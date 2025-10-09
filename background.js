// Background service worker for Essay Injector

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Essay Injector installed');
});

// Relay messages between popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Messages from content script to popup are automatically forwarded
    // This service worker acts as a relay if needed
    return true; // Keep the message channel open for async responses
});

