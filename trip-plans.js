document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("tripnest_user") || "null");
  if (!user) {
    window.location.href = "/";
    return;
  }

  const tripPlansProfileNavLink = document.getElementById("tripPlansProfileNavLink");
  const tripPlansProfileNavTitle = document.getElementById("tripPlansProfileNavTitle");
  const tripPlansLogoutBtn = document.getElementById("tripPlansLogoutBtn");
  const tripPlansMessage = document.getElementById("tripPlansMessage");

  const openTripPlanModalBtn = document.getElementById("openTripPlanModalBtn");
  const tripPlanModal = document.getElementById("tripPlanModal");
  const closeTripPlanModalBtn = document.getElementById("closeTripPlanModalBtn");
  const cancelTripPlanModalBtn = document.getElementById("cancelTripPlanModalBtn");

  const tripPlanForm = document.getElementById("tripPlanForm");
  const tripPlanCountryInput = document.getElementById("tripPlanCountrySelect");
  const tripPlanCityInput = document.getElementById("tripPlanCitySelect");
  const addTripPlanCityBtn = document.getElementById("addTripPlanCityBtn");
  const tripPlanCitiesList = document.getElementById("tripPlanCitiesList");
  const tripPlanStartDate = document.getElementById("tripPlanStartDate");
  const tripPlanReturnDate = document.getElementById("tripPlanReturnDate");
  const tripPlanRequestedPeople = document.getElementById("tripPlanRequestedPeople");
  const tripPlanGenderPreference = document.getElementById("tripPlanGenderPreference");
  const tripPlanAgeMin = document.getElementById("tripPlanAgeMin");
  const tripPlanAgeMax = document.getElementById("tripPlanAgeMax");
  const tripPlanBudget = document.getElementById("tripPlanBudget");
  const tripPlanVisibility = document.getElementById("tripPlanVisibility");
  const tripPlanDescription = document.getElementById("tripPlanDescription");
  const deleteTripPlanBtn = document.getElementById("deleteTripPlanBtn");

  const myTripPlansGrid = document.getElementById("myTripPlansGrid");
  const discoverTripPlansGrid = document.getElementById("discoverTripPlansGrid");
  const tripPlansSearchInput = document.getElementById("tripPlansSearchInput");
  const tripPlansRelationFilter = document.getElementById("tripPlansRelationFilter");
  const tripPlansCountryFilter = document.getElementById("tripPlansCountryFilter");
  const tripPlansCountryFilterOptions = document.getElementById("tripPlansCountryFilterOptions");

  const offersTypeFilter = document.getElementById("offersTypeFilter");
  const offersProviderFilter = document.getElementById("offersProviderFilter");
  const offersBudgetFilter = document.getElementById("offersBudgetFilter");
  const offersSearchInput = document.getElementById("offersSearchInput");
  const offersGrid = document.getElementById("offersGrid");
  const offersSummary = document.getElementById("offersSummary");

  const tripPlanExecuteModal = document.getElementById("tripPlanExecuteModal");
  const closeTripPlanExecuteModalBtn = document.getElementById("closeTripPlanExecuteModalBtn");
  const cancelTripPlanExecuteModalBtn = document.getElementById("cancelTripPlanExecuteModalBtn");
  const confirmTripPlanExecuteBtn = document.getElementById("confirmTripPlanExecuteBtn");
  const tripPlanExecuteSummary = document.getElementById("tripPlanExecuteSummary");
  const tripPlanExecuteInterestedList = document.getElementById("tripPlanExecuteInterestedList");
  const tripPlanExecuteAirportInfo = document.getElementById("tripPlanExecuteAirportInfo");
  const bookHotelBtn = document.getElementById("bookHotelBtn");
  const bookFlightsBtn = document.getElementById("bookFlightsBtn");
  const flightProviderModal = document.getElementById("flightProviderModal");
  const closeFlightProviderModalBtn = document.getElementById("closeFlightProviderModalBtn");
  const cancelFlightProviderModalBtn = document.getElementById("cancelFlightProviderModalBtn");
  const flightProviderChooser = document.querySelector(".tripnest-flight-provider-chooser-modal");
  const hotelProviderModal = document.getElementById("hotelProviderModal");
  const closeHotelProviderModalBtn = document.getElementById("closeHotelProviderModalBtn");
  const cancelHotelProviderModalBtn = document.getElementById("cancelHotelProviderModalBtn");
  const hotelProviderChooser = document.querySelector(".tripnest-hotel-provider-chooser-modal");
  const eskyHotelLiveResults = document.getElementById("eskyHotelLiveResults");

  let countries = [];
  let countryCities = {};
  let tripPlanCities = [];
  let myTripPlans = [];
  let discoverTripPlans = [];
  let offers = [];
  let editingTripPlanId = null;
  let executingTripPlanId = null;
  let executingTripPlanAirport = null;

  const HOTEL_DESTINATION_MAPPINGS = {
    "rio de janeiro|brazil": {
      skyscanner: {
        entityId: "27541837",
        countrySlug: "brazil",
        citySlug: "rio-de-janeiro-hotels"
      },
      airbnb: {
        slug: "Rio-de-Janeiro--Brazil"
      },
      booking: {
        label: "Rio de Janeiro, Brazil",
        cityPath: "https://www.booking.com/city/br/rio-de-janeiro.html"
      },
      esky: {
        label: "Rio de Janeiro, Brazil",
        cityPath: "https://www.esky.com/hotels/ci/rio/hotels-rio-de-janeiro"
      }
    },
    "dublin|ireland": {
      skyscanner: {
        entityId: "27540823",
        countrySlug: "ireland",
        citySlug: "dublin-hotels"
      },
      airbnb: {
        slug: "Dublin--Ireland"
      },
      booking: {
        label: "Dublin, Ireland",
        cityPath: "https://www.booking.com/city/ie/dublin.html"
      },
      esky: {
        label: "Dublin, Ireland",
        cityPath: "https://www.esky.com/hotels/ci/dub/hotels-dublin"
      }
    }
  };

  let selectedCountry = "";
  let selectedCity = "";

  let countryAutocomplete = null;
  let cityAutocomplete = null;

  if (tripPlansProfileNavLink) {
    tripPlansProfileNavLink.href = "./profile.html";
  }

  if (tripPlansProfileNavTitle) {
    tripPlansProfileNavTitle.textContent = user.nickname || user.username;
  }

  function injectAutocompleteStyles() {
    if (document.getElementById("tripnestAutocompleteStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "tripnestAutocompleteStyles";
    style.textContent = `
      .tripnest-autocomplete-shell {
        position: relative;
        width: 100%;
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

      .tripnest-autocomplete-item:hover,
      .tripnest-autocomplete-item.active {
        background: #eef6f1;
      }

      .tripnest-autocomplete-empty,
      .tripnest-autocomplete-hint {
        padding: 10px 12px;
        color: #648173;
        font-size: 0.95rem;
      }

      .tripnest-trip-plan-execute-shell {
        display: grid;
        gap: 16px;
      }

      .tripnest-trip-plan-execute-summary {
        padding: 14px 16px;
        border: 1px solid #d7e5dc;
        border-radius: 16px;
        background: #f8fcf9;
        color: #173328;
      }

      .tripnest-trip-plan-execute-summary strong {
        display: block;
        margin-bottom: 6px;
        font-size: 1.05rem;
      }

      .tripnest-trip-plan-execute-block {
        display: grid;
        gap: 10px;
      }

      .tripnest-trip-plan-execute-block > span {
        font-weight: 700;
        color: #173328;
      }

      .tripnest-trip-plan-execute-users {
        display: grid;
        gap: 10px;
        max-height: 240px;
        overflow-y: auto;
        padding-right: 4px;
      }

      .tripnest-trip-plan-execute-user {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        border: 1px solid #d7e5dc;
        border-radius: 14px;
        background: #ffffff;
      }

      .tripnest-trip-plan-execute-user input {
        width: 18px;
        height: 18px;
      }

      .tripnest-trip-plan-execute-user-meta {
        display: grid;
        gap: 2px;
      }

      .tripnest-trip-plan-execute-user-meta strong {
        color: #173328;
      }

      .tripnest-trip-plan-execute-user-meta span {
        color: #648173;
        font-size: 0.95rem;
      }
    `;
    document.head.appendChild(style);
  }

  function createAutocomplete(input) {
    if (!input || !input.parentElement) {
      return null;
    }

    if (input.hasAttribute("list")) {
      input.removeAttribute("list");
    }

    const shell = document.createElement("div");
    shell.className = "tripnest-autocomplete-shell";

    input.parentElement.insertBefore(shell, input);
    shell.appendChild(input);

    const results = document.createElement("div");
    results.className = "tripnest-autocomplete-results";
    results.hidden = true;
    shell.appendChild(results);

    return { shell, input, results };
  }

  function openAutocomplete(instance) {
    if (!instance?.results) {
      return;
    }
    instance.results.hidden = false;
  }

  function closeAutocomplete(instance) {
    if (!instance?.results) {
      return;
    }
    instance.results.hidden = true;
    instance.results.innerHTML = "";
  }

  function closeAllAutocompletes() {
    closeAutocomplete(countryAutocomplete);
    closeAutocomplete(cityAutocomplete);
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function setMessage(text, type) {
    if (!tripPlansMessage) {
      return;
    }

    tripPlansMessage.textContent = text;
    tripPlansMessage.className = text ? `tripnest-edit-message ${type}` : "tripnest-edit-message";
  }

  function getFriendIds() {
    const followers = Array.isArray(user.followers) ? user.followers : [];
    const following = Array.isArray(user.following) ? user.following : [];
    return followers.filter((id) => following.includes(id));
  }

  function getRelationToAuthor(authorId) {
    if (getFriendIds().includes(authorId)) {
      return "friends";
    }
    return "other";
  }

  function normalizeCityName(city) {
    return String(city || "").trim();
  }

  function findCountryMatch(value) {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue) {
      return "";
    }

    return countries.find((country) => normalizeText(country) === normalizedValue) || "";
  }

  function getCitiesForSelectedCountry() {
    const country = selectedCountry || findCountryMatch(tripPlanCountryInput?.value);
    return countryCities[country] || [];
  }

  function findCityMatch(value) {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue) {
      return "";
    }

    const cities = getCitiesForSelectedCountry();
    return cities.find((city) => normalizeText(city) === normalizedValue) || "";
  }

  function getVisibilityLabel(value) {
    if (value === "all") {
      return "all";
    }
    return "Just friends";
  }

  function getGenderPreferenceLabel(value) {
    if (value === "men") {
      return "Men only";
    }
    if (value === "women") {
      return "Women only";
    }
    return "Men and women";
  }

  function getBudgetLabel(value) {
    if (value === "high") {
      return "high budget";
    }
    if (value === "medium") {
      return "medium budget";
    }
    return "low budget";
  }

  function formatDateRange(plan) {
    return `${plan.startDate} - ${plan.returnDate}`;
  }

  async function loadCountriesAndCities() {
    const response = await fetch("./data/countries-cities.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to load countries and cities.");
    }

    const dataset = await response.json();
    const nextCountryCities = {};

    dataset.forEach((entry) => {
      const countryName = String(entry?.name || "").trim();
      if (!countryName) {
        return;
      }

      const uniqueCities = [
        ...new Set(
          (Array.isArray(entry?.cities) ? entry.cities : [])
            .map((city) => normalizeCityName(city))
            .filter(Boolean)
        )
      ].sort((a, b) => a.localeCompare(b));

      nextCountryCities[countryName] = uniqueCities;
    });

    countryCities = nextCountryCities;
    countries = Object.keys(nextCountryCities).sort((a, b) => a.localeCompare(b));
  }

  function populateCountryFilter() {
    if (!tripPlansCountryFilterOptions) {
      return;
    }

    const allCountries = [...new Set(discoverTripPlans.map((plan) => plan.country).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );

    tripPlansCountryFilterOptions.innerHTML = "";
    allCountries.forEach((country) => {
      const option = document.createElement("option");
      option.value = country;
      tripPlansCountryFilterOptions.appendChild(option);
    });
  }

  function setCityInputState() {
    const availableCities = getCitiesForSelectedCountry();
    const hasCountry = Boolean(selectedCountry);

    if (!tripPlanCityInput) {
      return;
    }

    tripPlanCityInput.disabled = !hasCountry || availableCities.length === 0;
    tripPlanCityInput.placeholder = hasCountry
      ? availableCities.length
        ? "Type at least 2 characters"
        : "No available cities"
      : "Select a country first";

    if (addTripPlanCityBtn) {
      addTripPlanCityBtn.disabled = tripPlanCityInput.disabled;
    }
  }

  function renderCities() {
    if (!tripPlanCitiesList) {
      return;
    }

    tripPlanCitiesList.innerHTML = tripPlanCities
      .map(
        (city) => `
        <span class="tripnest-trip-plan-city-chip">
          ${city}
          <button type="button" data-remove-city="${city}">x</button>
        </span>
      `
      )
      .join("");
  }

  function resetTripPlanForm() {
    tripPlanCities = [];
    selectedCountry = "";
    selectedCity = "";
    editingTripPlanId = null;

    if (deleteTripPlanBtn) {
      deleteTripPlanBtn.hidden = true;
    }

    tripPlanForm?.reset();
    renderCities();

    const today = new Date().toISOString().split("T")[0];
    if (tripPlanStartDate) {
      tripPlanStartDate.min = today;
    }
    if (tripPlanReturnDate) {
      tripPlanReturnDate.min = today;
    }
    if (tripPlanRequestedPeople) {
      tripPlanRequestedPeople.value = "1";
    }
    if (tripPlanAgeMin) {
      tripPlanAgeMin.value = "18";
    }
    if (tripPlanAgeMax) {
      tripPlanAgeMax.value = "35";
    }
    if (tripPlanVisibility) {
      tripPlanVisibility.value = "friends";
    }
    if (tripPlanCountryInput) {
      tripPlanCountryInput.value = "";
    }
    if (tripPlanCityInput) {
      tripPlanCityInput.value = "";
    }

    const submitBtn = tripPlanForm?.querySelector('button[type="submit"]');
    const modalTitle = document.getElementById("tripPlanModalTitle");

    if (submitBtn) {
      submitBtn.textContent = "Trip publication";
    }
    if (modalTitle) {
      modalTitle.textContent = "Create trip";
    }

    setCityInputState();
    closeAllAutocompletes();
  }

  function populateTripPlanForm(plan) {
    if (!plan) {
      return;
    }

    editingTripPlanId = plan.id;
    selectedCountry = findCountryMatch(plan.country) || plan.country || "";
    selectedCity = "";
    tripPlanCities = Array.isArray(plan.cities) ? [...plan.cities] : [];

    if (tripPlanCountryInput) {
      tripPlanCountryInput.value = selectedCountry;
    }
    if (tripPlanCityInput) {
      tripPlanCityInput.value = "";
    }
    if (tripPlanStartDate) {
      tripPlanStartDate.value = plan.startDate || "";
    }
    if (tripPlanReturnDate) {
      tripPlanReturnDate.value = plan.returnDate || "";
    }
    if (tripPlanRequestedPeople) {
      tripPlanRequestedPeople.value = String(plan.requestedPeople ?? "1");
    }
    if (tripPlanGenderPreference) {
      tripPlanGenderPreference.value = plan.genderPreference || "both";
    }
    if (tripPlanAgeMin) {
      tripPlanAgeMin.value = String(plan.ageMin ?? "18");
    }
    if (tripPlanAgeMax) {
      tripPlanAgeMax.value = String(plan.ageMax ?? "35");
    }
    if (tripPlanBudget) {
      tripPlanBudget.value = plan.budget || "low";
    }
    if (tripPlanVisibility) {
      tripPlanVisibility.value = plan.visibility || "friends";
    }
    if (tripPlanDescription) {
      tripPlanDescription.value = plan.description || "";
    }

    const submitBtn = tripPlanForm?.querySelector('button[type="submit"]');
    const modalTitle = document.getElementById("tripPlanModalTitle");

    if (submitBtn) {
      submitBtn.textContent = "Save changes";
    }
    if (modalTitle) {
      modalTitle.textContent = "Edit trip";
    }
    if (deleteTripPlanBtn) {
      deleteTripPlanBtn.hidden = false;
    }

    renderCities();
    setCityInputState();
    closeAllAutocompletes();
  }

  function openEditModal(planId) {
    const plan = myTripPlans.find((entry) => entry.id === planId);
    if (!plan) {
      setMessage("The trip to be edited was not found.", "error");
      return;
    }

    if (!tripPlanModal) {
      return;
    }

    tripPlanModal.hidden = false;
    tripPlanModal.classList.add("is-open");
    tripPlanModal.style.display = "flex";
    document.body.classList.add("tripnest-modal-open");

    resetTripPlanForm();
    populateTripPlanForm(plan);
  }

  async function getNearestAirport(country, city) {
    const response = await fetch(
      `/api/travel/nearest-airport?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "No nearby airport was found.");
    }

    return data.airport;
  }

  function closeExecuteModal() {
    if (!tripPlanExecuteModal) {
      return;
    }

    tripPlanExecuteModal.hidden = true;
    tripPlanExecuteModal.classList.remove("is-open");
    tripPlanExecuteModal.style.display = "none";
    document.body.classList.remove("tripnest-modal-open");

    executingTripPlanId = null;
    executingTripPlanAirport = null;

    if (tripPlanExecuteSummary) {
      tripPlanExecuteSummary.innerHTML = "";
    }

    if (tripPlanExecuteInterestedList) {
      tripPlanExecuteInterestedList.innerHTML = "";
    }

    if (tripPlanExecuteAirportInfo) {
      tripPlanExecuteAirportInfo.textContent = "";
      tripPlanExecuteAirportInfo.className = "tripnest-edit-message";
    }

    closeFlightProviderModal();
    closeHotelProviderModal();
  }

  async function openExecuteModal(planId) {
    const plan = myTripPlans.find((entry) => entry.id === planId);
    if (!plan) {
      setMessage("The trip was not found.", "error");
      return;
    }

    if (!Array.isArray(plan.cities) || !plan.cities.length) {
      setMessage("At least one city is required for the trip to make a booking.", "error");
      return;
    }

    if (!tripPlanExecuteModal) {
      return;
    }

    executingTripPlanId = plan.id;
    executingTripPlanAirport = null;

    tripPlanExecuteModal.hidden = false;
    tripPlanExecuteModal.classList.add("is-open");
    tripPlanExecuteModal.style.display = "flex";
    document.body.classList.add("tripnest-modal-open");

    const primaryCity = plan.cities[0];

    if (tripPlanExecuteSummary) {
      tripPlanExecuteSummary.innerHTML = `
        <strong>${plan.country}</strong>
        <div>City: ${primaryCity}</div>
        <div>Dates: ${plan.startDate} to ${plan.returnDate}</div>
        <div>Searching for nearby airport...</div>
      `;
    }

    if (tripPlanExecuteInterestedList) {
      const users = Array.isArray(plan.interestedUsers) ? plan.interestedUsers : [];

      if (!users.length) {
        tripPlanExecuteInterestedList.innerHTML = `<p class="tripnest-empty-posts">No interested users yet.</p>`;
      } else {
        tripPlanExecuteInterestedList.innerHTML = users
          .map(
            (entry) => `
              <label class="tripnest-trip-plan-execute-user">
                <input type="checkbox" value="${entry.id}" />
                <div class="tripnest-trip-plan-execute-user-meta">
                  <strong>${entry.nickname || entry.username}</strong>
                  <span>@${entry.username}</span>
                </div>
              </label>
            `
          )
          .join("");
      }
    }

    try {
      const airport = await getNearestAirport(plan.country, primaryCity);
      executingTripPlanAirport = airport;

      if (tripPlanExecuteSummary) {
        tripPlanExecuteSummary.innerHTML = `
          <strong>${plan.country}</strong>
          <div>City: ${primaryCity}</div>
          <div>Dates: ${plan.startDate} to ${plan.returnDate}</div>
          <div>Nearest Airport: ${airport.name} (${airport.iataCode})</div>
        `;
      }

      if (tripPlanExecuteAirportInfo) {
        tripPlanExecuteAirportInfo.textContent = `The airport will be used. ${airport.name} (${airport.iataCode}).`;
        tripPlanExecuteAirportInfo.className = "tripnest-edit-message success";
      }
    } catch (error) {
      if (tripPlanExecuteAirportInfo) {
        tripPlanExecuteAirportInfo.textContent = error.message;
        tripPlanExecuteAirportInfo.className = "tripnest-edit-message error";
      }
    }
  }

  function buildBookingPackageUrl(plan, airport) {
    const destination = Array.isArray(plan.cities) && plan.cities.length
      ? `${plan.cities[0]}, ${plan.country}`
      : plan.country;

    const checkin = plan.startDate;
    const checkout = plan.returnDate;

    return `https://packages.booking.com/vacationpackages/?destination=${encodeURIComponent(destination)}&originAirport=${encodeURIComponent(airport?.iataCode || "")}&checkIn=${encodeURIComponent(checkin)}&checkOut=${encodeURIComponent(checkout)}`;
  }

  function buildAirbnbHotelUrl(destinationLabel, plan, totalAdults) {
    const destinationMeta = getHotelDestinationMeta(destinationLabel);
    const destinationSlug = String(destinationLabel || "")
      .trim()
      .replace(/,/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();

    const url = new URL(
      `https://www.airbnb.com/s/${destinationMeta?.airbnb?.slug || destinationSlug}/homes`
    );
    url.searchParams.set("query", destinationLabel);
    url.searchParams.set("checkin", plan.startDate);
    url.searchParams.set("checkout", plan.returnDate);
    url.searchParams.set("adults", String(totalAdults));
    return url.toString();
  }

  function normalizeHotelDestinationKey(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function getHotelDestinationMeta(destinationLabel) {
    const parts = String(destinationLabel || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const city = parts[0] || "";
    const country = parts[1] || "";
    const key = `${normalizeHotelDestinationKey(city)}|${normalizeHotelDestinationKey(country)}`;
    return HOTEL_DESTINATION_MAPPINGS[key] || null;
  }

  function prepareHotelBookingData() {
    const plan = myTripPlans.find((entry) => entry.id === executingTripPlanId);
    if (!plan) {
      throw new Error("The trip to be booked was not found.");
    }

    const selectedCompanions = Array.from(
      tripPlanExecuteInterestedList.querySelectorAll('input[type="checkbox"]:checked')
    ).map((input) => input.value);

    const totalAdults = 1 + selectedCompanions.length;
    const destinationCity = Array.isArray(plan.cities) && plan.cities.length
      ? String(plan.cities[0]).trim()
      : "";
    const destinationCountry = String(plan.country || "").trim();
    const hotelDestinationLabel = [destinationCity, destinationCountry].filter(Boolean).join(", ");

    if (!hotelDestinationLabel) {
      throw new Error("The trip requires at least one destination city or country.");
    }

    return {
      plan,
      totalAdults,
      hotelDestinationLabel
    };
  }

  function buildStayProviderUrl(provider, destinationLabel, plan, totalAdults) {
    const destinationMeta = getHotelDestinationMeta(destinationLabel);
    if (!plan?.startDate || !plan?.returnDate) {
      throw new Error("The travel dates are missing.");
    }

    const checkinDate = new Date(plan.startDate);
    const checkoutDate = new Date(plan.returnDate);

    if (Number.isNaN(checkinDate.getTime()) || Number.isNaN(checkoutDate.getTime())) {
      throw new Error("The travel dates are not valid.");
    }

    if (provider === "booking") {
      const url = new URL(destinationMeta?.booking?.cityPath || "https://www.booking.com/searchresults.html");
      url.searchParams.set("ss", destinationMeta?.booking?.label || destinationLabel);
      url.searchParams.set("lang", "el");
      url.searchParams.set("group_adults", String(totalAdults));
      url.searchParams.set("no_rooms", "1");
      url.searchParams.set("group_children", "0");
      url.searchParams.set("checkin", plan.startDate);
      url.searchParams.set("checkout", plan.returnDate);
      url.searchParams.set("checkin_year", String(checkinDate.getFullYear()));
      url.searchParams.set("checkin_month", String(checkinDate.getMonth() + 1));
      url.searchParams.set("checkin_monthday", String(checkinDate.getDate()));
      url.searchParams.set("checkout_year", String(checkoutDate.getFullYear()));
      url.searchParams.set("checkout_month", String(checkoutDate.getMonth() + 1));
      url.searchParams.set("checkout_monthday", String(checkoutDate.getDate()));
      return url.toString();
    }

    if (provider === "skyscanner") {
      if (
        destinationMeta?.skyscanner?.entityId &&
        destinationMeta?.skyscanner?.countrySlug &&
        destinationMeta?.skyscanner?.citySlug
      ) {
        const url = new URL(
          `https://gr.skyscanner.com/hotels/${destinationMeta.skyscanner.countrySlug}/${destinationMeta.skyscanner.citySlug}/ci-${destinationMeta.skyscanner.entityId}`
        );
        url.searchParams.set("checkin", plan.startDate);
        url.searchParams.set("checkout", plan.returnDate);
        url.searchParams.set("adults", String(totalAdults));
        url.searchParams.set("rooms", "1");
        return url.toString();
      }

      const url = new URL("https://gr.skyscanner.com/hotels");
      url.searchParams.set("market", "GR");
      url.searchParams.set("locale", "el-GR");
      url.searchParams.set("currency", "EUR");
      url.searchParams.set("q", destinationLabel);
      url.searchParams.set("checkin", plan.startDate);
      url.searchParams.set("checkout", plan.returnDate);
      url.searchParams.set("adults", String(totalAdults));
      url.searchParams.set("rooms", "1");
      return url.toString();
    }

    if (provider === "esky") {
      if (destinationMeta?.esky?.cityPath) {
        const url = new URL(destinationMeta.esky.cityPath);
        url.searchParams.set("checkIn", plan.startDate);
        url.searchParams.set("checkOut", plan.returnDate);
        return url.toString();
      }

      const url = new URL("https://www.esky.gr/diamoni/");
      url.searchParams.set("destination", destinationMeta?.esky?.label || destinationLabel);
      return url.toString();
    }

    return buildAirbnbHotelUrl(destinationLabel, plan, totalAdults);
  }

  function buildBookingFlightsUrl(originAirport, destinationAirport, plan, totalAdults) {
    const url = new URL("https://www.booking.com/flights/index.html");
    url.searchParams.set("from", originAirport.iataCode || "");
    url.searchParams.set("to", destinationAirport.iataCode || "");
    url.searchParams.set("type", "ROUNDTRIP");
    url.searchParams.set("depart", plan.startDate);
    url.searchParams.set("return", plan.returnDate);
    url.searchParams.set("adults", String(totalAdults));
    return url.toString();
  }

  function buildSkyscannerFlightsUrl(originAirport, destinationAirport, plan, totalAdults) {
    const url = new URL("https://www.skyscanner.net/g/referrals/v1/flights/day-view/");
    url.searchParams.set("origin", originAirport.iataCode || "");
    url.searchParams.set("destination", destinationAirport.iataCode || "");
    url.searchParams.set("outboundDate", plan.startDate);
    url.searchParams.set("inboundDate", plan.returnDate);
    url.searchParams.set("adults", String(totalAdults));
    url.searchParams.set("cabinclass", "economy");
    url.searchParams.set("market", "GR");
    url.searchParams.set("locale", "el-GR");
    url.searchParams.set("currency", "EUR");
    return url.toString();
  }

  function buildESkyFlightsUrl(originAirport, destinationAirport, plan, totalAdults) {
    const originCode = originAirport.iataCode || "";
    const destinationCode = destinationAirport.iataCode || "";
    const url = new URL(
      `https://www.esky.gr/flights/select/roundtrip/ap/${encodeURIComponent(originCode)}/ap/${encodeURIComponent(destinationCode)}`
    );
    url.searchParams.set("departureDate", plan.startDate);
    url.searchParams.set("returnDate", plan.returnDate);
    url.searchParams.set("pa", String(totalAdults));
    url.searchParams.set("py", "0");
    url.searchParams.set("pc", "0");
    url.searchParams.set("pi", "0");
    url.searchParams.set("sc", "economy");
    return url.toString();
  }

  function buildFlightProviderUrl(provider, originAirport, destinationAirport, plan, totalAdults) {
    if (provider === "skyscanner") {
      return buildSkyscannerFlightsUrl(originAirport, destinationAirport, plan, totalAdults);
    }

    if (provider === "esky") {
      return buildESkyFlightsUrl(originAirport, destinationAirport, plan, totalAdults);
    }

    return buildBookingFlightsUrl(originAirport, destinationAirport, plan, totalAdults);
  }

  function openFlightProviderModal() {
    if (!flightProviderModal) {
      return;
    }

    flightProviderModal.hidden = false;
    flightProviderModal.classList.add("is-open");
    flightProviderModal.style.display = "flex";
  }

  function closeFlightProviderModal() {
    if (!flightProviderModal) {
      return;
    }

    flightProviderModal.hidden = true;
    flightProviderModal.classList.remove("is-open");
    flightProviderModal.style.display = "none";
  }

  function clearEskyHotelResults() {
    if (!eskyHotelLiveResults) {
      return;
    }

    eskyHotelLiveResults.innerHTML = "";
    eskyHotelLiveResults.hidden = true;
  }

  function renderEskyLiveHotelResults(results) {
    if (!eskyHotelLiveResults) {
      return;
    }

    clearEskyHotelResults();

    if (!Array.isArray(results) || !results.length) {
      eskyHotelLiveResults.hidden = false;
      eskyHotelLiveResults.innerHTML = `
        <div class="tripnest-edit-message error">No results found on eSky for this stay..</div>
      `;
      return;
    }

    eskyHotelLiveResults.hidden = false;
    eskyHotelLiveResults.innerHTML = results
      .map(
        (hotel) => `
          <article class="tripnest-live-hotel-card">
            <img
              class="tripnest-live-hotel-image"
              src="${hotel.image || "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80"}"
              alt="${(hotel.name || "Hotel").replace(/"/g, "&quot;")}"
            />
            <div class="tripnest-live-hotel-content">
              <h4 class="tripnest-live-hotel-name">${hotel.name || "Hotel"}</h4>
              <div class="tripnest-live-hotel-meta">${hotel.rating ? `Rating ${hotel.rating}/10 · ` : ""}${hotel.summary ? hotel.summary.slice(0, 90) : "Διαμονή"}</div>
            </div>
            <div class="tripnest-live-hotel-price">
              <div>${hotel.price || "Information"}</div>
              <button type="button" class="tripnest-live-hotel-action" data-live-hotel-url="${encodeURIComponent(hotel.url || "https://www.esky.gr/")}">View</button>
            </div>
          </article>
        `
      )
      .join("");
  }

  function openHotelProviderModal() {
    if (!hotelProviderModal) {
      return;
    }

    clearEskyHotelResults();
    hotelProviderModal.hidden = false;
    hotelProviderModal.classList.add("is-open");
    hotelProviderModal.style.display = "flex";
  }

  function closeHotelProviderModal() {
    if (!hotelProviderModal) {
      return;
    }

    clearEskyHotelResults();
    hotelProviderModal.hidden = true;
    hotelProviderModal.classList.remove("is-open");
    hotelProviderModal.style.display = "none";
  }

  function confirmExecuteTripPlan() {
    const plan = myTripPlans.find((entry) => entry.id === executingTripPlanId);
    if (!plan) {
      setMessage("The trip to be booked was not found.", "error");
      return;
    }

    if (!executingTripPlanAirport) {
      setMessage("No nearby airport found for the trip.", "error");
      return;
    }

    const selectedUsers = Array.from(
      tripPlanExecuteInterestedList?.querySelectorAll('input[type="checkbox"]:checked') || []
    ).map((input) => input.value);

    const selectedUserNames = (plan.interestedUsers || [])
      .filter((entry) => selectedUsers.includes(entry.id))
      .map((entry) => entry.nickname || entry.username);

    if (selectedUserNames.length) {
      setMessage(`You will be traveling with: ${selectedUserNames.join(", ")}`, "success");
    } else {
      setMessage("Booking for your trip is now open.", "success");
    }

    const bookingUrl = buildBookingPackageUrl(plan, executingTripPlanAirport);
    window.open(bookingUrl, "_blank", "noopener,noreferrer");
    closeExecuteModal();
  }

  function openModal() {
    if (!tripPlanModal) {
      return;
    }

    tripPlanModal.hidden = false;
    tripPlanModal.classList.add("is-open");
    tripPlanModal.style.display = "flex";
    document.body.classList.add("tripnest-modal-open");
    resetTripPlanForm();
  }

  function closeModal() {
    if (!tripPlanModal) {
      return;
    }

    tripPlanModal.hidden = true;
    tripPlanModal.classList.remove("is-open");
    tripPlanModal.style.display = "none";
    document.body.classList.remove("tripnest-modal-open");
    closeAllAutocompletes();
  }

  function buildMetaChips(plan, isOwnSection, relationLabel) {
    const chips = [];

    if (isOwnSection) {
      chips.push(
        `<span class="tripnest-trip-plan-visibility">${getVisibilityLabel(plan.visibility)}</span>`
      );
    } else if (plan.visibility === "all") {
      chips.push(`<span class="tripnest-trip-plan-relation">Δημόσιο</span>`);
    } else if (relationLabel) {
      chips.push(`<span class="tripnest-trip-plan-relation">${relationLabel}</span>`);
    }

    chips.push(`<span class="tripnest-trip-plan-mini-chip">${plan.requestedPeople} people</span>`);
    chips.push(`<span class="tripnest-trip-plan-mini-chip">${getGenderPreferenceLabel(plan.genderPreference)}</span>`);
    chips.push(`<span class="tripnest-trip-plan-mini-chip">${plan.ageMin}-${plan.ageMax} years old</span>`);
    chips.push(`<span class="tripnest-trip-plan-mini-chip">${getBudgetLabel(plan.budget)}</span>`);

    return chips.join("");
  }

  function formatOfferPrice(value) {
    const numericValue = Number(value || 0);
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(numericValue);
  }

  function getOfferTypeLabel(type) {
    if (type === "flight") {
      return "flight";
    }
    if (type === "hotel") {
      return "hotel";
    }
    return "package";
  }

  function getOfferBudgetLabel(value) {
    if (value === "low") {
      return "low";
    }
    if (value === "high") {
      return "high";
    }
    return "mid";
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
      offersGrid.innerHTML = '<p class="tripnest-empty-posts">No offers were found with these filters..</p>';
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
          <li>Departure: ${offer.departure}</li>
          <li>Return: ${offer.returnDate}</li>
          <li>Category: ${getOfferBudgetLabel(offer.budget)}</li>
        </ul>

        <div class="tripnest-offer-foot">
          <div class="tripnest-offer-price">${formatOfferPrice(offer.price)}<small>/ άτομο</small></div>
          <a class="tripnest-offer-link" href="${offer.url}" target="_blank" rel="noopener noreferrer">Check out the offer</a>
        </div>
      `;
      offersGrid.appendChild(card);
    });
  }

  async function loadOffers() {
    const response = await fetch("/api/offers");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load offers.");
    }

    offers = Array.isArray(data.offers) ? data.offers : [];
    if (offersSummary) {
      const updatedAt = offers[0]?.updatedAt || data.generatedAt;
      const friendlyDate = updatedAt ? new Date(updatedAt).toLocaleString("el-GR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }) : "Today";
      offersSummary.textContent = `Updated: ${friendlyDate}`;
    }
    renderOffers();
  }

  function renderTripPlans(grid, plans, emptyMessage, isOwnSection) {
    if (!grid) {
      return;
    }

    grid.innerHTML = "";
    if (!plans.length) {
      grid.innerHTML = `<p class="tripnest-empty-posts">${emptyMessage}</p>`;
      return;
    }

    plans.forEach((plan) => {
      const relation = getRelationToAuthor(plan.userId);
      const relationLabel = relation === "friends" ? "friends" : "";
      const citiesMarkup =
        Array.isArray(plan.cities) && plan.cities.length
          ? plan.cities.map((city) => `<span class="tripnest-trip-plan-mini-chip">${city}</span>`).join("")
          : '<span class="tripnest-trip-plan-mini-chip muted">Without cities</span>';

      const actionButton = isOwnSection
        ? `
          <button
            type="button"
            class="tripnest-trip-plan-interest-btn"
            data-edit-trip-plan-id="${plan.id}"
          >
            Edit
          </button>
          <button
            type="button"
            class="tripnest-trip-plan-interest-btn"
            data-execute-trip-plan-id="${plan.id}"
          >
            Take your trip
          </button>
        `
        : `
          <button
            type="button"
            class="tripnest-trip-plan-interest-btn${plan.isInterested ? " active" : ""}"
            data-interest-trip-plan-id="${plan.id}"
          >
            ${plan.isInterested ? "You are interested" : "I am interested"}
          </button>
        `;

      const ownerMeta = isOwnSection
        ? ""
        : `
          <div class="tripnest-trip-plan-owner-meta">
            <strong>${plan.nickname || plan.username}</strong>
            <span>@${plan.username}</span>
          </div>
        `;

      const card = document.createElement("article");
      card.className = "tripnest-trip-plan-card";
      card.innerHTML = `
        <div class="tripnest-trip-plan-card-head">
          <div>
            <h3>${plan.country}</h3>
            <p>${formatDateRange(plan)}</p>
          </div>
          <span class="tripnest-trip-plan-interest-count">${plan.interestedCount} interested parties</span>
        </div>
        ${ownerMeta}
        <div class="tripnest-trip-plan-meta-row">
          ${buildMetaChips(plan, isOwnSection, relationLabel)}
        </div>
        <div class="tripnest-trip-plan-cities">${citiesMarkup}</div>
        <p class="tripnest-trip-plan-description">${plan.description || "You haven't added a description for the trip yet."}</p>
        <div class="tripnest-trip-plan-actions">
          ${actionButton}
        </div>
      `;

      grid.appendChild(card);
    });
  }

  function applyDiscoverFilters() {
    const search = String(tripPlansSearchInput?.value || "").trim().toLowerCase();
    const relation = String(tripPlansRelationFilter?.value || "all");
    const countryFilterValue = String(tripPlansCountryFilter?.value || "").trim().toLowerCase();

    const filtered = discoverTripPlans.filter((plan) => {
      const isFriendPlan = getRelationToAuthor(plan.userId) === "friends";
      const isPublicPlan = plan.visibility === "all";

      const relationMatches =
        relation === "all"
          ? true
          : relation === "friends"
            ? isFriendPlan
            : true;

      const countryMatches =
        !countryFilterValue || String(plan.country || "").toLowerCase().includes(countryFilterValue);

      const searchable = [
        plan.country,
        ...(Array.isArray(plan.cities) ? plan.cities : []),
        plan.nickname,
        plan.username,
        plan.description,
        getBudgetLabel(plan.budget),
        getVisibilityLabel(plan.visibility)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const searchMatches = !search || searchable.includes(search);

      return (isFriendPlan || isPublicPlan) && relationMatches && countryMatches && searchMatches;
    });

    renderTripPlans(
      discoverTripPlansGrid,
      filtered,
      "There are no trips that match these filters.",
      false
    );
  }

  async function loadTripPlans() {
    const [ownResponse, discoverResponse] = await Promise.all([
      fetch(`/api/trip-plans?viewerId=${encodeURIComponent(user.id)}&ownOnly=true`),
      fetch(`/api/trip-plans?viewerId=${encodeURIComponent(user.id)}`)
    ]);

    const ownData = await ownResponse.json();
    const discoverData = await discoverResponse.json();

    if (!ownResponse.ok) {
      throw new Error(ownData.message || "Your trips could not be loaded.");
    }

    if (!discoverResponse.ok) {
      throw new Error(discoverData.message || "Unable to load available trips..");
    }

    myTripPlans = Array.isArray(ownData.tripPlans) ? ownData.tripPlans : [];
    discoverTripPlans = (Array.isArray(discoverData.tripPlans) ? discoverData.tripPlans : []).filter(
      (plan) => plan.userId !== user.id
    );

    renderTripPlans(myTripPlansGrid, myTripPlans, "You haven't created a trip yet.", true);
    populateCountryFilter();
    applyDiscoverFilters();
  }

  async function saveTripPlan() {
    const confirmedCountry = findCountryMatch(tripPlanCountryInput?.value);
    const normalizedTypedCity = String(tripPlanCityInput?.value || "").trim();

    if (!confirmedCountry) {
      throw new Error("Select a valid country from the results.");
    }

    if (!tripPlanCities.length) {
      throw new Error("Add at least one city.");
    }

    if (normalizedTypedCity && !findCityMatch(normalizedTypedCity)) {
      throw new Error("Select a valid city from the results.");
    }

    tripPlanCountryInput.value = confirmedCountry;

    const endpoint = editingTripPlanId
      ? "/api/trip-plans/update"
      : "/api/trip-plans/create";

    const payload = {
      userId: user.id,
      country: confirmedCountry,
      cities: tripPlanCities,
      startDate: tripPlanStartDate?.value,
      returnDate: tripPlanReturnDate?.value,
      requestedPeople: tripPlanRequestedPeople?.value,
      genderPreference: tripPlanGenderPreference?.value,
      ageMin: tripPlanAgeMin?.value,
      ageMax: tripPlanAgeMax?.value,
      budget: tripPlanBudget?.value,
      description: tripPlanDescription?.value,
      visibility: tripPlanVisibility?.value
    };

    if (editingTripPlanId) {
      payload.tripPlanId = editingTripPlanId;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        data.message ||
          (editingTripPlanId
            ? "It was not possible to update the trip."
            : "It was not possible to create the trip.")
      );
    }

    setMessage(
      data.message ||
        (editingTripPlanId
          ? "The trip has been successfully updated."
          : "The trip has been successfully created."),
      "success"
    );

    closeModal();
    await loadTripPlans();
  }

  async function deleteTripPlan() {
    if (!editingTripPlanId) {
      throw new Error("There is no journey to be erased.");
    }

    const confirmed = window.confirm("Do you want to permanently delete this trip?");
    if (!confirmed) {
      return;
    }

    const response = await fetch("/api/trip-plans/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripPlanId: editingTripPlanId,
        userId: user.id
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "It was not possible to delete the trip.");
    }

    setMessage(data.message || "The trip has been successfully deleted.", "success");
    closeModal();
    await loadTripPlans();
  }

  async function toggleInterest(tripPlanId) {
    const response = await fetch("/api/trip-plans/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripPlanId,
        userId: user.id
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "It was not possible to send an expression of interest.");
    }

    setMessage(data.message, "success");
    await loadTripPlans();
  }

  function renderAutocompleteResults(instance, items, emptyText, onSelect) {
    if (!instance?.results) {
      return;
    }

    instance.results.innerHTML = "";

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "tripnest-autocomplete-empty";
      empty.textContent = emptyText;
      instance.results.appendChild(empty);
      openAutocomplete(instance);
      return;
    }

    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tripnest-autocomplete-item";
      button.textContent = item;
      button.addEventListener("click", () => onSelect(item));
      instance.results.appendChild(button);
    });

    openAutocomplete(instance);
  }

  function showHint(instance, text) {
    if (!instance?.results) {
      return;
    }

    instance.results.innerHTML = `<div class="tripnest-autocomplete-hint">${text}</div>`;
    openAutocomplete(instance);
  }

  function updateCountryResults() {
    if (!countryAutocomplete || !tripPlanCountryInput) {
      return;
    }

    const query = normalizeText(tripPlanCountryInput.value);

    if (query.length < 2) {
      closeAutocomplete(countryAutocomplete);
      selectedCountry = findCountryMatch(tripPlanCountryInput.value) || "";
      return;
    }

    const matches = countries
      .filter((country) => normalizeText(country).includes(query))
      .slice(0, 10);

    renderAutocompleteResults(
      countryAutocomplete,
      matches,
      "No countries were found.",
      (country) => {
        selectedCountry = country;
        selectedCity = "";
        tripPlanCountryInput.value = country;
        if (tripPlanCityInput) {
          tripPlanCityInput.value = "";
        }
        tripPlanCities = [];
        renderCities();
        setCityInputState();
        closeAutocomplete(countryAutocomplete);
        closeAutocomplete(cityAutocomplete);
        tripPlanCityInput?.focus();
      }
    );
  }

  function updateCityResults() {
    if (!cityAutocomplete || !tripPlanCityInput) {
      return;
    }

    if (!selectedCountry) {
      closeAutocomplete(cityAutocomplete);
      return;
    }

    const query = normalizeText(tripPlanCityInput.value);
    if (query.length < 2) {
      closeAutocomplete(cityAutocomplete);
      selectedCity = findCityMatch(tripPlanCityInput.value) || "";
      return;
    }

    const matches = getCitiesForSelectedCountry()
      .filter((city) => normalizeText(city).includes(query))
      .slice(0, 15);

    renderAutocompleteResults(
      cityAutocomplete,
      matches,
      "No cities were found.",
      (city) => {
        selectedCity = city;
        tripPlanCityInput.value = city;
        closeAutocomplete(cityAutocomplete);
      }
    );
  }

  if (openTripPlanModalBtn) {
    openTripPlanModalBtn.addEventListener("click", openModal);
  }

  if (closeTripPlanModalBtn) {
    closeTripPlanModalBtn.addEventListener("click", closeModal);
  }

  if (cancelTripPlanModalBtn) {
    cancelTripPlanModalBtn.addEventListener("click", closeModal);
  }

  if (tripPlanModal) {
    tripPlanModal.addEventListener("click", (event) => {
      if (event.target === tripPlanModal) {
        closeModal();
      }
    });
  }

  if (closeTripPlanExecuteModalBtn) {
    closeTripPlanExecuteModalBtn.addEventListener("click", closeExecuteModal);
  }

  if (cancelTripPlanExecuteModalBtn) {
    cancelTripPlanExecuteModalBtn.addEventListener("click", closeExecuteModal);
  }

  if (confirmTripPlanExecuteBtn) {
    confirmTripPlanExecuteBtn.addEventListener("click", confirmExecuteTripPlan);
  }

  if (bookFlightsBtn) {
    bookFlightsBtn.addEventListener("click", () => {
      openFlightProviderModal();
    });
  }

  if (bookHotelBtn) {
    bookHotelBtn.addEventListener("click", () => {
      openHotelProviderModal();
    });
  }

  if (flightProviderChooser) {
    flightProviderChooser.addEventListener("click", async (event) => {
      const providerButton = event.target.closest("[data-flight-provider]");
      if (!providerButton) {
        return;
      }

      try {
        const plan = myTripPlans.find((entry) => entry.id === executingTripPlanId);
        if (!plan || !executingTripPlanAirport) {
          throw new Error("There is not enough information about the flights.");
        }

        if (!user.residenceCountry || !user.residenceCity) {
          throw new Error("Please fill in your residence country and city in your profile.");
        }

        const selectedCompanions = Array.from(
          tripPlanExecuteInterestedList.querySelectorAll('input[type="checkbox"]:checked')
        ).map((input) => input.value);

        const totalAdults = 1 + selectedCompanions.length;
        const originAirport = await getNearestAirport(user.residenceCountry, user.residenceCity);

        window.open(
          buildFlightProviderUrl(
            providerButton.dataset.flightProvider,
            originAirport,
            executingTripPlanAirport,
            plan,
            totalAdults
          ),
          "_blank",
          "noopener,noreferrer"
        );

        closeFlightProviderModal();
      } catch (error) {
        if (tripPlanExecuteAirportInfo) {
          tripPlanExecuteAirportInfo.textContent = error.message;
          tripPlanExecuteAirportInfo.className = "tripnest-edit-message error";
        }
      }
    });
  }

  if (hotelProviderChooser) {
    hotelProviderChooser.addEventListener("click", async (event) => {
      const providerButton = event.target.closest("[data-hotel-provider]");
      if (!providerButton) {
        return;
      }

      try {
        const bookingData = prepareHotelBookingData();
        const provider = providerButton.dataset.hotelProvider;
        const destinationMeta = getHotelDestinationMeta(bookingData.hotelDestinationLabel);

        if (provider === "esky") {
          const cityPath =
            destinationMeta?.esky?.cityPath ||
            new URL(
              `https://www.esky.gr/hotels/?destination=${encodeURIComponent(bookingData.hotelDestinationLabel)}`
            ).toString();

          if (tripPlanExecuteAirportInfo) {
            tripPlanExecuteAirportInfo.textContent = "We are searching for live hotel listings on eSky within the modal.";
            tripPlanExecuteAirportInfo.className = "tripnest-edit-message success";
          }

          const automationResponse = await fetch("/api/travel/hotel-automation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: "esky",
              cityPath,
              checkIn: bookingData.plan.startDate,
              checkOut: bookingData.plan.returnDate,
              adults: bookingData.totalAdults
            })
          });

          const automationData = await automationResponse.json();
          if (!automationResponse.ok) {
            throw new Error(automationData.message || "Live hotel search on eSky was not possible.");
          }

          renderEskyLiveHotelResults(automationData.hotels || []);
          return;
        }

        window.open(
          buildStayProviderUrl(
            provider,
            bookingData.hotelDestinationLabel,
            bookingData.plan,
            bookingData.totalAdults
          ),
          "_blank",
          "noopener,noreferrer"
        );

        closeHotelProviderModal();
      } catch (error) {
        if (tripPlanExecuteAirportInfo) {
          tripPlanExecuteAirportInfo.textContent = error.message;
          tripPlanExecuteAirportInfo.className = "tripnest-edit-message error";
        }

        renderEskyLiveHotelResults([]);
      }
    });
  }

  eskyHotelLiveResults?.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-live-hotel-url]");
    if (!actionButton) {
      return;
    }

    const hotelUrl = decodeURIComponent(actionButton.dataset.liveHotelUrl || "");
    if (!hotelUrl) {
      return;
    }

    window.open(hotelUrl, "_blank", "noopener,noreferrer");
  });

  closeFlightProviderModalBtn?.addEventListener("click", closeFlightProviderModal);
  cancelFlightProviderModalBtn?.addEventListener("click", closeFlightProviderModal);
  flightProviderModal?.addEventListener("click", (event) => {
    if (event.target === flightProviderModal) {
      closeFlightProviderModal();
    }
  });

  closeHotelProviderModalBtn?.addEventListener("click", closeHotelProviderModal);
  cancelHotelProviderModalBtn?.addEventListener("click", closeHotelProviderModal);
  hotelProviderModal?.addEventListener("click", (event) => {
    if (event.target === hotelProviderModal) {
      closeHotelProviderModal();
    }
  });

  if (tripPlanExecuteModal) {
    tripPlanExecuteModal.addEventListener("click", (event) => {
      if (event.target === tripPlanExecuteModal) {
        closeExecuteModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
      closeExecuteModal();
      closeFlightProviderModal();
      closeHotelProviderModal();
    }
  });

  if (tripPlanCountryInput) {
    tripPlanCountryInput.addEventListener("input", () => {
      selectedCountry = findCountryMatch(tripPlanCountryInput.value) || "";
      selectedCity = "";
      tripPlanCities = [];
      renderCities();

      if (tripPlanCityInput) {
        tripPlanCityInput.value = "";
      }

      setCityInputState();
      updateCountryResults();
      closeAutocomplete(cityAutocomplete);
    });

    tripPlanCountryInput.addEventListener("focus", () => {
      if (!tripPlanCountryInput.value.trim()) {
        showHint(countryAutocomplete, "Type at least 2 characters.");
        return;
      }
      updateCountryResults();
    });

    tripPlanCountryInput.addEventListener("blur", () => {
      const exactMatch = findCountryMatch(tripPlanCountryInput.value);
      if (exactMatch) {
        selectedCountry = exactMatch;
        tripPlanCountryInput.value = exactMatch;
        setCityInputState();
      }
    });
  }

  if (tripPlanCityInput) {
    tripPlanCityInput.addEventListener("input", () => {
      selectedCity = findCityMatch(tripPlanCityInput.value) || "";
      updateCityResults();
    });

    tripPlanCityInput.addEventListener("focus", () => {
      if (!selectedCountry) {
        showHint(cityAutocomplete, "Select a country first.");
        return;
      }

      if (!tripPlanCityInput.value.trim()) {
        showHint(cityAutocomplete, "Type at least 2 characters.");
        return;
      }

      updateCityResults();
    });

    tripPlanCityInput.addEventListener("blur", () => {
      const exactMatch = findCityMatch(tripPlanCityInput.value);
      if (exactMatch) {
        selectedCity = exactMatch;
        tripPlanCityInput.value = exactMatch;
      }
    });
  }

  if (addTripPlanCityBtn) {
    addTripPlanCityBtn.addEventListener("click", () => {
      const confirmedCountry = selectedCountry || findCountryMatch(tripPlanCountryInput?.value);
      const city = selectedCity || findCityMatch(tripPlanCityInput?.value);

      if (!confirmedCountry) {
        setMessage("Select a valid country first.", "error");
        return;
      }

      if (!city) {
        setMessage("Select a valid city from the results.", "error");
        return;
      }

      tripPlanCountryInput.value = confirmedCountry;
      selectedCountry = confirmedCountry;

      if (tripPlanCities.includes(city)) {
        setMessage("The city has already been added.", "error");
        return;
      }

      tripPlanCities.push(city);
      renderCities();

      if (tripPlanCityInput) {
        tripPlanCityInput.value = "";
      }
      selectedCity = "";
      closeAutocomplete(cityAutocomplete);
      setMessage("", "");
    });
  }

  if (tripPlanCitiesList) {
    tripPlanCitiesList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-city]");
      if (!removeButton?.dataset.removeCity) {
        return;
      }

      tripPlanCities = tripPlanCities.filter((city) => city !== removeButton.dataset.removeCity);
      renderCities();
    });
  }

  if (tripPlanStartDate && tripPlanReturnDate) {
    tripPlanStartDate.addEventListener("change", () => {
      tripPlanReturnDate.min = tripPlanStartDate.value || new Date().toISOString().split("T")[0];
      if (tripPlanReturnDate.value && tripPlanReturnDate.value < tripPlanStartDate.value) {
        tripPlanReturnDate.value = tripPlanStartDate.value;
      }
    });
  }

  if (tripPlanAgeMin && tripPlanAgeMax) {
    tripPlanAgeMin.addEventListener("change", () => {
      tripPlanAgeMax.min = tripPlanAgeMin.value || "18";
      if (tripPlanAgeMax.value && Number(tripPlanAgeMax.value) < Number(tripPlanAgeMin.value)) {
        tripPlanAgeMax.value = tripPlanAgeMin.value;
      }
    });
  }

  if (deleteTripPlanBtn) {
    deleteTripPlanBtn.addEventListener("click", async () => {
      try {
        await deleteTripPlan();
      } catch (error) {
        setMessage(error.message, "error");
      }
    });
  }

  if (tripPlanForm) {
    tripPlanForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await saveTripPlan();
      } catch (error) {
        setMessage(error.message, "error");
      }
    });
  }

  if (tripPlansSearchInput) {
    tripPlansSearchInput.addEventListener("input", applyDiscoverFilters);
  }

  if (tripPlansRelationFilter) {
    tripPlansRelationFilter.addEventListener("change", applyDiscoverFilters);
  }

  if (tripPlansCountryFilter) {
    tripPlansCountryFilter.addEventListener("input", applyDiscoverFilters);
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

  if (discoverTripPlansGrid) {
    discoverTripPlansGrid.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-interest-trip-plan-id]");
      if (!button?.dataset.interestTripPlanId) {
        return;
      }

      try {
        await toggleInterest(button.dataset.interestTripPlanId);
      } catch (error) {
        setMessage(error.message, "error");
      }
    });
  }

  if (myTripPlansGrid) {
    myTripPlansGrid.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-edit-trip-plan-id]");
      if (editButton?.dataset.editTripPlanId) {
        openEditModal(editButton.dataset.editTripPlanId);
        return;
      }

      const executeButton = event.target.closest("[data-execute-trip-plan-id]");
      if (executeButton?.dataset.executeTripPlanId) {
        openExecuteModal(executeButton.dataset.executeTripPlanId);
      }
    });
  }

  if (tripPlansLogoutBtn) {
    tripPlansLogoutBtn.addEventListener("click", () => {
      localStorage.removeItem("tripnest_user");
      window.location.href = "/";
    });
  }

  document.addEventListener("click", (event) => {
    const insideCountry = countryAutocomplete?.shell?.contains(event.target);
    const insideCity = cityAutocomplete?.shell?.contains(event.target);

    if (!insideCountry) {
      closeAutocomplete(countryAutocomplete);
    }
    if (!insideCity) {
      closeAutocomplete(cityAutocomplete);
    }
  });

  try {
    injectAutocompleteStyles();

    countryAutocomplete = createAutocomplete(tripPlanCountryInput);
    cityAutocomplete = createAutocomplete(tripPlanCityInput);

    await loadCountriesAndCities();
    resetTripPlanForm();
    await loadTripPlans();
    await loadOffers();
    window.setInterval(() => {
      loadOffers().catch(() => {});
    }, 24 * 60 * 60 * 1000);
  } catch (error) {
    setMessage(error.message, "error");
  }
});
