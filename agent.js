import puppeteer from 'puppeteer';
//const puppeteer = require('puppeteer');

async function extractVideoLinks() {
  const browser = await puppeteer.launch({ headless: false }); // visible browser for realism
  const page = await browser.newPage();

  // Go to YouTube
  await page.goto('https://www.youtube.com', { waitUntil: 'networkidle2' });

  // Wait for videos to load
  await page.waitForSelector('a#video-title');

  // Scroll a little to load more videos
  //await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await new Promise(resolve => setTimeout(resolve, 20000));

  // Extract titles and URLs
  const videos = await page.$$eval('a#video-title', links =>
    links.map(link => ({
      title: link.textContent.trim(),
      url: link.href
    }))
  );

  // Return only the URLs
  return videos.slice(0, 3).map(video => video.url);

  //await browser.close();
}

//extractVideoLinks().then(urls => {
//  console.log(urls);
//});

export { extractVideoLinks };