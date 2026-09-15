document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("tripnest_user") || "null");

  if (!user) {
    window.location.href = "/";
    return;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  const profileSidebarLink = document.getElementById("profileSidebarLink");
  const profileSidebarTitle = document.getElementById("profileSidebarTitle");
  const totalCountries = 195;
  const searchParams = new URLSearchParams(window.location.search);
  const requestedUserId = searchParams.get("userId");
  const requestedUsername = searchParams.get("username");

  const profileAvatar = document.getElementById("profileAvatar");
  const profileNickname = document.getElementById("profileNickname");
  const profileHandle = document.getElementById("profileHandle");
  const profileBio = document.getElementById("profileBio");
  const profileUsername = document.getElementById("profileUsername");
  const profileEmail = document.getElementById("profileEmail");
  const profilePostsCount = document.getElementById("profilePostsCount");
  const profileFollowersCount = document.getElementById("profileFollowersCount");
  const profileFollowingCount = document.getElementById("profileFollowingCount");
  const profileFriendsCount = document.getElementById("profileFriendsCount");
  const profileVisitedCount = document.getElementById("profileVisitedCount");
  const profileVisitedPercent = document.getElementById("profileVisitedPercent");
  const profileFollowersStat = document.getElementById("profileFollowersStat");
  const profileFollowingStat = document.getElementById("profileFollowingStat");
  const profileFriendsStat = document.getElementById("profileFriendsStat");
  const profileCountriesStat = document.getElementById("profileCountriesStat");
  const profileStatsPopover = document.getElementById("profileStatsPopover");
  const profileStatsPopoverTitle = document.getElementById("profileStatsPopoverTitle");
  const profileStatsPopoverBody = document.getElementById("profileStatsPopoverBody");
  const profileStatsPopoverClose = document.getElementById("profileStatsPopoverClose");
  const profileStatsSearch = document.getElementById("profileStatsSearch");
  const editProfileBtn = document.getElementById("editProfileBtn");
  const addPostBtn = document.getElementById("addPostBtn");
  const followProfileBtn = document.getElementById("followProfileBtn");
  const messageProfileBtn = document.getElementById("messageProfileBtn");
  const profilePostsGrid = document.getElementById("profilePostsGrid");

  let currentPosts = [];
  let currentProfile = user;
  let allUsers = [];
  let currentVisitedCountries = [];
  let activePopoverType = "";
  let currentPopoverItems = [];
  let viewingOwnProfile = !requestedUserId && !requestedUsername;

  if (profileSidebarLink) {
    profileSidebarLink.href = "./profile.html";
  }

  if (profileSidebarTitle) {
    profileSidebarTitle.textContent = user.nickname || user.username;
  }

  function getVisitedCountriesForProfile(profile) {
    const targetUsername = profile?.username || user.username;
    const storedValue = JSON.parse(localStorage.getItem(`tripnest_visited_${targetUsername}`) || "[]");
    if (Array.isArray(storedValue)) {
      return storedValue.filter(Boolean);
    }

    return [];
  }

  async function loadUserDirectory() {
    const response = await fetch("/api/users");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Δεν ήταν δυνατή η φόρτωση των χρηστών.");
    }

    allUsers = Array.isArray(data.users) ? data.users : [];
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
      };

      return entities[character] || character;
    });
  }

  function createListEmptyState(message) {
    return `<p class="tripnest-profile-popover-empty">${escapeHtml(message)}</p>`;
  }

  function getUsersByIds(ids) {
    if (!Array.isArray(ids) || !ids.length) {
      return [];
    }

    return ids
      .map((id) => allUsers.find((entry) => entry.id === id))
      .filter(Boolean);
  }

  function getFriendIds(profile) {
    const followers = Array.isArray(profile?.followers) ? profile.followers : [];
    const following = Array.isArray(profile?.following) ? profile.following : [];
    return followers.filter((id) => following.includes(id));
  }

  function isFollowingUser(targetUserId) {
    const currentFollowing = Array.isArray(user.following) ? user.following : [];
    return currentFollowing.includes(targetUserId);
  }

  function buildUserListMarkup(usersList, emptyMessage) {
    if (!usersList.length) {
      return createListEmptyState(emptyMessage);
    }

    return `
      <div class="tripnest-profile-popover-list">
        ${usersList.map((entry) => {
          const avatarContent = entry.profileImage
            ? `<img src="${escapeHtml(entry.profileImage)}" alt="${escapeHtml(entry.nickname || entry.username)}" class="tripnest-profile-popover-avatar-image" />`
            : escapeHtml((entry.nickname || entry.username || "U").charAt(0).toUpperCase());
          const canFollow = entry.id !== user.id;
          const isFollowing = isFollowingUser(entry.id);
          const followButton = canFollow
            ? `
              <button
                type="button"
                class="tripnest-profile-popover-follow-btn${isFollowing ? " is-following" : ""}"
                data-follow-id="${escapeHtml(entry.id)}"
              >
                ${isFollowing ? "Following" : "Follow"}
              </button>
            `
            : '<span class="tripnest-profile-popover-self-label">You</span>';

          return `
            <div class="tripnest-profile-popover-item" data-profile-id="${escapeHtml(entry.id)}" role="button" tabindex="0">
              <span class="tripnest-profile-popover-avatar">${avatarContent}</span>
              <span class="tripnest-profile-popover-copy">
                <strong>${escapeHtml(entry.nickname || entry.username)}</strong>
                <span>@${escapeHtml(entry.username)}</span>
              </span>
              ${followButton}
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function buildCountriesMarkup(countries) {
    if (!countries.length) {
      return createListEmptyState("No countries to display yet.");
    }

    return `
      <div class="tripnest-profile-country-list">
        ${countries.map((country) => `
          <button
            type="button"
            class="tripnest-profile-country-chip"
            data-country-name="${escapeHtml(country)}"
          >
            ${escapeHtml(country)}
          </button>
        `).join("")}
      </div>
    `;
  }

  function closeStatsPopover() {
    if (!profileStatsPopover) {
      return;
    }

    profileStatsPopover.hidden = true;
    profileStatsPopover.classList.remove("is-open");
    profileStatsPopover.setAttribute("aria-hidden", "true");
    profileStatsPopover.style.display = "none";
    activePopoverType = "";
    currentPopoverItems = [];
    if (profileStatsSearch) {
      profileStatsSearch.value = "";
    }
    document.body.classList.remove("tripnest-modal-open");

    [profileFollowersStat, profileFollowingStat, profileFriendsStat, profileCountriesStat].forEach((element) => {
      element?.classList.remove("is-active");
    });
  }

  function resetStatsPopoverState() {
    closeStatsPopover();

    if (profileStatsPopover) {
      profileStatsPopover.hidden = true;
      profileStatsPopover.classList.remove("is-open");
      profileStatsPopover.setAttribute("aria-hidden", "true");
      profileStatsPopover.style.display = "none";
    }

    if (profileStatsPopoverBody) {
      profileStatsPopoverBody.innerHTML = "";
    }

    if (profileStatsPopoverTitle) {
      profileStatsPopoverTitle.textContent = "Details";
    }
  }

  function renderPopoverList(searchValue = "") {
    if (!profileStatsPopoverBody) {
      return;
    }

    const normalizedSearch = String(searchValue || "").trim().toLowerCase();
    const filteredItems = normalizedSearch
      ? currentPopoverItems.filter((item) => item.searchText.includes(normalizedSearch))
      : currentPopoverItems;

    if (!filteredItems.length) {
      profileStatsPopoverBody.innerHTML = createListEmptyState("No results found.");
      return;
    }

    if (activePopoverType === "countries") {
      profileStatsPopoverBody.innerHTML = buildCountriesMarkup(filteredItems.map((item) => item.label));
      return;
    }

    profileStatsPopoverBody.innerHTML = buildUserListMarkup(
      filteredItems.map((item) => item.user),
      "Δεν βρέθηκαν αποτελέσματα."
    );
  }

  function buildPopoverItems(type) {
    if (type === "followers") {
      return getUsersByIds(currentProfile.followers).map((entry) => ({
        type: "user",
        user: entry,
        searchText: `${String(entry.nickname || "").toLowerCase()} ${String(entry.username || "").toLowerCase()}`
      }));
    }

    if (type === "following") {
      return getUsersByIds(currentProfile.following).map((entry) => ({
        type: "user",
        user: entry,
        searchText: `${String(entry.nickname || "").toLowerCase()} ${String(entry.username || "").toLowerCase()}`
      }));
    }

    if (type === "countries") {
      return currentVisitedCountries.map((country) => ({
        type: "country",
        label: country,
        searchText: String(country || "").toLowerCase()
      }));
    }

    if (type === "friends") {
      return getUsersByIds(getFriendIds(currentProfile)).map((entry) => ({
        type: "user",
        user: entry,
        searchText: `${String(entry.nickname || "").toLowerCase()} ${String(entry.username || "").toLowerCase()}`
      }));
    }

    return [];
  }

  function refreshActivePopover() {
    if (!activePopoverType || !profileStatsPopover || profileStatsPopover.hidden) {
      return;
    }

    currentPopoverItems = buildPopoverItems(activePopoverType);
    renderPopoverList(profileStatsSearch?.value || "");
  }

  function openStatsPopover(type) {
    if (!profileStatsPopover || !profileStatsPopoverTitle || !profileStatsPopoverBody || !currentProfile) {
      return;
    }

    if (activePopoverType === type && !profileStatsPopover.hidden) {
      closeStatsPopover();
      return;
    }

    let title = "";

    if (type === "followers") {
      title = "Followers";
    } else if (type === "following") {
      title = "Following";
    } else if (type === "friends") {
      title = "Friends";
    } else if (type === "countries") {
      title = "Countries";
    } else {
      return;
    }

    activePopoverType = type;
    currentPopoverItems = buildPopoverItems(type);
    profileStatsPopoverTitle.textContent = title;
    profileStatsPopover.hidden = false;
    profileStatsPopover.classList.add("is-open");
    profileStatsPopover.setAttribute("aria-hidden", "false");
    profileStatsPopover.style.display = "flex";
    document.body.classList.add("tripnest-modal-open");
    renderPopoverList();
    if (profileStatsSearch) {
      profileStatsSearch.value = "";
      profileStatsSearch.placeholder = type === "countries" ? "Search country" : "Search user";
      window.setTimeout(() => profileStatsSearch.focus(), 0);
    }

    [profileFollowersStat, profileFollowingStat, profileFriendsStat, profileCountriesStat].forEach((element) => {
      const matchesType =
        (type === "followers" && element === profileFollowersStat) ||
        (type === "following" && element === profileFollowingStat) ||
        (type === "friends" && element === profileFriendsStat) ||
        (type === "countries" && element === profileCountriesStat);

      element?.classList.toggle("is-active", matchesType);
    });
  }

  function syncVisitedCountries(posts) {
    const mapCountries = getVisitedCountriesForProfile(currentProfile || user);
    if (Array.isArray(mapCountries) && mapCountries.length) {
      currentVisitedCountries = mapCountries;
      return;
    }

    if (viewingOwnProfile) {
      currentVisitedCountries = getVisitedCountriesForProfile(user);
      return;
    }

    const countries = Array.isArray(posts)
      ? [...new Set(posts.map((post) => String(post.country || "").trim()).filter(Boolean))]
      : [];

    currentVisitedCountries = countries;
  }

  function renderPosts(posts) {
    if (!profilePostsGrid) {
      return;
    }

    currentPosts = posts;
    syncVisitedCountries(posts);
    profilePostsGrid.innerHTML = "";

    if (!posts.length) {
      profilePostsGrid.innerHTML = '<p class="tripnest-empty-posts">No posts yet.</p>';
      return;
    }

    posts.forEach((post) => {
      const card = document.createElement("article");
      card.className = "tripnest-post-card";
      card.dataset.postId = post.id;

      const averageRating = Number(post.averageRating || 0).toFixed(2);
      const cover = post.photos?.[0]
        ? `<img src="${post.photos[0]}" alt="${post.country}" class="tripnest-post-cover" />`
        : `<div class="tripnest-post-cover tripnest-post-cover-placeholder">${post.country}</div>`;
      const cities = Array.isArray(post.cities) && post.cities.length
        ? post.cities.join(", ")
        : "No cities added";
      const description = post.description ? `<p class="tripnest-post-description">${post.description}</p>` : "";
      const actions = viewingOwnProfile
        ? `
          <div class="tripnest-post-card-actions">
            <button type="button" class="tripnest-post-action-btn" data-action="edit" data-post-id="${post.id}">Edit</button>
            <button type="button" class="tripnest-post-action-btn danger" data-action="delete" data-post-id="${post.id}">Delete</button>
          </div>
        `
        : "";
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

      card.innerHTML = `
        ${cover}
        <div class="tripnest-post-body">
          ${actions}
          <div class="tripnest-post-topline">
            <strong>${post.country}</strong>
            <span class="tripnest-post-inline-score">${averageRating}</span>
          </div>
          <p>${cities}</p>
          ${description}
          <small>${tripDurationText}</small>
        </div>
      `;

      profilePostsGrid.appendChild(card);
    });
  }

  async function deletePost(postId) {
    const response = await fetch("/api/posts/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        userId: user.id
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "It was not possible to delete the post.");
    }

    localStorage.setItem("tripnest_user", JSON.stringify(data.user));
    localStorage.setItem(`tripnest_posts_${user.username}`, String(data.user.postsCount || 0));
    renderProfile(data.user);
    renderPosts(currentPosts.filter((post) => post.id !== postId));
  }

  function renderProfile(profile) {
    currentProfile = profile;
    viewingOwnProfile = profile.id === user.id;

    const mapVisitedCountries = getVisitedCountriesForProfile(profile);
    const ownVisitedCountries = mapVisitedCountries.length ? mapVisitedCountries : getVisitedCountriesForProfile(user);
    currentVisitedCountries = ownVisitedCountries;

    if (viewingOwnProfile) {
      const nextUser = { ...user, ...profile, visitedCountries: currentVisitedCountries.length };
      localStorage.setItem("tripnest_user", JSON.stringify(nextUser));
      user.visitedCountries = currentVisitedCountries.length;
    }

    const activeNickname = profile.nickname || profile.username;
    const activeBio = profile.bio || "Travel lover, memories collector and explorer of new places.";
    const activePosts = Number(profile.postsCount || 0);
    const activeFollowers = Number(profile.followersCount || 0);
    const activeFollowing = Number(profile.followingCount || 0);
    const activeFriends = getFriendIds(profile).length;
    const activeVisitedCount = currentVisitedCountries.length;
    const activeVisitedPercent = `${((activeVisitedCount / totalCountries) * 100).toFixed(1)}%`;

    document.title = `${activeNickname} | TripNest`;

    if (profileAvatar) {
      if (profile.profileImage) {
        const positionX = Number(profile.profileImagePosition?.x ?? 50);
        const positionY = Number(profile.profileImagePosition?.y ?? 50);
        profileAvatar.innerHTML = `
          <img
            src="${profile.profileImage}"
            alt="Profile"
            class="tripnest-avatar-image"
            style="object-position: ${positionX}% ${positionY}%"
          />
        `;
      } else {
        profileAvatar.textContent = activeNickname.charAt(0).toUpperCase();
      }
    }

    if (profileNickname) profileNickname.textContent = activeNickname;
    if (profileHandle) profileHandle.textContent = `@${profile.username}`;
    if (profileBio) profileBio.textContent = activeBio;
    if (profileUsername) profileUsername.textContent = profile.username;
    if (profileEmail) profileEmail.textContent = profile.email || "-";
    if (profilePostsCount) profilePostsCount.textContent = String(activePosts);
    if (profileFollowersCount) profileFollowersCount.textContent = String(activeFollowers);
    if (profileFollowingCount) profileFollowingCount.textContent = String(activeFollowing);
    if (profileFriendsCount) profileFriendsCount.textContent = String(activeFriends);
    if (profileVisitedCount) profileVisitedCount.textContent = String(activeVisitedCount);
    if (profileVisitedPercent) profileVisitedPercent.textContent = activeVisitedPercent;
    if (editProfileBtn) editProfileBtn.hidden = !viewingOwnProfile;
    if (addPostBtn) addPostBtn.hidden = !viewingOwnProfile;
    if (followProfileBtn) {
      const currentFollowing = Array.isArray(user.following) ? user.following : [];
      const isFollowing = !viewingOwnProfile && currentFollowing.includes(profile.id);
      followProfileBtn.hidden = viewingOwnProfile;
      followProfileBtn.textContent = isFollowing ? "Ακολουθώ" : "Ακολουθήστε";
      followProfileBtn.classList.toggle("tripnest-profile-following-btn", isFollowing);
    }
    if (messageProfileBtn) {
      const currentFollowing = Array.isArray(user.following) ? user.following : [];
      const isFollowing = !viewingOwnProfile && currentFollowing.includes(profile.id);
      messageProfileBtn.hidden = viewingOwnProfile || !isFollowing;
    }

    closeStatsPopover();
  }

  async function loadProfile() {
    const query = requestedUsername && !requestedUserId
      ? `username=${encodeURIComponent(requestedUsername)}`
      : `id=${encodeURIComponent(requestedUserId || user.id)}`;

    const response = await fetch(`/api/profile?${query}`);
    const data = await response.json();
    if (!response.ok || !data.user) {
      throw new Error(data.message || "Profile not found.");
    }

    if (data.user.id === user.id) {
      localStorage.setItem("tripnest_user", JSON.stringify(data.user));
    }

    renderProfile(data.user);
    return data.user;
  }

  async function loadPosts(profileId) {
    const response = await fetch(`/api/posts?userId=${encodeURIComponent(profileId)}`);
    const data = await response.json();
    renderPosts(Array.isArray(data.posts) ? data.posts : []);
  }

  if (!requestedUserId && !requestedUsername) {
    renderProfile(user);
  }

  resetStatsPopoverState();

  window.addEventListener("pageshow", () => {
    resetStatsPopoverState();
  });

  Promise.all([loadUserDirectory(), loadProfile()])
    .then(([, profile]) => loadPosts(profile.id))
    .catch((error) => {
      if (profilePostsGrid) {
        profilePostsGrid.innerHTML = `<p class="tripnest-empty-posts">${error.message}</p>`;
      }
    });

  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      window.location.href = "./edit-profile.html";
    });
  }

  if (addPostBtn) {
    addPostBtn.addEventListener("click", () => {
      window.location.href = "./create-post.html";
    });
  }

  if (followProfileBtn) {
    followProfileBtn.addEventListener("click", async () => {
      if (!currentProfile || viewingOwnProfile) {
        return;
      }

      try {
        const response = await fetch("/api/profile/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentUserId: user.id,
            targetUserId: currentProfile.id
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Unable to update the follow.");
        }

        Object.assign(user, data.currentUser);
        localStorage.setItem("tripnest_user", JSON.stringify(data.currentUser));
        currentProfile = data.targetUser;
        renderProfile(data.targetUser);
        window.alert(data.message);
      } catch (error) {
        window.alert(error.message);
      }
    });
  }

  if (messageProfileBtn) {
    messageProfileBtn.addEventListener("click", () => {
      if (!currentProfile?.id) {
        return;
      }

      window.location.href = `./conversations.html?userId=${encodeURIComponent(currentProfile.id)}`;
    });
  }

  if (profilePostsGrid) {
    profilePostsGrid.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-action]");
      if (button) {
        if (!viewingOwnProfile) {
          return;
        }

        const action = button.dataset.action;
        const postId = button.dataset.postId;
        if (!postId) {
          return;
        }

        if (action === "edit") {
          window.location.href = `./create-post.html?postId=${encodeURIComponent(postId)}`;
          return;
        }

        if (action === "delete") {
          const confirmed = window.confirm("Are you sure you want to delete this post?");
          if (!confirmed) {
            return;
          }

          try {
            await deletePost(postId);
          } catch (error) {
            window.alert(error.message);
          }
          return;
        }
      }

      const card = event.target.closest(".tripnest-post-card");
      if (!card?.dataset.postId) {
        return;
      }

      window.location.href = `./post.html?postId=${encodeURIComponent(card.dataset.postId)}`;
    });
  }

  if (profileFollowersStat) {
    profileFollowersStat.addEventListener("click", () => {
      openStatsPopover("followers");
    });
  }

  if (profileFollowingStat) {
    profileFollowingStat.addEventListener("click", () => {
      openStatsPopover("following");
    });
  }

  if (profileFriendsStat) {
    profileFriendsStat.addEventListener("click", () => {
      openStatsPopover("friends");
    });
  }

  if (profileCountriesStat) {
    profileCountriesStat.addEventListener("click", () => {
      openStatsPopover("countries");
    });
  }

  if (profileStatsPopoverClose) {
    profileStatsPopoverClose.addEventListener("click", () => {
      closeStatsPopover();
    });
  }

  if (profileStatsPopoverBody) {
    profileStatsPopoverBody.addEventListener("click", (event) => {
      const countryChip = event.target.closest("[data-country-name]");
      if (countryChip?.dataset.countryName) {
        event.stopPropagation();

        const wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
          countryChip.dataset.countryName.replace(/\s+/g, "_")
        )}`;
        window.open(wikipediaUrl, "_blank", "noopener,noreferrer");
        return;
      }

      const followButton = event.target.closest("[data-follow-id]");
      if (followButton?.dataset.followId) {
        event.stopPropagation();

        fetch("/api/profile/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentUserId: user.id,
            targetUserId: followButton.dataset.followId
          })
        })
          .then(async (response) => {
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.message || "Unable to update follow.");
            }

            Object.assign(user, data.currentUser);
            localStorage.setItem("tripnest_user", JSON.stringify(data.currentUser));

            if (viewingOwnProfile) {
              renderProfile(data.currentUser);
            } else if (currentProfile?.id === data.targetUser.id) {
              renderProfile(data.targetUser);
            }

            refreshActivePopover();
          })
          .catch((error) => {
            window.alert(error.message);
          });

        return;
      }

      const profileItem = event.target.closest("[data-profile-id]");
      if (!profileItem?.dataset.profileId) {
        return;
      }

      const profileId = profileItem.dataset.profileId;
      if (profileId === currentProfile.id) {
        closeStatsPopover();
        return;
      }

      window.location.href = `./profile.html?userId=${encodeURIComponent(profileId)}`;
    });

    profileStatsPopoverBody.addEventListener("keydown", (event) => {
      const profileItem = event.target.closest("[data-profile-id]");
      if (!profileItem || (event.key !== "Enter" && event.key !== " ")) {
        return;
      }

      event.preventDefault();
      profileItem.click();
    });
  }

  if (profileStatsSearch) {
    profileStatsSearch.addEventListener("input", (event) => {
      renderPopoverList(event.target.value);
    });
  }

  document.addEventListener("click", (event) => {
    if (
      profileStatsPopover &&
      !profileStatsPopover.hidden &&
      event.target === profileStatsPopover
    ) {
      closeStatsPopover();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeStatsPopover();
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("tripnest_user");
      window.location.href = "/";
    });
  }
});
