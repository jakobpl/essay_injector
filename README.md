# Essay Injector - Chrome Extension

A Chrome browser extension that simulates natural human typing in Google Docs, helping bypass AI detection by typing text character-by-character with realistic delays and occasional errors.

## ⚠️ DISCLAIMER - USE AT YOUR OWN RISK

**This tool is provided "as-is" without any warranties or guarantees. By using this extension, you acknowledge that:**

- You use this tool entirely at your own risk
- The developer assumes NO RESPONSIBILITY if you are caught or face consequences
- You are solely responsible for complying with your institution's academic integrity policies
- This tool does not guarantee that you will bypass any detection systems
- Use of this tool may violate terms of service, academic policies, or other agreements
- You accept full liability for any consequences resulting from use of this extension

**If you are caught using this tool, that is YOUR responsibility, not the developer's.**

## Features

- **Natural Typing Simulation**: Types character-by-character with randomized delays (50-200ms)
- **Realistic Errors**: Occasionally introduces common typos (e.g., "teh" → "the") and then corrects them
- **Progress Tracking**: Real-time progress indicator showing typing status
- **Google Docs Integration**: Automatically detects and types into Google Docs editor
- **Clean UI**: Modern popup interface with textarea and controls

## Installation

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/jakobpl/essay_injector.git
   ```

2. **Open Chrome and navigate to extensions page**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)

3. **Load the extension**
   - Click "Load unpacked"
   - Select the `essay_injector` folder
   - The extension should now appear in your extensions list

## Usage

1. **Open a Google Docs document**
   - Navigate to https://docs.google.com
   - Create a new document or open an existing one
   - Click in the document to focus the editor

2. **Open the extension popup**
   - Click the Essay Injector icon in your Chrome toolbar

3. **Paste your essay**
   - Paste your full essay text into the textarea
   - The text will be automatically saved

4. **Start typing simulation**
   - Click "Start Typing" button
   - The extension will begin typing your essay character-by-character
   - Watch the progress bar for real-time updates

5. **⚠️ IMPORTANT: While typing is in progress:**
   - **DO NOT click anywhere in the document** - this will move the cursor
   - **DO NOT accept any suggestions** from Google Docs
   - **DO NOT interact with the document** in any way
   - The program will continue typing from wherever the cursor is positioned, NOT appended to the end
   - If you click or move the cursor, the remaining text will type at that new location
   - You can safely close the extension popup - typing will continue in the background

6. **Stop if needed**
   - Reopen the extension popup if you closed it
   - Click "Stop" button to halt the typing simulation at any time

## Technical Details

### Architecture

- **Manifest V3**: Modern Chrome extension format
- **Popup Interface**: HTML/CSS/JS popup for user interaction
- **Content Script**: Injected into Google Docs pages to simulate typing
- **Background Service Worker**: Handles messaging between popup and content script

### Typing Simulation

- **Delays**: Randomized 50-200ms delays between characters
- **Typos**: 5% chance of introducing common typos
- **Correction**: Automatic backspace and correction after typos
- **Events**: Dispatches proper keyboard events (keydown, keypress, keyup, input)

### Permissions

- `activeTab`: Access to currently active tab
- `scripting`: Inject content scripts
- `https://docs.google.com/*`: Host permission for Google Docs

## Files

- `manifest.json` - Extension configuration (Manifest V3)
- `popup.html` - Popup interface HTML
- `popup.js` - Popup logic and UI controls
- `content.js` - Content script for typing simulation
- `background.js` - Background service worker
- `style.css` - Popup styling

## Troubleshooting

**Extension not working?**
- Make sure you're on a Google Docs page (docs.google.com)
- Click in the document editor before starting
- Check Chrome DevTools console for any errors

**Typing not appearing?**
- Try clicking in the document first to focus the editor
- Reload the Google Docs page and try again
- Check that the extension has proper permissions

**Typing appearing in wrong location?**
- You likely clicked in the document or moved the cursor while typing was in progress
- The extension types from the current cursor position, not at the end of the document
- Do not interact with the document while typing is active

**Progress not updating?**
- This is normal for very fast typing
- The progress bar updates in real-time as characters are typed

**Text got interrupted or split up?**
- You may have accepted a Google Docs suggestion or clicked during typing
- Always let the extension finish typing without any interaction

## Development

This extension uses pure JavaScript with no external libraries. To modify:

1. Edit the source files
2. Go to `chrome://extensions/`
3. Click the reload icon on the Essay Injector card
4. Test your changes

## Legal & Ethical Notice

This tool is provided for educational and research purposes only. The developer:

- Makes NO warranties or guarantees about functionality or effectiveness
- Assumes NO LIABILITY for any consequences of using this tool
- Does NOT encourage violating academic integrity policies
- Is NOT RESPONSIBLE if you are caught or face disciplinary action

**You use this tool at your own risk. You are fully responsible for your actions and any consequences.**

## License

MIT License - Feel free to modify and distribute.
