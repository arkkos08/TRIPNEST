document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("tripnest_user") || "null");
  if (!user) {
    window.location.href = "/";
    return;
  }

  const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024;
  const EMOJIS = ["😀", "😁", "😂", "😊", "😍", "😎", "🤩", "🥳", "❤️", "🔥", "✈️", "🌍", "📍", "👍", "🙏"];

  const logoutBtn = document.getElementById("logoutBtn");
  const profileNavLink = document.getElementById("profileNavLink");
  const profileNavTitle = document.getElementById("profileNavTitle");
  const conversationMessage = document.getElementById("conversationMessage");
  const conversationSearchInput = document.getElementById("conversationSearchInput");
  const conversationThreadsList = document.getElementById("conversationThreadsList");
  const conversationEmptyState = document.getElementById("conversationEmptyState");
  const conversationPanel = document.getElementById("conversationPanel");
  const conversationPartnerUsername = document.getElementById("conversationPartnerUsername");
  const conversationClearBtn = document.getElementById("conversationClearBtn");
  const conversationMessagesList = document.getElementById("conversationMessagesList");
  const conversationForm = document.getElementById("conversationForm");
  const conversationInput = document.getElementById("conversationInput");
  const conversationEmojiToggle = document.getElementById("conversationEmojiToggle");
  const conversationQuickLike = document.getElementById("conversationQuickLike");
  const conversationEmojiPicker = document.getElementById("conversationEmojiPicker");
  const conversationAttachmentInput = document.getElementById("conversationAttachmentInput");
  const conversationAttachmentBtn = document.getElementById("conversationAttachmentBtn");
  const conversationAttachmentPreview = document.getElementById("conversationAttachmentPreview");
  const conversationAttachmentName = document.getElementById("conversationAttachmentName");
  const conversationAttachmentClear = document.getElementById("conversationAttachmentClear");

  const searchParams = new URLSearchParams(window.location.search);
  const requestedUserId = searchParams.get("userId");

  let allUsers = [];
  let allMessages = [];
  let activePartnerId = requestedUserId || "";
  let searchQuery = "";
  let selectedAttachment = null;

  function setEmojiPickerState(isOpen) {
    if (!conversationEmojiPicker || !conversationEmojiToggle) {
      return;
    }

    conversationEmojiPicker.hidden = !isOpen;
    conversationEmojiToggle.classList.toggle("active", isOpen);
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatBytes(size) {
    if (!Number.isFinite(size) || size <= 0) {
      return "";
    }

    const units = ["B", "KB", "MB", "GB"];
    let index = 0;
    let value = size;

    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index += 1;
    }

    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
  }

  function setMessage(text, type) {
    conversationMessage.textContent = text;
    conversationMessage.className = text ? `tripnest-edit-message ${type}` : "tripnest-edit-message";
  }

  function getPartnerForMessage(message) {
    return message.fromUserId === user.id ? message.toUserId : message.fromUserId;
  }

  function formatMessagePreview(message) {
    if (message.type === "post_share") {
      return message.text || `Shared post${message.postCountry ? `: ${message.postCountry}` : ""}`;
    }

    if (message.text) {
      return message.text;
    }

    if (message.attachment?.name) {
      return `File: ${message.attachment.name}`;
    }

    return "New message";
  }

  function updateAttachmentPreview() {
    if (!conversationAttachmentPreview || !conversationAttachmentName) {
      return;
    }

    if (!selectedAttachment) {
      conversationAttachmentPreview.hidden = true;
      conversationAttachmentName.textContent = "";
      return;
    }

    conversationAttachmentPreview.hidden = false;
    conversationAttachmentName.textContent = `${selectedAttachment.name} (${formatBytes(selectedAttachment.size)})`;
  }

  function clearAttachment() {
    selectedAttachment = null;
    if (conversationAttachmentInput) {
      conversationAttachmentInput.value = "";
    }
    updateAttachmentPreview();
  }

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("The file could not be read."));
      reader.readAsDataURL(file);
    });
  }

  function buildThreads() {
    const map = new Map();

    allMessages.forEach((message) => {
      const partnerId = getPartnerForMessage(message);
      if (!partnerId) {
        return;
      }

      const existing = map.get(partnerId);
      if (!existing || new Date(message.createdAt) > new Date(existing.lastMessage.createdAt)) {
        map.set(partnerId, { partnerId, lastMessage: message });
      }
    });

    allUsers.forEach((entry) => {
      if (!map.has(entry.id)) {
        map.set(entry.id, { partnerId: entry.id, lastMessage: null });
      }
    });

    return [...map.values()]
      .filter((thread) => {
        if (!searchQuery) {
          return true;
        }

        const partner = allUsers.find((entry) => entry.id === thread.partnerId);
        if (!partner) {
          return false;
        }

        const nickname = normalizeText(partner.nickname);
        const username = normalizeText(partner.username);
        return nickname.includes(searchQuery) || username.includes(searchQuery);
      })
      .sort((a, b) => {
        const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  function renderThreads() {
    conversationThreadsList.innerHTML = "";

    const threads = buildThreads();
    if (!threads.length) {
      conversationThreadsList.innerHTML = `<p class="tripnest-empty-posts">${
        searchQuery ? "No user found with that name." : "There are no conversations yet."
      }</p>`;
      return;
    }

    threads.forEach((thread) => {
      const partner = allUsers.find((entry) => entry.id === thread.partnerId);
      if (!partner) {
        return;
      }

      const item = document.createElement("button");
      item.type = "button";
      item.className = "tripnest-conversation-thread";
      item.dataset.partnerId = partner.id;
      if (partner.id === activePartnerId) {
        item.classList.add("active");
      }

      item.innerHTML = `
        <span class="tripnest-conversation-thread-avatar">${escapeHtml((partner.nickname || partner.username).charAt(0).toUpperCase())}</span>
        <span class="tripnest-conversation-thread-copy">
          <strong>${escapeHtml(partner.nickname || partner.username)}</strong>
          <span>${escapeHtml(thread.lastMessage ? formatMessagePreview(thread.lastMessage) : "Start a new conversation")}</span>
        </span>
      `;

      conversationThreadsList.appendChild(item);
    });
  }

  function renderAttachment(message) {
    if (!message.attachment?.dataUrl) {
      return "";
    }

    const safeName = escapeHtml(message.attachment.name || "attachment");
    const safeType = escapeHtml(message.attachment.type || "File");
    const safeSize = escapeHtml(formatBytes(Number(message.attachment.size || 0)));
    const safeUrl = escapeHtml(message.attachment.dataUrl);

    return `
      <a class="tripnest-conversation-attachment-card" href="${safeUrl}" download="${safeName}" target="_blank" rel="noopener noreferrer">
        <span class="tripnest-conversation-attachment-icon">📎</span>
        <span class="tripnest-conversation-attachment-copy">
          <strong>${safeName}</strong>
          <span>${safeType}${safeSize ? ` · ${safeSize}` : ""}</span>
        </span>
      </a>
    `;
  }

  function renderSharedPostLink(message) {
    if (message.type !== "post_share" || !message.postId) {
      return "";
    }

    const safeCountry = escapeHtml(message.postCountry || "Open post");
    const safeUrl = `./post.html?postId=${encodeURIComponent(message.postId)}`;

    return `
      <a class="tripnest-conversation-shared-post" href="${safeUrl}">
        <span class="tripnest-conversation-shared-post-label">Shared post</span>
        <strong>${safeCountry}</strong>
        <span>Click to open the post</span>
      </a>
    `;
  }

  function renderActiveConversation() {
    if (!activePartnerId && allUsers.length) {
      activePartnerId = allUsers[0].id;
    }

    let partner = allUsers.find((entry) => entry.id === activePartnerId);
    if (!partner && allUsers.length) {
      activePartnerId = allUsers[0].id;
      partner = allUsers[0];
    }

    if (!partner) {
      if (conversationPanel) {
        conversationPanel.hidden = true;
        conversationPanel.style.display = "none";
      }
      if (conversationEmptyState) {
        conversationEmptyState.hidden = false;
        conversationEmptyState.innerHTML = "<p>No conversation found.</p>";
      }
      return;
    }

    if (conversationPanel) {
      conversationPanel.hidden = false;
      conversationPanel.style.display = "flex";
    }
    if (conversationEmptyState) {
      conversationEmptyState.hidden = true;
      conversationEmptyState.innerHTML = "";
    }
    if (conversationPartnerUsername) {
      conversationPartnerUsername.textContent = partner.username || partner.nickname || "";
    }
    const messages = allMessages
      .filter((message) => {
        const outgoing = message.fromUserId === user.id && message.toUserId === activePartnerId;
        const incoming = message.toUserId === user.id && message.fromUserId === activePartnerId;
        return outgoing || incoming;
      })
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    conversationMessagesList.innerHTML = "";

    if (!messages.length) {
      return;
    }

    messages.forEach((message) => {
      const isOwn = message.fromUserId === user.id;
      const item = document.createElement("article");
      item.className = `tripnest-conversation-bubble${isOwn ? " own" : ""}`;

      let textContent = message.text;
      if (message.type === "post_share") {
        textContent = `Shared post${message.postCountry ? `: ${message.postCountry}` : ""}${message.text ? `\n${message.text}` : ""}`;
      }

      const senderMarkup = isOwn
        ? ""
        : `<strong>${escapeHtml(message.fromNickname || message.fromUsername)}</strong>`;

      const bodyMarkup = textContent
        ? `<p>${escapeHtml(textContent)}</p>`
        : "";

      item.innerHTML = `
        ${senderMarkup}
        ${bodyMarkup}
        ${renderSharedPostLink(message)}
        ${renderAttachment(message)}
      `;

      conversationMessagesList.appendChild(item);
    });

    conversationMessagesList.scrollTop = conversationMessagesList.scrollHeight;
  }

  async function loadUsers() {
    const response = await fetch(`/api/users?excludeUserId=${encodeURIComponent(user.id)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "The users could not be loaded.");
    }

    allUsers = Array.isArray(data.users) ? data.users : [];
  }

  async function loadMessages() {
    const response = await fetch(`/api/messages?userId=${encodeURIComponent(user.id)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "The conversations could not be loaded.");
    }

    allMessages = Array.isArray(data.messages) ? data.messages : [];
  }

  function openConversation(partnerId) {
    activePartnerId = partnerId;
    renderThreads();
    renderActiveConversation();
  }

  function renderEmojiPicker() {
    if (!conversationEmojiPicker) {
      return;
    }

    conversationEmojiPicker.innerHTML = "";
    EMOJIS.forEach((emoji) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tripnest-conversation-emoji-btn";
      button.textContent = emoji;
      button.dataset.emoji = emoji;
      conversationEmojiPicker.appendChild(button);
    });
  }

  if (profileNavLink) {
    profileNavLink.href = "./profile.html";
  }

  if (profileNavTitle) {
    profileNavTitle.textContent = user.nickname || user.username;
  }

  renderEmojiPicker();

  try {
    await Promise.all([loadUsers(), loadMessages()]);

    if (requestedUserId && !allUsers.some((entry) => entry.id === requestedUserId)) {
      activePartnerId = "";
    }

    if (!activePartnerId && allUsers.length) {
      activePartnerId = allUsers[0].id;
    }

    renderThreads();
    renderActiveConversation();
  } catch (error) {
    setMessage(error.message, "error");
  }

  conversationSearchInput?.addEventListener("input", (event) => {
    searchQuery = normalizeText(event.target.value);
    renderThreads();
  });

  conversationThreadsList?.addEventListener("click", (event) => {
    const thread = event.target.closest("[data-partner-id]");
    if (!thread?.dataset.partnerId) {
      return;
    }

    openConversation(thread.dataset.partnerId);
  });

  conversationEmojiToggle?.addEventListener("click", () => {
    if (!conversationEmojiPicker || !conversationEmojiToggle) {
      return;
    }

    setEmojiPickerState(conversationEmojiPicker.hidden);
  });

  conversationEmojiPicker?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-emoji]");
    if (!button?.dataset.emoji || !conversationInput) {
      return;
    }

    const emoji = button.dataset.emoji;
    const start = conversationInput.selectionStart ?? conversationInput.value.length;
    const end = conversationInput.selectionEnd ?? conversationInput.value.length;
    const value = conversationInput.value;
    conversationInput.value = `${value.slice(0, start)}${emoji}${value.slice(end)}`;
    conversationInput.focus();
    const cursor = start + emoji.length;
    conversationInput.setSelectionRange(cursor, cursor);
  });

  document.addEventListener("click", (event) => {
    if (!conversationEmojiPicker || !conversationEmojiToggle) {
      return;
    }

    const insidePicker = conversationEmojiPicker.contains(event.target);
    const insideToggle = conversationEmojiToggle.contains(event.target);
    if (!insidePicker && !insideToggle) {
      setEmojiPickerState(false);
    }
  });

  conversationQuickLike?.addEventListener("click", () => {
    if (!conversationInput) {
      return;
    }

    conversationInput.value = `${conversationInput.value}${conversationInput.value ? " " : ""}👍`;
    conversationInput.focus();
  });

  conversationAttachmentBtn?.addEventListener("click", () => {
    conversationAttachmentInput?.click();
  });

  conversationAttachmentInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      clearAttachment();
      return;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      clearAttachment();
      setMessage("The file exceeds the 100MB limit.", "error");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      selectedAttachment = {
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        dataUrl
      };
      updateAttachmentPreview();
      setMessage("", "");
    } catch (error) {
      clearAttachment();
      setMessage(error.message, "error");
    }
  });

  conversationAttachmentClear?.addEventListener("click", clearAttachment);

  conversationInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    conversationForm?.requestSubmit();
  });

  conversationForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activePartnerId) {
      return;
    }

    const text = conversationInput.value.trim();
    if (!text && !selectedAttachment) {
      setMessage("Write a message or select a file before sending.", "error");
      return;
    }

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: user.id,
          toUserId: activePartnerId,
          text,
          attachment: selectedAttachment
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "The message could not be sent.");
      }

      conversationInput.value = "";
      clearAttachment();
      setMessage(data.message, "success");

      allMessages.push(data.sentMessage);
      renderThreads();
      renderActiveConversation();
    } catch (error) {
      setMessage(error.message, "error");
    }
  });

  conversationClearBtn?.addEventListener("click", async () => {
    if (!activePartnerId) {
      return;
    }

    const partner = allUsers.find((entry) => entry.id === activePartnerId);
    const partnerName = partner?.nickname || partner?.username || "this user";
    const confirmed = window.confirm(`Do you want to clear the conversation with ${partnerName}?`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch("/api/messages/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentUserId: user.id,
          partnerUserId: activePartnerId
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "The conversation could not be cleared.");
      }

      setMessage(data.message, "success");
      await loadMessages();
      renderThreads();
      renderActiveConversation();
    } catch (error) {
      setMessage(error.message, "error");
    }
  });

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("tripnest_user");
    window.location.href = "/";
  });
});
