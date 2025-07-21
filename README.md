# Mediamammal
All code is created by me (CCOh125)

---

## 🚀 How to Run the Mediamammal Backend

### 1. **Install Node.js**

If you don’t already have Node.js installed:

- Go to [https://nodejs.org/](https://nodejs.org/)
- Download the **LTS** version for your operating system (Windows, macOS, or Linux)
- Run the installer and follow the instructions

To check if Node.js is installed, open a terminal and run:
```sh
node --version
```
You should see a version number (e.g., `v18.17.0`).

---

### 3. **Install Project Dependencies**

Open a terminal, navigate to the project folder, and run:
```sh
npm install
```
This will install any required packages (like `express`, `cors`, etc.).

---

## 🧩 How to Install and Use the Mediamammal Chrome Extension

### 1. **Open Chrome Extensions Page**
- Go to `chrome://extensions` in your Chrome browser.
- Enable **Developer mode** (toggle in the top right).

### 2. **Load the Unpacked Extension**
- Click **Load unpacked**.
- Select the folder containing your extension files (including `manifest.json`, `popup.html`, etc.).

---

## How to use the agent
### 1. **Start the backend server**
- In the terminal, from the project folder, run:
```sh
node ai_agent.js
```

---
### 2. **Open the Extension Window**
- Click the Mediamammal extension icon in the Chrome toolbar.
- The UI window will open.
- Add categories by typing, remove categories by clicking on them

---
### 3. **Browse YouTube**
- Go to the YouTube homepage in a tab.
- The extension will automatically show recommendations as tooltips on video links, based on your categories.
