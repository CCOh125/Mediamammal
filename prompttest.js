import 'dotenv/config';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY;

async function callGeminiWithUrls(urls, categories) {
    const prompt = `The user has provided categories, which refers to their goals and interests. Your objective is to recommend content that relates to the categories. This way users can continue their personal development when using social media instead of potentially hindering it. Given the video links evaluate each video link individually. 
    When evaluating: 
    - Don’t just recommend content because it's popular and entertaining, put more emphasis on content that will educate the user in their categories. 
    - Don’t recommend content that doesn’t relate to their categories
    - Make sure to evaluate each link individually with the criteria
    - Return the video link with "recommend" or "not recommend".
    Categories: Competitive Basketball, Meditation, Asian Culture

    IMPORTANT: For each video link, respond with exactly this format and nothing else:
    <url> recommend
    <url> not recommend

    Do not include any explanations, categories, or extra text. Only output the list in the format above.
    Video links to evaluate:
    }`

    const content = `${prompt}\n${urls.join('\n')}`;

    const body = {
        contents: [
            { parts: [{ text: content }] }
        ]
    };

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