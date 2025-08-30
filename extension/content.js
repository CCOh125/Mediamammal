// Run on YouTube homepage, trending page, and video pages (but not shorts)
const isHomePage = window.location.pathname === '/' || window.location.pathname === '/feed/trending';
const isVideoPage = window.location.pathname.startsWith('/watch');
const isShortsPage = window.location.pathname.startsWith('/shorts');

if ((isHomePage || isVideoPage) && !isShortsPage) {
  console.log("YouTube Gemini Recommender: Running on YouTube page")
  
  // Configuration - uncomment the line you want to use
  const SERVER_URL = 'http://localhost:3000'; // For local testing
  //const SERVER_URL = 'https://mediamammaltest.uc.r.appspot.com'; // For production server
  
  // Check if this is a fresh page load (not navigation within the site)
  const isFreshPageLoad = performance.navigation.type === 1 || // TYPE_RELOAD
                          performance.getEntriesByType('navigation')[0]?.type === 'reload';
  
  if (isFreshPageLoad) {
    console.log('YouTube Gemini Recommender: Fresh page load detected');
  }
  
  // Scrape video links from the page

function getVideoLinks() {
      // On video pages, focus on recommended videos in the sidebar
      // On homepage/trending, get all video links
      let links;
      if (window.location.pathname.startsWith('/watch')) {
        // For video pages, only get links from the recommended videos section
        const recommendedSection = document.querySelector('#secondary #related');
        if (recommendedSection) {
          links = Array.from(recommendedSection.querySelectorAll('a[href^="/watch"]'));
        } else {
          // Fallback: get all video links but exclude comment section
          const allLinks = Array.from(document.querySelectorAll('a[href^="/watch"]'));
          const commentSection = document.querySelector('#comments');
          if (commentSection) {
            links = allLinks.filter(link => !commentSection.contains(link));
          } else {
            links = allLinks;
          }
        }
      } else {
        // For homepage/trending, get all video links
        links = Array.from(document.querySelectorAll('a[href^="/watch"]'));
      }
      
      const videoLinks = links
        .map(link => link.href.startsWith('http') ? link.href : 'https://www.youtube.com' + link.getAttribute('href'))
      .filter(href => href && href.startsWith('https://www.youtube.com/watch'));
      const uniqueLinks = Array.from(new Set(videoLinks)).slice(0, 100); // Limit to first 100
      console.log('YouTube Gemini Recommender: Retrieved video links:', uniqueLinks);
      return uniqueLinks;
}
  


// Detect current theme (light/dark mode)
function detectTheme() {
  // Check for YouTube's dark mode class
  const isDarkMode = document.documentElement.classList.contains('dark') || 
                     document.body.classList.contains('dark') ||
                     document.querySelector('html[dark]') !== null;
  return isDarkMode ? 'dark' : 'light';
}

// Replace thumbnails for non-recommended videos
function replaceThumbnails(recommendations) {
  console.log('YouTube Gemini Recommender: replaceThumbnails called with recommendations:', recommendations);
  
  // Don't replace thumbnails if no recommendations are available
  if (!recommendations || Object.keys(recommendations).length === 0) {
    console.log('YouTube Gemini Recommender: No recommendations available, skipping thumbnail replacement');
    return;
  }
  
  const theme = detectTheme();
  const whaleImage = theme === 'dark' ? 'whalethumb2.png' : 'whalethumb1.png';
  console.log(`YouTube Gemini Recommender: Using whale image for ${theme} theme: ${whaleImage}`);
  
  // Get all video links on the page
  let videoLinks;
  if (window.location.pathname.startsWith('/watch')) {
    // For video pages, only process recommended videos in the sidebar
    const recommendedSection = document.querySelector('#secondary #related');
    if (recommendedSection) {
      videoLinks = Array.from(recommendedSection.querySelectorAll('a[href^="/watch"]'));
    } else {
      // Fallback: get all video links but exclude comment section
      const allLinks = Array.from(document.querySelectorAll('a[href^="/watch"]'));
      const commentSection = document.querySelector('#comments');
      if (commentSection) {
        videoLinks = allLinks.filter(link => !commentSection.contains(link));
      } else {
        videoLinks = allLinks;
      }
    }
  } else {
    // For homepage/trending, process all video links
    videoLinks = Array.from(document.querySelectorAll('a[href^="/watch"]'));
  }
  
  console.log('YouTube Gemini Recommender: Found video links:', videoLinks.length);
  
  videoLinks.forEach(link => {
    const url = link.href;
    const recommendation = recommendations[url];
    
    console.log(`YouTube Gemini Recommender: Checking video ${url} - recommendation: ${recommendation}`);
    
    // Find the thumbnail within this video link
    const thumbnail = link.querySelector('img[src*="i.ytimg.com"]');
    if (thumbnail) {
      if (recommendation === 'not recommend') {
        // Replace thumbnail with whale image for non-recommended videos
        const extensionUrl = chrome.runtime.getURL(whaleImage);
        thumbnail.src = extensionUrl;
        thumbnail.style.objectFit = 'cover';
        console.log(`YouTube Gemini Recommender: Replaced thumbnail for non-recommended video: ${url} with ${whaleImage}`);
      }
    }
  });
}

// Inject tooltips based on recommendations
function injectTooltips(recommendations) {
    // Also replace thumbnails when injecting tooltips to ensure consistency
    replaceThumbnails(recommendations);
    
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
  
      // Apply the same selective logic for tooltip injection
      let linksToProcess;
      if (window.location.pathname.startsWith('/watch')) {
        // For video pages, only process recommended videos in the sidebar
        const recommendedSection = document.querySelector('#secondary #related');
        if (recommendedSection) {
          linksToProcess = Array.from(recommendedSection.querySelectorAll('a[href^="/watch"]'));
        } else {
          // Fallback: get all video links but exclude comment section
          const allLinks = Array.from(document.querySelectorAll('a[href^="/watch"]'));
          const commentSection = document.querySelector('#comments');
          if (commentSection) {
            linksToProcess = allLinks.filter(link => !commentSection.contains(link));
          } else {
            linksToProcess = allLinks;
          }
        }
      } else {
        // For homepage/trending, process all video links
        linksToProcess = document.querySelectorAll('a[href^="/watch"]');
      }
      
      linksToProcess.forEach(addTooltip);
      console.log('YouTube Gemini Recommender: Tooltips injected for recommended links.');
}
  
// Track processed URLs to avoid duplicates (client-side backup)
let processedUrls = new Set();
let categories = [];
let isInitialLoad = true;
let hasResetForThisPage = false;

// Reset function for page reloads
function resetForNewPage() {
    processedUrls.clear();
    isInitialLoad = true;
    hasResetForThisPage = false;
    console.log('YouTube Gemini Recommender: Reset for new page load - processedUrls cleared, isInitialLoad reset to true');
}
  
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
        
        // Determine if we should reset server processed URLs
        // Reset if this is the first initial request for this page load
        const shouldResetServer = isInitialRequest && !hasResetForThisPage;
        
        if (shouldResetServer) {
            console.log('YouTube Gemini Recommender: Will request server to reset processed URLs');
        }
        
        const res = await fetch(`${SERVER_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                urls: newVideoLinks, 
                categories: categories,
                isInitialRequest: isInitialRequest,
                resetProcessedUrls: shouldResetServer
            })
      });
        
        if (shouldResetServer) {
            hasResetForThisPage = true;
            console.log('YouTube Gemini Recommender: Requested server to reset processed URLs');
        }
        
      if (!res.ok) {
          console.error('YouTube Gemini Recommender: Gemini backend error:', await res.text());
        return;
      }
      const data = await res.json();
        console.log('YouTube Gemini Recommender: Received recommendations:', data.recommendations);
        
        // Mark URLs as processed (client-side backup)
        newVideoLinks.forEach(url => processedUrls.add(url));
        

        
        // Inject tooltips for new recommendations (this also replaces thumbnails)
        injectTooltips(data.recommendations || {});
    } catch (err) {
        console.error('YouTube Gemini Recommender: Error contacting Gemini backend:', err);
    }
}
  
  // Reset on page load and initial processing
  if (isFreshPageLoad) {
    resetForNewPage();
  }
  setTimeout(() => processVideos(true), 5000);
  window.addEventListener('DOMContentLoaded', () => {
    if (isFreshPageLoad) {
      resetForNewPage();
    }
    setTimeout(() => processVideos(true), 5000);
  });
  
  // Detect actual page reloads
  window.addEventListener('beforeunload', () => {
    // This will trigger when the page is about to reload
    console.log('YouTube Gemini Recommender: Page reload detected');
  });
  
  // Also reset on page visibility change (for when user comes back to tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      resetForNewPage();
      setTimeout(() => processVideos(true), 2000);
    }
  });
  
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
    resetForNewPage();
    setTimeout(() => processVideos(true), 5000); // Wait for YouTube to update if needed
  }
});