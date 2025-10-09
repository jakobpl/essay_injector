// Content script for Essay Injector - simulates typing in Google Docs

console.log('Essay Injector content script loaded on:', window.location.href);

let isTyping = false;
let shouldStop = false;

// Common typos for realistic simulation
const typos = {
    'the': 'teh',
    'and': 'adn',
    'for': 'fro',
    'that': 'taht',
    'with': 'wiht',
    'have': 'ahve',
    'this': 'htis',
    'from': 'form',
    'they': 'tehy',
    'would': 'woudl',
    'there': 'tehre',
    'their': 'thier',
    'what': 'waht',
    'about': 'abotu',
    'which': 'whcih'
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message.action);
    if (message.action === 'startTyping') {
        startTyping(message.essay);
    } else if (message.action === 'stopTyping') {
        shouldStop = true;
        isTyping = false;
    }
    sendResponse({ received: true });
    return true; // Keep the message channel open
});

async function startTyping(essay) {
    console.log('Starting typing, essay length:', essay.length);
    if (isTyping) return;
    
    isTyping = true;
    shouldStop = false;
    
    try {
        // Find Google Docs editor
        const editor = findGoogleDocsEditor();
        console.log('Found editor:', editor);
        
        if (!editor) {
            sendError('Could not find Google Docs editor. Please click in the document first.');
            return;
        }
        
        // Focus the editor
        editor.focus();
        console.log('Editor focused, starting to type...');
        
        // Type the essay character by character
        await typeText(editor, essay);
        
        if (!shouldStop) {
            chrome.runtime.sendMessage({ action: 'typingComplete' });
        }
        
    } catch (error) {
        console.error('Error in startTyping:', error);
        sendError(error.message);
    } finally {
        isTyping = false;
    }
}

function findGoogleDocsEditor() {
    console.log('Searching for Google Docs editor...');
    
    // Try multiple selectors for Google Docs editor
    const selectors = [
        '.docs-texteventtarget-iframe',
        '.kix-appview-editor',
        '[role="textbox"][contenteditable="true"]',
        '.docs-gm',
        '.kix-cursor-caret',
        '.kix-lineview-content'
    ];
    
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            console.log('Found element with selector:', selector, element);
            // If it's an iframe, get the content document
            if (element.tagName === 'IFRAME') {
                try {
                    const doc = element.contentDocument || element.contentWindow.document;
                    const textbox = doc.querySelector('[contenteditable="true"]') || doc.body;
                    if (textbox) {
                        console.log('Found textbox inside iframe:', textbox);
                        return textbox;
                    }
                } catch (e) {
                    console.log('Cannot access iframe:', e);
                }
            }
            return element;
        }
    }
    
    // Try to find any contenteditable element
    const contentEditables = document.querySelectorAll('[contenteditable="true"]');
    console.log('Found contenteditable elements:', contentEditables.length);
    if (contentEditables.length > 0) {
        return contentEditables[0];
    }
    
    // Fallback: find any focused contenteditable element
    const focused = document.activeElement;
    console.log('Active element:', focused);
    if (focused && focused.isContentEditable) {
        return focused;
    }
    
    console.log('No editor found!');
    return null;
}

async function typeText(editor, text) {
    let currentIndex = 0;
    const totalChars = text.length;
    
    while (currentIndex < text.length && !shouldStop) {
        const char = text[currentIndex];
        
        // Check if we should introduce a typo (5% chance)
        const shouldMakeTypo = Math.random() < 0.05;
        let typedText = char;
        let needsCorrection = false;
        
        // Check if current position starts a word that has a common typo
        if (shouldMakeTypo && char.match(/[a-z]/i)) {
            const remainingText = text.slice(currentIndex).toLowerCase();
            for (const [correct, wrong] of Object.entries(typos)) {
                if (remainingText.startsWith(correct)) {
                    // Type the typo version instead
                    for (let i = 0; i < wrong.length; i++) {
                        await typeCharacter(editor, wrong[i]);
                        currentIndex++;
                        sendProgress(currentIndex, totalChars);
                        await sleep(randomDelay());
                        if (shouldStop) return;
                    }
                    
                    // Wait a moment, then correct it
                    await sleep(randomDelay(200, 500));
                    
                    // Backspace the wrong word
                    for (let i = 0; i < wrong.length; i++) {
                        await backspace(editor);
                        await sleep(randomDelay(30, 80));
                        if (shouldStop) return;
                    }
                    
                    // Type the correct word
                    for (let i = 0; i < correct.length; i++) {
                        await typeCharacter(editor, correct[i]);
                        currentIndex++;
                        sendProgress(currentIndex, totalChars);
                        await sleep(randomDelay());
                        if (shouldStop) return;
                    }
                    
                    // Skip ahead since we've already typed this word
                    currentIndex--; // Will be incremented at end of loop
                    continue;
                }
            }
        }
        
        // Normal typing
        await typeCharacter(editor, char);
        currentIndex++;
        sendProgress(currentIndex, totalChars);
        
        // Random delay between characters (50-200ms)
        await sleep(randomDelay());
    }
}

