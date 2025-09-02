// Main content script - Platform detector for Mediamammal
// This script detects which social media platform the user is on and loads the appropriate handler

console.log('Mediamammal: Platform detector initialized');

// Server configuration - shared across all platforms
// Uncomment the line you want to use for local testing
const SERVER_URL = 'http://localhost:3000'; // For local testing
//const SERVER_URL = 'https://mediamammaltest.uc.r.appspot.com'; // For production server

// Make SERVER_URL globally accessible to all platform scripts
window.MEDIAMAMMAL_SERVER_URL = SERVER_URL;
console.log('Mediamammal: Server URL set to:', SERVER_URL);

// Detect current platform
function detectPlatform() {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  // YouTube
  if (hostname === 'www.youtube.com' || hostname === 'youtube.com') {
    return 'youtube';
  }
  
  // Twitter/X
  if (hostname === 'twitter.com' || hostname === 'x.com') {
    return 'twitter';
  }
  
  // Instagram
  if (hostname === 'www.instagram.com' || hostname === 'instagram.com') {
    return 'instagram';
  }
  
  // TikTok
  if (hostname === 'www.tiktok.com' || hostname === 'tiktok.com') {
    return 'tiktok';
  }
  
  // Reddit
  if (hostname === 'www.reddit.com' || hostname === 'reddit.com') {
    return 'reddit';
  }
  
  // LinkedIn
  if (hostname === 'www.linkedin.com' || hostname === 'linkedin.com') {
    return 'linkedin';
  }
  
  // Facebook
  if (hostname === 'www.facebook.com' || hostname === 'facebook.com') {
    return 'facebook';
  }
  
  return 'unknown';
}

// Initialize platform detection
const currentPlatform = detectPlatform();
console.log(`Mediamammal: Detected platform: ${currentPlatform}`);

// Platform-specific scripts are now loaded directly via manifest.json
// No need for dynamic loading

// Listen for navigation changes (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('Mediamammal: URL changed, re-detecting platform');
    const newPlatform = detectPlatform();
    if (newPlatform !== currentPlatform) {
      console.log(`Mediamammal: Platform changed from ${currentPlatform} to ${newPlatform}`);
      // Reload the page to get the new platform script
      // This is a simple approach - for more sophisticated handling, you could
      // dynamically unload/load scripts or implement a more complex state management
      window.location.reload();
    }
  }
}).observe(document, { subtree: true, childList: true });

// Listen for messages from platform-specific scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'platform-info') {
    sendResponse({ platform: currentPlatform });
  }
});