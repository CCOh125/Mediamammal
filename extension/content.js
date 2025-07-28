// Only run on the YouTube homepage
if (window.location.pathname === '/' || window.location.pathname === '/feed/trending') {
  console.log("Correct page")
  // Scrape video links from the page

function getVideoLinks() {
      const links = Array.from(document.querySelectorAll('a[href^="/watch"]'))
        .map(link => link.href.startsWith('http') ? link.href : 'https://www.youtube.com' + link.getAttribute('href'))
      .filter(href => href && href.startsWith('https://www.youtube.com/watch'));
      const uniqueLinks = Array.from(new Set(links)).slice(0, 100); // Limit to first 100
      console.log('YouTube Gemini Recommender: Retrieved video links:', uniqueLinks);
      return uniqueLinks;
}
  
// Inject tooltips based on recommendations
function injectTooltips(recommendations) {
    let tooltip = document.getElementById('gemini-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'gemini-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.background = '#222';
      tooltip.style.color = '#fff';
      tooltip.style.padding = '6px 12px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontSize = '14px';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '9999';
      tooltip.style.display = 'none';
      document.body.appendChild(tooltip);
    }
  
    function addTooltip(link) {
      if (link.dataset.geminiTooltip) return;
      const url = link.href;
      if (recommendations[url]) {
        link.style.borderBottom = '2px dotted #007bff';
        link.addEventListener('mouseenter', (e) => {
          tooltip.textContent = `Agent: ${recommendations[url]}`;
          tooltip.style.display = 'block';
        });
        link.addEventListener('mousemove', (e) => {
          tooltip.style.left = e.clientX + 10 + 'px';
          tooltip.style.top = e.clientY + 10 + 'px';
        });
        link.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });
        link.dataset.geminiTooltip = 'true';
          console.log(`YouTube Gemini Recommender: Injected tooltip for ${url} -> ${recommendations[url]}`);
      }
    }
  
      document.querySelectorAll('a[href^="/watch"]').forEach(addTooltip);
      console.log('YouTube Gemini Recommender: Tooltips injected for all recommended links.');
}
  
// Track processed URLs to avoid duplicates (client-side backup)
let processedUrls = new Set();
let categories = [];
let isInitialLoad = true;

// Main logic: scrape, send, inject
async function processVideos(isInitialRequest = true) {
    const videoLinks = getVideoLinks();
    if (videoLinks.length === 0) {
        console.log('YouTube Gemini Recommender: No video links found on the page.');
        return;
    }

    // Reset processed URLs on initial load or page change
    if (isInitialLoad) {
        processedUrls.clear();
        isInitialLoad = false;
    }

    // Filter out already processed URLs (client-side backup)
    const newVideoLinks = videoLinks.filter(url => !processedUrls.has(url));
    if (newVideoLinks.length === 0) {
        console.log('YouTube Gemini Recommender: No new video links to process.');
        return;
    }

    // Get categories from local storage (only on initial request)
    if (isInitialRequest) {
        try {
            const result = await chrome.storage.local.get(['mediamammal_categories']);
            categories = result.mediamammal_categories || [];
            console.log('YouTube Gemini Recommender: Loaded categories from local storage:', categories);
        } catch (err) {
            console.error('YouTube Gemini Recommender: Error loading categories:', err);
        }
        
        if (categories.length === 0) {
            console.log('YouTube Gemini Recommender: No categories found. Please set categories in the extension popup.');
            return;
        }
    }

    try {
        console.log(`YouTube Gemini Recommender: Processing ${newVideoLinks.length} new video links (${isInitialRequest ? 'initial' : 'scroll'} request)...`);
        const res = await fetch('http://localhost:3000/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                urls: newVideoLinks, 
                categories: categories,
                isInitialRequest: isInitialRequest,
                resetProcessedUrls: isInitialRequest && isInitialLoad
            })
        });
        if (!res.ok) {
            console.error('YouTube Gemini Recommender: Gemini backend error:', await res.text());
            return;
        }
        const data = await res.json();
        console.log('YouTube Gemini Recommender: Received recommendations:', data.recommendations);
        
        // Mark URLs as processed (client-side backup)
        newVideoLinks.forEach(url => processedUrls.add(url));
        
        // Inject tooltips for new recommendations
        injectTooltips(data.recommendations || {});
    } catch (err) {
        console.error('YouTube Gemini Recommender: Error contacting Gemini backend:', err);
    }
}
  
  // Initial processing
  setTimeout(() => processVideos(true), 5000);
  window.addEventListener('DOMContentLoaded', () => setTimeout(() => processVideos(true), 5000));
  
  // Scroll detection with debouncing
  let scrollTimeout;
  let isProcessing = false;
  
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(async () => {
      if (isProcessing) return;
      isProcessing = true;
      
      try {
        await processVideos(false); // false = scroll request
      } finally {
        isProcessing = false;
      }
    }, 1000); // Wait 1 second after scrolling stops
  });
}

// Listen for restart message from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'restart-recommendations') {
    processedUrls.clear(); // Reset processed URLs
    isInitialLoad = true; // Reset initial load flag
    setTimeout(() => processVideos(true), 5000); // Wait for YouTube to update if needed
  }
});