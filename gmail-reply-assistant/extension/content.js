(() => {
  const BUTTON_CLASS = "rm-reply-btn";
  const BUTTON_LABEL = "Quick Reply";
  const DEFAULT_BACKEND_URL = "http://localhost:8080";
  const DEFAULT_TONE = "Professional";

  function getSettings() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(
          { backendUrl: DEFAULT_BACKEND_URL, tone: DEFAULT_TONE },
          (items) => resolve(items)
        );
      } catch (e) {
        resolve({ backendUrl: DEFAULT_BACKEND_URL, tone: DEFAULT_TONE });
      }
    });
  }

  function showToast(message, type = "info") {
    const existing = document.querySelector(".rm-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = `rm-toast rm-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("rm-toast-fadeout");
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  function findOpenEmailContainer() {
    const items = document.querySelectorAll('div[role="main"] div[role="listitem"]');
    if (items.length === 0) return null;
    return items[items.length - 1];
  }

  function extractEmailContent(container) {
    if (!container) return { subject: "", body: "" };

    let subject = "";
    const subjectEl = document.querySelector('h2[data-thread-perm-id], h2.hP');
    if (subjectEl) subject = subjectEl.innerText.trim();

    let body = "";
    const bodyEl = container.querySelector('div.a3s, div.ii.gt');
    body = (bodyEl ? bodyEl.innerText : container.innerText).trim();

    if (body.length > 8000) body = body.slice(0, 8000);

    return { subject, body };
  }

  function findReplyToolbar() {
    const toolbars = document.querySelectorAll('div[role="main"] td.acX, div[role="main"] div.amn');
    if (toolbars.length > 0) return toolbars[toolbars.length - 1];

    const replyButtons = document.querySelectorAll('div[role="main"] span.ams');
    if (replyButtons.length > 0) {
      const btn = replyButtons[replyButtons.length - 1];
      return btn.closest("div") || btn.parentElement;
    }
    return null;
  }

  function createReplyButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = BUTTON_CLASS;
    btn.innerHTML = renderLabel(BUTTON_LABEL);
    return btn;
  }

  function renderLabel(text) {
    return `<span class="rm-reply-label">${text}</span>`;
  }

  function setLoading(btn, loading) {
    if (loading) {
      btn.disabled = true;
      btn.classList.add("rm-loading");
      btn.innerHTML = `<span class="rm-spinner"></span><span class="rm-reply-label">Generating...</span>`;
    } else {
      btn.disabled = false;
      btn.classList.remove("rm-loading");
      btn.innerHTML = renderLabel(BUTTON_LABEL);
    }
  }

  function findOpenComposeBox() {
    return document.querySelector(
      'div[aria-label="Message Body"][contenteditable="true"], ' +
      'div[g_editable="true"][contenteditable="true"]'
    );
  }

  function clickGmailReply() {
    if (findOpenComposeBox()) return true;

    const container = findOpenEmailContainer() || document;

    const selectors = [
      'span.ams.bkH',
      'span.ams.bkI',
      'span.ams',
      'div[role="button"][aria-label="Reply"]',
      'div[role="button"][data-tooltip="Reply"]',
      'span[role="link"][aria-label*="Reply" i]:not([aria-label*="all" i])',
      '[role="button"][aria-label^="Reply"]:not([aria-label*="all" i])',
    ];

    for (const sel of selectors) {
      const el = container.querySelector(sel) || document.querySelector(sel);
      if (el) {
        el.click();
        return true;
      }
    }

    const candidates = document.querySelectorAll('[role="button"], [role="link"]');
    for (const c of candidates) {
      const label = (c.getAttribute("aria-label") || c.getAttribute("data-tooltip") || c.textContent || "")
        .trim()
        .toLowerCase();
      if (label === "reply" || label.startsWith("reply ")) {
        c.click();
        return true;
      }
    }

    return false;
  }

  function injectReplyText(text) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 25;

      const tryInject = () => {
        attempts++;
        const composeBox = findOpenComposeBox();

        if (composeBox) {
          composeBox.focus();
          composeBox.innerHTML = "";

          for (const line of text.split("\n")) {
            const div = document.createElement("div");
            div.textContent = line || "​";
            composeBox.appendChild(div);
          }

          composeBox.dispatchEvent(new Event("input", { bubbles: true }));
          resolve(true);
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(tryInject, 200);
        } else {
          reject(new Error("Compose box did not open in time"));
        }
      };

      tryInject();
    });
  }

  async function callBackend(backendUrl, payload) {
    const url = backendUrl.replace(/\/$/, "") + "/api/generate-reply";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Backend error ${res.status}: ${errText || res.statusText}`);
      }

      const data = await res.json();
      if (!data || !data.reply) throw new Error("Backend returned empty reply");
      return data.reply;
    } finally {
      clearTimeout(timer);
    }
  }

  async function handleClick(btn) {
    try {
      const settings = await getSettings();
      const container = findOpenEmailContainer();
      const { subject, body } = extractEmailContent(container);

      if (!subject && !body) {
        showToast("Could not read email content. Open an email first.", "error");
        return;
      }

      setLoading(btn, true);

      let reply;
      try {
        reply = await callBackend(settings.backendUrl, { subject, body, tone: settings.tone });
      } catch (err) {
        showToast(
          err.name === "AbortError"
            ? "Request timed out. Is the backend running?"
            : `Backend error: ${err.message}`,
          "error"
        );
        return;
      }

      if (!clickGmailReply()) {
        showToast("Could not open Gmail reply box.", "error");
        return;
      }

      try {
        await injectReplyText(reply);
        showToast("Reply inserted.", "success");
      } catch (err) {
        showToast("Could not insert reply into compose box.", "error");
      }
    } finally {
      setLoading(btn, false);
    }
  }

  function injectButtonIfNeeded() {
    const toolbar = findReplyToolbar();
    if (!toolbar) return;
    if (toolbar.querySelector("." + BUTTON_CLASS)) return;

    const btn = createReplyButton();
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleClick(btn);
    });

    toolbar.appendChild(btn);
  }

  const observer = new MutationObserver(() => {
    try { injectButtonIfNeeded(); } catch (e) {}
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(injectButtonIfNeeded, 2000);
  injectButtonIfNeeded();
})();
