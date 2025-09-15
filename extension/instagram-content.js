// Instagram-specific content script
// Run on Instagram explore page to scrape post and reel links
const isExplorePage = window.location.pathname === '/explore/';

if (isExplorePage) {
  console.log("Mediamammal: Instagram handler loaded - running on explore page");
  
  // Server configuration - inherited from main content.js
  const SERVER_URL = window.MEDIAMAMMAL_SERVER_URL;
  
  // Check if this is a fresh page load (not navigation within the site)
  const isFreshPageLoad = performance.navigation.type === 1 || // TYPE_RELOAD
                          performance.getEntriesByType('navigation')[0]?.type === 'reload';
  
  if (isFreshPageLoad) {
    console.log('Mediamammal: Fresh page load detected');
  }
  
  // Scrape Instagram links from the explore page
  function getInstagramLinks() {
    console.log('Mediamammal: Starting Instagram link detection...');
    
    // Try multiple selectors for Instagram's dynamic content
    const selectors = [
      'a[href*="/p/"]',           // Posts with any href containing /p/
      'a[href*="/reel/"]',        // Reels with any href containing /reel/
      '[role="link"][href*="/p/"]', // Posts with role="link"
      '[role="link"][href*="/reel/"]', // Reels with role="link"
      'a[data-testid*="post"]',   // Posts with data-testid
      'a[data-testid*="reel"]'    // Reels with data-testid
    ];
    
    let allLinks = [];
    
    selectors.forEach(selector => {
      const links = Array.from(document.querySelectorAll(selector));
      console.log(`Mediamammal: Found ${links.length} links with selector: ${selector}`);
      allLinks = [...allLinks, ...links];
    });
    
    // Remove duplicates based on href
    const uniqueLinks = [];
    const seenHrefs = new Set();
    
    allLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && !seenHrefs.has(href)) {
        seenHrefs.add(href);
        uniqueLinks.push(link);
      }
    });
    
    console.log('Mediamammal: Total unique links found:', uniqueLinks.length);
    
    // Process and filter links
    const instagramLinks = uniqueLinks
      .map(link => {
        const href = link.getAttribute('href');
        if (href) {
          // Handle relative and absolute URLs
          if (href.startsWith('http')) {
            return href;
          } else if (href.startsWith('/')) {
            return 'https://www.instagram.com' + href;
          } else if (href.includes('/p/') || href.includes('/reel/')) {
            return 'https://www.instagram.com/' + href;
          }
        }
        return null;
      })
      .filter(href => href && (href.includes('/p/') || href.includes('/reel/')));
    
    const finalLinks = instagramLinks.slice(0, 100); // Limit to first 100
    console.log('Mediamammal: Final processed Instagram links:', finalLinks);
    console.log('Mediamammal: Sample links:', finalLinks.slice(0, 5));
    
    return finalLinks;
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
      
      // Get the URL from the href attribute
      const href = link.getAttribute('href');
      if (!href) return;
      
      const fullUrl = href.startsWith('http') ? href : 'https://www.instagram.com' + href;
      
      if (recommendations[fullUrl]) {
        // Add visual indicator
        link.style.borderBottom = '2px dotted #007bff';
        
        // Add event listeners for tooltip
        link.addEventListener('mouseenter', (e) => {
          tooltip.textContent = `Agent: ${recommendations[fullUrl]}`;
          tooltip.style.display = 'block';
        });
        
        link.addEventListener('mousemove', (e) => {
          tooltip.style.left = e.clientX + 10 + 'px';
          tooltip.style.top = e.clientY + 10 + 'px';
        });
        
        link.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });
        
        // Mark as processed
        link.dataset.geminiTooltip = 'true';
      }
    }
  
    // Apply tooltips to all Instagram links using the same detection logic
    const allLinks = getInstagramLinks();
    console.log('Mediamammal: Applying tooltips to', allLinks.length, 'Instagram links');
    
    // Get all current DOM elements that match our selectors
    const selectors = [
      'a[href*="/p/"]',
      'a[href*="/reel/"]',
      '[role="link"][href*="/p/"]',
      '[role="link"][href*="/reel/"]'
    ];
    
    let allDomElements = [];
    selectors.forEach(selector => {
      const elements = Array.from(document.querySelectorAll(selector));
      allDomElements = [...allDomElements, ...elements];
    });
    
    console.log('Mediamammal: Found', allDomElements.length, 'DOM elements to process');
    
    // Remove duplicates and apply tooltips
    const processedElements = new Set();
    let tooltipCount = 0;
    
    allDomElements.forEach(element => {
      const href = element.getAttribute('href');
      if (href && !processedElements.has(href)) {
        processedElements.add(href);
        
        // Check if this element has a recommendation
        const fullUrl = href.startsWith('http') ? href : 'https://www.instagram.com' + href;
        if (recommendations[fullUrl]) {
          addTooltip(element);
          tooltipCount++;
        }
      }
    });
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
    console.log('Mediamammal: Reset for new page load - processedUrls cleared, isInitialLoad reset to true');
  }
  
  // Main logic: scrape, send, inject
  async function processInstagramContent(isInitialRequest = true) {
    const instagramLinks = getInstagramLinks();
    if (instagramLinks.length === 0) {
      console.log('Mediamammal: No Instagram links found on the page.');
      return;
    }
  
    // Reset processed URLs on initial load or page change
    if (isInitialLoad) {
      processedUrls.clear();
      isInitialLoad = false;
    }

    // Filter out already processed URLs (client-side backup)
    const newInstagramLinks = instagramLinks.filter(url => !processedUrls.has(url));
    if (newInstagramLinks.length === 0) {
      console.log('Mediamammal: No new Instagram links to process.');
      return;
    }

    // Get categories from local storage (only on initial request)
    if (isInitialRequest) {
      try {
        const result = await chrome.storage.local.get(['mediamammal_categories']);
        categories = result.mediamammal_categories || [];
        console.log('Mediamammal: Loaded categories from local storage:', categories);
      } catch (err) {
        console.error('Mediamammal: Error loading categories:', err);
      }
    
      if (categories.length === 0) {
        console.log('Mediamammal: No categories found. Please set categories in the extension popup.');
        return;
      }
    }
  
    try {
      console.log(`Mediamammal: Processing ${newInstagramLinks.length} new Instagram links (${isInitialRequest ? 'initial' : 'scroll'} request)...`);
      
      // Determine if we should reset server processed URLs
      // Reset if this is the first initial request for this page load
      const shouldResetServer = isInitialRequest && !hasResetForThisPage;
      
      if (shouldResetServer) {
        console.log('Mediamammal: Will request server to reset processed URLs');
      }
      
      const res = await fetch(`${SERVER_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          urls: newInstagramLinks, 
          categories: categories,
          isInitialRequest: isInitialRequest,
          resetProcessedUrls: shouldResetServer
        })
      });
      
      if (shouldResetServer) {
        hasResetForThisPage = true;
        console.log('Mediamammal: Requested server to reset processed URLs');
      }
      
      if (!res.ok) {
        console.error('Mediamammal: Gemini backend error:', await res.text());
        return;
      }
      const data = await res.json();
      console.log('Mediamammal: Received recommendations:', data.recommendations);
      
      // Mark URLs as processed (client-side backup)
      newInstagramLinks.forEach(url => processedUrls.add(url));
      
      // Inject tooltips for new recommendations
      injectTooltips(data.recommendations || {});
    } catch (err) {
      console.error('Mediamammal: Error contacting Gemini backend:', err);
    }
  }
  
  // Reset on page load and initial processing
  if (isFreshPageLoad) {
    resetForNewPage();
  }
  
  // Wait longer for Instagram to fully load its dynamic content
  setTimeout(() => processInstagramContent(true), 8000);
  
  window.addEventListener('DOMContentLoaded', () => {
    if (isFreshPageLoad) {
      resetForNewPage();
    }
    setTimeout(() => processInstagramContent(true), 8000);
  });
  
  // Also try after a longer delay to catch late-loading content
  setTimeout(() => processInstagramContent(true), 15000);
  
  // Detect actual page reloads
  window.addEventListener('beforeunload', () => {
    // This will trigger when the page is about to reload
    console.log('Mediamammal: Page reload detected');
  });
  
  // Also reset on page visibility change (for when user comes back to tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      resetForNewPage();
      setTimeout(() => processInstagramContent(true), 2000);
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
        await processInstagramContent(false); // false = scroll request
      } finally {
        isProcessing = false;
      }
    }, 1000); // Wait 1 second after scrolling stops
  });

  // Listen for restart message from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'restart-recommendations') {
      resetForNewPage();
      setTimeout(() => processInstagramContent(true), 5000); // Wait for Instagram to update if needed
    }
  });
  
  // Watch for new content being added to the page
  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if new Instagram content was added
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.querySelector && (
              node.querySelector('a[href*="/p/"]') || 
              node.querySelector('a[href*="/reel/"]') ||
              node.querySelector('[role="link"][href*="/p/"]') ||
              node.querySelector('[role="link"][href*="/reel/"]')
            )) {
              shouldProcess = true;
            }
          }
        });
      }
    });
    
    if (shouldProcess) {
      console.log('Mediamammal: New Instagram content detected, processing...');
      setTimeout(() => processInstagramContent(false), 2000);
    }
  });
  
  // Start observing the document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
