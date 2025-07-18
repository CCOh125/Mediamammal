import express from 'express';
import 'dotenv/config';
import readline from 'readline';
import cors from 'cors';
import fs from 'fs';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY;
const CATEGORY_FILE = 'categories.json';

// Function to load categories from file
function loadCategoriesFromFile() {
  try {
    if (fs.existsSync(CATEGORY_FILE)) {
      const data = fs.readFileSync(CATEGORY_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading categories from file:', err);
  }
  return [];
}

// Function to save categories to file
function saveCategoriesToFile(categories) {
  try {
    fs.writeFileSync(CATEGORY_FILE, JSON.stringify(categories, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving categories to file:', err);
  }
}

// Function to collect user categories
async function collectCategories() {
  let categories = loadCategoriesFromFile();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Print existing categories
  console.log('Current categories:', categories.length ? categories.join(', ') : '(none)');
  console.log('Enter your categories. To remove a category, type -<name> (e.g., -Basketball).');
  console.log('Ex. Do you play any competitive sports? Hobbies? Issues you are interested in?');
  console.log('Type "done" when you\'re finished.\n');

  while (true) {
    const category = await new Promise((resolve) => {
      rl.question(`Category ${categories.length + 1}: `, resolve);
    });

    if (category.toLowerCase() === 'done') {
      break;
    }

    if (category.trim().startsWith('-')) {
      // Remove category
      const toRemove = category.trim().slice(1).trim();
      const idx = categories.findIndex(c => c.toLowerCase() === toRemove.toLowerCase());
      if (idx !== -1) {
        categories.splice(idx, 1);
        console.log(`Removed category: ${toRemove}`);
      } else {
        console.log(`Category not found: ${toRemove}`);
      }
    } else if (category.trim()) {
      // Add category if not duplicate
      if (!categories.some(c => c.toLowerCase() === category.trim().toLowerCase())) {
        categories.push(category.trim());
        console.log(`Added category: ${category.trim()}`);
      } else {
        console.log(`Category already exists: ${category.trim()}`);
      }
    }
  }

  rl.close();
  saveCategoriesToFile(categories);
  return categories;
}

async function callGeminiWithUrls(urls, categories) {
  const prompt = `Your job is to act as an agent that recommends content to users. This way users can use social media as an aid for their personal development. 
The user has provided some categories, which refers to their goals. Your objective is to recommend content that relates to the categories.
Categories might be the subject they are studying or it might be an activity they are passionate about. For example a computer science major will say a goal of Computer Science and a competitive basketball player will say a goal is basketball. 
When analyzing if a content relates to a goal you need to be careful. Only recommend content that can teach information to the user. Don’t recommend content that's just designed to entertain users. For example with the example of basketball there might be content such as fun basketball challenges with a social media influencer. However this would not relate to the category, because it doesn’t teach the user anything about basketball.
Another content might be focused on a NBA player getting into an argument with a fan or trying some new trends. This also does not relate to the category because its goal is to just provoke an emotional response in the user and grab users attentions.
Some content to recommend would be another basketball player showcasing some basketball drills. Don’t recommend content if it doesn’t relate to any of the categories. I'm not telling you to recommend and not recommend these content only, you just have to use this kind of thinking for all contents.
What you don't want to do is to recommed content that is fun for the user to watch in the moment, but it doesn’t help them in their goals long term.
Categories: ${categories.join(', ')}

Evaluating youtube videos:
When evaluating youtube videos make sure to evaluate each link individually with the criteria
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

function getVideoLinks() {
  const links = Array.from(document.querySelectorAll('a#video-title, ytd-thumbnail a[href^="/watch"]'))
    .map(link => link.href.startsWith('http') ? link.href : 'https://www.youtube.com' + link.getAttribute('href'))
    .filter(href => href && href.startsWith('https://www.youtube.com/watch'));
  const uniqueLinks = Array.from(new Set(links));
  console.log('YouTube Gemini Recommender: Retrieved video links:', uniqueLinks);
  return uniqueLinks;
}

const app = express();
app.use(express.json());
app.use(cors());

let userCategories = [];

// Endpoint to get recommendations
app.post('/recommend', async (req, res) => {
  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'No URLs provided.' });
    }
    if (!userCategories.length) {
      return res.status(400).json({ error: 'No categories set on server.' });
    }
    const geminiResponse = await callGeminiWithUrls(urls, userCategories);
    const geminiResponseText = geminiResponse.candidates[0].content.parts[0].text;
    const recommendations = parseGeminiResponse(geminiResponseText);
    res.json({ recommendations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

(async () => {
  userCategories = await collectCategories();
  const PORT = 3000;
  app.listen(PORT, 'localhost', () => {
    console.log(`Gemini recommendation backend running on http://localhost:${PORT}`);
    console.log('Ready to receive POST requests to /recommend');
  });
})(); 