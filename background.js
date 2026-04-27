// Background service worker for Essay Injector

let isTyping = false;
let shouldStop = false;
let currentTabId = null;

// Typing speed configuration (in milliseconds)
const TYPING_DELAYS = {
    normal: { min: 40, max: 180 },
    burst: { min: 20, max: 80 },
    afterComma: { min: 150, max: 350 },
    afterPeriod: { min: 300, max: 600 },
    afterNewline: { min: 400, max: 800 },
    thinkingPause: { min: 500, max: 1200 },
    shiftKey: { min: 30, max: 80 }
};

const commonWords = new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me']);

const qwertyAdjacent = {
    'q': ['w', 'a', 's'], 'w': ['q', 'e', 'a', 's', 'd'], 'e': ['w', 'r', 's', 'd', 'f'], 'r': ['e', 't', 'd', 'f', 'g'], 't': ['r', 'y', 'f', 'g', 'h'], 'y': ['t', 'u', 'g', 'h', 'j'], 'u': ['y', 'i', 'h', 'j', 'k'], 'i': ['u', 'o', 'j', 'k', 'l'], 'o': ['i', 'p', 'k', 'l'], 'p': ['o', 'l'],
    'a': ['q', 'w', 's', 'z', 'x'], 's': ['q', 'w', 'e', 'a', 'd', 'z', 'x', 'c'], 'd': ['w', 'e', 'r', 's', 'f', 'x', 'c', 'v'], 'f': ['e', 'r', 't', 'd', 'g', 'c', 'v', 'b'], 'g': ['r', 't', 'y', 'f', 'h', 'v', 'b', 'n'], 'h': ['t', 'y', 'u', 'g', 'j', 'b', 'n', 'm'], 'j': ['y', 'u', 'i', 'h', 'k', 'n', 'm'], 'k': ['u', 'i', 'o', 'j', 'l', 'm'], 'l': ['i', 'o', 'p', 'k'],
    'z': ['a', 's', 'x'], 'x': ['z', 's', 'd', 'c'], 'c': ['x', 'd', 'f', 'v'], 'v': ['c', 'f', 'g', 'b'], 'b': ['v', 'g', 'h', 'n'], 'n': ['b', 'h', 'j', 'm'], 'm': ['n', 'j', 'k']
};

const typos = {
    'the': 'teh', 'and': 'adn', 'for': 'fro', 'that': 'taht', 'with': 'wiht', 'have': 'ahve', 'this': 'htis', 'from': 'form', 'they': 'tehy', 'would': 'woudl', 'there': 'tehre', 'their': 'thier', 'what': 'waht', 'about': 'abotu', 'which': 'whcih'
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startTyping') {
        startTyping(message.essay, message.tabId || (sender.tab ? sender.tab.id : null));
        sendResponse({ received: true });
    } else if (message.action === 'stopTyping') {
        shouldStop = true;
        isTyping = false;
        chrome.storage.local.set({ isCurrentlyTyping: false });
        sendResponse({ received: true });
    } else if (message.action === 'getStatus') {
        sendResponse({ isTyping: isTyping });
    } else if (message.action === 'contentUnloaded') {
        shouldStop = true;
        isTyping = false;
        chrome.storage.local.set({ isCurrentlyTyping: false });
    }
    return true;
});

async function startTyping(essay, tabId) {
    if (isTyping) return;
    if (!tabId) {
        console.error("No tab ID provided");
        return;
    }
    isTyping = true;
    shouldStop = false;
    currentTabId = tabId;

    chrome.storage.local.set({ 
        isCurrentlyTyping: true,
        totalChars: essay.length,
        currentProgress: 0
    });

    try {
        await sendToContent(tabId, { action: 'initTyping' });
        await typeText(essay, tabId);
        if (!shouldStop) {
            chrome.runtime.sendMessage({ action: 'typingComplete' }).catch(() => {});
        }
    } catch (error) {
        console.error('Error in startTyping:', error);
        chrome.runtime.sendMessage({ action: 'typingError', error: error.message }).catch(() => {});
    } finally {
        isTyping = false;
        chrome.storage.local.set({ isCurrentlyTyping: false });
    }
}

async function sendToContent(tabId, message) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else if (response && response.error) {
                reject(new Error(response.error));
            } else {
                resolve(response);
            }
        });
    });
}

function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isBurstWord(text, index) {
    const remaining = text.slice(index);
    const match = remaining.match(/^([a-zA-Z]+)(\b|$)/);
    if (match) {
        const word = match[1].toLowerCase();
        return commonWords.has(word);
    }
    return false;
}

