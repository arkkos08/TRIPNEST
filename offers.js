document.addEventListener("DOMContentLoaded", async () => {
  const storedUser = JSON.parse(localStorage.getItem("tripnest_user") || "null");
  if (!storedUser) {
    window.location.href = "/";
    return;
  }

  const offersProfileNavLink = document.getElementById("offersProfileNavLink");
  const offersProfileNavTitle = document.getElementById("offersProfileNavTitle");
  const offersLogoutBtn = document.getElementById("offersLogoutBtn");
  const offersTypeFilter = document.getElementById("offersTypeFilter");
  const offersProviderFilter = document.getElementById("offersProviderFilter");
  const offersBudgetFilter = document.getElementById("offersBudgetFilter");
  const offersSearchInput = document.getElementById("offersSearchInput");
  const offersGrid = document.getElementById("offersGrid");
  const offersSummary = document.getElementById("offersSummary");

  const languageState = {
    current: localStorage.getItem("tripnest_language") || "en"
  };
  localStorage.setItem("tripnest_language", "en");

  const translations = {
    el: {
      profile: "Το προφίλ μου",
      offersTitle: "Προσφορές",
      offersSubtitle: "Πτήσεις, ξενοδοχεία και πακέτα από Booking, Skyscanner και eSky.",
      allCategories: "Όλες οι κατηγορίες",
      flights: "Πτήσεις",
      hotels: "Ξενοδοχεία",
      packages: "Πακέτα",
      allProviders: "Όλοι οι πάροχοι",
      allBudgets: "Όλα τα budget",
      low: "Χαμηλό",
      medium: "Μεσαίο",
      high: "Υψηλό",
      searchPlaceholder: "Αναζήτηση προορισμού ή παρόχου",
      loading: "Φόρτωση προσφορών...",
      noMatches: "Δεν βρέθηκαν προσφορές με αυτά τα φίλτρα.",
      updated: "Ενημερώθηκε:",
      perPerson: "/ άτομο",
      viewOffer: "Δες την προσφορά",
      departure: "Αναχώρηση:",
      returnDate: "Επιστροφή:",
      category: "Κατηγορία:",
      flight: "Πτήση",
      hotel: "Ξενοδοχείο",
      package: "Πακέτο",
      backToMap: "Επιστροφή στον χάρτη",
      search: "Αναζήτηση"
    },
    en: {
      profile: "My profile",
      offersTitle: "Offers",
      offersSubtitle: "Flights, hotels and packages from Booking, Skyscanner and eSky.",
      allCategories: "All categories",
      flights: "Flights",
      hotels: "Hotels",
      packages: "Packages",
      allProviders: "All providers",
      allBudgets: "All budgets",
      low: "Low",
      medium: "Medium",
      high: "High",
      searchPlaceholder: "Search destination or provider",
      loading: "Loading offers...",
      noMatches: "No offers match these filters.",
      updated: "Updated:",
      perPerson: "/ person",
      viewOffer: "View offer",
      departure: "Departure:",
      returnDate: "Return:",
      category: "Category:",
      flight: "Flight",
      hotel: "Hotel",
      package: "Package",
      backToMap: "Back to map",
      search: "Search"
    }
  };

  function getLanguage() {
    return languageState.current;
  }

  function getTranslation(key) {
    return translations[getLanguage()]?.[key] || translations.en[key] || key;
  }

  function setLanguageButtonState() {
    document.querySelectorAll(".tripnest-language-toggle").forEach((button) => button.remove());
  }

  function updateFilterLabels() {
    if (!offersTypeFilter || !offersProviderFilter || !offersBudgetFilter) {
      return;
    }

    offersTypeFilter.innerHTML = `
      <option value="all">${getTranslation("allCategories")}</option>
      <option value="flight">${getTranslation("flights")}</option>
      <option value="hotel">${getTranslation("hotels")}</option>
      <option value="package">${getTranslation("packages")}</option>
    `;

    offersProviderFilter.innerHTML = `
      <option value="all">${getTranslation("allProviders")}</option>
      <option value="booking">Booking</option>
      <option value="skyscanner">Skyscanner</option>
      <option value="esky">eSky</option>
    `;

    offersBudgetFilter.innerHTML = `
      <option value="all">${getTranslation("allBudgets")}</option>
      <option value="low">${getTranslation("low")}</option>
      <option value="medium">${getTranslation("medium")}</option>
      <option value="high">${getTranslation("high")}</option>
    `;

    offersSearchInput.placeholder = getTranslation("searchPlaceholder");
  }

  function updatePageLanguage() {
    document.documentElement.lang = getLanguage() === "en" ? "en" : "el";
    setLanguageButtonState();
    updateFilterLabels();

    const backLink = document.querySelector(".tripnest-back-link");
    if (backLink) {
      backLink.textContent = getTranslation("backToMap");
    }

    const pageTitle = document.querySelector(".tripnest-trip-plans-head h1");
    if (pageTitle) {
      pageTitle.textContent = getTranslation("offersTitle");
    }

    const pageSubtitle = document.querySelector(".tripnest-trip-plans-head p");
    if (pageSubtitle) {
      pageSubtitle.textContent = getTranslation("offersSubtitle");
    }

    const offersSummaryText = document.getElementById("offersSummary");
    if (offersSummaryText && offersSummaryText.dataset.initial) {
      offersSummaryText.textContent = `${getTranslation("updated")} ${offersSummaryText.dataset.initial}`;
    }

    if (offersProfileNavTitle) {
      offersProfileNavTitle.textContent = storedUser.nickname || storedUser.username;
    }

    const profileSubtitle = document.querySelector("#offersProfileNavLink .tripnest-sidebar-subtitle");
    if (profileSubtitle) {
      profileSubtitle.textContent = getTranslation("profile");
    }

    const topbarSearch = document.querySelector(".tripnest-topbar-search");
    if (topbarSearch) {
      topbarSearch.placeholder = getTranslation("search");
    }

    renderOffers();
  }

  if (offersProfileNavLink) {
    offersProfileNavLink.href = "./profile.html";
  }

  if (offersProfileNavTitle) {
    offersProfileNavTitle.textContent = storedUser.nickname || storedUser.username;
  }

  if (offersLogoutBtn) {
    offersLogoutBtn.addEventListener("click", () => {
      localStorage.removeItem("tripnest_user");
      window.location.href = "/";
    });
  }

  let offers = [];

  function formatOfferPrice(value) {
    const numericValue = Number(value || 0);
    return new Intl.NumberFormat(getLanguage() === "en" ? "en-US" : "el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(numericValue);
  }

  function getOfferTypeLabel(type) {
    if (type === "flight") return getTranslation("flight");
    if (type === "hotel") return getTranslation("hotel");
    return getTranslation("package");
  }

  function getOfferBudgetLabel(value) {
    if (value === "low") return getTranslation("low");
    if (value === "high") return getTranslation("high");
    return getTranslation("medium");
  }

  function renderOffers() {
    if (!offersGrid) {
      return;
    }

    const filters = {
      type: String(offersTypeFilter?.value || "all"),
      provider: String(offersProviderFilter?.value || "all"),
      budget: String(offersBudgetFilter?.value || "all"),
      search: String(offersSearchInput?.value || "").trim().toLowerCase()
    };

    const visibleOffers = offers.filter((offer) => {
      const matchesType = filters.type === "all" || offer.type === filters.type;
      const matchesProvider = filters.provider === "all" || offer.provider === filters.provider;
      const matchesBudget = filters.budget === "all" || offer.budget === filters.budget;
      const searchable = [offer.title, offer.route, offer.provider, offer.type, getOfferTypeLabel(offer.type)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !filters.search || searchable.includes(filters.search);

      return matchesType && matchesProvider && matchesBudget && matchesSearch;
    });

    offersGrid.innerHTML = "";
    if (!visibleOffers.length) {
      offersGrid.innerHTML = `<p class="tripnest-empty-posts">${getTranslation("noMatches")}</p>`;
      return;
    }

    visibleOffers.forEach((offer) => {
      const card = document.createElement("article");
      card.className = "tripnest-offer-card";
      card.innerHTML = `
        <div class="tripnest-offer-card-head">
          <span class="tripnest-offer-provider">${offer.provider}</span>
          <span class="tripnest-offer-type">${getOfferTypeLabel(offer.type)}</span>
        </div>

        <div>
          <h3>${offer.title}</h3>
          <p class="tripnest-offer-route">${offer.route}</p>
        </div>

        <ul class="tripnest-offer-meta">
          <li>${getTranslation("departure")} ${offer.departure}</li>
          <li>${getTranslation("returnDate")} ${offer.returnDate}</li>
          <li>${getTranslation("category")} ${getOfferBudgetLabel(offer.budget)}</li>
        </ul>

        <div class="tripnest-offer-foot">
          <div class="tripnest-offer-price">${formatOfferPrice(offer.price)}<small>${getTranslation("perPerson")}</small></div>
          <button type="button" class="tripnest-offer-link" data-offer-url="${encodeURIComponent(offer.url || "")}">${getTranslation("viewOffer")}</button>
        </div>
      `;

      card.querySelector(".tripnest-offer-link").addEventListener("click", (event) => {
        event.preventDefault();
        const targetUrl = decodeURIComponent(event.currentTarget.dataset.offerUrl || "");

        if (!targetUrl) {
          return;
        }

        window.open(targetUrl, "_blank", "noopener,noreferrer");

        void fetch("/api/offers/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl })
        }).then(async (response) => {
          try {
            const data = await response.json();
            if (!response.ok) {
              console.warn(data.message || "Δεν έγινε εξαγωγή δεδομένων.");
            }
          } catch (error) {
            console.warn("Offer scrape did not return JSON.", error);
          }
        }).catch((error) => {
          console.warn("Offer scrape failed.", error);
        });
      });

      offersGrid.appendChild(card);
    });
  }

  async function loadOffers() {
    const response = await fetch("/api/offers");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Δεν ήταν δυνατή η φόρτωση προσφορών.");
    }

    offers = Array.isArray(data.offers) ? data.offers : [];
    if (offersSummary) {
      const updatedAt = offers[0]?.updatedAt || data.generatedAt;
      const friendlyDate = updatedAt
        ? new Date(updatedAt).toLocaleString(getLanguage() === "en" ? "en-US" : "el-GR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })
        : getLanguage() === "en" ? "today" : "σήμερα";
      offersSummary.dataset.initial = friendlyDate;
      offersSummary.textContent = `${getTranslation("updated")} ${friendlyDate}`;
    }

    renderOffers();
  }

  if (offersTypeFilter) {
    offersTypeFilter.addEventListener("change", renderOffers);
  }

  if (offersProviderFilter) {
    offersProviderFilter.addEventListener("change", renderOffers);
  }

  if (offersBudgetFilter) {
    offersBudgetFilter.addEventListener("change", renderOffers);
  }

  if (offersSearchInput) {
    offersSearchInput.addEventListener("input", renderOffers);
  }

  document.querySelectorAll(".tripnest-language-toggle").forEach((button) => button.remove());
  updatePageLanguage();

  try {
    await loadOffers();
    window.setInterval(() => {
      loadOffers().catch(() => {});
    }, 24 * 60 * 60 * 1000);
  } catch (error) {
    if (offersGrid) {
      offersGrid.innerHTML = `<p class="tripnest-empty-posts">${error.message}</p>`;
    }
  }
});
