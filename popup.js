// Popup script for Essay Injector

const essayInput = document.getElementById('essayInput');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');
const statusText = document.getElementById('statusText');
const progressBar = document.getElementById('progressBar');
const progressInfo = document.getElementById('progressInfo');
const errorDiv = document.getElementById('error');

let isTyping = false;

// Load saved essay and check typing status when popup opens
chrome.storage.local.get(['savedEssay', 'isCurrentlyTyping', 'currentProgress', 'totalChars'], (result) => {
    if (result.savedEssay) {
        essayInput.value = result.savedEssay;
    }
    
    // Check if typing is currently in progress
    if (result.isCurrentlyTyping) {
        console.log('Typing in progress detected, restoring UI state');
        restoreTypingState(result.currentProgress || 0, result.totalChars || 0);
    }
});

// Also query the content script directly to double-check status
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('docs.google.com')) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Could not query content script:', chrome.runtime.lastError);
                return;
            }
            
            if (response && response.isTyping) {
                console.log('Content script confirms typing is in progress');
                // Get the latest progress from storage
                chrome.storage.local.get(['currentProgress', 'totalChars'], (result) => {
                    restoreTypingState(result.currentProgress || 0, result.totalChars || 0);
                });
            }
        });
    }
});

function restoreTypingState(current, total) {
    isTyping = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    essayInput.disabled = true;
    statusDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    statusText.textContent = 'Typing...';
    
    if (total > 0) {
        const percentage = (current / total) * 100;
        progressBar.style.width = percentage + '%';
        progressInfo.textContent = `${current} / ${total} characters`;
    }
}

// Save essay to storage when changed
essayInput.addEventListener('input', () => {
    chrome.storage.local.set({ savedEssay: essayInput.value });
});

// Start typing
startBtn.addEventListener('click', async () => {
    const essay = essayInput.value.trim();
    
    console.log('Start button clicked, essay length:', essay.length);
    
    if (!essay) {
        showError('Please paste your essay first.');
        return;
    }
    
    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        console.log('Active tab:', tab.url);
        
        if (!tab.url || !tab.url.includes('docs.google.com')) {
            showError('Please open a Google Docs document first.');
            return;
        }
        
        // Update UI
        isTyping = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        essayInput.disabled = true;
        statusDiv.classList.remove('hidden');
        errorDiv.classList.add('hidden');
        statusText.textContent = 'Typing...';
        progressBar.style.width = '0%';
        progressInfo.textContent = `0 / ${essay.length} characters`;
        
        // Send message to content script
        console.log('Sending message to tab:', tab.id);
        chrome.tabs.sendMessage(tab.id, {
            action: 'startTyping',
            essay: essay
        }, (response) => {
            console.log('Response from content script:', response);
            if (chrome.runtime.lastError) {
                console.error('Error sending message:', chrome.runtime.lastError);
                showError('Could not connect to page. Try refreshing the Google Docs page.');
                resetUI();
            }
        });
        
    } catch (error) {
        console.error('Error in startBtn click handler:', error);
        showError('Error: ' + error.message);
        resetUI();
    }
});

// Stop typing
stopBtn.addEventListener('click', async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, { action: 'stopTyping' });
        chrome.storage.local.set({ isCurrentlyTyping: false, currentProgress: 0 });
        resetUI();
        statusText.textContent = 'Stopped';
    } catch (error) {
        showError('Error stopping: ' + error.message);
    }
});

// Listen for progress updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'typingProgress') {
        const { current, total } = message;
        const percentage = (current / total) * 100;
        progressBar.style.width = percentage + '%';
        progressInfo.textContent = `${current} / ${total} characters`;
    } else if (message.action === 'typingComplete') {
        statusText.textContent = 'Complete!';
        chrome.storage.local.set({ isCurrentlyTyping: false, currentProgress: 0 });
        resetUI();
    } else if (message.action === 'typingError') {
        showError('Error: ' + message.error);
        chrome.storage.local.set({ isCurrentlyTyping: false, currentProgress: 0 });
        resetUI();
    }
});

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function resetUI() {
    isTyping = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    essayInput.disabled = false;
}

