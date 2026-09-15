document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("tripnest_user") || "null");

  if (!user) {
    window.location.href = "/";
    return;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  const editProfileForm = document.getElementById("editProfileForm");
  const profileImageInput = document.getElementById("profileImageInput");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const editAvatarPreview = document.getElementById("editAvatarPreview");
  const editProfileMessage = document.getElementById("editProfileMessage");
  const profileImageCropModal = document.getElementById("profileImageCropModal");
  const profileImageCropViewport = document.getElementById("profileImageCropViewport");
  const profileImageCropPreview = document.getElementById("profileImageCropPreview");
  const removeProfileImageBtn = document.getElementById("removeProfileImageBtn");
  const closeProfileImageCropModalBtn = document.getElementById("closeProfileImageCropModal");
  const applyProfileImageCropBtn = document.getElementById("applyProfileImageCropBtn");
  const removeProfileImageCropBtn = document.getElementById("removeProfileImageCropBtn");

  const editUsername = document.getElementById("editUsername");
  const editNickname = document.getElementById("editNickname");
  const editEmail = document.getElementById("editEmail");
  const editBirthDate = document.getElementById("editBirthDate");
  const editGender = document.getElementById("editGender");
  const editResidenceCountry = document.getElementById("editResidenceCountry");
  const editResidenceCity = document.getElementById("editResidenceCity");
  const editPhoneFlag = document.getElementById("editPhoneFlag");
  const editPhoneCodeDisplay = document.getElementById("editPhoneCodeDisplay");
  const editPhoneCode = document.getElementById("editPhoneCode");
  const editPhoneNumber = document.getElementById("editPhoneNumber");
  const editBio = document.getElementById("editBio");
  const currentPassword = document.getElementById("currentPassword");
  const newPassword = document.getElementById("newPassword");
  const confirmPassword = document.getElementById("confirmPassword");

  let profileImageData = "";
  let profileImagePosition = { x: 50, y: 50 };
  let locationMetadata = [];
  let selectedCountry = "";
  let selectedCity = "";
  let countryAutocomplete = null;
  let cityAutocomplete = null;
  let phoneAutocomplete = null;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeProfileImagePosition(value) {
    const source = value && typeof value === "object" ? value : {};
    const x = clamp(Number(source.x ?? 50), 0, 100);
    const y = clamp(Number(source.y ?? 50), 0, 100);
    return { x: Number.isFinite(x) ? x : 50, y: Number.isFinite(y) ? y : 50 };
  }

  function renderProfileImagePreview() {
    if (!editAvatarPreview) {
      return;
    }

    const hasImage = Boolean(profileImageData);
    if (hasImage) {
      editAvatarPreview.innerHTML = `
        <img
          src="${profileImageData}"
          alt="Profile"
          class="tripnest-avatar-image"
          style="object-position: ${profileImagePosition.x}% ${profileImagePosition.y}%"
        />
      `;
    } else {
      editAvatarPreview.innerHTML = "";
      editAvatarPreview.textContent = (editNickname.value || editUsername.value || "T").charAt(0).toUpperCase();
    }

    if (removeProfileImageBtn) {
      removeProfileImageBtn.disabled = !hasImage;
    }
  }

  function renderCropPreview() {
    if (profileImageCropPreview && profileImageData) {
      profileImageCropPreview.src = profileImageData;
      profileImageCropPreview.style.objectPosition = `${profileImagePosition.x}% ${profileImagePosition.y}%`;
    }
  }

  function openProfileImageCropModal() {
    if (!profileImageData || !profileImageCropModal) {
      return;
    }

    renderCropPreview();
    profileImageCropModal.hidden = false;
  }

  function closeProfileImageCropModal() {
    if (!profileImageCropModal) {
      return;
    }

    profileImageCropModal.hidden = true;
  }

  function setProfileImagePosition(x, y) {
    profileImagePosition = normalizeProfileImagePosition({ x, y });
    renderProfileImagePreview();
    renderCropPreview();
  }

  function updateProfileImagePositionFromPointer(event) {
    if (!profileImageCropViewport || !profileImageData) {
      return;
    }

    const rect = profileImageCropViewport.getBoundingClientRect();
    const relativeX = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const relativeY = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
    setProfileImagePosition(relativeX, relativeY);
  }

  function normalizeGreek(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function normalizeGender(value) {
    const text = normalizeGreek(value);

    if (text.includes("ανδρ") || text.includes("αντρ")) {
      return "Άνδρας";
    }

    if (text.includes("γυν")) {
      return "Γυναίκα";
    }

    return "";
  }

  function normalizeDate(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value) : "";
    }

    return date.toISOString().slice(0, 10);
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function setMessage(text, type) {
    editProfileMessage.textContent = text;
    editProfileMessage.className = text ? `tripnest-edit-message ${type}` : "tripnest-edit-message";
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

  function injectAutocompleteStyles() {
    if (document.getElementById("tripnestEditProfileAutocompleteStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "tripnestEditProfileAutocompleteStyles";
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

    editPhoneCode.value = country?.phoneCode || "";
    if (editPhoneCodeDisplay) {
      editPhoneCodeDisplay.value = country ? `${country.name} (${country.phoneCode})` : "";
    }
    if (editPhoneFlag) {
      editPhoneFlag.textContent = getFlagEmoji(country?.iso2);
    }
  }

  function resolveProfileDefaults(profile) {
    const fallbackCountry = String(profile.residenceCountry || "").trim();
    const matchedCountry = findCountryEntry(fallbackCountry) || findPhoneCountryEntry(profile.phoneCountryCode || "");
    const resolvedCountry = matchedCountry?.name || fallbackCountry;
    const resolvedCity = matchedCountry
      ? matchedCountry.cities.find((city) => normalizeText(city) === normalizeText(profile.residenceCity || "")) ||
        String(profile.residenceCity || "").trim()
      : String(profile.residenceCity || "").trim();

    return {
      ...profile,
      residenceCountry: resolvedCountry,
      residenceCity: resolvedCity,
      phoneCountryCode: matchedCountry?.phoneCode || String(profile.phoneCountryCode || "").trim()
    };
  }

  function setCityInputState() {
    const country = findCountryEntry(selectedCountry || editResidenceCountry.value);
    const hasCountry = Boolean(country);
    editResidenceCity.disabled = !hasCountry;
    editResidenceCity.placeholder = hasCountry ? "Type at least 2 characters" : "Select a country first";
  }

  function renderProfileForm(profile) {
    const defaults = locationMetadata.length ? resolveProfileDefaults(profile) : profile;

    profileImageData = defaults.profileImage || "";
    profileImagePosition = normalizeProfileImagePosition(defaults.profileImagePosition);
    editUsername.value = defaults.username || "";
    editNickname.value = defaults.nickname || "";
    editEmail.value = defaults.email || "";
    editBirthDate.value = normalizeDate(defaults.birthDate);
    editGender.value = normalizeGender(defaults.gender);
    editResidenceCountry.value = defaults.residenceCountry || "";
    editResidenceCity.value = defaults.residenceCity || "";
    updatePhoneSelection(defaults.residenceCountry || defaults.phoneCountryCode || "");
    editPhoneNumber.value = defaults.phoneNumber || "";
    editBio.value = defaults.bio || "";
    selectedCountry = defaults.residenceCountry || "";
    selectedCity = defaults.residenceCity || "";
    setCityInputState();
    renderProfileImagePreview();
  }

  async function loadProfile() {
    const response = await fetch(`/api/profile?id=${encodeURIComponent(user.id)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load profile.");
    }

    localStorage.setItem("tripnest_user", JSON.stringify(data.user));
    return data.user;
  }

  async function loadLocationMetadata() {
    const response = await fetch("/api/location/countries");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load countries.");
    }

    locationMetadata = Array.isArray(data.countries) ? data.countries : [];
  }

  function updateCountryResults() {
    const query = normalizeText(editResidenceCountry.value);

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
      editResidenceCountry.value = countryName;
      editResidenceCity.value = "";
      updatePhoneSelection(countryName);
      setCityInputState();
      closeAutocomplete(countryAutocomplete);
      closeAutocomplete(cityAutocomplete);
      editResidenceCity.focus();
    });
  }

  function updateCityResults() {
    const country = findCountryEntry(selectedCountry || editResidenceCountry.value);
    const query = normalizeText(editResidenceCity.value);

    if (!country || query.length < 2) {
      closeAutocomplete(cityAutocomplete);
      return;
    }

    const matches = country.cities.filter((city) => normalizeText(city).includes(query)).slice(0, 12);

    renderAutocompleteResults(cityAutocomplete, matches, "No cities found.", (cityName) => {
      selectedCity = cityName;
      editResidenceCity.value = cityName;
      closeAutocomplete(cityAutocomplete);
    });
  }

  function updatePhoneResults() {
    const query = normalizeText(editPhoneCodeDisplay?.value);

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

  profileImageInput?.addEventListener("change", () => {
    const file = profileImageInput.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      profileImageData = String(reader.result || "");
      profileImagePosition = { x: 50, y: 50 };
      renderProfileImagePreview();
      openProfileImageCropModal();
    };
    reader.readAsDataURL(file);
  });

  removeProfileImageBtn?.addEventListener("click", () => {
    profileImageData = "";
    profileImagePosition = { x: 50, y: 50 };
    if (profileImageInput) {
      profileImageInput.value = "";
    }
    renderProfileImagePreview();
  });

  profileImageCropViewport?.addEventListener("pointerdown", (event) => {
    if (!profileImageData) {
      return;
    }

    updateProfileImagePositionFromPointer(event);
    profileImageCropViewport.setPointerCapture?.(event.pointerId);
  });

  profileImageCropViewport?.addEventListener("pointermove", (event) => {
    if (!profileImageData || event.buttons !== 1) {
      return;
    }

    updateProfileImagePositionFromPointer(event);
  });

  profileImageCropViewport?.addEventListener("keydown", (event) => {
    if (!profileImageData) {
      return;
    }

    const moveAmount = event.shiftKey ? 10 : 5;
    if (event.key === "ArrowLeft") {
      setProfileImagePosition(profileImagePosition.x - moveAmount, profileImagePosition.y);
      event.preventDefault();
    } else if (event.key === "ArrowRight") {
      setProfileImagePosition(profileImagePosition.x + moveAmount, profileImagePosition.y);
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      setProfileImagePosition(profileImagePosition.x, profileImagePosition.y - moveAmount);
      event.preventDefault();
    } else if (event.key === "ArrowDown") {
      setProfileImagePosition(profileImagePosition.x, profileImagePosition.y + moveAmount);
      event.preventDefault();
    }
  });

  closeProfileImageCropModalBtn?.addEventListener("click", () => {
    closeProfileImageCropModal();
  });

  removeProfileImageCropBtn?.addEventListener("click", () => {
    profileImageData = "";
    profileImagePosition = { x: 50, y: 50 };
    closeProfileImageCropModal();
    if (profileImageInput) {
      profileImageInput.value = "";
    }
    renderProfileImagePreview();
  });

  applyProfileImageCropBtn?.addEventListener("click", () => {
    closeProfileImageCropModal();
    renderProfileImagePreview();
  });

  editResidenceCountry?.addEventListener("input", () => {
    selectedCountry = findCountryEntry(editResidenceCountry.value)?.name || "";
    selectedCity = "";
    editResidenceCity.value = "";
    updatePhoneSelection(selectedCountry || editResidenceCountry.value);
    setCityInputState();
    updateCountryResults();
    closeAutocomplete(cityAutocomplete);
  });

  editResidenceCountry?.addEventListener("focus", () => {
    if (!editResidenceCountry.value.trim()) {
      showHint(countryAutocomplete, "Type at least 2 characters.");
      return;
    }

    updateCountryResults();
  });

  editResidenceCountry?.addEventListener("blur", () => {
    const exactMatch = findCountryEntry(editResidenceCountry.value);
    if (!exactMatch) {
      return;
    }

    selectedCountry = exactMatch.name;
    editResidenceCountry.value = exactMatch.name;
    updatePhoneSelection(exactMatch.name);
    setCityInputState();
  });

  editPhoneCodeDisplay?.addEventListener("input", () => {
    editPhoneCode.value = "";
    if (editPhoneFlag) {
      editPhoneFlag.textContent = "🌍";
    }
    updatePhoneResults();
  });

  editPhoneCodeDisplay?.addEventListener("focus", () => {
    if (normalizeText(editPhoneCodeDisplay.value).length < 2) {
      showHint(phoneAutocomplete, "Type at least 2 characters.");
      return;
    }

    updatePhoneResults();
  });

  editPhoneCodeDisplay?.addEventListener("blur", () => {
    const exactMatch = findPhoneCountryEntry(editPhoneCodeDisplay.value);
    if (exactMatch) {
      updatePhoneSelection(exactMatch);
      return;
    }

    if (selectedCountry) {
      updatePhoneSelection(selectedCountry);
    }
  });

  editResidenceCity?.addEventListener("input", () => {
    selectedCity = findCityMatch(selectedCountry || editResidenceCountry.value, editResidenceCity.value);
    updateCityResults();
  });

  editResidenceCity?.addEventListener("focus", () => {
    if (!selectedCountry && !findCountryEntry(editResidenceCountry.value)) {
      showHint(cityAutocomplete, "Select a country first.");
      return;
    }

    if (!editResidenceCity.value.trim()) {
      showHint(cityAutocomplete, "Type at least 2 characters.");
      return;
    }

    updateCityResults();
  });

  editResidenceCity?.addEventListener("blur", () => {
    const exactMatch = findCityMatch(selectedCountry || editResidenceCountry.value, editResidenceCity.value);
    if (exactMatch) {
      selectedCity = exactMatch;
      editResidenceCity.value = exactMatch;
    }
  });

  editProfileForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const age = calculateAge(editBirthDate.value);
    const confirmedCountry = findCountryEntry(editResidenceCountry.value);
    const confirmedCity = confirmedCountry ? findCityMatch(confirmedCountry.name, editResidenceCity.value) : "";

    if (age === null || age <= 18) {
      setMessage("The user must be over 18 years of age.", "error");
      return;
    }

    if (!confirmedCountry) {
      setMessage("Select a valid residence country from the results.", "error");
      return;
    }

    if (!confirmedCity) {
      setMessage("Select a valid city of residence from the results.", "error");
      return;
    }

    if (!/^[0-9]{5,15}$/.test(editPhoneNumber.value.trim())) {
      setMessage("The mobile number must contain only digits.", "error");
      return;
    }

    if ((currentPassword.value || newPassword.value || confirmPassword.value) && newPassword.value !== confirmPassword.value) {
      setMessage("The new password and the confirmation must match..", "error");
      return;
    }

    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          username: editUsername.value.trim(),
          nickname: editNickname.value.trim(),
          email: editEmail.value.trim(),
          birthDate: editBirthDate.value,
          gender: editGender.value,
          residenceCountry: confirmedCountry.name,
          residenceCity: confirmedCity,
          phoneCountryCode: editPhoneCode.value.trim(),
          phoneNumber: editPhoneNumber.value.trim(),
          bio: editBio.value.trim(),
          profileImage: profileImageData,
          profileImagePosition,
          currentPassword: currentPassword.value,
          newPassword: newPassword.value,
          confirmPassword: confirmPassword.value
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Αποτυχία ενημέρωσης προφίλ.");
      }

      localStorage.setItem("tripnest_user", JSON.stringify(data.user));
      setMessage("Το προφίλ ενημερώθηκε επιτυχώς.", "success");
      currentPassword.value = "";
      newPassword.value = "";
      confirmPassword.value = "";
    } catch (error) {
      setMessage(error.message, "error");
    }
  });

  deleteAccountBtn?.addEventListener("click", async () => {
    const confirmed = window.confirm(
      "Θέλεις σίγουρα να διαγράψεις οριστικά τον λογαριασμό σου; Θα μπορείς να κάνεις ξανά εγγραφή αργότερα."
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch("/api/profile/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Δεν ήταν δυνατή η διαγραφή του λογαριασμού.");
      }

      localStorage.removeItem("tripnest_user");
      alert("Ο λογαριασμός διαγράφηκε οριστικά.");
      window.location.href = "/";
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
  countryAutocomplete = createAutocomplete(editResidenceCountry);
  cityAutocomplete = createAutocomplete(editResidenceCity);
  phoneAutocomplete = createAutocomplete(editPhoneCodeDisplay, editPhoneCodeDisplay.parentElement);

  renderProfileForm(user);
  Promise.all([loadLocationMetadata(), loadProfile()])
    .then(([, profile]) => {
      renderProfileForm(profile || user);
    })
    .catch((error) => {
      setMessage(`${error.message} Εμφανίζονται προσωρινά τα τοπικά στοιχεία σου.`, "error");
    });
});
