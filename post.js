document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("tripnest_user") || "null");
  if (!user) {
    window.location.href = "/";
    return;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  const postViewMessage = document.getElementById("postViewMessage");
  const postDetailCard = document.getElementById("postDetailCard");
  const postAuthorAvatar = document.getElementById("postAuthorAvatar");
  const postDetailAuthorName = document.getElementById("postDetailAuthorName");
  const postDetailMeta = document.getElementById("postDetailMeta");
  const postDetailTitle = document.getElementById("postDetailTitle");
  const postDetailDescription = document.getElementById("postDetailDescription");
  const postDetailAverage = document.getElementById("postDetailAverage");
  const postDetailPhotos = document.getElementById("postDetailPhotos");
  const postLikesCount = document.getElementById("postLikesCount");
  const postCommentsCount = document.getElementById("postCommentsCount");
  const postSharesCount = document.getElementById("postSharesCount");
  const postLikeBtn = document.getElementById("postLikeBtn");
  const postCommentFocusBtn = document.getElementById("postCommentFocusBtn");
  const postShareBtn = document.getElementById("postShareBtn");
  let postSavesCount = document.getElementById("postSavesCount");
  let postSaveBtn = document.getElementById("postSaveBtn");
  const postDetailSights = document.getElementById("postDetailSights");
  const postDetailFood = document.getElementById("postDetailFood");
  const postDetailActivities = document.getElementById("postDetailActivities");
  const postDetailEase = document.getElementById("postDetailEase");
  const postDetailCost = document.getElementById("postDetailCost");
  const postCommentForm = document.getElementById("postCommentForm");
  const postCommentInput = document.getElementById("postCommentInput");
  const postCommentsList = document.getElementById("postCommentsList");
  const postShareModal = document.getElementById("postShareModal");
  const postShareForm = document.getElementById("postShareForm");
  const shareRecipientSelect = document.getElementById("shareRecipientSelect");
  const shareMessageInput = document.getElementById("shareMessageInput");
  const closeShareModalBtn = document.getElementById("closeShareModalBtn");
  const cancelShareBtn = document.getElementById("cancelShareBtn");
  const postBackToProfile = document.getElementById("postBackToProfile");
  const postGalleryModal = document.getElementById("postGalleryModal");
  const postGalleryImage = document.getElementById("postGalleryImage");
  const postGalleryCloseBtn = document.getElementById("postGalleryCloseBtn");
  const postGalleryPrevBtn = document.getElementById("postGalleryPrevBtn");
  const postGalleryNextBtn = document.getElementById("postGalleryNextBtn");
  const postStatsSection = document.querySelector(".tripnest-social-post-stats");
  const postActionsSection = document.querySelector(".tripnest-social-post-actions");

  if (!postSavesCount && postStatsSection) {
    postSavesCount = document.createElement("span");
    postSavesCount.id = "postSavesCount";
    postStatsSection.appendChild(postSavesCount);
  }

  if (!postSaveBtn && postActionsSection) {
    postSaveBtn = document.createElement("button");
    postSaveBtn.id = "postSaveBtn";
    postSaveBtn.type = "button";
    postSaveBtn.className = "tripnest-social-action-btn";
    postActionsSection.appendChild(postSaveBtn);
  }

  const searchParams = new URLSearchParams(window.location.search);
  const postId = searchParams.get("postId");
  let currentPost = null;
  let shareRecipientsCount = 0;
  let activeReplyCommentId = null;
  let activeReplyTargetName = "";
  let activePhotoIndex = 0;

  function setMessage(text, type) {
    postViewMessage.textContent = text;
    postViewMessage.className = `tripnest-edit-message ${type}`;
  }

  function formatCount(value, emoji, label) {
    return `${emoji} ${value} ${label}`;
  }

  function updateDetailPhotoView() {
    const photos = Array.isArray(currentPost?.photos) ? currentPost.photos : [];
    if (!photos.length || !postDetailPhotos) {
      return;
    }

    const safeIndex = ((activePhotoIndex % photos.length) + photos.length) % photos.length;
    const image = postDetailPhotos.querySelector(".tripnest-social-post-main-photo");
    const counter = postDetailPhotos.querySelector(".tripnest-social-post-photo-counter");

    if (image) {
      image.src = photos[safeIndex];
      image.alt = `${currentPost?.country || "TripNest"} ${safeIndex + 1}`;
      image.dataset.photoIndex = String(safeIndex);
    }

    if (counter) {
      counter.textContent = `${safeIndex + 1} / ${photos.length}`;
    }
  }

  function renderPhotos(photos, country) {
    postDetailPhotos.innerHTML = "";

    if (!Array.isArray(photos) || !photos.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "tripnest-social-post-photo tripnest-social-post-photo-placeholder";
      placeholder.textContent = country;
      postDetailPhotos.appendChild(placeholder);
      return;
    }

    const carousel = document.createElement("div");
    carousel.className = "tripnest-social-post-photo-carousel";

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "tripnest-social-post-carousel-btn tripnest-social-post-carousel-btn-left";
    prevBtn.textContent = "‹";
    prevBtn.setAttribute("aria-label", "Previous photo");
    prevBtn.addEventListener("click", () => {
      showPreviousPhoto();
    });

    const imageWrap = document.createElement("div");
    imageWrap.className = "tripnest-social-post-main-photo-wrap";

    const img = document.createElement("img");
    img.src = photos[0];
    img.alt = `${country} 1`;
    img.className = "tripnest-social-post-photo tripnest-social-post-main-photo";
    img.dataset.photoIndex = "0";
    img.addEventListener("click", () => openGallery(activePhotoIndex));

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "tripnest-social-post-carousel-btn tripnest-social-post-carousel-btn-right";
    nextBtn.textContent = "›";
    nextBtn.setAttribute("aria-label", "Next photo");
    nextBtn.addEventListener("click", () => {
      showNextPhoto();
    });

    const counter = document.createElement("div");
    counter.className = "tripnest-social-post-photo-counter";
    counter.textContent = `1 / ${photos.length}`;

    imageWrap.appendChild(img);
    carousel.appendChild(prevBtn);
    carousel.appendChild(imageWrap);
    carousel.appendChild(nextBtn);
    postDetailPhotos.appendChild(carousel);
    postDetailPhotos.appendChild(counter);

    activePhotoIndex = 0;
    updateDetailPhotoView();
  }

  function updateGalleryImage() {
    const photos = Array.isArray(currentPost?.photos) ? currentPost.photos : [];
    if (!photos.length) {
      return;
    }

    const safeIndex = ((activePhotoIndex % photos.length) + photos.length) % photos.length;
    activePhotoIndex = safeIndex;
    postGalleryImage.src = photos[safeIndex];
    postGalleryImage.alt = `${currentPost?.country || "TripNest"} ${safeIndex + 1}`;
  }

  function openGallery(index) {
    const photos = Array.isArray(currentPost?.photos) ? currentPost.photos : [];
    if (!photos.length) {
      return;
    }

    activePhotoIndex = Number(index) || 0;
    updateGalleryImage();
    postGalleryModal.hidden = false;
  }

  function closeGallery() {
    postGalleryModal.hidden = true;
    postGalleryImage.src = "";
  }

  function showPreviousPhoto() {
    const photos = Array.isArray(currentPost?.photos) ? currentPost.photos : [];
    if (!photos.length) {
      return;
    }

    activePhotoIndex -= 1;
    updateGalleryImage();
    updateDetailPhotoView();
  }

  function showNextPhoto() {
    const photos = Array.isArray(currentPost?.photos) ? currentPost.photos : [];
    if (!photos.length) {
      return;
    }

    activePhotoIndex += 1;
    updateGalleryImage();
    updateDetailPhotoView();
  }

  function getCommentsTotalCount(comments) {
    return comments.reduce((total, comment) => total + 1 + ((comment.replies || []).length), 0);
  }

  function renderComments(comments) {
    postCommentsList.innerHTML = "";

    if (!Array.isArray(comments) || !comments.length) {
      postCommentsList.innerHTML = '<p class="tripnest-empty-posts">There are no comments yet.</p>';
      return;
    }

    comments
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach((comment) => {
        const item = document.createElement("article");
        item.className = "tripnest-post-comment-item";
        const replies = Array.isArray(comment.replies) ? comment.replies : [];
        const canDeleteComment = currentPost && (currentPost.userId === user.id || comment.userId === user.id);
        const replyForm = activeReplyCommentId === comment.id
          ? `
            <form class="tripnest-reply-form" data-parent-comment-id="${comment.id}">
              <textarea class="tripnest-reply-input" rows="2" placeholder="${activeReplyTargetName ? `Reply to ${activeReplyTargetName}...` : "Reply to your comment..."}"></textarea>
              <div class="tripnest-reply-actions">
                <button type="submit" class="primary-btn">Answer</button>
                <button type="button" class="secondary-btn" data-reply-cancel="${comment.id}">Cancel</button>
              </div>
            </form>
          `
          : "";
        const repliesHtml = replies.length
          ? `
            <div class="tripnest-comment-replies">
              ${replies
                .slice()
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                .map((reply) => `
                  <article class="tripnest-post-reply-item">
                    <div class="tripnest-post-comment-head">
                      <strong>${reply.nickname || reply.username}</strong>
                      <span>@${reply.username}</span>
                    </div>
                    <p>${reply.text}</p>
                    <div class="tripnest-comment-actions">
                      <button type="button" class="tripnest-comment-reply-btn" data-reply-target="${comment.id}" data-reply-name="${reply.nickname || reply.username}">Answer</button>
                      ${currentPost && (currentPost.userId === user.id || reply.userId === user.id)
                        ? `<button type="button" class="tripnest-comment-delete-btn" data-comment-delete="${reply.id}" data-parent-comment-id="${comment.id}">Delete</button>`
                        : ""}
                    </div>
                  </article>
                `)
                .join("")}
            </div>
          `
          : "";

        item.innerHTML = `
          <div class="tripnest-post-comment-head">
            <strong>${comment.nickname || comment.username}</strong>
            <span>@${comment.username}</span>
          </div>
          <p>${comment.text}</p>
          <div class="tripnest-comment-actions">
            <button type="button" class="tripnest-comment-reply-btn" data-reply-target="${comment.id}" data-reply-name="${comment.nickname || comment.username}">Answer</button>
            ${canDeleteComment ? `<button type="button" class="tripnest-comment-delete-btn" data-comment-delete="${comment.id}">Delete</button>` : ""}
          </div>
          ${replyForm}
          ${repliesHtml}
        `;
        postCommentsList.appendChild(item);
      });
  }

  function renderPost(post) {
    currentPost = post;
    const likes = Array.isArray(post.likes) ? post.likes : [];
    const savedBy = Array.isArray(post.savedBy) ? post.savedBy : [];
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const cities = Array.isArray(post.cities) ? post.cities : [];

    document.title = `${post.country} | TripNest`;

    const authorName = post.nickname || post.username;
    const tripDurationText = (() => {
      const totalDays = Number(post.totalDays ?? 0);
      if (Number.isFinite(totalDays) && totalDays > 0) {
        return `${totalDays} Days`;
      }
      if (post.travelDate && post.returnDate) {
        const start = new Date(`${post.travelDate}T00:00:00`);
        const end = new Date(`${post.returnDate}T00:00:00`);
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
          const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
          const safeDays = Math.max(0, diffDays + 1);
          return `${safeDays} Days`;
        }
      }
      return "0 Days";
    })();

    postAuthorAvatar.textContent = authorName.charAt(0).toUpperCase();
    postDetailAuthorName.textContent = authorName;
    postDetailMeta.textContent = `${post.country} • ${cities.join(", ") || "Χωρίς πόλεις"} • ${tripDurationText}`;
    postDetailTitle.textContent = post.country;
    postDetailDescription.textContent = post.description || "Δεν υπάρχει περιγραφή.";
    postDetailAverage.textContent = Number(post.averageRating || 0).toFixed(2);
    postDetailSights.textContent = String(post.ratings?.sights ?? 0);
    postDetailFood.textContent = String(post.ratings?.food ?? 0);
    postDetailActivities.textContent = String(post.ratings?.activities ?? 0);
    postDetailEase.textContent = String(post.ratings?.ease ?? 0);
    postDetailCost.textContent = String(post.ratings?.cost ?? 0);
    postLikesCount.textContent = formatCount(likes.length, "❤️", "likes");
    postCommentsCount.textContent = formatCount(getCommentsTotalCount(comments), "💬", "comments");
    postSharesCount.textContent = formatCount(post.sharesCount || 0, "📤", "shares");
    if (postSavesCount) {
      postSavesCount.textContent = formatCount(savedBy.length, "🔖", "saves");
    }
    postLikeBtn.classList.toggle("active", likes.includes(user.id));
    postLikeBtn.textContent = likes.includes(user.id) ? "💔 Unlike" : "❤️ Like";
    postCommentFocusBtn.textContent = "💬 Comment";
    postShareBtn.textContent = "📤 Share";
    if (postSaveBtn) {
      postSaveBtn.classList.toggle("active", savedBy.includes(user.id));
      postSaveBtn.textContent = savedBy.includes(user.id) ? "🔖 Saved" : "🔖 Save";
    }
    postBackToProfile.href = post.userId === user.id
      ? "./profile.html"
      : `./profile.html?userId=${encodeURIComponent(post.userId)}`;

    renderPhotos(post.photos, post.country);
    renderComments(comments);
    postDetailCard.hidden = false;
  }

  async function fetchPost() {
    const response = await fetch(`/api/posts?id=${encodeURIComponent(postId)}`);
    const data = await response.json();
    if (!response.ok || !data.post) {
      throw new Error(data.message || "Unable to load the post..");
    }

    renderPost(data.post);
  }

  async function loadShareRecipients() {
    const response = await fetch(`/api/users?excludeUserId=${encodeURIComponent(user.id)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to load users.");
    }

    const users = Array.isArray(data.users) ? data.users : [];
    shareRecipientsCount = users.length;
    shareRecipientSelect.innerHTML = '<option value="">Select User</option>';
    users.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = `${entry.nickname || entry.username} (@${entry.username})`;
      shareRecipientSelect.appendChild(option);
    });

    postShareBtn.disabled = shareRecipientsCount === 0;
    postShareBtn.title = shareRecipientsCount === 0 ? "No other users available to share with." : "";
  }

  function openShareModal() {
    if (shareRecipientsCount === 0) {
      setMessage("No other users available to share with.", "error");
      return;
    }

    postShareModal.hidden = false;
  }

  function closeShareModal() {
    postShareModal.hidden = true;
    postShareForm.reset();
  }

  if (!postId) {
    setMessage("No post found to display.", "error");
    return;
  }

  try {
    await Promise.all([fetchPost(), loadShareRecipients()]);
  } catch (error) {
    setMessage(error.message, "error");
  }

  postLikeBtn?.addEventListener("click", async () => {
    if (!currentPost) {
      return;
    }

    try {
      const response = await fetch("/api/posts/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: currentPost.id,
          userId: user.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to update like.");
      }

      setMessage("", "");
      renderPost(data.post);
    } catch (error) {
      setMessage(error.message, "error");
    }
  });

  postSaveBtn?.addEventListener("click", async () => {
    if (!currentPost) {
      return;
    }

    try {
      const response = await fetch("/api/posts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: currentPost.id,
          userId: user.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "It was not possible to save the post.");
      }

      setMessage(data.message, "success");
      renderPost(data.post);
    } catch (error) {
      setMessage(error.message, "error");
    }
  });

  postCommentFocusBtn?.addEventListener("click", () => {
    postCommentInput?.focus();
  });

  postCommentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentPost) {
      return;
    }

    try {
      const response = await fetch("/api/posts/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: currentPost.id,
          userId: user.id,
          text: postCommentInput.value.trim(),
          parentCommentId: null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to post the comment.");
      }

      postCommentInput.value = "";
      setMessage(data.message, "success");
      renderPost(data.post);
    } catch (error) {
      setMessage(error.message, "error");
    }
  });

  postCommentsList?.addEventListener("click", (event) => {
    const replyTargetButton = event.target.closest("[data-reply-target]");
    if (replyTargetButton) {
      activeReplyCommentId = replyTargetButton.dataset.replyTarget;
      activeReplyTargetName = replyTargetButton.dataset.replyName || "";
      renderComments(Array.isArray(currentPost?.comments) ? currentPost.comments : []);
      const replyInput = postCommentsList.querySelector(".tripnest-reply-input");
      replyInput?.focus();
      return;
    }

    const replyCancelButton = event.target.closest("[data-reply-cancel]");
    if (replyCancelButton) {
      activeReplyCommentId = null;
      activeReplyTargetName = "";
      renderComments(Array.isArray(currentPost?.comments) ? currentPost.comments : []);
      return;
    }

    const deleteButton = event.target.closest("[data-comment-delete]");
    if (deleteButton && currentPost) {
      const confirmed = window.confirm("Are you sure you want to delete this comment?");
      if (!confirmed) {
        return;
      }

      fetch("/api/posts/comment/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: currentPost.id,
          userId: user.id,
          commentId: deleteButton.dataset.commentDelete,
          parentCommentId: deleteButton.dataset.parentCommentId || null
        })
      })
        .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) {
            throw new Error(data.message || "Unable to delete the comment.");
          }

          activeReplyCommentId = null;
          activeReplyTargetName = "";
          setMessage(data.message, "success");
          renderPost(data.post);
        })
        .catch((error) => {
          setMessage(error.message, "error");
        });
    }
  });

  postCommentsList?.addEventListener("submit", async (event) => {
    const replyForm = event.target.closest(".tripnest-reply-form");
    if (!replyForm) {
      return;
    }

    event.preventDefault();
    if (!currentPost) {
      return;
    }

    const replyInput = replyForm.querySelector(".tripnest-reply-input");
    const parentCommentId = replyForm.dataset.parentCommentId;
    const replyText = replyInput?.value.trim() || "";

    try {
      const response = await fetch("/api/posts/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: currentPost.id,
          userId: user.id,
          text: replyText,
          parentCommentId
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "It was not possible to send the reply.");
      }

      activeReplyCommentId = null;
      activeReplyTargetName = "";
      setMessage(data.message, "success");
      renderPost(data.post);
    } catch (error) {
      setMessage(error.message, "error");
    }
  });

  postDetailPhotos?.addEventListener("click", (event) => {
    const photo = event.target.closest("[data-photo-index]");
    if (!photo) {
      return;
    }

    openGallery(Number(photo.dataset.photoIndex));
  });

  postShareBtn?.addEventListener("click", () => {
    openShareModal();
  });

  closeShareModalBtn?.addEventListener("click", closeShareModal);
  cancelShareBtn?.addEventListener("click", closeShareModal);
  postShareModal?.addEventListener("click", (event) => {
    if (event.target === postShareModal) {
      closeShareModal();
    }
  });
  postGalleryCloseBtn?.addEventListener("click", closeGallery);
  postGalleryPrevBtn?.addEventListener("click", showPreviousPhoto);
  postGalleryNextBtn?.addEventListener("click", showNextPhoto);
  postGalleryModal?.addEventListener("click", (event) => {
    if (event.target === postGalleryModal) {
      closeGallery();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !postShareModal.hidden) {
      closeShareModal();
      return;
    }

    if (event.key === "Escape" && !postGalleryModal.hidden) {
      closeGallery();
      return;
    }

    if (postGalleryModal.hidden) {
      return;
    }

    if (event.key === "ArrowLeft") {
      showPreviousPhoto();
    }

    if (event.key === "ArrowRight") {
      showNextPhoto();
    }
  });

  postShareForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentPost) {
      return;
    }

    if (!shareRecipientSelect.value) {
      setMessage("First select a user for sharing.", "error");
      return;
    }

    try {
      const response = await fetch("/api/posts/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: currentPost.id,
          fromUserId: user.id,
          toUserId: shareRecipientSelect.value,
          text: shareMessageInput.value.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "It was not possible to share.");
      }

      setMessage(data.message, "success");
      renderPost(data.post);
      closeShareModal();
    } catch (error) {
      setMessage(error.message, "error");
    }
  });
  

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("tripnest_user");
    window.location.href = "/";
  });
});
