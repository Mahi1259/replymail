const DEFAULTS = {
  backendUrl: "http://localhost:8080",
  tone: "Professional",
};

const backendUrlInput = document.getElementById("backendUrl");
const toneSelect = document.getElementById("tone");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  setTimeout(() => {
    statusEl.textContent = "";
    statusEl.className = "status";
  }, 2500);
}

function loadSettings() {
  chrome.storage.sync.get(DEFAULTS, (items) => {
    backendUrlInput.value = items.backendUrl;
    toneSelect.value = items.tone;
  });
}

function saveSettings() {
  let url = backendUrlInput.value.trim();
  if (!url) url = DEFAULTS.backendUrl;

  try {
    new URL(url);
  } catch (e) {
    showStatus("Invalid URL. Include http:// or https://", "error");
    return;
  }

  const tone = toneSelect.value || DEFAULTS.tone;

  chrome.storage.sync.set({ backendUrl: url, tone }, () => {
    if (chrome.runtime.lastError) {
      showStatus("Failed to save settings.", "error");
    } else {
      showStatus("Settings saved.", "success");
    }
  });
}

saveBtn.addEventListener("click", saveSettings);
document.addEventListener("DOMContentLoaded", loadSettings);
