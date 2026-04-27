// Content script for Essay Injector - simulates typing in Google Docs

console.log('Essay Injector content script loaded on:', window.location.href);

let activeEditor = null;

// Handle page reload to reset state
window.addEventListener('beforeunload', () => {
    chrome.runtime.sendMessage({ action: 'contentUnloaded' }).catch(() => {});
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'initTyping') {
        activeEditor = findGoogleDocsEditor();
        if (!activeEditor) {
            sendResponse({ error: 'Could not find Google Docs editor. Please click in the document first.' });
        } else {
            activeEditor.focus();
            sendResponse({ success: true });
        }
    } else if (message.action === 'typeChar') {
        if (activeEditor) {
            typeCharacter(activeEditor, message.char);
        }
        sendResponse({ success: true });
    } else if (message.action === 'backspace') {
        if (activeEditor) {
            backspace(activeEditor);
        }
        sendResponse({ success: true });
    } else if (message.action === 'getStatus') {
        sendResponse({ isTyping: true });
    }
    
    return true; // Keep the message channel open
});

function findGoogleDocsEditor() {
    console.log('Searching for Google Docs editor...');
    
    // Prioritize the hidden iframe which Docs uses for catching input
    const iframe = document.querySelector('.docs-texteventtarget-iframe');
    if (iframe) {
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            const body = doc.body;
            if (body) {
                console.log('Found body inside Docs iframe');
                return body;
            }
        } catch(e) {
            console.log('Cannot access iframe:', e);
        }
    }

    // Fallbacks
    const selectors = [
        '.kix-appview-editor',
        '[role="textbox"][contenteditable="true"]',
        '.docs-gm',
        '.kix-cursor-caret'
    ];
    
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) return element;
    }
    
    const contentEditables = document.querySelectorAll('[contenteditable="true"]');
    if (contentEditables.length > 0) return contentEditables[0];
    
    const focused = document.activeElement;
    if (focused && focused.isContentEditable) return focused;
    
    return null;
}

function typeCharacter(element, char) {
    if (char === '\n') {
        typeEnter(element);
        return;
    }
    
    const charCode = char.charCodeAt(0);
    const code = getKeyCode(char);
    
    element.dispatchEvent(new KeyboardEvent('keydown', { key: char, code: code, charCode: charCode, keyCode: charCode, which: charCode, bubbles: true, cancelable: true }));
    element.dispatchEvent(new KeyboardEvent('keypress', { key: char, code: code, charCode: charCode, keyCode: charCode, which: charCode, bubbles: true, cancelable: true }));
    
    const inputEvent = new InputEvent('input', {
        data: char,
        inputType: 'insertText',
        bubbles: true,
        cancelable: false
    });
    
    // Fallback for native inputs if used outside Google Docs
    if (!element.isContentEditable && (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT')) {
        element.value += char;
    }
    
    element.dispatchEvent(inputEvent);
    
    try {
        const textEvent = document.createEvent('TextEvent');
        textEvent.initTextEvent('textInput', true, true, null, char, 9, "en-US");
        element.dispatchEvent(textEvent);
    } catch(e) {}

    element.dispatchEvent(new KeyboardEvent('keyup', { key: char, code: code, charCode: charCode, keyCode: charCode, which: charCode, bubbles: true, cancelable: true }));
}

function typeEnter(element) {
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
    element.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
    
    const inputEvent = new InputEvent('input', {
        data: null,
        inputType: 'insertLineBreak',
        bubbles: true,
        cancelable: false
    });
    
    if (!element.isContentEditable && element.tagName === 'TEXTAREA') {
        element.value += '\n';
    }
    
    element.dispatchEvent(inputEvent);
    element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
}

function backspace(element) {
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', code: 'Backspace', keyCode: 8, which: 8, bubbles: true, cancelable: true }));
    
    const inputEvent = new InputEvent('input', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: false
    });
    
    if (!element.isContentEditable && (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT')) {
        element.value = element.value.slice(0, -1);
    }
    
    element.dispatchEvent(inputEvent);
    element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Backspace', code: 'Backspace', keyCode: 8, which: 8, bubbles: true, cancelable: true }));
}

function getKeyCode(char) {
    if (char === ' ') return 'Space';
    if (char === '\n') return 'Enter';
    if (char.match(/[a-z]/i)) return 'Key' + char.toUpperCase();
    return 'Digit' + char;
}