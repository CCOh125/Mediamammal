import { extractVideoLinks } from './agent.js';
import 'dotenv/config';
import puppeteer from 'puppeteer';
import readline from 'readline';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY;

// Function to collect user categories
async function collectCategories() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const categories = [];
  
  console.log('Enter your categories');
  console.log('Ex. Do you play any competitive sports? Hobbies? Issues you are interested in?');
  console.log('Type "done" when you\'re finished adding categories.\n');

  while (true) {
    const category = await new Promise((resolve) => {
      rl.question(`Category ${categories.length + 1}: `, resolve);
    });

    if (category.toLowerCase() === 'done') {
      break;
    }

    if (category.trim()) {
      categories.push(category.trim());
    }
  }

  rl.close();
  return categories;
}

async function callGeminiWithUrls(urls, categories) {
  const prompt = `The user has provided categories, which refers to their goals and interests. Your objective is to recommend content that relates to the categories. This way users can continue their personal development when using social media instead of potentially hindering it. Given the video links evaluate each video link individually. 
When evaluating: \
- Don’t just recommend content because it's popular and entertaining, put more emphasis on content that will educate the user in their categories. 
- Don’t recommend content that doesn’t relate to their categories
- Make sure to evaluate each link individually with the criteria
- Return the video link with “recommend” or “not recommend”.
Categories: ${categories.join(', ')}

IMPORTANT: For each video link, respond with exactly this format and nothing else:
<url> recommend
<url> not recommend

Do not include any explanations, categories, or extra text. Only output the list in the format above.
Video links to evaluate:
`;
  const content = `${prompt}\n${urls.join('\n')}`;

  const body = {
    contents: [
      { parts: [{ text: content }] }
    ]
  };

  console.log('Request body:', JSON.stringify(body, null, 2));

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error details:', errorText);
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

function parseGeminiResponse(responseText) {
  console.log('Raw Gemini response:', responseText);
  
  const lines = responseText.split('\n').map(line => line.trim()).filter(Boolean);
  const map = {};
  
  for (const line of lines) {
    let url, recommendation;
    // Split on the first space to separate URL from recommendation
    const firstSpaceIndex = line.indexOf(' ');
    if (firstSpaceIndex !== -1) {
      url = line.substring(0, firstSpaceIndex).trim();
      recommendation = line.substring(firstSpaceIndex + 1).trim();
    }
    if (url && recommendation && (recommendation === 'recommend' || recommendation === 'not recommend')) {
      url = url.replace(/^\[|\]$/g, ''); // Remove brackets if present
      map[url] = recommendation;
      console.log(`Parsed: ${url} -> ${recommendation}`);
    }
  }
  
  console.log('Final recommendations map:', map);
  console.log('Number of recommendations:', Object.keys(map).length);
  return map;
}

(async () => {
  // Collect user categories interactively before opening browser
  const categories = await collectCategories();
  
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Use the same page for scraping and tooltip injection
  const urls = await extractVideoLinks(page);
  console.log("loading please wait...");
  const geminiResponse = await callGeminiWithUrls(urls, categories);
  console.log(
    geminiResponse.candidates[0].content.parts[0].text
    
  );
  var geminiResponseText = geminiResponse.candidates[0].content.parts[0].text
  const recommendations = parseGeminiResponse(geminiResponseText);

  // Inject recommendations and real-time tooltip logic
  await page.evaluate((recommendations) => {
    // Create a tooltip element
    let tooltip = document.createElement('div');
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

    function addTooltip(link) {
      if (link.dataset.geminiTooltip) return; // Already processed
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
        link.dataset.geminiTooltip = 'true'; // geminiTooltip is to signify whether data already has event listener
      }
    }

    // Debounce function to limit how often we process DOM changes
    function debounce(fn, delay) {
      let timer = null;
      return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    }

    // Initial pass
    document.querySelectorAll('a#video-title').forEach(addTooltip);

    // Observe for new video links (real-time updates)
    const observer = new MutationObserver(
      debounce(() => {
        document.querySelectorAll('a#video-title').forEach(addTooltip);
      }, 300) // Only run every 300ms at most
    );

    observer.observe(document.body, { childList: true, subtree: true });
  }, recommendations);
})();
