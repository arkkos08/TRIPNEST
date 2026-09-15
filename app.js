document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const switchButtons = document.querySelectorAll(".switch-mode");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const birthDate = document.getElementById("birthDate");
  const ageMessage = document.getElementById("ageMessage");

  const registerUsername = document.getElementById("registerUsername");
  const registerNickname = document.getElementById("registerNickname");
  const registerEmail = document.getElementById("registerEmail");
  const registerPassword = registerForm?.querySelector('input[type="password"]');
  const registerGender = document.getElementById("registerGender") || registerForm?.querySelector("select");
  const registerResidenceCountry = document.getElementById("registerResidenceCountry");
  const registerResidenceCity = document.getElementById("registerResidenceCity");
  const registerPhoneFlag = document.getElementById("registerPhoneFlag");
  const registerPhoneCodeDisplay = document.getElementById("registerPhoneCodeDisplay");
  const registerPhoneCode = document.getElementById("registerPhoneCode");
  const registerPhoneNumber = document.getElementById("registerPhoneNumber");

  let locationMetadata = [];
  let selectedCountry = "";
  let selectedCity = "";
  let countryAutocomplete = null;
  let cityAutocomplete = null;
  let phoneAutocomplete = null;

  function showMode(mode) {
    const isLogin = mode === "login";
    loginForm.classList.toggle("active", isLogin);
    registerForm.classList.toggle("active", !isLogin);

    tabButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === mode);
    });
  }

  function calculateAge(dateValue) {
    if (!dateValue) {
      return null;
    }

    const today = new Date();
    const birth = new Date(dateValue);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }

    return age;
  }

  function isAllowedEmail(email) {
    const normalizedEmail = String(email).trim().toLowerCase();
    return /@(gmail\.com|hotmail\.com|yahoo\.com|outlook\.com)$/.test(normalizedEmail);
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }

    return data;
  }

  function redirectByRole(user) {
    window.location.href = "/home.html";
  }

  function injectAutocompleteStyles() {
    if (document.getElementById("tripnestRegisterAutocompleteStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "tripnestRegisterAutocompleteStyles";
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
        z-index: 20;
        background: #ffffff;
        border: 1px solid #d7e5dc;
        border-radius: 16px;
        box-shadow: 0 16px 32px rgba(13, 75, 45, 0.12);
        padding: 8px;
        max-height: 240px;
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

  function createAutocomplete(input, anchorElement = input) {
    if (!input || !anchorElement || !anchorElement.parentElement) {
      return null;
    }

    const shell = document.createElement("div");
    shell.className = "tripnest-autocomplete-shell";
    anchorElement.parentElement.insertBefore(shell, anchorElement);
    shell.appendChild(anchorElement);

    const results = document.createElement("div");
    results.className = "tripnest-autocomplete-results";
    results.hidden = true;
    shell.appendChild(results);

    return { shell, input, results };
  }

  function openAutocomplete(instance) {
    if (instance?.results) {
      instance.results.hidden = false;
    }
  }

  function closeAutocomplete(instance) {
    if (!instance?.results) {
      return;
    }

    instance.results.hidden = true;
    instance.results.innerHTML = "";
  }

  function showHint(instance, text) {
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

  function getFlagEmoji(iso2) {
    const code = String(iso2 || "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) {
      return "🌍";
    }

    return String.fromCodePoint(...code.split("").map((char) => 127397 + char.charCodeAt(0)));
  }

  function findCountryEntry(value) {
    const normalizedValue = normalizeText(value);
    return locationMetadata.find((entry) => normalizeText(entry.name) === normalizedValue) || null;
  }

  function findPhoneCountryEntry(value) {
    const normalizedValue = normalizeText(value);
    return (
      locationMetadata.find((entry) => {
        const display = normalizeText(`${entry.name} (${entry.phoneCode})`);
        return display === normalizedValue || normalizeText(entry.phoneCode) === normalizedValue;
      }) || null
    );
  }

  function findCityMatch(countryName, value) {
    const country = findCountryEntry(countryName);
    const normalizedValue = normalizeText(value);
    if (!country || !normalizedValue) {
      return "";
    }

    return country.cities.find((city) => normalizeText(city) === normalizedValue) || "";
  }

  function updatePhoneSelection(countryOrEntry) {
    const country =
      typeof countryOrEntry === "string" ? findCountryEntry(countryOrEntry) || findPhoneCountryEntry(countryOrEntry) : countryOrEntry;

    registerPhoneCode.value = country?.phoneCode || "";
    if (registerPhoneCodeDisplay) {
      registerPhoneCodeDisplay.value = country ? `${country.name} (${country.phoneCode})` : "";
    }
    if (registerPhoneFlag) {
      registerPhoneFlag.textContent = getFlagEmoji(country?.iso2);
    }
  }

  function setCityInputState() {
    const country = findCountryEntry(selectedCountry || registerResidenceCountry?.value);
    const hasCountry = Boolean(country);
    registerResidenceCity.disabled = !hasCountry;
    registerResidenceCity.placeholder = hasCountry
      ? "Type at least 2 characters"
      : "Choose a country first";
  }

  function updateCountryResults() {
    const query = normalizeText(registerResidenceCountry.value);

    if (query.length < 2) {
      closeAutocomplete(countryAutocomplete);
      return;
    }

    const matches = locationMetadata
      .filter((entry) => normalizeText(entry.name).includes(query))
      .slice(0, 10)
      .map((entry) => entry.name);

    renderAutocompleteResults(countryAutocomplete, matches, "No countries found.", (countryName) => {
      selectedCountry = countryName;
      selectedCity = "";
      registerResidenceCountry.value = countryName;
      registerResidenceCity.value = "";
      updatePhoneSelection(countryName);
      setCityInputState();
      closeAutocomplete(countryAutocomplete);
      closeAutocomplete(cityAutocomplete);
      registerResidenceCity.focus();
    });
  }

  function updateCityResults() {
    const country = findCountryEntry(selectedCountry || registerResidenceCountry.value);
    const query = normalizeText(registerResidenceCity.value);

    if (!country || query.length < 2) {
      closeAutocomplete(cityAutocomplete);
      return;
    }

    const matches = country.cities.filter((city) => normalizeText(city).includes(query)).slice(0, 12);

    renderAutocompleteResults(cityAutocomplete, matches, "No cities found.", (cityName) => {
      selectedCity = cityName;
      registerResidenceCity.value = cityName;
      closeAutocomplete(cityAutocomplete);
    });
  }

  function updatePhoneResults() {
    const query = normalizeText(registerPhoneCodeDisplay?.value);

    if (query.length < 2) {
      closeAutocomplete(phoneAutocomplete);
      return;
    }

    const matches = locationMetadata
      .filter((entry) => normalizeText(entry.name).includes(query) || normalizeText(entry.phoneCode).includes(query))
      .slice(0, 12)
      .map((entry) => `${getFlagEmoji(entry.iso2)} ${entry.name} (${entry.phoneCode})`);

    renderAutocompleteResults(phoneAutocomplete, matches, "No countries found.", (label) => {
      const matchedCountry = findPhoneCountryEntry(label.replace(/^[^\s]+\s/, ""));
      updatePhoneSelection(matchedCountry);
      closeAutocomplete(phoneAutocomplete);
    });
  }

  async function loadLocationMetadata() {
    const response = await fetch("/api/location/countries");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "The countries list could not be loaded.");
    }

    locationMetadata = Array.isArray(data.countries) ? data.countries : [];
  }

  async function handleLoginSubmit() {
    const loginInputs = loginForm.querySelectorAll("input");
    const identifier = loginInputs[0].value.trim();
    const password = loginInputs[1].value.trim();

    if (!identifier || !password) {
      alert("Please fill in username/email and password.");
      return;
    }

    try {
      const result = await postJson("/api/login", { identifier, password });
      localStorage.setItem("tripnest_user", JSON.stringify(result.user));
      redirectByRole(result.user);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleRegisterSubmit() {
    const username = registerUsername.value.trim();
    const nickname = registerNickname.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword?.value.trim() || "";
    const birthDateValue = birthDate.value;
    const gender = registerGender.value;
    const residenceCountry = registerResidenceCountry.value.trim();
    const residenceCity = registerResidenceCity.value.trim();
    const phoneCountryCode = registerPhoneCode.value.trim();
    const phoneNumber = registerPhoneNumber.value.trim();
    const age = calculateAge(birthDateValue);
    const confirmedCountry = findCountryEntry(residenceCountry);
    const confirmedCity = confirmedCountry ? findCityMatch(confirmedCountry.name, residenceCity) : "";

    if (
      !username ||
      !nickname ||
      !email ||
      !password ||
      !birthDateValue ||
      !gender ||
      !residenceCountry ||
      !residenceCity ||
      !phoneCountryCode ||
      !phoneNumber
    ) {
      ageMessage.textContent = "Please fill in all registration fields.";
      ageMessage.className = "helper-text error";
      return;
    }

    if (!confirmedCountry) {
      ageMessage.textContent = "Please choose a valid country of residence from the results.";
      ageMessage.className = "helper-text error";
      return;
    }

    if (!confirmedCity) {
      ageMessage.textContent = "Please choose a valid city of residence from the results.";
      ageMessage.className = "helper-text error";
      return;
    }

    if (!isAllowedEmail(email)) {
      ageMessage.textContent =
        "The email must be in the form @gmail.com, @hotmail.com, @yahoo.com or @outlook.com.";
      ageMessage.className = "helper-text error";
      return;
    }

    if (age === null || age <= 18) {
      ageMessage.textContent = "Registration is allowed only for users over 18 years old.";
      ageMessage.className = "helper-text error";
      return;
    }

    if (!/^[0-9]{5,15}$/.test(phoneNumber)) {
      ageMessage.textContent = "The mobile number must contain only digits.";
      ageMessage.className = "helper-text error";
      return;
    }

    try {
      await postJson("/api/register", {
        username,
        nickname,
        email,
        password,
        birthDate: birthDateValue,
        gender,
        residenceCountry: confirmedCountry.name,
        residenceCity: confirmedCity,
        phoneCountryCode,
        phoneNumber
      });

      ageMessage.textContent = "Registration completed. You can now log in.";
      ageMessage.className = "helper-text success";
      registerForm.reset();
      selectedCountry = "";
      selectedCity = "";
      setCityInputState();
      showMode("login");
      loginForm.querySelector("input")?.focus();
      alert("Registration completed. Sign in with your new credentials.");
    } catch (error) {
      ageMessage.textContent = error.message;
      ageMessage.className = "helper-text error";
    }
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => showMode(button.dataset.mode));
  });

  switchButtons.forEach((button) => {
    button.addEventListener("click", () => showMode(button.dataset.mode));
  });

  loginBtn.addEventListener("click", handleLoginSubmit);
  registerBtn.addEventListener("click", handleRegisterSubmit);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleLoginSubmit();
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleRegisterSubmit();
  });

  birthDate.addEventListener("change", () => {
    const age = calculateAge(birthDate.value);

    if (age === null) {
      ageMessage.textContent = "Registration is allowed only for users over 18 years old.";
      ageMessage.className = "helper-text";
      return;
    }

    if (age <= 18) {
      ageMessage.textContent = "The user must be over 18 years old.";
      ageMessage.className = "helper-text error";
      return;
    }

    ageMessage.textContent = "The age is valid.";
    ageMessage.className = "helper-text success";
  });

  registerResidenceCountry?.addEventListener("input", () => {
    selectedCountry = findCountryEntry(registerResidenceCountry.value)?.name || "";
    selectedCity = "";
    registerResidenceCity.value = "";
    updatePhoneSelection(selectedCountry || registerResidenceCountry.value);
    setCityInputState();
    updateCountryResults();
    closeAutocomplete(cityAutocomplete);
  });

  registerResidenceCountry?.addEventListener("focus", () => {
    if (!registerResidenceCountry.value.trim()) {
      showHint(countryAutocomplete, "Πληκτρολόγησε τουλάχιστον 2 χαρακτήρες.");
      return;
    }

    updateCountryResults();
  });

  registerResidenceCountry?.addEventListener("blur", () => {
    const exactMatch = findCountryEntry(registerResidenceCountry.value);
    if (!exactMatch) {
      return;
    }

    selectedCountry = exactMatch.name;
    registerResidenceCountry.value = exactMatch.name;
    updatePhoneSelection(exactMatch.name);
    setCityInputState();
  });

  registerPhoneCodeDisplay?.addEventListener("input", () => {
    registerPhoneCode.value = "";
    if (registerPhoneFlag) {
      registerPhoneFlag.textContent = "🌍";
    }
    updatePhoneResults();
  });

  registerPhoneCodeDisplay?.addEventListener("focus", () => {
    if (normalizeText(registerPhoneCodeDisplay.value).length < 2) {
      showHint(phoneAutocomplete, "Type at least 2 characters.");
      return;
    }

    updatePhoneResults();
  });

  registerPhoneCodeDisplay?.addEventListener("blur", () => {
    const exactMatch = findPhoneCountryEntry(registerPhoneCodeDisplay.value);
    if (exactMatch) {
      updatePhoneSelection(exactMatch);
      return;
    }

    if (selectedCountry) {
      updatePhoneSelection(selectedCountry);
    }
  });

  registerResidenceCity?.addEventListener("input", () => {
    selectedCity = findCityMatch(selectedCountry || registerResidenceCountry.value, registerResidenceCity.value);
    updateCityResults();
  });

  registerResidenceCity?.addEventListener("focus", () => {
    if (!selectedCountry && !findCountryEntry(registerResidenceCountry.value)) {
      showHint(cityAutocomplete, "choose country first.");
      return;
    }

    if (!registerResidenceCity.value.trim()) {
      showHint(cityAutocomplete, "Type at least 2 characters.");
      return;
    }

    updateCityResults();
  });

  registerResidenceCity?.addEventListener("blur", () => {
    const exactMatch = findCityMatch(selectedCountry || registerResidenceCountry.value, registerResidenceCity.value);
    if (exactMatch) {
      selectedCity = exactMatch;
      registerResidenceCity.value = exactMatch;
    }
  });

  document.addEventListener("click", (event) => {
    const insideCountry = countryAutocomplete?.shell?.contains(event.target);
    const insideCity = cityAutocomplete?.shell?.contains(event.target);
    const insidePhone = phoneAutocomplete?.shell?.contains(event.target);

    if (!insideCountry) {
      closeAutocomplete(countryAutocomplete);
    }
    if (!insideCity) {
      closeAutocomplete(cityAutocomplete);
    }
    if (!insidePhone) {
      closeAutocomplete(phoneAutocomplete);
    }
  });

  injectAutocompleteStyles();
  countryAutocomplete = createAutocomplete(registerResidenceCountry);
  cityAutocomplete = createAutocomplete(registerResidenceCity);
  phoneAutocomplete = createAutocomplete(registerPhoneCodeDisplay, registerPhoneCodeDisplay.parentElement);
  setCityInputState();

  loadLocationMetadata().catch((error) => {
    ageMessage.textContent = error.message;
    ageMessage.className = "helper-text error";
  });
});
