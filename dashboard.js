document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("tripnest_user") || "null");

  if (!user) {
    window.location.href = "/";
    return;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  const profileNavLink = document.getElementById("profileNavLink");
  const profileNavTitle = document.getElementById("profileNavTitle");
  const welcomeUser = document.getElementById("welcomeUser");
  const countrySelect = document.getElementById("countrySelect");
  const addCountryBtn = document.getElementById("addCountryBtn");
  const removeCountryBtn = document.getElementById("removeCountryBtn");
  const clearCountriesBtn = document.getElementById("clearCountriesBtn");
  const visitedPercentBig = document.getElementById("visitedPercentBig");
  const visitedCountriesBig = document.getElementById("visitedCountriesBig");
  const visitedCountriesText = document.getElementById("visitedCountriesText");
  const progressRing = document.getElementById("progressRing");
  const dashboardFeedGrid = document.getElementById("dashboardFeedGrid");

  const totalCountries = 195;
  const storageKey = `tripnest_visited_${user.username}`;
  let visitedCountries = new Set(JSON.parse(localStorage.getItem(storageKey) || "[]"));
  let map = null;

  let selectedCountry = "";
  let countryAutocomplete = null;

  const countries = [
    ["Afghanistan","AF"],["Albania","AL"],["Algeria","DZ"],["Andorra","AD"],["Angola","AO"],
    ["Antigua and Barbuda","AG"],["Argentina","AR"],["Armenia","AM"],["Australia","AU"],["Austria","AT"],
    ["Azerbaijan","AZ"],["Bahamas","BS"],["Bahrain","BH"],["Bangladesh","BD"],["Barbados","BB"],
    ["Belarus","BY"],["Belgium","BE"],["Belize","BZ"],["Benin","BJ"],["Bhutan","BT"],
    ["Bolivia","BO"],["Bosnia and Herzegovina","BA"],["Botswana","BW"],["Brazil","BR"],["Brunei","BN"],
    ["Bulgaria","BG"],["Burkina Faso","BF"],["Burundi","BI"],["Cabo Verde","CV"],["Cambodia","KH"],
    ["Cameroon","CM"],["Canada","CA"],["Central African Republic","CF"],["Chad","TD"],["Chile","CL"],
    ["China","CN"],["Colombia","CO"],["Comoros","KM"],["Congo","CG"],["Costa Rica","CR"],
    ["Cote d'Ivoire","CI"],["Croatia","HR"],["Cuba","CU"],["Cyprus","CY"],["Czechia","CZ"],
    ["Democratic Republic of the Congo","CD"],["Denmark","DK"],["Djibouti","DJ"],["Dominica","DM"],["Dominican Republic","DO"],
    ["Ecuador","EC"],["Egypt","EG"],["El Salvador","SV"],["Equatorial Guinea","GQ"],["Eritrea","ER"],
    ["Estonia","EE"],["Eswatini","SZ"],["Ethiopia","ET"],["Fiji","FJ"],["Finland","FI"],
    ["France","FR"],["Gabon","GA"],["Gambia","GM"],["Georgia","GE"],["Germany","DE"],
    ["Ghana","GH"],["Greece","GR"],["Grenada","GD"],["Guatemala","GT"],["Guinea","GN"],
    ["Guinea-Bissau","GW"],["Guyana","GY"],["Haiti","HT"],["Holy See","VA"],["Honduras","HN"],
    ["Hungary","HU"],["Iceland","IS"],["India","IN"],["Indonesia","ID"],["Iran","IR"],
    ["Iraq","IQ"],["Ireland","IE"],["Israel","IL"],["Italy","IT"],["Jamaica","JM"],
    ["Japan","JP"],["Jordan","JO"],["Kazakhstan","KZ"],["Kenya","KE"],["Kiribati","KI"],
    ["Kuwait","KW"],["Kyrgyzstan","KG"],["Laos","LA"],["Latvia","LV"],["Lebanon","LB"],
    ["Lesotho","LS"],["Liberia","LR"],["Libya","LY"],["Liechtenstein","LI"],["Lithuania","LT"],
    ["Luxembourg","LU"],["Madagascar","MG"],["Malawi","MW"],["Malaysia","MY"],["Maldives","MV"],
    ["Mali","ML"],["Malta","MT"],["Marshall Islands","MH"],["Mauritania","MR"],["Mauritius","MU"],
    ["Mexico","MX"],["Micronesia","FM"],["Moldova","MD"],["Monaco","MC"],["Mongolia","MN"],
    ["Montenegro","ME"],["Morocco","MA"],["Mozambique","MZ"],["Myanmar","MM"],["Namibia","NA"],
    ["Nauru","NR"],["Nepal","NP"],["Netherlands","NL"],["New Zealand","NZ"],["Nicaragua","NI"],
    ["Niger","NE"],["Nigeria","NG"],["North Korea","KP"],["North Macedonia","MK"],["Norway","NO"],
    ["Oman","OM"],["Pakistan","PK"],["Palau","PW"],["Palestine","PS"],["Panama","PA"],
    ["Papua New Guinea","PG"],["Paraguay","PY"],["Peru","PE"],["Philippines","PH"],["Poland","PL"],
    ["Portugal","PT"],["Qatar","QA"],["Romania","RO"],["Russia","RU"],["Rwanda","RW"],
    ["Saint Kitts and Nevis","KN"],["Saint Lucia","LC"],["Saint Vincent and the Grenadines","VC"],["Samoa","WS"],["San Marino","SM"],
    ["Sao Tome and Principe","ST"],["Saudi Arabia","SA"],["Senegal","SN"],["Serbia","RS"],["Seychelles","SC"],
    ["Sierra Leone","SL"],["Singapore","SG"],["Slovakia","SK"],["Slovenia","SI"],["Solomon Islands","SB"],
    ["Somalia","SO"],["South Africa","ZA"],["South Korea","KR"],["South Sudan","SS"],["Spain","ES"],
    ["Sri Lanka","LK"],["Sudan","SD"],["Suriname","SR"],["Sweden","SE"],["Switzerland","CH"],
    ["Syria","SY"],["Tajikistan","TJ"],["Tanzania","TZ"],["Thailand","TH"],["Timor-Leste","TL"],
    ["Togo","TG"],["Tonga","TO"],["Trinidad and Tobago","TT"],["Tunisia","TN"],["Turkey","TR"],
    ["Turkmenistan","TM"],["Tuvalu","TV"],["Uganda","UG"],["Ukraine","UA"],["United Arab Emirates","AE"],
    ["United Kingdom","GB"],["United States","US"],["Uruguay","UY"],["Uzbekistan","UZ"],["Vanuatu","VU"],
    ["Venezuela","VE"],["Vietnam","VN"],["Yemen","YE"],["Zambia","ZM"],["Zimbabwe","ZW"]
  ];

  const countryMap = Object.fromEntries(countries);

  function injectAutocompleteStyles() {
    if (document.getElementById("tripnestDashboardAutocompleteStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "tripnestDashboardAutocompleteStyles";
    style.textContent = `
      .tripnest-autocomplete-shell {
        position: relative;
        width: 100%;
      }

      .tripnest-autocomplete-input {
        width: 100%;
        min-height: 46px;
        padding: 12px 14px;
        border: 1px solid #d7e5dc;
        border-radius: 14px;
        background: #ffffff;
        color: #173328;
        font: inherit;
      }

      .tripnest-autocomplete-input:focus {
        outline: none;
        border-color: #1c7f4f;
        box-shadow: 0 0 0 4px rgba(28, 127, 79, 0.12);
      }

      .tripnest-autocomplete-results {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        right: 0;
        z-index: 1000;
        background: #ffffff;
        border: 1px solid #d7e5dc;
        border-radius: 16px;
        box-shadow: 0 16px 32px rgba(13, 75, 45, 0.12);
        padding: 8px;
        max-height: 260px;
        overflow-y: auto;
      }

      .tripnest-autocomplete-results[hidden] {
        display: none !important;
      }

      .tripnest-autocomplete-item {
        width: 100%;
        display: block;
        padding: 10px 12px;
        border: 0;
        border-radius: 12px;
        background: transparent;
        color: #173328;
        text-align: left;
        cursor: pointer;
        font: inherit;
      }

      .tripnest-autocomplete-item:hover {
        background: #eef6f1;
      }

      .tripnest-autocomplete-empty,
      .tripnest-autocomplete-hint {
        padding: 10px 12px;
        color: #648173;
        font-size: 0.95rem;
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function findCountryMatch(value) {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue) {
      return "";
    }

    const match = countries.find(([name]) => normalizeText(name) === normalizedValue);
    return match ? match[0] : "";
  }

  function createCountryAutocomplete() {
    if (!countrySelect || !countrySelect.parentElement) {
      return null;
    }

    countrySelect.style.display = "none";

    const shell = document.createElement("div");
    shell.className = "tripnest-autocomplete-shell";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "tripnest-autocomplete-input";
    input.placeholder = "Type at least 2 characters";
    input.autocomplete = "off";

    const results = document.createElement("div");
    results.className = "tripnest-autocomplete-results";
    results.hidden = true;

    countrySelect.parentElement.insertBefore(shell, countrySelect);
    shell.appendChild(input);
    shell.appendChild(results);

    return { shell, input, results };
  }

  function openAutocomplete() {
    if (!countryAutocomplete?.results) {
      return;
    }
    countryAutocomplete.results.hidden = false;
  }

  function closeAutocomplete() {
    if (!countryAutocomplete?.results) {
      return;
    }
    countryAutocomplete.results.hidden = true;
    countryAutocomplete.results.innerHTML = "";
  }

  function renderAutocompleteResults(items) {
    if (!countryAutocomplete?.results) {
      return;
    }

    countryAutocomplete.results.innerHTML = "";

    if (!items.length) {
      countryAutocomplete.results.innerHTML = '<div class="tripnest-autocomplete-empty">No countries found.</div>';
      openAutocomplete();
      return;
    }

    items.forEach((country) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tripnest-autocomplete-item";
      button.textContent = country;
      button.addEventListener("click", () => {
        selectedCountry = country;
        countrySelect.value = country;
        countryAutocomplete.input.value = country;
        closeAutocomplete();
      });
      countryAutocomplete.results.appendChild(button);
    });

    openAutocomplete();
  }

  function showAutocompleteHint(text) {
    if (!countryAutocomplete?.results) {
      return;
    }

    countryAutocomplete.results.innerHTML = `<div class="tripnest-autocomplete-hint">${text}</div>`;
    openAutocomplete();
  }

  function updateCountryAutocompleteResults() {
    if (!countryAutocomplete?.input) {
      return;
    }

    const query = normalizeText(countryAutocomplete.input.value);

    if (query.length < 2) {
      selectedCountry = findCountryMatch(countryAutocomplete.input.value) || "";
      closeAutocomplete();
      return;
    }

    const matches = countries
      .map(([name]) => name)
      .filter((name) => normalizeText(name).includes(query))
      .slice(0, 10);

    renderAutocompleteResults(matches);
  }

  function populateCountrySelect() {
    if (!countrySelect) {
      return;
    }

    countrySelect.innerHTML = '<option value="">Choose country</option>';

    countries.forEach(([name]) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      countrySelect.appendChild(option);
    });
  }

  function save() {
    const nextCountries = [...visitedCountries];
    localStorage.setItem(storageKey, JSON.stringify(nextCountries));

    const currentUser = JSON.parse(localStorage.getItem("tripnest_user") || "null");
    if (currentUser) {
      currentUser.visitedCountries = nextCountries.length;
      localStorage.setItem("tripnest_user", JSON.stringify(currentUser));
      user.visitedCountries = nextCountries.length;
    }
  }

  function updateStats() {
    const count = visitedCountries.size;
    const percent = ((count / totalCountries) * 100).toFixed(1);
    const deg = (count / totalCountries) * 360;

    visitedPercentBig.textContent = `${percent}%`;
    visitedCountriesBig.textContent = String(count);
    visitedCountriesText.textContent = `${count} / ${totalCountries} UN Countries`;
    progressRing.style.background = `conic-gradient(#ffffff 0deg ${deg}deg, rgba(255, 255, 255, 0.28) ${deg}deg 360deg)`;
  }

  function paintMap() {
    const selectedCodes = [...visitedCountries]
      .map((country) => countryMap[country])
      .filter(Boolean);

    if (!map) {
      return;
    }

    map.clearSelectedRegions();
    map.setSelectedRegions(selectedCodes);
  }

  function addVisitedCountry(country) {
    if (!country || !countryMap[country]) {
      return;
    }

    visitedCountries.add(country);
    save();
    paintMap();
    updateStats();
  }

  function removeVisitedCountry(country) {
    if (!country || !visitedCountries.has(country)) {
      return;
    }

    visitedCountries.delete(country);
    save();
    paintMap();
    updateStats();
  }

  function clearVisitedCountries() {
    if (visitedCountries.size === 0) {
      return;
    }

    visitedCountries.clear();
    save();
    paintMap();
    updateStats();
  }

  function initMap() {
    map = new jsVectorMap({
      selector: "#beenMap",
      map: "world",
      zoomButtons: false,
      backgroundColor: "transparent",
      regionStyle: {
        initial: {
          fill: "#d4dadd",
          stroke: "#ffffff",
          strokeWidth: 0.8
        },
        hover: {
          fill: "#b7d8c5"
        },
        selected: {
          fill: "#1c7f4f"
        }
      }
    });

    paintMap();
  }

  function renderFeedPosts(posts) {
    if (!dashboardFeedGrid) {
      return;
    }

    dashboardFeedGrid.innerHTML = "";

    if (!Array.isArray(user.following) || !user.following.length) {
      dashboardFeedGrid.innerHTML =
        '<p class="tripnest-empty-posts">Follow users to see their posts here.</p>';
      return;
    }

    if (!posts.length) {
      dashboardFeedGrid.innerHTML =
        '<p class="tripnest-empty-posts">The users you follow have not posted anything yet.</p>';
      return;
    }

    posts.forEach((post) => {
      const card = document.createElement("article");
      card.className = "tripnest-post-card tripnest-dashboard-feed-card";
      card.dataset.postId = post.id;

      const averageRating = Number(post.averageRating || 0).toFixed(2);
      const cover = post.photos?.[0]
        ? `<img src="${post.photos[0]}" alt="${post.country}" class="tripnest-post-cover" />`
        : `<div class="tripnest-post-cover tripnest-post-cover-placeholder">${post.country}</div>`;
      const authorName = post.nickname || post.username;
      const cities = Array.isArray(post.cities) && post.cities.length
        ? post.cities.join(", ")
        : "No cities added";
      const description = post.description ? `<p class="tripnest-post-description">${post.description}</p>` : "";
      const tripDurationText = (() => {
        const totalDays = Number(post.totalDays ?? 0);
        if (Number.isFinite(totalDays) && totalDays > 0) {
          return `${totalDays} days`;
        }
        if (post.travelDate && post.returnDate) {
          const start = new Date(`${post.travelDate}T00:00:00`);
          const end = new Date(`${post.returnDate}T00:00:00`);
          if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
            const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
            const safeDays = Math.max(0, diffDays + 1);
            return `${safeDays} days`;
          }
        }
        return "0 days";
      })();

      card.innerHTML = `
        ${cover}
        <div class="tripnest-post-body">
          <div class="tripnest-dashboard-feed-topline">
            <strong>${authorName}</strong>
            <span>@${post.username}</span>
          </div>
          <div class="tripnest-post-topline">
            <strong>${post.country}</strong>
            <span class="tripnest-post-inline-score">${averageRating}</span>
          </div>
          <p>${cities}</p>
          ${description}
          <small>${tripDurationText}</small>
        </div>
      `;

      dashboardFeedGrid.appendChild(card);
    });
  }

  async function loadDashboardFeed() {
    if (!dashboardFeedGrid) {
      return;
    }

    if (!Array.isArray(user.following) || !user.following.length) {
      renderFeedPosts([]);
      return;
    }

    try {
      const response = await fetch("/api/posts");
      const data = await response.json();
      const posts = Array.isArray(data.posts) ? data.posts : [];
      const followedIds = new Set(user.following || []);
      renderFeedPosts(posts.filter((post) => followedIds.has(post.userId)));
    } catch (error) {
      dashboardFeedGrid.innerHTML = '<p class="tripnest-empty-posts">The feed could not be loaded.</p>';
    }
  }

  async function refreshUserProfile() {
    try {
      const response = await fetch(`/api/profile?id=${encodeURIComponent(user.id)}`);
      const data = await response.json();
      if (!response.ok || !data.user) {
        return;
      }

      Object.assign(user, data.user);
      localStorage.setItem("tripnest_user", JSON.stringify(data.user));
      if (profileNavTitle) {
        profileNavTitle.textContent = data.user.nickname || data.user.username;
      }
    } catch (error) {
      // Keep dashboard usable even if profile refresh fails.
    }
  }

  if (welcomeUser) {
    welcomeUser.textContent = `Welcome ${user.nickname || user.username} (@${user.username}).`;
  }

  if (profileNavLink) {
    profileNavLink.href = "./profile.html";
  }

  if (profileNavTitle) {
    profileNavTitle.textContent = user.nickname || user.username;
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("tripnest_user");
      window.location.href = "/";
    });
  }

  if (addCountryBtn) {
    addCountryBtn.addEventListener("click", () => {
      const country = selectedCountry || findCountryMatch(countryAutocomplete?.input?.value || countrySelect?.value);
      if (!country) {
        return;
      }

      selectedCountry = country;
      countrySelect.value = country;
      if (countryAutocomplete?.input) {
        countryAutocomplete.input.value = country;
      }

      addVisitedCountry(country);
      closeAutocomplete();
    });
  }

  if (removeCountryBtn) {
    removeCountryBtn.addEventListener("click", () => {
      const country = selectedCountry || findCountryMatch(countryAutocomplete?.input?.value || countrySelect?.value);
      if (!country) {
        return;
      }

      selectedCountry = country;
      countrySelect.value = country;
      if (countryAutocomplete?.input) {
        countryAutocomplete.input.value = country;
      }

      removeVisitedCountry(country);
      closeAutocomplete();
    });
  }

  if (clearCountriesBtn) {
    clearCountriesBtn.addEventListener("click", () => {
      clearVisitedCountries();
    });
  }

  if (dashboardFeedGrid) {
    dashboardFeedGrid.addEventListener("click", (event) => {
      const card = event.target.closest(".tripnest-dashboard-feed-card");
      if (!card?.dataset.postId) {
        return;
      }

      window.location.href = `./post.html?postId=${encodeURIComponent(card.dataset.postId)}`;
    });
  }

  injectAutocompleteStyles();
  populateCountrySelect();
  countryAutocomplete = createCountryAutocomplete();

  if (countryAutocomplete?.input) {
    countryAutocomplete.input.addEventListener("input", () => {
      selectedCountry = findCountryMatch(countryAutocomplete.input.value) || "";
      if (selectedCountry) {
        countrySelect.value = selectedCountry;
      }
      updateCountryAutocompleteResults();
    });

    countryAutocomplete.input.addEventListener("focus", () => {
      if (!countryAutocomplete.input.value.trim()) {
        showAutocompleteHint("Type at least 2 characters.");
        return;
      }
      updateCountryAutocompleteResults();
    });

    countryAutocomplete.input.addEventListener("blur", () => {
      const exactMatch = findCountryMatch(countryAutocomplete.input.value);
      if (exactMatch) {
        selectedCountry = exactMatch;
        countrySelect.value = exactMatch;
        countryAutocomplete.input.value = exactMatch;
      }
    });
  }

  document.addEventListener("click", (event) => {
    const insideAutocomplete = countryAutocomplete?.shell?.contains(event.target);
    if (!insideAutocomplete) {
      closeAutocomplete();
    }
  });

  initMap();
  updateStats();
  refreshUserProfile().then(loadDashboardFeed);
});