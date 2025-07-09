import { extractVideoLinks } from './agent.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY;

async function callGeminiWithUrls(urls) {
  const prompt = 'A problem social media users experience is that they feel that they have \
  wasted their time on social media. You are an agent responsible for enhancing a users \
  social media experience. The user has identified categories, which refers to their goals \
  and interests. Your objective is to recommend content that relates to the categories. \
  This way users can use social media to aid their self-improvement. Given the video links \
  evaluate each video link and determine whether you recommend it or not. Just return the \
  video link with “recommend” or “not recommend”. \
  Categories: User plays competitive basketball, interested in science and technology';
  const content = `${prompt}\n\n${urls.join('\n')}`;

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

(async () => {
  const urls = await extractVideoLinks();
  const geminiResponse = await callGeminiWithUrls(urls);
  console.log("loading please wait...");
  console.log(geminiResponse);
})();
