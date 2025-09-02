# Adding New Platforms to Mediamammal

This document explains how to add support for new social media platforms to the Mediamammal extension.

## Architecture Overview

The extension now uses a modular architecture:

- **`content.js`** - Main platform detector that loads platform-specific scripts
- **`{platform}-content.js`** - Platform-specific implementation files
- **`manifest.json`** - Must include new platform files in `web_accessible_resources`

## How It Works

1. **Platform Detection**: `content.js` detects which website the user is on
2. **Dynamic Loading**: It dynamically loads the appropriate platform-specific script
3. **Platform Isolation**: Each platform has its own file with isolated logic

## Supported Platforms

Currently implemented:
- **YouTube** (`yt-content.js`) - Full implementation with video recommendations

Template available:
- **Twitter/X** (`twitter-content.js`) - Basic template

## Adding a New Platform

### Step 1: Create Platform File

Create a new file named `{platform}-content.js` (e.g., `instagram-content.js`):

```javascript
// Instagram-specific content script
console.log("Mediamammal: Instagram handler loaded");

const SERVER_URL = 'https://mediamammaltest.uc.r.appspot.com';

function handleInstagramContent() {
  // Implement Instagram-specific logic here
  console.log('Mediamammal: Instagram content handler');
}

handleInstagramContent();
```

### Step 2: Update Platform Detection

Add your platform to the `detectPlatform()` function in `content.js`:

```javascript
// Instagram
if (hostname === 'www.instagram.com' || hostname === 'instagram.com') {
  return 'instagram';
}
```

### Step 3: Update Manifest

Add your platform file to `web_accessible_resources` in `manifest.json`:

```json
"web_accessible_resources": [
  {
    "resources": ["whalethumb1.png", "whalethumb2.png", "yt-content.js", "instagram-content.js"],
    "matches": ["https://www.youtube.com/*", "https://www.instagram.com/*"]
  }
]
```

### Step 4: Add Content Script Matches

Add your platform URL to the `content_scripts` section in `manifest.json`:

```json
"content_scripts": [
  {
    "matches": ["https://www.youtube.com/*", "https://www.instagram.com/*"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }
]
```

## Platform-Specific Implementation Guide

### Required Functions

Each platform should implement:

1. **Content Scraping**: Extract relevant links/content from the page
2. **Recommendation Application**: Apply AI recommendations to content
3. **Scroll Handling**: Handle infinite scroll or pagination
4. **State Management**: Track processed content to avoid duplicates

### Example Structure

```javascript
// Configuration
const SERVER_URL = 'https://mediamammaltest.uc.r.appspot.com';

// Content extraction
function extractContent() {
  // Platform-specific content extraction logic
}

// Recommendation application
function applyRecommendations(recommendations) {
  // Apply recommendations to content
}

// Main processing
async function processContent() {
  // Main logic flow
}

// Event listeners
window.addEventListener('scroll', handleScroll);
```

## Testing New Platforms

1. **Load Extension**: Load the extension in developer mode
2. **Navigate to Platform**: Go to the new platform's website
3. **Check Console**: Look for platform detection and script loading messages
4. **Test Functionality**: Verify that recommendations are working

## Common Patterns

### Content Extraction
- Use `document.querySelectorAll()` with platform-specific selectors
- Filter content based on relevance
- Handle dynamic content loading

### Recommendation Display
- Create tooltips or visual indicators
- Apply consistent styling across platforms
- Handle theme changes (light/dark mode)

### Performance
- Implement debouncing for scroll events
- Limit content processing to reasonable amounts
- Cache recommendations when possible

## Troubleshooting

### Script Not Loading
- Check `web_accessible_resources` in manifest
- Verify platform detection logic
- Check browser console for errors

### Functionality Not Working
- Ensure platform-specific logic is correct
- Check if content selectors are accurate
- Verify API calls to backend

### Performance Issues
- Implement proper debouncing
- Limit content processing
- Use efficient DOM queries

## Future Enhancements

- **Shared Utilities**: Common functions across platforms
- **Configuration Management**: Platform-specific settings
- **Analytics**: Track usage across platforms
- **User Preferences**: Platform-specific customization options
