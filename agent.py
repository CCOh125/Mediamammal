from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import time

def scrape_youtube_links():
    # Launch Chrome
    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")  # Visible browser
    #chrome_options.add_argument("--headless")       # Optional: headless mode

    driver = webdriver.Chrome(options=chrome_options)
    driver.get("https://www.youtube.com")

    # Wait for homepage to load
    time.sleep(5)

    # Grab video titles and links
    
    print("🎥 Found Video Links:\n")
    #while True:
    videos = driver.find_elements(By.CSS_SELECTOR, 'a#video-title')

    
    seen_urls = set()
    count = 1
    for video in videos:
        title = video.get_attribute("title") or video.text
        url = video.get_attribute("href")

        if url and url.startswith("https://www.youtube.com/watch") and url not in seen_urls:
            print(f"{count}. {title.strip()}")
            print(f"   🔗 {url}")
            seen_urls.add(url)
            count += 1

    #driver.quit()

if __name__ == "__main__":
    scrape_youtube_links()
    #input("Press Enter after you have closed the browser window...")