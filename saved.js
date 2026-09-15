document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("tripnest_user") || "null");
  if (!user) {
    window.location.href = "/";
    return;
  }

  const savedLogoutBtn = document.getElementById("savedLogoutBtn");
  const savedProfileNavLink = document.getElementById("savedProfileNavLink");
  const savedProfileNavTitle = document.getElementById("savedProfileNavTitle");
  const savedPostsGrid = document.getElementById("savedPostsGrid");
  const savedPostsCountBadge = document.getElementById("savedPostsCountBadge");
  const savedSearchInput = document.getElementById("savedSearchInput");
  const savedCountryFilter = document.getElementById("savedCountryFilter");
  const savedCountryFilterOptions = document.getElementById("savedCountryFilterOptions");
  const savedSortSelect = document.getElementById("savedSortSelect");
  let allSavedPosts = [];

  if (savedProfileNavLink) {
    savedProfileNavLink.href = "./profile.html";
  }

  if (savedProfileNavTitle) {
    savedProfileNavTitle.textContent = user.nickname || user.username;
  }

  function populateCountryFilter(posts) {
    if (!savedCountryFilterOptions) {
      return;
    }

    const countries = [...new Set(posts.map((post) => String(post.country || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));

    savedCountryFilterOptions.innerHTML = "";
    countries.forEach((country) => {
      const option = document.createElement("option");
      option.value = country;
      savedCountryFilterOptions.appendChild(option);
    });
  }

  function applyFiltersAndRender() {
    const searchQuery = String(savedSearchInput?.value || "").trim().toLowerCase();
    const countryFilter = String(savedCountryFilter?.value || "").trim().toLowerCase();
    const sortValue = String(savedSortSelect?.value || "newest");

    const filteredPosts = allSavedPosts.filter((post) => {
      const matchesCountry = !countryFilter || String(post.country || "").toLowerCase().includes(countryFilter);
      const searchableText = [
        post.country,
        ...(Array.isArray(post.cities) ? post.cities : []),
        post.nickname,
        post.username,
        post.description
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !searchQuery || searchableText.includes(searchQuery);
      return matchesCountry && matchesSearch;
    });

    filteredPosts.sort((a, b) => {
      if (sortValue === "oldest") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }

      if (sortValue === "rating_desc") {
        return Number(b.averageRating || 0) - Number(a.averageRating || 0);
      }

      if (sortValue === "rating_asc") {
        return Number(a.averageRating || 0) - Number(b.averageRating || 0);
      }

      if (sortValue === "country_asc") {
        return String(a.country || "").localeCompare(String(b.country || ""));
      }

      if (sortValue === "country_desc") {
        return String(b.country || "").localeCompare(String(a.country || ""));
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    renderSavedPosts(filteredPosts);
  }

  function renderSavedPosts(posts) {
    if (!savedPostsGrid) {
      return;
    }

    const count = posts.length;
    if (savedPostsCountBadge) {
      savedPostsCountBadge.textContent = `${count} ${count === 1 ? "post" : "posts"}`;
    }

    savedPostsGrid.innerHTML = "";

    if (!posts.length) {
      savedPostsGrid.innerHTML = '<p class="tripnest-empty-posts">No saved posts yet.</p>';
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
      const author = post.nickname || post.username;
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
          <div class="tripnest-post-topline">
            <strong>${post.country}</strong>
            <span class="tripnest-post-inline-score">${averageRating}</span>
          </div>
          <p class="tripnest-saved-post-author">Από ${author}</p>
          <p>${cities}</p>
          ${description}
          <small>${tripDurationText}</small>
        </div>
      `;

      savedPostsGrid.appendChild(card);
    });
  }

  async function loadSavedPosts() {
    const response = await fetch("/api/posts");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to load the saved items.");
    }

    const posts = Array.isArray(data.posts) ? data.posts : [];
    const savedPosts = posts
      .filter((post) => Array.isArray(post.savedBy) && post.savedBy.includes(user.id))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    allSavedPosts = savedPosts;
    populateCountryFilter(savedPosts);
    applyFiltersAndRender();
  }

  if (savedPostsGrid) {
    savedPostsGrid.addEventListener("click", (event) => {
      const card = event.target.closest(".tripnest-post-card");
      if (!card?.dataset.postId) {
        return;
      }

      window.location.href = `./post.html?postId=${encodeURIComponent(card.dataset.postId)}`;
    });
  }

  if (savedLogoutBtn) {
    savedLogoutBtn.addEventListener("click", () => {
      localStorage.removeItem("tripnest_user");
      window.location.href = "/";
    });
  }

  if (savedSearchInput) {
    savedSearchInput.addEventListener("input", () => {
      applyFiltersAndRender();
    });
  }

  if (savedCountryFilter) {
    savedCountryFilter.addEventListener("input", () => {
      applyFiltersAndRender();
    });
  }

  if (savedSortSelect) {
    savedSortSelect.addEventListener("change", () => {
      applyFiltersAndRender();
    });
  }

  try {
    await loadSavedPosts();
  } catch (error) {
    if (savedPostsGrid) {
      savedPostsGrid.innerHTML = `<p class="tripnest-empty-posts">${error.message}</p>`;
    }
  }
});