function typeCharacter(element, char) {
    // Handle newline characters specially
    if (char === '\n') {
        typeEnter(element);
        return;
    }
    
    // Create and dispatch keyboard events
    const keydownEvent = new KeyboardEvent('keydown', {
        key: char,
        code: getKeyCode(char),
        charCode: char.charCodeAt(0),
        keyCode: char.charCodeAt(0),
        which: char.charCodeAt(0),
        bubbles: true,
        cancelable: true
    });
    
    const keypressEvent = new KeyboardEvent('keypress', {
        key: char,
        code: getKeyCode(char),
        charCode: char.charCodeAt(0),
        keyCode: char.charCodeAt(0),
        which: char.charCodeAt(0),
        bubbles: true,
        cancelable: true
    });
    
    const keyupEvent = new KeyboardEvent('keyup', {
        key: char,
        code: getKeyCode(char),
        charCode: char.charCodeAt(0),
        keyCode: char.charCodeAt(0),
        which: char.charCodeAt(0),
        bubbles: true,
        cancelable: true
    });
    
    element.dispatchEvent(keydownEvent);
    element.dispatchEvent(keypressEvent);
    
    // Insert the character using InputEvent
    const inputEvent = new InputEvent('input', {
        data: char,
        inputType: 'insertText',
        bubbles: true,
        cancelable: false
    });
    
    // Actually insert the text
    if (element.isContentEditable) {
        // Get the window object that owns this element (might be in iframe)
        const win = element.ownerDocument.defaultView || window;
        const selection = win.getSelection();
        
        // Create a range if one doesn't exist
        let range;
        if (selection.rangeCount === 0) {
            range = element.ownerDocument.createRange();
            range.selectNodeContents(element);
            range.collapse(false); // Collapse to end
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            range = selection.getRangeAt(0);
        }
        
        // Insert the character
        const textNode = document.createTextNode(char);
        range.deleteContents();
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        element.value += char;
    }
    
    element.dispatchEvent(inputEvent);
    element.dispatchEvent(keyupEvent);
}

function typeEnter(element) {
    // Create Enter key events
    const keydownEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
    });
    
    const keypressEvent = new KeyboardEvent('keypress', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
    });
    
    const keyupEvent = new KeyboardEvent('keyup', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
    });
    
    element.dispatchEvent(keydownEvent);
    element.dispatchEvent(keypressEvent);
    
    // Insert line break
    if (element.isContentEditable) {
        // Get the window object that owns this element (might be in iframe)
        const win = element.ownerDocument.defaultView || window;
        const selection = win.getSelection();
        
        // Create a range if one doesn't exist
        let range;
        if (selection.rangeCount === 0) {
            range = element.ownerDocument.createRange();
            range.selectNodeContents(element);
            range.collapse(false); // Collapse to end
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            range = selection.getRangeAt(0);
        }
        
        // Insert a line break (br element)
        const br = element.ownerDocument.createElement('br');
        range.deleteContents();
        range.insertNode(br);
        range.setStartAfter(br);
        range.setEndAfter(br);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        element.value += '\n';
    }
    
    const inputEvent = new InputEvent('input', {
        data: null,
        inputType: 'insertLineBreak',
        bubbles: true,
        cancelable: false
    });
    
    element.dispatchEvent(inputEvent);
    element.dispatchEvent(keyupEvent);
}

function backspace(element) {
    const keydownEvent = new KeyboardEvent('keydown', {
        key: 'Backspace',
        code: 'Backspace',
        keyCode: 8,
        which: 8,
        bubbles: true,
        cancelable: true
    });
    
    const keyupEvent = new KeyboardEvent('keyup', {
        key: 'Backspace',
        code: 'Backspace',
        keyCode: 8,
        which: 8,
        bubbles: true,
        cancelable: true
    });
    
    element.dispatchEvent(keydownEvent);
    
    // Delete the last character
    if (element.isContentEditable) {
        // Get the window object that owns this element (might be in iframe)
        const win = element.ownerDocument.defaultView || window;
        const selection = win.getSelection();
        
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (range.startOffset > 0) {
                range.setStart(range.startContainer, range.startOffset - 1);
                range.deleteContents();
            } else if (range.startContainer.previousSibling) {
                // If at start of current node, try to delete from previous node
                const prevNode = range.startContainer.previousSibling;
                if (prevNode.nodeType === Node.TEXT_NODE && prevNode.length > 0) {
                    const newRange = element.ownerDocument.createRange();
                    newRange.setStart(prevNode, prevNode.length - 1);
                    newRange.setEnd(prevNode, prevNode.length);
                    newRange.deleteContents();
                }
            }
        }
    } else {
        element.value = element.value.slice(0, -1);
    }
    
    const inputEvent = new InputEvent('input', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: false
    });
    
    element.dispatchEvent(inputEvent);
    element.dispatchEvent(keyupEvent);
}

function getKeyCode(char) {
    if (char === ' ') return 'Space';
    if (char === '\n') return 'Enter';
    if (char.match(/[a-z]/i)) return 'Key' + char.toUpperCase();
    return 'Digit' + char;
}

function randomDelay(min = 50, max = 200) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function sendProgress(current, total) {
    chrome.runtime.sendMessage({
        action: 'typingProgress',
        current: current,
        total: total
    });
}

function sendError(error) {
    chrome.runtime.sendMessage({
        action: 'typingError',
        error: error
    });
    isTyping = false;
}

