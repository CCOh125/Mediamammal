// Use chrome.storage.local for persistence in the extension
const STORAGE_KEY = 'mediamammal_categories';

function saveCategories(categories) {
  chrome.storage.local.set({ [STORAGE_KEY]: categories });
}

function loadCategories(callback) {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    callback(result[STORAGE_KEY] || []);
  });
}

function renderCategories(categories) {
  const list = document.getElementById('categories-list');
  list.innerHTML = '';
  categories.forEach((cat, idx) => {
    const box = document.createElement('div');
    box.className = 'category-box';
    box.textContent = `[${cat}]`;
    box.title = 'Click to remove';
    box.onclick = () => {
      categories.splice(idx, 1);
      saveCategories(categories);
      renderCategories(categories);
    };
    list.appendChild(box);
  });
}

function sendCategoriesToBackend(categories) {
  fetch('http://localhost:3000/set-categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categories })
  }).then(res => res.json()).then(data => {
    console.log('Categories sent to backend:', data);
  }).catch(err => {
    console.error('Error sending categories to backend:', err);
  });
}

function notifyBackgroundToRestart() {
  chrome.runtime.sendMessage({ action: 'restart-recommendations' });
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('category-input');
  loadCategories((categories) => {
    renderCategories(categories);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const value = input.value.trim();
        if (!value) return;
        // Remove if starts with '-'
        if (value.startsWith('-')) {
          const toRemove = value.slice(1).trim().toLowerCase();
          const idx = categories.findIndex(c => c.toLowerCase() === toRemove);
          if (idx !== -1) {
            categories.splice(idx, 1);
            saveCategories(categories);
            renderCategories(categories);
          }
        } else if (!categories.some(c => c.toLowerCase() === value.toLowerCase())) {
          categories.push(value);
          saveCategories(categories);
          renderCategories(categories);
        }
        input.value = '';
      }
    });

    // On popup close, send categories to backend and notify background
    window.addEventListener('unload', () => {
      saveCategories(categories);
      sendCategoriesToBackend(categories);
      notifyBackgroundToRestart();
    });
  });
});
