document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("tripnest_user") || "null");
  if (!user) {
    window.location.href = "/";
    return;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  const createPostForm = document.getElementById("createPostForm");
  const postPhotosInput = document.getElementById("postPhotosInput");
  const postPhotosPreview = document.getElementById("postPhotosPreview");
  const addCityBtn = document.getElementById("addCityBtn");
  const citiesContainer = document.getElementById("citiesContainer");
  const postAverageRating = document.getElementById("postAverageRating");
  const createPostMessage = document.getElementById("createPostMessage");
  const postCountryInput = document.getElementById("postCountry");
  const postCountryOptions = document.getElementById("postCountryOptions");
  const postCityOptions = document.getElementById("postCityOptions");
  const createPostTitle = document.getElementById("createPostTitle");
  const createPostIntro = document.getElementById("createPostIntro");
  const createPostSubmitBtn = document.getElementById("createPostSubmitBtn");
  const postDescriptionInput = document.getElementById("postDescription");
  const postTravelDateInput = document.getElementById("postTravelDate");
  const postReturnDateInput = document.getElementById("postReturnDate");
  const tripDurationSummary = document.getElementById("tripDurationSummary");
  const searchParams = new URLSearchParams(window.location.search);
  const currentPostId = searchParams.get("postId");
  const isEditMode = Boolean(currentPostId);

  const ratingInputs = [
    document.getElementById("ratingSights"),
    document.getElementById("ratingFood"),
    document.getElementById("ratingActivities"),
    document.getElementById("ratingEase"),
    document.getElementById("ratingCost")
  ];

  const MAX_PHOTOS = 10;
  const MAX_RATING = 10;
  let photosData = [];
  let countries = [];
  let countryCities = {};
  let selectedCountry = "";
  let countryAutocomplete = null;

  function injectAutocompleteStyles() {
    if (document.getElementById("tripnestCreatePostAutocompleteStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "tripnestCreatePostAutocompleteStyles";
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

  function applyFormMode() {
    if (!isEditMode) {
      return;
    }

    document.title = "TripNest Edit Post";
    if (createPostTitle) createPostTitle.textContent = "Edit post";
    if (createPostIntro) createPostIntro.textContent = "Update the photos, cities, description, and ratings for your post.";
    if (createPostSubmitBtn) createPostSubmitBtn.textContent = "Save";
  }

  function setMessage(text, type) {
    createPostMessage.textContent = text;
    createPostMessage.className = `tripnest-edit-message ${type}`;
  }

  function setRatingsMax() {
    ratingInputs.forEach((input) => {
      if (input) {
        input.min = "0";
        input.max = String(MAX_RATING);
        input.step = "0.01";
      }
    });
  }

  function normalizeRatingInput(input) {
    if (!input || input.value === "") {
      return;
    }

    const value = Number(input.value);
    if (Number.isNaN(value)) {
      input.value = "";
      return;
    }

    const normalizedValue = Math.min(MAX_RATING, Math.max(0, value));
    input.value = String(normalizedValue);
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
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

  function getCitiesForCountry() {
    const country = selectedCountry || findCountryMatch(postCountryInput?.value);
    return countryCities[country] || [];
  }

  function findCityMatch(value) {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue) {
      return "";
    }

    const cities = getCitiesForCountry();
    return cities.find((city) => normalizeText(city) === normalizedValue) || "";
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

  function closeAllCityAutocompletes() {
    const cityInputs = citiesContainer.querySelectorAll(".tripnest-city-input");
    cityInputs.forEach((input) => {
      if (input._autocomplete) {
        closeAutocomplete(input._autocomplete);
      }
    });
  }

  async function loadCountriesAndCities() {
    const response = await fetch("./data/countries-cities.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("The list of countries and cities could not be loaded.");
    }

    const dataset = await response.json();
    const nextCountryCities = {};

    dataset.forEach((entry) => {
      const countryName = String(entry?.name || "").trim();
      if (!countryName) {
        return;
      }

      const uniqueCities = [...new Set(
        (Array.isArray(entry?.cities) ? entry.cities : [])
          .map((city) => normalizeCityName(city))
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b));

      nextCountryCities[countryName] = uniqueCities;
    });

    countryCities = nextCountryCities;
    countries = Object.keys(nextCountryCities).sort((a, b) => a.localeCompare(b));
  }

  async function loadPostForEdit() {
    if (!isEditMode) {
      return null;
    }

    const response = await fetch(`/api/posts?id=${encodeURIComponent(currentPostId)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Δεν ήταν δυνατή η φόρτωση της δημοσίευσης.");
    }

    if (!data.post || data.post.userId !== user.id) {
      throw new Error("You cannot edit this post.");
    }

    return data.post;
  }

  function populateCountrySelect() {
    if (!postCountryOptions) {
      return;
    }

    postCountryOptions.innerHTML = "";
    countries.forEach((country) => {
      const option = document.createElement("option");
      option.value = country;
      postCountryOptions.appendChild(option);
    });
  }

  function showAutocompleteHint(instance, text) {
    if (!instance?.results) {
      return;
    }

    instance.results.innerHTML = `<div class="tripnest-autocomplete-hint">${text}</div>`;
    openAutocomplete(instance);
  }

  function renderAutocompleteResults(instance, items, emptyText, onSelect) {
    if (!instance?.results) {
      return;
    }

    instance.results.innerHTML = "";

    if (!items.length) {
      instance.results.innerHTML = `<div class="tripnest-autocomplete-empty">${emptyText}</div>`;
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

  function buildCountryResults() {
    if (!countryAutocomplete?.input) {
      return;
    }

    const query = normalizeText(countryAutocomplete.input.value);

    if (query.length < 2) {
      selectedCountry = findCountryMatch(countryAutocomplete.input.value) || "";
      closeAutocomplete(countryAutocomplete);
      return;
    }

    const matches = countries
      .filter((country) => normalizeText(country).includes(query))
      .slice(0, 10);

    renderAutocompleteResults(
      countryAutocomplete,
      matches,
      "Δεν βρέθηκαν χώρες.",
      (country) => {
        selectedCountry = country;
        postCountryInput.value = country;
        closeAutocomplete(countryAutocomplete);

        const cityInputs = citiesContainer.querySelectorAll(".tripnest-city-input");
        cityInputs.forEach((input) => {
          input.value = "";
          input.dataset.selectedCity = "";
          updateCityInputState(input);
          if (input._autocomplete) {
            closeAutocomplete(input._autocomplete);
          }
        });

        setMessage("", "");
      }
    );
  }

  function updateCityInputState(input) {
    const cities = getCitiesForCountry();
    const hasCountry = Boolean(selectedCountry || findCountryMatch(postCountryInput?.value));

    input.placeholder = hasCountry
      ? (cities.length ? "Type at least 2 characters" : "No cities available")
      : "Select a country first";

    input.disabled = !hasCountry || cities.length === 0;
  }

  function buildCityResults(input) {
    const instance = input?._autocomplete;
    if (!instance) {
      return;
    }

    const confirmedCountry = selectedCountry || findCountryMatch(postCountryInput?.value);
    if (!confirmedCountry) {
      closeAutocomplete(instance);
      return;
    }

    const query = normalizeText(input.value);

    if (query.length < 2) {
      input.dataset.selectedCity = findCityMatch(input.value) || "";
      closeAutocomplete(instance);
      return;
    }

    const matches = getCitiesForCountry()
      .filter((city) => normalizeText(city).includes(query))
      .slice(0, 15);

    renderAutocompleteResults(
      instance,
      matches,
      "No cities were found.",
      (city) => {
        input.value = city;
        input.dataset.selectedCity = city;
        closeAutocomplete(instance);
        setMessage("", "");
      }
    );
  }

  function setupCityAutocomplete(input) {
    const instance = createAutocomplete(input);
    input._autocomplete = instance;
    input.dataset.selectedCity = "";

    updateCityInputState(input);

    input.addEventListener("input", () => {
      input.dataset.selectedCity = findCityMatch(input.value) || "";
      buildCityResults(input);
    });

    input.addEventListener("focus", () => {
      const confirmedCountry = selectedCountry || findCountryMatch(postCountryInput?.value);

      if (!confirmedCountry) {
        showAutocompleteHint(instance, "Select a country first.");
        return;
      }

      if (!input.value.trim()) {
        showAutocompleteHint(instance, "Type at least 2 characters.");
        return;
      }

      buildCityResults(input);
    });

    input.addEventListener("blur", () => {
      const exactMatch = findCityMatch(input.value);
      if (exactMatch) {
        input.value = exactMatch;
        input.dataset.selectedCity = exactMatch;
      }
    });
  }

  function refreshCityFields() {
    const cityInputs = citiesContainer.querySelectorAll(".tripnest-city-input");
    cityInputs.forEach((input) => {
      updateCityInputState(input);
      if (input._autocomplete) {
        closeAutocomplete(input._autocomplete);
      }
    });

    addCityBtn.disabled = !selectedCountry || getCitiesForCountry().length === 0;
  }

  function addCityField(value = "") {
    const wrapper = document.createElement("div");
    wrapper.className = "tripnest-city-item";

    const cityInput = document.createElement("input");
    cityInput.type = "text";
    cityInput.className = "tripnest-city-input";
    cityInput.required = true;
    cityInput.setAttribute("autocomplete", "off");
    cityInput.value = value || "";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "secondary-btn tripnest-remove-city-btn";
    removeButton.textContent = "Delete";
    removeButton.addEventListener("click", () => {
      wrapper.remove();
    });

    wrapper.appendChild(cityInput);
    wrapper.appendChild(removeButton);
    citiesContainer.appendChild(wrapper);

    setupCityAutocomplete(cityInput);

    if (value) {
      const exactMatch = findCityMatch(value);
      if (exactMatch) {
        cityInput.value = exactMatch;
        cityInput.dataset.selectedCity = exactMatch;
      }
    }
  }

  function calculateTripDurationDays(startDateValue, endDateValue) {
    if (!startDateValue || !endDateValue) {
      return null;
    }

    const startDate = new Date(`${startDateValue}T00:00:00`);
    const endDate = new Date(`${endDateValue}T00:00:00`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return null;
    }

    const totalDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (totalDays < 0) {
      return null;
    }

    return totalDays + 1;
  }

  function updateTripDurationSummary() {
    if (!tripDurationSummary) {
      return;
    }

    const startDateValue = postTravelDateInput?.value || "";
    const endDateValue = postReturnDateInput?.value || "";
    const tripDays = calculateTripDurationDays(startDateValue, endDateValue);

    if (!startDateValue || !endDateValue || tripDays === null) {
      tripDurationSummary.textContent = "-";
      return;
    }

    tripDurationSummary.textContent = `${tripDays} Days`;
  }

  function updateAverage() {
    ratingInputs.forEach((input) => normalizeRatingInput(input));

    const values = ratingInputs
      .map((input) => Number(input.value))
      .filter((value) => !Number.isNaN(value));

    if (!values.length) {
      postAverageRating.textContent = "0.00";
      return;
    }

    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    postAverageRating.textContent = average.toFixed(2);
  }

  function populateForm(post) {
    selectedCountry = findCountryMatch(post.country || "");
    postCountryInput.value = selectedCountry || post.country || "";
    postTravelDateInput.value = post.travelDate || "";
    postReturnDateInput.value = post.returnDate || "";
    postDescriptionInput.value = post.description || "";
    updateTripDurationSummary();

    citiesContainer.innerHTML = "";
    const cityValues = Array.isArray(post.cities) && post.cities.length ? post.cities : [""];
    cityValues.forEach((city) => addCityField(city));
    refreshCityFields();

    document.getElementById("ratingSights").value = String(post.ratings?.sights ?? "");
    document.getElementById("ratingFood").value = String(post.ratings?.food ?? "");
    document.getElementById("ratingActivities").value = String(post.ratings?.activities ?? "");
    document.getElementById("ratingEase").value = String(post.ratings?.ease ?? "");
    document.getElementById("ratingCost").value = String(post.ratings?.cost ?? "");

    photosData = Array.isArray(post.photos) ? [...post.photos] : [];
    renderPhotosPreview();
    updateAverage();
  }

  function renderPhotosPreview() {
    postPhotosPreview.innerHTML = "";

    photosData.forEach((photo, index) => {
      const card = document.createElement("div");
      card.className = "tripnest-post-preview-card";

      const img = document.createElement("img");
      img.src = photo;
      img.className = "tripnest-post-preview-image";

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "tripnest-remove-photo-btn";
      removeButton.textContent = "Delete";
      removeButton.addEventListener("click", () => {
        photosData.splice(index, 1);
        renderPhotosPreview();
        setMessage("", "");
      });

      card.appendChild(img);
      card.appendChild(removeButton);
      postPhotosPreview.appendChild(card);
    });
  }

  async function readFileAsDataUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });
  }

  [postTravelDateInput, postReturnDateInput].forEach((dateInput) => {
    dateInput?.addEventListener("change", () => {
      updateTripDurationSummary();
    });
  });

  addCityBtn?.addEventListener("click", () => {
    const confirmedCountry = selectedCountry || findCountryMatch(postCountryInput?.value);
    if (!confirmedCountry) {
      setMessage("Choose city first.", "error");
      return;
    }

    selectedCountry = confirmedCountry;
    postCountryInput.value = confirmedCountry;
    setMessage("", "");
    addCityField();
    refreshCityFields();
  });

  postCountryInput?.addEventListener("input", () => {
    selectedCountry = findCountryMatch(postCountryInput.value) || "";
    setMessage("", "");

    const cityInputs = citiesContainer.querySelectorAll(".tripnest-city-input");
    cityInputs.forEach((input) => {
      input.value = "";
      input.dataset.selectedCity = "";
      updateCityInputState(input);
      if (input._autocomplete) {
        closeAutocomplete(input._autocomplete);
      }
    });

    buildCountryResults();
  });

  postCountryInput?.addEventListener("focus", () => {
    if (!postCountryInput.value.trim()) {
      showAutocompleteHint(countryAutocomplete, "Type at least 2 characters.");
      return;
    }

    buildCountryResults();
  });

  postCountryInput?.addEventListener("blur", () => {
    const exactMatch = findCountryMatch(postCountryInput.value);
    if (exactMatch) {
      selectedCountry = exactMatch;
      postCountryInput.value = exactMatch;
      refreshCityFields();
    }
  });

  ratingInputs.forEach((input) => {
    input?.addEventListener("input", () => {
      normalizeRatingInput(input);
      updateAverage();
    });
  });

  postPhotosInput?.addEventListener("change", async () => {
    const remainingSlots = MAX_PHOTOS - photosData.length;

    if (remainingSlots <= 0) {
      setMessage(`You can upload a maximum of ${MAX_PHOTOS} photos.`, "error");
      postPhotosInput.value = "";
      return;
    }

    const files = Array.from(postPhotosInput.files || []).slice(0, remainingSlots);
    if (!files.length) {
      return;
    }

    for (const file of files) {
      const dataUrl = await readFileAsDataUrl(file);
      photosData.push(dataUrl);
    }

    if ((postPhotosInput.files || []).length > remainingSlots) {
      setMessage(
        `Only the first ${remainingSlots} new photos were kept to avoid exceeding the limit of ${MAX_PHOTOS}.`,
        "error"
      );
    } else {
      setMessage("", "");
    }

    renderPhotosPreview();
    postPhotosInput.value = "";
  });

  createPostForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const confirmedCountry = selectedCountry || findCountryMatch(postCountryInput?.value);
    const rawCityInputs = Array.from(document.querySelectorAll(".tripnest-city-input"));

    const rawCityValues = rawCityInputs
      .map((input) => String(input.value || "").trim())
      .filter(Boolean);

    const cities = rawCityInputs
      .map((input) => input.dataset.selectedCity || findCityMatch(input.value))
      .filter(Boolean);

    if (!confirmedCountry) {
      setMessage("Please select a country for the post.", "error");
      return;
    }

    postCountryInput.value = confirmedCountry;
    selectedCountry = confirmedCountry;

    if (postReturnDateInput?.value && postTravelDateInput?.value && postReturnDateInput.value < postTravelDateInput.value) {
      setMessage("The return date must be after the departure date..", "error");
      return;
    }

    if (!rawCityValues.length || cities.length !== rawCityValues.length) {
      setMessage("Please select valid cities from the country results.", "error");
      return;
    }

    const ratingValues = ratingInputs.map((input) => Number(input.value));
    if (ratingValues.some((value) => Number.isNaN(value) || value < 0 || value > MAX_RATING)) {
      setMessage(`Scores must be from 0 to ${MAX_RATING}.`, "error");
      return;
    }

    try {
      const endpoint = isEditMode ? "/api/posts/update" : "/api/posts/create";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: currentPostId,
          userId: user.id,
          country: confirmedCountry,
          cities,
          description: postDescriptionInput.value.trim(),
          travelDate: postTravelDateInput.value,
          returnDate: postReturnDateInput?.value || "",
          photos: photosData,
          ratings: {
            sights: document.getElementById("ratingSights").value,
            food: document.getElementById("ratingFood").value,
            activities: document.getElementById("ratingActivities").value,
            ease: document.getElementById("ratingEase").value,
            cost: document.getElementById("ratingCost").value
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to publish the post.");
      }

      localStorage.setItem("tripnest_user", JSON.stringify(data.user));
      localStorage.setItem(`tripnest_posts_${user.username}`, String(data.user.postsCount || 0));

      setMessage(isEditMode ? "The publication was successfully updated." : "The publication was successfully saved.", "success");
      setTimeout(() => {
        window.location.href = "./profile.html";
      }, 500);
    } catch (error) {
      setMessage(error.message, "error");
    }
  });

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("tripnest_user");
    window.location.href = "/";
  });

  document.addEventListener("click", (event) => {
    const insideCountry = countryAutocomplete?.shell?.contains(event.target);
    if (!insideCountry) {
      closeAutocomplete(countryAutocomplete);
    }

    const cityInputs = citiesContainer.querySelectorAll(".tripnest-city-input");
    cityInputs.forEach((input) => {
      const instance = input._autocomplete;
      const insideCity = instance?.shell?.contains(event.target);
      if (!insideCity) {
        closeAutocomplete(instance);
      }
    });
  });

  async function initForm() {
    applyFormMode();
    setRatingsMax();
    addCityBtn.disabled = true;
    if (postCountryInput) {
      postCountryInput.disabled = true;
    }

    injectAutocompleteStyles();
    countryAutocomplete = createAutocomplete(postCountryInput);

    addCityField();

    try {
      await loadCountriesAndCities();
      populateCountrySelect();
      if (postCountryInput) {
        postCountryInput.disabled = false;
      }

      const post = await loadPostForEdit();
      if (post) {
        populateForm(post);
      } else {
        refreshCityFields();
      }
    } catch (error) {
      setMessage(error.message, "error");
    }
  }

  initForm();
});