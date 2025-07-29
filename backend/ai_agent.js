import express from 'express';
import 'dotenv/config';
import cors from 'cors';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY;

async function callGeminiWithUrls(urls, categories) {
  const prompt = `Your job is to act as an agent that recommends content to users. This way users can use social media as an aid for their personal development. 
The user has provided some categories, which refers to their goals. Your objective is to recommend content that relates to the categories.
Categories might be the subject they are studying or it might be an activity they are passionate about. For example a computer science major will say a goal of Computer Science and a competitive basketball player will say a goal is basketball. 
When analyzing if a content relates to a goal you need to be careful. Some content might relate to the category, but it is just designed to grab attention. For example, by leveraging social media influencer's popularity or using a new trend. 
Another case is perhaps a content is just entertainment and just happens to have a title similar to the category. For example it could actually be about something else but it just has the name of the category.
Or maybe it is trying to provoke emotions such as rage and pleasure. Do not recommend those types of content because it doesn’t teach anything about the topic.
Even though they are fun to watch at the moment, it doesn’t teach them anything useful, so it doesn’t help them in their goals long term.
Instead, recommend content that relates to the category but teaches the user new information instead of trying to get views. One example would be content where an expert or professional in the field shares their experience and advice. 
Or content displaying information in novel ways such as through visualizations or in-depth analysis.

Categories: ${categories.join(', ')}

When evaluating youtube videos:
Make sure to evaluate each link individually with the criteria, there shouldn't be any correlation between whether you recommend one link and another.
Additionally don’t recommend content that doesn’t relate to the categories.
In particular, some content may have the appearance or a video title that makes it seem like it relates to the categories, but they don’t actually have anything to do with the category.
It's important to really evaluate the content core, to see if it really will educate the user on their category or not.

IMPORTANT: For each video link, respond with exactly this format and nothing else:
<url> recommend
<url> not recommend
Do not include any explanations, categories, or extra text. Only output the list in the format above.
Video links to evaluate:`;
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
    let errorMsg = `Gemini API error: ${response.status} ${response.statusText}`;
    // Try to parse the error message for rate limit info
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson && errorJson.error && errorJson.error.message) {
        errorMsg += `\nDetails: ${errorJson.error.message}`;
        // Optionally, check for specific rate limit keywords
        if (
          errorJson.error.message.toLowerCase().includes('rate limit') ||
          errorJson.error.message.toLowerCase().includes('quota') ||
          errorJson.error.message.toLowerCase().includes('exceeded')
        ) {
          errorMsg += '\nYou have reached the Gemini API rate limit (daily, hourly, or token quota). Please try again later or check your API usage in the Google Cloud Console.';
        }
      }
    } catch (e) {
      // If not JSON, just log the raw error text
      errorMsg += `\nRaw error: ${errorText}`;
    }
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data;
}

async function callGeminiWithUrlsShort(urls, categories) {
  const prompt = `Your job is to act as an agent that recommends content to users based on their categories.
Categories: ${categories.join(', ')}

When evaluating youtube videos:
Make sure to evaluate each link individually with the criteria, there shouldn't be any correlation between whether you recommend one link and another.
Additionally don't recommend content that doesn't relate to the categories.
In particular, some content may have the appearance or a video title that makes it seem like it relates to the categories, but they don't actually have anything to do with the category.
It's important to really evaluate the content core, to see if it really will educate the user on their category or not.

IMPORTANT: For each video link, respond with exactly this format and nothing else:
<url> recommend
<url> not recommend
Do not include any explanations, categories, or extra text. Only output the list in the format above.
Video links to evaluate:`;
  const content = `${prompt}\n${urls.join('\n')}`;

  const body = {
    contents: [
      { parts: [{ text: content }] }
    ]
  };

  console.log('Short request body:', JSON.stringify(body, null, 2));

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = `Gemini API error: ${response.status} ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson && errorJson.error && errorJson.error.message) {
        errorMsg += `\nDetails: ${errorJson.error.message}`;
        if (
          errorJson.error.message.toLowerCase().includes('rate limit') ||
          errorJson.error.message.toLowerCase().includes('quota') ||
          errorJson.error.message.toLowerCase().includes('exceeded')
        ) {
          errorMsg += '\nYou have reached the Gemini API rate limit. Please try again later.';
        }
      }
    } catch (e) {
      errorMsg += `\nRaw error: ${errorText}`;
    }
    console.error(errorMsg);
    throw new Error(errorMsg);
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
    const firstSpaceIndex = line.indexOf(' ');
    if (firstSpaceIndex !== -1) {
      url = line.substring(0, firstSpaceIndex).trim();
      recommendation = line.substring(firstSpaceIndex + 1).trim();
    }
    if (url && recommendation && (recommendation === 'recommend' || recommendation === 'not recommend')) {
      url = url.replace(/^\[|\]$/g, '');
      map[url] = recommendation;
    }
  }
  return map;
}

const app = express();
app.use(express.json());
app.use(cors());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Mediamammal backend is running',
    note: 'Categories are now stored locally in the extension'
  });
});

// Track processed URLs on the server side
let serverProcessedUrls = new Set();

// Endpoint to get recommendations
app.post('/recommend', async (req, res) => {
  try {
    const { urls, categories, isInitialRequest, resetProcessedUrls } = req.body;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'No URLs provided.' });
    }
    
    // Reset processed URLs if requested (for new page loads)
    if (resetProcessedUrls) {
      serverProcessedUrls.clear();
      console.log('Server: Reset processed URLs');
    }
    
    // Filter out already processed URLs on server side
    const newUrls = urls.filter(url => !serverProcessedUrls.has(url));
    
    if (newUrls.length === 0) {
      console.log('Server: All URLs already processed, returning empty recommendations');
      return res.json({ recommendations: {} });
    }
    
    // Mark URLs as processed before sending to Gemini
    newUrls.forEach(url => serverProcessedUrls.add(url));
    
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'No categories provided.' });
    }
    
    let geminiResponse;
    if (isInitialRequest) {
      // Full prompt for initial request (includes detailed instructions about content quality)
      geminiResponse = await callGeminiWithUrls(newUrls, categories);
    } else {
      // Short prompt for scroll requests (includes categories but less detailed instructions to save tokens)
      geminiResponse = await callGeminiWithUrlsShort(newUrls, categories);
    }
    
    const geminiResponseText = geminiResponse.candidates[0].content.parts[0].text;
    const recommendations = parseGeminiResponse(geminiResponseText);
    res.json({ recommendations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Categories are now stored locally in the extension

// Get the port from environment variable (for App Engine) or use 3000 for local development
const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`Mediamammal backend running on http://${HOST}:${PORT}`);
  console.log('Ready to receive POST requests to /recommend');
  console.log('Categories are now stored locally in the extension');
}); 