async function typeText(text, tabId) {
    let currentIndex = 0;
    const totalChars = text.length;
    let charsSinceLastPause = 0;
    let inBurst = false;
    let burstRemaining = 0;
    
    while (currentIndex < text.length && !shouldStop) {
        const char = text[currentIndex];
        
        // Handle word typos
        const shouldMakeWordTypo = Math.random() < 0.05;
        let wordTypoHandled = false;
        
        if (shouldMakeWordTypo && char.match(/[a-z]/i)) {
            const remainingText = text.slice(currentIndex).toLowerCase();
            for (const [correct, wrong] of Object.entries(typos)) {
                if (remainingText.startsWith(correct)) {
                    for (let i = 0; i < wrong.length; i++) {
                        await sendToContent(tabId, { action: 'typeChar', char: wrong[i] });
                        currentIndex++;
                        updateProgress(currentIndex, totalChars);
                        await sleep(getDelayForCharacter(wrong[i], false));
                        if (shouldStop) return;
                    }
                    
                    await sleep(randomDelay(200, 500));
                    
                    for (let i = 0; i < wrong.length; i++) {
                        await sendToContent(tabId, { action: 'backspace' });
                        await sleep(randomDelay(30, 80));
                        if (shouldStop) return;
                    }
                    
                    for (let i = 0; i < correct.length; i++) {
                        await sendToContent(tabId, { action: 'typeChar', char: correct[i] });
                        currentIndex++;
                        updateProgress(currentIndex, totalChars);
                        await sleep(getDelayForCharacter(correct[i], false));
                        if (shouldStop) return;
                    }
                    
                    currentIndex--; // Correct the index increment in the main loop
                    charsSinceLastPause = 0;
                    wordTypoHandled = true;
                    break;
                }
            }
        }
        
        if (wordTypoHandled) {
            currentIndex++;
            continue;
        }

        // Fat finger typos
        const isLetter = char.match(/[a-z]/i);
        const shouldFatFinger = isLetter && Math.random() < 0.02;

        if (shouldFatFinger) {
            const lowerChar = char.toLowerCase();
            const adjacents = qwertyAdjacent[lowerChar];
            if (adjacents && adjacents.length > 0) {
                const mistakeChar = adjacents[Math.floor(Math.random() * adjacents.length)];
                const typedMistake = char === char.toUpperCase() ? mistakeChar.toUpperCase() : mistakeChar;
                
                await sendToContent(tabId, { action: 'typeChar', char: typedMistake });
                await sleep(getDelayForCharacter(typedMistake, false) + randomDelay(100, 300));
                if (shouldStop) return;
                
                await sendToContent(tabId, { action: 'backspace' });
                await sleep(randomDelay(100, 200));
                if (shouldStop) return;
            }
        }

        // Normal typing
        await sendToContent(tabId, { action: 'typeChar', char: char });
        currentIndex++;
        updateProgress(currentIndex, totalChars);
        charsSinceLastPause++;

        // Determine burst typing
        if (burstRemaining <= 0 && char.match(/\s/) && currentIndex < text.length) {
            if (isBurstWord(text, currentIndex)) {
                inBurst = true;
                const match = text.slice(currentIndex).match(/^([a-zA-Z]+)(\b|$)/);
                if (match) burstRemaining = match[1].length;
            } else {
                inBurst = false;
            }
        }
        
        if (burstRemaining > 0) burstRemaining--;
        if (burstRemaining <= 0) inBurst = false;

        let delay = getDelayForCharacter(char, inBurst);

        // Shift key penalty
        if (char === char.toUpperCase() && char.match(/[A-Z]/)) {
            delay += randomDelay(TYPING_DELAYS.shiftKey.min, TYPING_DELAYS.shiftKey.max);
        }

        if (Math.random() < 0.01 && charsSinceLastPause > 20) {
            delay += randomDelay(TYPING_DELAYS.thinkingPause.min, TYPING_DELAYS.thinkingPause.max);
            charsSinceLastPause = 0;
        }

        await sleep(delay);
    }
}

function getDelayForCharacter(char, inBurst) {
    if (char === '\n') return randomDelay(TYPING_DELAYS.afterNewline.min, TYPING_DELAYS.afterNewline.max);
    if (char === '.' || char === '!' || char === '?') return randomDelay(TYPING_DELAYS.afterPeriod.min, TYPING_DELAYS.afterPeriod.max);
    if (char === ',' || char === ';' || char === ':') return randomDelay(TYPING_DELAYS.afterComma.min, TYPING_DELAYS.afterComma.max);
    
    if (inBurst) {
        return randomDelay(TYPING_DELAYS.burst.min, TYPING_DELAYS.burst.max);
    }
    return randomDelay(TYPING_DELAYS.normal.min, TYPING_DELAYS.normal.max);
}

function updateProgress(current, total) {
    chrome.storage.local.set({ 
        currentProgress: current,
        totalChars: total
    });
    
    chrome.runtime.sendMessage({
        action: 'typingProgress',
        current: current,
        total: total
    }).catch(() => {});
}