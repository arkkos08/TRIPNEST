const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { countries: countriesList } = require("countries-list");

const PORT = process.env.PORT || 3000;
const baseDir = __dirname;
const dataDir = path.join(baseDir, "data");
const dbPath = path.join(dataDir, "db.json");
const airportsLitePath = path.join(dataDir, "airports-lite.json");
const MAX_RATING = 10;
const MAX_MESSAGE_ATTACHMENT_BYTES = 100 * 1024 * 1024;
const braveExecutablePath = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

function resolveBrowserExecutablePath() {
  const candidates = [
    process.env.TRIPNEST_BROWSER_PATH,
    braveExecutablePath,
    "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/brave-browser",
    "/usr/bin/brave",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

let airportsLiteCache = null;
let countryNameToIso2Cache = null;
let countryMetadataCache = null;

const manualCityAirportOverrides = {
  "greece|kilkis": "SKG"
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const defaultDatabase = {
  users: [],
  posts: [],
  tripPlans: [],
  messages: [],
  notifications: [],
  meta: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

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
  return totalDays >= 0 ? totalDays + 1 : null;
}

function ensureDatabase() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(defaultDatabase, null, 2), "utf8");
  }

  const database = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  let changed = false;

  if (!Array.isArray(database.tripPlans)) {
    database.tripPlans = [];
    changed = true;
  }

  if (!Array.isArray(database.posts)) {
    database.posts = [];
    changed = true;
  }

  database.posts = database.posts.map((post) => {
    if (!post || typeof post !== "object") {
      return post;
    }

    if (typeof post.returnDate === "undefined") {
      post.returnDate = "";
      changed = true;
    }

    if (typeof post.totalDays === "undefined") {
      post.totalDays = calculateTripDurationDays(post.travelDate, post.returnDate);
      changed = true;
    }

    if (post.returnDate && post.totalDays === null) {
      post.totalDays = calculateTripDurationDays(post.travelDate, post.returnDate);
      changed = true;
    }

    return post;
  });

  if (changed) {
    fs.writeFileSync(dbPath, JSON.stringify(database, null, 2), "utf8");
  }
}

function readDatabase() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeDatabase(database) {
  database.meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(dbPath, JSON.stringify(database, null, 2), "utf8");
}

function readCountriesCitiesDataset() {
  const datasetPath = path.join(dataDir, "countries-cities.json");
  if (!fs.existsSync(datasetPath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendFile(filePath, response) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Server error");
      return;
    }

    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  });
}

function collectRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk.toString();
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function calculateAge(dateValue) {
  const today = new Date();
  const birthDate = new Date(dateValue);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
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

function loadAirportsLite() {
  if (airportsLiteCache) {
    return airportsLiteCache;
  }

  if (!fs.existsSync(airportsLitePath)) {
    airportsLiteCache = [];
    return airportsLiteCache;
  }

  const raw = fs.readFileSync(airportsLitePath, "utf8");
  const parsed = JSON.parse(raw);
  airportsLiteCache = Array.isArray(parsed) ? parsed : [];
  return airportsLiteCache;
}

function buildCountryNameToIso2Map() {
  if (countryNameToIso2Cache) {
    return countryNameToIso2Cache;
  }

  const display = new Intl.DisplayNames(["en"], { type: "region" });
  const map = {};

  for (let first = 65; first <= 90; first += 1) {
    for (let second = 65; second <= 90; second += 1) {
      const code = String.fromCharCode(first) + String.fromCharCode(second);
      try {
        const name = display.of(code);
        if (name && name !== code) {
          map[normalizeText(name)] = code;
        }
      } catch (error) {
        // ignore invalid codes
      }
    }
  }

  const aliases = {
    "usa": "US",
    "united states": "US",
    "united states of america": "US",
    "uk": "GB",
    "united kingdom": "GB",
    "england": "GB",
    "south korea": "KR",
    "north korea": "KP",
    "russia": "RU",
    "moldova": "MD",
    "czech republic": "CZ",
    "palestine": "PS",
    "vatican": "VA"
  };

  Object.entries(aliases).forEach(([name, code]) => {
    map[normalizeText(name)] = code;
  });

  countryNameToIso2Cache = map;
  return countryNameToIso2Cache;
}

function buildCountryMetadata() {
  if (countryMetadataCache) {
    return countryMetadataCache;
  }

  const dataset = readCountriesCitiesDataset();
  const metadata = dataset
    .map((entry) => {
      const name = String(entry?.name || "").trim();
      if (!name) {
        return null;
      }

      const iso2 = countryNameToIso2(name);
      const countryInfo = iso2 ? countriesList[iso2] : null;
      const phoneCode = Array.isArray(countryInfo?.phone) ? String(countryInfo.phone[0] || "") : "";

      return {
        name,
        iso2,
        phoneCode: phoneCode ? `+${phoneCode}` : "",
        cities: Array.isArray(entry?.cities)
          ? [...new Set(entry.cities.map((city) => String(city || "").trim()).filter(Boolean))].sort((a, b) =>
              a.localeCompare(b)
            )
          : []
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  countryMetadataCache = metadata;
  return countryMetadataCache;
}

function countryNameToIso2(countryName) {
  const map = buildCountryNameToIso2Map();
  return map[normalizeText(countryName)] || "";
}

function getAirportTypeScore(type) {
  if (type === "large_airport") {
    return 300;
  }
  if (type === "medium_airport") {
    return 200;
  }
  if (type === "small_airport") {
    return 100;
  }
  return 0;
}

function scoreAirportMatch(city, airport) {
  const normalizedCity = normalizeText(city);
  const municipality = normalizeText(airport.municipality);
  const airportName = normalizeText(airport.name);

  let score = getAirportTypeScore(airport.type);

  if (municipality === normalizedCity) {
    score += 1000;
  } else if (municipality.includes(normalizedCity) || normalizedCity.includes(municipality)) {
    score += 700;
  }

  if (airportName.includes(normalizedCity)) {
    score += 400;
  }

  if (airport.iataCode) {
    score += 50;
  }

  return score;
}

function findAirportByIata(iataCode) {
  const airports = loadAirportsLite();
  const normalizedCode = String(iataCode || "").trim().toUpperCase();
  return airports.find((airport) => String(airport.iataCode || "").toUpperCase() === normalizedCode) || null;
}

function findBestAirportForCity(countryName, cityName) {
  const airports = loadAirportsLite();
  const normalizedCity = normalizeText(cityName);
  const normalizedCountry = normalizeText(countryName);
  const countryIso2 = countryNameToIso2(countryName);

  if (!normalizedCity) {
    return null;
  }

  const overrideKey = `${normalizedCountry}|${normalizedCity}`;
  const overrideIata = manualCityAirportOverrides[overrideKey];
  if (overrideIata) {
    const overrideAirport = findAirportByIata(overrideIata);
    if (overrideAirport) {
      return {
        airport: overrideAirport,
        strategy: "manual_override"
      };
    }
  }

  const sameCountryAirports = countryIso2
    ? airports.filter((airport) => String(airport.isoCountry || "").toUpperCase() === countryIso2)
    : airports;

  if (!sameCountryAirports.length) {
    return null;
  }

  const exactMunicipalityMatches = sameCountryAirports
    .filter((airport) => normalizeText(airport.municipality) === normalizedCity)
    .sort((a, b) => scoreAirportMatch(cityName, b) - scoreAirportMatch(cityName, a));

  if (exactMunicipalityMatches.length) {
    return {
      airport: exactMunicipalityMatches[0],
      strategy: "exact_municipality"
    };
  }

  const fuzzyMatches = sameCountryAirports
    .map((airport) => ({
      airport,
      score: scoreAirportMatch(cityName, airport)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (fuzzyMatches.length) {
    return {
      airport: fuzzyMatches[0].airport,
      strategy: "fuzzy_match"
    };
  }

  const fallback = sameCountryAirports
    .slice()
    .sort((a, b) => getAirportTypeScore(b.type) - getAirportTypeScore(a.type));

  if (fallback.length) {
    return {
      airport: fallback[0],
      strategy: "country_fallback"
    };
  }

  return null;
}

function isVisibleUser(user) {
  return Boolean(user);
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cleanupExpiredTripPlans(database) {
  if (!Array.isArray(database.tripPlans)) {
    database.tripPlans = [];
    return false;
  }

  const today = getTodayDateString();
  const initialLength = database.tripPlans.length;
  database.tripPlans = database.tripPlans.filter((plan) => {
    const returnDate = String(plan.returnDate || plan.endDate || "");
    return returnDate >= today;
  });
  return database.tripPlans.length !== initialLength;
}

function getFriendIdsForUser(user) {
  const followers = Array.isArray(user?.followers) ? user.followers : [];
  const following = Array.isArray(user?.following) ? user.following : [];
  return followers.filter((id) => following.includes(id));
}

function canUserViewTripPlan(viewer, owner, visibility) {
  if (!viewer || !owner) {
    return false;
  }

  if (viewer.id === owner.id) {
    return true;
  }

  const normalizedVisibility = String(visibility || "friends");

  if (normalizedVisibility === "all") {
    return true;
  }

  const ownerFriends = getFriendIdsForUser(owner);

  if (normalizedVisibility === "friends") {
    return ownerFriends.includes(viewer.id);
  }

  return false;
}

function normalizeMessageAttachment(attachment) {
  if (!attachment) {
    return null;
  }

  const size = Number(attachment.size);
  const dataUrl = String(attachment.dataUrl || "");

  if (!Number.isFinite(size) || size <= 0 || size > MAX_MESSAGE_ATTACHMENT_BYTES) {
    throw new Error("The file must be up to 100MB.");
  }

  if (!dataUrl.startsWith("data:")) {
    throw new Error("Invalid attachment file.");
  }

  return {
    name: String(attachment.name || "attachment").slice(0, 255),
    size,
    type: String(attachment.type || "application/octet-stream").slice(0, 120),
    dataUrl
  };
}

function normalizeProfileImagePosition(value) {
  const source = value && typeof value === "object" ? value : {};
  const x = Number(source.x ?? 50);
  const y = Number(source.y ?? 50);

  return {
    x: Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : 50,
    y: Number.isFinite(y) ? Math.min(100, Math.max(0, y)) : 50
  };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    email: user.email,
    birthDate: user.birthDate,
    gender: user.gender,
    residenceCountry: user.residenceCountry || "",
    residenceCity: user.residenceCity || "",
    phoneCountryCode: user.phoneCountryCode || "",
    phoneNumber: user.phoneNumber || "",
    role: user.role,
    visitedCountries: user.visitedCountries || 0,
    bio: user.bio || "",
    profileImage: user.profileImage || "",
    profileImagePosition: normalizeProfileImagePosition(user.profileImagePosition),
    postsCount: user.postsCount || 0,
    followersCount: user.followersCount || 0,
    followingCount: user.followingCount || 0,
    followers: Array.isArray(user.followers) ? user.followers : [],
    following: Array.isArray(user.following) ? user.following : [],
    createdAt: user.createdAt
  };
}

function formatMessage(message, database) {
  const fromUser = database.users.find((entry) => entry.id === message.fromUserId);
  const toUser = database.users.find((entry) => entry.id === message.toUserId);
  const post = message.postId
    ? database.posts.find((entry) => entry.id === message.postId)
    : null;

  return {
    id: message.id,
    fromUserId: message.fromUserId,
    toUserId: message.toUserId,
    fromUsername: fromUser?.username || "",
    fromNickname: fromUser?.nickname || fromUser?.username || "",
    toUsername: toUser?.username || "",
    toNickname: toUser?.nickname || toUser?.username || "",
    type: message.type || "direct",
    postId: message.postId || null,
    postCountry: post?.country || "",
    text: message.text || "",
    attachment: message.attachment
      ? {
          name: message.attachment.name || "attachment",
          size: Number(message.attachment.size || 0),
          type: message.attachment.type || "application/octet-stream",
          dataUrl: message.attachment.dataUrl || ""
        }
      : null,
    createdAt: message.createdAt
  };
}

function isMessageHiddenForUser(message, userId) {
  return Array.isArray(message.hiddenFor) && message.hiddenFor.includes(userId);
}

function handleNearestAirportRead(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const country = String(url.searchParams.get("country") || "").trim();
  const city = String(url.searchParams.get("city") || "").trim();

  if (!country || !city) {
    sendJson(response, 400, {
      message: "The country and city fields are missing."
    });
    return;
  }

  const result = findBestAirportForCity(country, city);

  if (!result?.airport) {
    sendJson(response, 404, {
      message: "No suitable airport was found."
    });
    return;
  }

  sendJson(response, 200, {
    country,
    city,
    strategy: result.strategy,
    airport: {
      name: result.airport.name,
      municipality: result.airport.municipality,
      isoCountry: result.airport.isoCountry,
      iataCode: result.airport.iataCode,
      type: result.airport.type,
      latitude: result.airport.latitude,
      longitude: result.airport.longitude
    }
  });
}

function handleCountryMetadataRead(response) {
  sendJson(response, 200, {
    countries: buildCountryMetadata().map((entry) => ({
      name: entry.name,
      iso2: entry.iso2,
      phoneCode: entry.phoneCode,
      cities: entry.cities
    }))
  });
}

function buildDailyOffersData() {
  const today = new Date();
  const seedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayOffset = Math.round(seedDate.getTime() / 86400000);

  const offers = [
    {
      provider: "booking",
      type: "flight",
      title: "Athens → Paris",
      route: "Αθήνα → Παρίσι",
      departure: "08:30",
      returnDate: "12 Αυγ",
      price: 143,
      budget: "medium",
      url: "https://www.booking.com/flights/index.html"
    },
    {
      provider: "skyscanner",
      type: "hotel",
      title: "Rome Boutique Stay",
      route: "Ρώμη · 3 διανυκτερεύσεις",
      departure: "06 Σεπ",
      returnDate: "09 Σεπ",
      price: 189,
      budget: "medium",
      url: "https://www.skyscanner.net/"
    },
    {
      provider: "esky",
      type: "package",
      title: "Flight + Hotel Madrid",
      route: "Μαδρίτη · πακέτο", 
      departure: "14 Σεπ",
      returnDate: "18 Σεπ",
      price: 324,
      budget: "high",
      url: "https://www.esky.gr/"
    },
    {
      provider: "booking",
      type: "hotel",
      title: "Barcelona City Hotel",
      route: "Βαρκελώνη · δωμάτιο μονό",
      departure: "02 Οκτ",
      returnDate: "05 Οκτ",
      price: 211,
      budget: "medium",
      url: "https://www.booking.com/searchresults.html"
    },
    {
      provider: "skyscanner",
      type: "flight",
      title: "Berlin → Lisbon",
      route: "Βερολίνο → Λισαβώνα",
      departure: "11 Σεπ",
      returnDate: "15 Σεπ",
      price: 134,
      budget: "low",
      url: "https://www.skyscanner.net/g/referrals/v1/flights/day-view/"
    },
    {
      provider: "esky",
      type: "hotel",
      title: "Amalfi Coast Escape",
      route: "Αμάλφι · 4 διανυκτερεύσεις",
      departure: "18 Σεπ",
      returnDate: "22 Σεπ",
      price: 278,
      budget: "high",
      url: "https://www.esky.gr/hotels/"
    },
    {
      provider: "booking",
      type: "package",
      title: "Prague Weekend Package",
      route: "Πράγα · πτήσεις + διαμονή",
      departure: "28 Σεπ",
      returnDate: "30 Σεπ",
      price: 467,
      budget: "medium",
      url: "https://packages.booking.com/vacationpackages/"
    },
    {
      provider: "skyscanner",
      type: "package",
      title: "Copenhagen Combo",
      route: "Κοπεγχάγη · πακέτο ταξιδιού",
      departure: "05 Οκτ",
      returnDate: "09 Οκτ",
      price: 356,
      budget: "high",
      url: "https://www.skyscanner.net/"
    },
    {
      provider: "esky",
      type: "flight",
      title: "Athens → Rome",
      route: "Αθήνα → Ρώμη",
      departure: "21 Σεπ",
      returnDate: "24 Σεπ",
      price: 132,
      budget: "low",
      url: "https://www.esky.gr/flights/"
    }
  ];

  return offers.map((offer, index) => {
    const priceSwing = ((dayOffset + index * 9) % 12) * 7;
    const price = offer.price + priceSwing;
    const budget = price <= 180 ? "low" : price <= 300 ? "medium" : "high";

    return {
      ...offer,
      id: `offer-${offer.provider}-${index + 1}`,
      price,
      budget,
      updatedAt: new Date().toISOString()
    };
  });
}

function handleOffersRead(request, response) {
  const offers = buildDailyOffersData();
  sendJson(response, 200, {
    generatedAt: new Date().toISOString(),
    offers
  });
}

async function scrapeOfferPageData(targetUrl) {
  if (!targetUrl) {
    throw new Error("No offer URL was provided.");
  }

  const parsedUrl = new URL(targetUrl);
  const executablePath = resolveBrowserExecutablePath();

  if (!executablePath) {
    return {
      sourceUrl: parsedUrl.toString(),
      title: "Provider offer",
      price: "",
      currency: "",
      text: "",
      image: "",
      extracted: false,
      message: "No browser found for scraping. Open the link directly."
    };
  }

  const { chromium } = require("playwright-core");
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--disable-blink-features=AutomationControlled"]
  });

  try {
    const page = await browser.newPage({
      viewport: {
        width: 1440,
        height: 1000
      },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/126.0.0.0 Safari/537.36"
    });

    await page.goto(parsedUrl.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForTimeout(2500);

    const payload = await page.evaluate(() => {
      const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const firstText = (selectorList) => {
        for (const selector of selectorList) {
          const element = document.querySelector(selector);
          if (element && clean(element.textContent)) {
            return clean(element.textContent);
          }
        }
        return "";
      };

      const text = clean(document.body?.innerText || "");
      const priceMatch = text.match(/(?:€|EUR|£|\$)\s*[\d.,]+/i) || text.match(/[\d.,]+\s*(?:€|EUR|£|\$)/i);
      const price = priceMatch ? priceMatch[0] : "";
      const currency = /€|EUR/i.test(price) ? "EUR" : /£/i.test(price) ? "GBP" : /\$/i.test(price) ? "USD" : "";
      const image = Array.from(document.querySelectorAll("img"))
        .map((img) => img.currentSrc || img.src || img.dataset.src || "")
        .find(Boolean) || "";

      return {
        title: clean(document.title || firstText(["h1", "h2", "h3", "[data-testid*=title]", "[class*=title]"])) || "Provider offer",
        price,
        currency,
        text: text.slice(0, 1800),
        image,
        sourceUrl: window.location.href
      };
    });

    return {
      ...payload,
      extracted: true,
      message: "The offer was analyzed by the provider."
    };
  } finally {
    await browser.close();
  }
}

async function handleOfferPageScrape(request, response) {
  try {
    const body = await collectRequestBody(request);
    const targetUrl = body?.url;

    if (!targetUrl) {
      sendJson(response, 400, { message: "No offer URL was provided." });
      return;
    }

    const result = await scrapeOfferPageData(targetUrl);
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 400, {
      message: error.message || "It was not possible to extract data from the offer."
    });
  }
}

function normalizeLiveHotelText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLiveHotelPrice(text) {
  const normalized = normalizeLiveHotelText(text);

  const patterns = [
    /(?:€|EUR)\s*([\d.,]+)/i,
    /([\d.,]+)\s*(?:€|EUR)/i,
    /(?:USD|US\$|\$)\s*([\d.,]+)/i,
    /([\d.,]+)\s*(?:USD|US\$)/i,
    /(?:GBP|£)\s*([\d.,]+)/i,
    /([\d.,]+)\s*(?:GBP|£)/i
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);

    if (match) {
      const raw = match[0];

      const currency = /€|EUR/i.test(raw)
        ? "EUR"
        : /USD|US\$|\$/i.test(raw)
          ? "USD"
          : /GBP|£/i.test(raw)
            ? "GBP"
            : "";

      return {
        display: raw,
        currency
      };
    }
  }

  return {
    display: "",
    currency: ""
  };
}

async function searchEskyHotelsLive({
  cityPath,
  checkIn,
  checkOut,
  adults = 1,
  limit = 12
}) {
  if (!cityPath || !checkIn || !checkOut) {
    throw new Error("Data for the live eSky hotel search is missing.");
  }

  const executablePath = resolveBrowserExecutablePath();

  if (!executablePath) {
    throw new Error("Δεν βρέθηκε Brave/Chrome/Chromium. Όρισε TRIPNEST_BROWSER_PATH με το path του browser.");
  }

  const { chromium } = require("playwright-core");

  const browser = await chromium.launch({
    headless: String(process.env.ESKY_HEADLESS || "true").toLowerCase() !== "false",
    executablePath,
    args: ["--disable-blink-features=AutomationControlled"]
  });

  try {
    const context = await browser.newContext({
      locale: "el-GR",
      viewport: {
        width: 1440,
        height: 1000
      },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/126.0.0.0 Safari/537.36"
    });

    const page = await context.newPage();

    const url = new URL(cityPath);
    url.searchParams.set("checkIn", checkIn);
    url.searchParams.set("checkOut", checkOut);
    url.searchParams.set("adults", String(Math.max(1, Number(adults) || 1)));

    await page.goto(url.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    const dateInputCandidates = {
      checkIn: [
        "#checkInDate",
        'input[name="checkIn"]',
        'input[name="checkin"]',
        'input[id*="checkIn" i]',
        'input[placeholder*="check-in" i]',
        'input[placeholder*="check in" i]'
      ],
      checkOut: [
        "#checkOutDate",
        'input[name="checkOut"]',
        'input[name="checkout"]',
        'input[id*="checkOut" i]',
        'input[placeholder*="check-out" i]',
        'input[placeholder*="check out" i]'
      ]
    };

    async function setFirstAvailableValue(selectors, value) {
      for (const selector of selectors) {
        const locator = page.locator(selector).first();

        if (await locator.count()) {
          try {
            await locator.evaluate(
              (input, nextValue) => {
                input.removeAttribute("readonly");
                input.value = nextValue;

                input.dispatchEvent(
                  new Event("input", {
                    bubbles: true
                  })
                );

                input.dispatchEvent(
                  new Event("change", {
                    bubbles: true
                  })
                );
              },
              value
            );

            return true;
          } catch (error) {
            // δοκιμάζει τον επόμενο selector
          }
        }
      }

      return false;
    }

    await setFirstAvailableValue(dateInputCandidates.checkIn, checkIn);
    await setFirstAvailableValue(dateInputCandidates.checkOut, checkOut);

    const searchButtons = [
      "button.btn.qsf-search.hotels",
      'button[type="submit"]',
      'button:has-text("Search")',
      'button:has-text("Αναζήτηση")'
    ];

    let clickedSearch = false;

    for (const selector of searchButtons) {
      const locator = page.locator(selector).first();

      if (await locator.count()) {
        try {
          await locator.click({ timeout: 5000 });
          clickedSearch = true;
          break;
        } catch (error) {
          // δοκιμάζει άλλο κουμπί
        }
      }
    }

    if (clickedSearch) {
      try {
        await page.waitForLoadState("domcontentloaded", { timeout: 20000 });
      } catch (error) {
        // συνεχίζουμε έτσι κι αλλιώς
      }
    }

    try {
      await page.waitForLoadState("networkidle", { timeout: 15000 });
    } catch (error) {
      // συνεχίζουμε έτσι κι αλλιώς
    }

    await page.waitForTimeout(2500);

    const rawResults = await page.evaluate((maxResults) => {
      const clean = (value) =>
        String(value || "")
          .replace(/\s+/g, " ")
          .trim();

      const absoluteUrl = (value) => {
        if (!value) {
          return "";
        }

        try {
          return new URL(value, window.location.href).toString();
        } catch (error) {
          return "";
        }
      };

      const cardSelectors = [
        '[data-testid*="property" i]',
        '[data-testid*="hotel" i]',
        '[class*="property-card" i]',
        '[class*="hotel-card" i]',
        '[class*="accommodation" i]',
        '[class*="offer" i]',
        '[class*="result" i]',
        "article"
      ];

      const nodes = [];
      const seenNodes = new Set();

      for (const selector of cardSelectors) {
        for (const node of document.querySelectorAll(selector)) {
          if (!seenNodes.has(node)) {
            seenNodes.add(node);
            nodes.push(node);
          }
        }
      }

      const results = [];
      const seenUrls = new Set();

      const pushNode = (node) => {
        if (!node || results.length >= maxResults) {
          return;
        }

        const text = clean(node.innerText || node.textContent || "");

        if (!text || text.length < 10) {
          return;
        }

        const anchor = node.matches?.("a[href]") ? node : node.querySelector?.("a[href]");
        const href = absoluteUrl(anchor?.getAttribute("href") || "");

        if (!href || seenUrls.has(href)) {
          return;
        }

        const heading = node.querySelector?.("h1,h2,h3,h4,[role=heading]");
        const titleCandidate = clean(heading?.textContent || anchor?.textContent || "");

        if (!titleCandidate || titleCandidate.length < 2) {
          return;
        }

        const image = node.querySelector?.("img");
        const imageUrl = absoluteUrl(image?.getAttribute("src") || image?.getAttribute("data-src") || "");

        seenUrls.add(href);

        results.push({
          name: titleCandidate.slice(0, 180),
          text: text.slice(0, 800),
          url: href,
          image: imageUrl
        });
      };

      nodes.forEach(pushNode);

      if (results.length < Math.min(4, maxResults)) {
        for (const anchor of document.querySelectorAll('a[href]')) {
          if (results.length >= maxResults) {
            break;
          }

          const href = absoluteUrl(anchor.getAttribute("href"));
          const title = clean(anchor.textContent || "");
          const looksLikeStay = /\/stays?\//i.test(href) || /\/hotels?\//i.test(href);

          if (!looksLikeStay || title.length < 3 || title.length > 180 || seenUrls.has(href)) {
            continue;
          }

          pushNode(anchor);
        }
      }

      return {
        pageTitle: document.title,
        pageUrl: window.location.href,
        results
      };
    }, Math.max(1, Math.min(30, Number(limit) || 12)));

    const hotels = rawResults.results.map((result, index) => {
      const price = extractLiveHotelPrice(result.text);
      const ratingMatch = result.text.match(/(?:rating|score|βαθμολογία)?\s*([0-9](?:[.,][0-9])?)\s*(?:\/\s*10)?/i);

      return {
        id: `esky-live-${index + 1}`,
        provider: "eSky",
        name: result.name,
        price: price.display,
        currency: price.currency,
        rating: ratingMatch ? ratingMatch[1].replace(",", ".") : "",
        image: result.image,
        url: result.url,
        summary: result.text
      };
    });

    return {
      provider: "esky",
      checkIn,
      checkOut,
      adults: Math.max(1, Number(adults) || 1),
      sourceUrl: rawResults.pageUrl || url.toString(),
      pageTitle: rawResults.pageTitle || "eSky",
      hotels
    };
  } finally {
    await browser.close();
  }
}

async function handleHotelAutomation(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { provider, cityPath, checkIn, checkOut, adults } = body;

    if (provider !== "esky") {
      sendJson(response, 400, {
        message: "Provider automation is not supported.."
      });

      return;
    }

    const liveData = await searchEskyHotelsLive({
      cityPath,
      checkIn,
      checkOut,
      adults,
      limit: 12
    });

    sendJson(response, 200, {
      message: liveData.hotels.length
        ? `They were found ${liveData.hotels.length} results from eSky.`
        : "eSky opened, but no structured results were found..",
      ...liveData
    });
  } catch (error) {
    sendJson(response, 400, {
      message: error.message || "Live hotel search on eSky was not possible.."
    });
  }
}

async function handleRegister(request, response) {
  try {
    const body = await collectRequestBody(request);
    const {
      username,
      nickname,
      email,
      password,
      birthDate,
      gender,
      residenceCountry,
      residenceCity,
      phoneCountryCode,
      phoneNumber
    } = body;

    if (
      !username ||
      !nickname ||
      !email ||
      !password ||
      !birthDate ||
      !gender ||
      !residenceCountry ||
      !residenceCity ||
      !phoneCountryCode ||
      !phoneNumber
    ) {
      sendJson(response, 400, { message: "Fill in all the registration fields." });
      return;
    }

    if (!isAllowedEmail(email)) {
      sendJson(response, 400, {
        message: "The email must be a gmail.com, hotmail.com, yahoo.com or outlook.com address."
      });
      return;
    }

    if (calculateAge(birthDate) <= 18) {
      sendJson(response, 400, { message: "Registration is permitted only for users over the age of 18." });
      return;
    }

    if (String(residenceCountry).trim().length < 2 || String(residenceCity).trim().length < 2) {
      sendJson(response, 400, { message: "Provide a valid country and city of residence." });
      return;
    }

    if (!/^\+\d{1,4}$/.test(String(phoneCountryCode).trim())) {
      sendJson(response, 400, { message: "The mobile country code is invalid." });
      return;
    }

    if (!/^[0-9]{5,15}$/.test(String(phoneNumber).trim())) {
      sendJson(response, 400, { message: "The mobile number must contain only digits." });
      return;
    }

    const database = readDatabase();
    const existingUser = database.users.find((user) => user.username === username || user.email === email);

    if (existingUser) {
      sendJson(response, 409, { message: "An account with this username or email already exists." });
      return;
    }

    const user = {
      id: crypto.randomUUID(),
      username,
      nickname,
      email,
      passwordHash: hashPassword(password),
      birthDate,
      gender,
      residenceCountry: String(residenceCountry).trim(),
      residenceCity: String(residenceCity).trim(),
      phoneCountryCode: String(phoneCountryCode).trim(),
      phoneNumber: String(phoneNumber).trim(),
      role: "user",
      visitedCountries: 0,
      bio: "",
      profileImage: "",
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      followers: [],
      following: [],
      createdAt: new Date().toISOString()
    };

    database.users.push(user);
    writeDatabase(database);

    sendJson(response, 201, {
      message: "Registration was completed and the data was saved locally.",
      user: sanitizeUser(user)
    });
  } catch (error) {
    sendJson(response, 400, { message: "Invalid registration data." });
  }
}

async function handleLogin(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { identifier, password } = body;

    if (!identifier || !password) {
      sendJson(response, 400, { message: "Enter your username/email and password." });
      return;
    }

    const database = readDatabase();
    const user = database.users.find(
      (entry) => entry.username === identifier || entry.email === identifier
    );

    if (!user || user.passwordHash !== hashPassword(password)) {
      sendJson(response, 401, { message: "Incorrect login details." });
      return;
    }

    sendJson(response, 200, {
      message: `Καλώς ήρθες ${user.nickname}.`,
      user: sanitizeUser(user)
    });
  } catch (error) {
    sendJson(response, 400, { message: "Invalid login credentials." });
  }
}

function handleDatabaseStatus(response) {
  const database = readDatabase();
  sendJson(response, 200, {
    ok: true,
    users: database.users.length,
    posts: database.posts.length,
    messages: database.messages.length,
    dbFile: dbPath
  });
}

function handleProfileRead(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const userId = url.searchParams.get("id");
  const username = url.searchParams.get("username");
  const database = readDatabase();
  const user = database.users.find((entry) => entry.id === userId || entry.username === username);

  if (!isVisibleUser(user)) {
    sendJson(response, 404, { message: "The user was not found." });
    return;
  }

  sendJson(response, 200, { user: sanitizeUser(user) });
}

function formatNotification(notification, database) {
  const fromUser = notification.fromUserId
    ? database.users.find((entry) => entry.id === notification.fromUserId)
    : null;

  return {
    id: notification.id,
    userId: notification.userId,
    fromUserId: notification.fromUserId || null,
    fromUsername: fromUser?.username || "",
    fromNickname: fromUser?.nickname || fromUser?.username || "",
    type: notification.type || "info",
    text: notification.text || "Νέα ειδοποίηση.",
    href: notification.href || "./home.html",
    time: notification.time || "Τώρα",
    read: Boolean(notification.read),
    createdAt: notification.createdAt || new Date().toISOString()
  };
}

function createNotification(database, { userId, fromUserId = null, type = "info", text = "", href = "./home.html", read = false, time = "Τώρα" }) {
  if (!userId) {
    return null;
  }

  const notification = {
    id: crypto.randomUUID(),
    userId,
    fromUserId,
    type,
    text,
    href,
    time,
    read,
    createdAt: new Date().toISOString()
  };

  database.notifications = Array.isArray(database.notifications) ? database.notifications : [];
  database.notifications.push(notification);
  return formatNotification(notification, database);
}

function handleNotificationsRead(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const userId = url.searchParams.get("userId");
  const database = readDatabase();

  if (!userId) {
    sendJson(response, 400, { message: "The userId for notifications is missing." });
    return;
  }

  const user = database.users.find((entry) => entry.id === userId);
  if (!isVisibleUser(user)) {
    sendJson(response, 404, { message: "The user was not found." });
    return;
  }

  const notifications = (Array.isArray(database.notifications) ? database.notifications : [])
    .filter((notification) => notification.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((notification) => formatNotification(notification, database));

  sendJson(response, 200, { notifications });
}

async function handleNotificationsMarkRead(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { userId } = body;

    if (!userId) {
      sendJson(response, 400, { message: "The userId is missing to mark them as read." });
      return;
    }

    const database = readDatabase();
    const user = database.users.find((entry) => entry.id === userId);
    if (!isVisibleUser(user)) {
      sendJson(response, 404, { message: "The user was not found." });
      return;
    }

    database.notifications = Array.isArray(database.notifications) ? database.notifications : [];
    database.notifications.forEach((notification) => {
      if (notification.userId === userId) {
        notification.read = true;
      }
    });
    writeDatabase(database);

    sendJson(response, 200, { message: "The notifications were marked as read." });
  } catch (error) {
    sendJson(response, 400, { message: "Unable to update notifications." });
  }
}

function formatPost(post, database) {
  const isUserVisible = (userId) => isVisibleUser(database.users.find((entry) => entry.id === userId));
  const comments = Array.isArray(post.comments)
    ? post.comments
        .filter((comment) => isUserVisible(comment.userId))
        .map((comment) => ({
          id: comment.id,
          userId: comment.userId,
          username: comment.username,
          nickname: comment.nickname,
          text: comment.text,
          createdAt: comment.createdAt,
          replies: Array.isArray(comment.replies)
            ? comment.replies
                .filter((reply) => isUserVisible(reply.userId))
                .map((reply) => ({
                  id: reply.id,
                  userId: reply.userId,
                  username: reply.username,
                  nickname: reply.nickname,
                  text: reply.text,
                  createdAt: reply.createdAt
                }))
            : []
        }))
    : [];

  const durationDays = post.totalDays !== undefined && post.totalDays !== null
    ? post.totalDays
    : calculateTripDurationDays(post.travelDate, post.returnDate);

  return {
    id: post.id,
    userId: post.userId,
    username: post.username,
    nickname: post.nickname,
    country: post.country,
    cities: post.cities || [],
    description: post.description || "",
    travelDate: post.travelDate,
    returnDate: post.returnDate || "",
    totalDays: durationDays,
    ratings: post.ratings,
    averageRating: post.averageRating,
    photos: post.photos || [],
    likes: Array.isArray(post.likes) ? post.likes.filter((userId) => isUserVisible(userId)) : [],
    savedBy: Array.isArray(post.savedBy) ? post.savedBy.filter((userId) => isUserVisible(userId)) : [],
    comments,
    sharesCount: post.sharesCount || 0,
    createdAt: post.createdAt
  };
}

function formatTripPlan(plan, database, viewerId = "") {
  const owner = database.users.find((entry) => entry.id === plan.userId);
  if (!isVisibleUser(owner)) {
    return null;
  }

  const interestedUserIds = Array.isArray(plan.interestedUserIds)
    ? plan.interestedUserIds.filter((userId) => isVisibleUser(database.users.find((entry) => entry.id === userId)))
    : [];

  const interestedUsers = interestedUserIds
    .map((userId) => database.users.find((entry) => entry.id === userId))
    .filter(isVisibleUser)
    .map((user) => ({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      profileImage: user.profileImage || ""
    }));

  return {
    id: plan.id,
    userId: owner.id,
    username: owner.username,
    nickname: owner.nickname,
    profileImage: owner.profileImage || "",
    country: plan.country,
    cities: Array.isArray(plan.cities) ? plan.cities : [],
    startDate: plan.startDate,
    returnDate: plan.returnDate || plan.endDate,
    description: plan.description || "",
    visibility: plan.visibility || "friends",
    requestedPeople: Number(plan.requestedPeople || 1),
    genderPreference: plan.genderPreference || "both",
    ageMin: Number(plan.ageMin || 18),
    ageMax: Number(plan.ageMax || 35),
    budget: plan.budget || "low",
    interestedUserIds,
    interestedUsers,
    interestedCount: interestedUserIds.length,
    isInterested: Boolean(viewerId) && interestedUserIds.includes(viewerId),
    createdAt: plan.createdAt
  };
}

function handleUsersRead(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const excludeUserId = url.searchParams.get("excludeUserId");
  const database = readDatabase();

  const users = database.users
    .filter((user) => user.id !== excludeUserId && isVisibleUser(user))
    .map((user) => ({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      profileImage: user.profileImage || ""
    }));

  sendJson(response, 200, { users });
}

function handleMessagesRead(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const userId = url.searchParams.get("userId");
  const database = readDatabase();

  if (!userId) {
    sendJson(response, 400, { message: "The userId for the conversations is missing." });
    return;
  }

  const user = database.users.find((entry) => entry.id === userId);
  if (!isVisibleUser(user)) {
    sendJson(response, 404, { message: "The user was not found." });
    return;
  }

  const messages = database.messages
    .filter((message) => {
      const fromUser = database.users.find((entry) => entry.id === message.fromUserId);
      const toUser = database.users.find((entry) => entry.id === message.toUserId);
      const involvesCurrentUser = message.fromUserId === userId || message.toUserId === userId;
      return (
        involvesCurrentUser &&
        !isMessageHiddenForUser(message, userId) &&
        isVisibleUser(fromUser) &&
        isVisibleUser(toUser)
      );
    })
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((message) => formatMessage(message, database));

  sendJson(response, 200, { messages });
}

function handlePostsRead(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const postId = url.searchParams.get("id");
  const userId = url.searchParams.get("userId");
  const database = readDatabase();

  if (postId) {
    const post = database.posts.find((entry) => entry.id === postId);
    const postOwner = post ? database.users.find((entry) => entry.id === post.userId) : null;
    if (!post || !isVisibleUser(postOwner)) {
      sendJson(response, 404, { message: "The post was not found." });
      return;
    }

    sendJson(response, 200, { post: formatPost(post, database) });
    return;
  }

  const posts = (userId
    ? database.posts.filter((post) => post.userId === userId)
    : database.posts)
    .filter((post) => isVisibleUser(database.users.find((entry) => entry.id === post.userId)));

  posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  sendJson(response, 200, { posts: posts.map((post) => formatPost(post, database)) });
}

function handleTripPlansRead(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const viewerId = url.searchParams.get("viewerId");
  const ownOnly = url.searchParams.get("ownOnly") === "true";
  const database = readDatabase();
  const changed = cleanupExpiredTripPlans(database);

  if (changed) {
    writeDatabase(database);
  }

  if (!viewerId) {
    sendJson(response, 400, { message: "The viewerId for the trips is missing." });
    return;
  }

  const viewer = database.users.find((entry) => entry.id === viewerId);
  if (!isVisibleUser(viewer)) {
    sendJson(response, 404, { message: "The user was not found." });
    return;
  }

  const plans = database.tripPlans
    .filter((plan) => {
      const owner = database.users.find((entry) => entry.id === plan.userId);
      if (!isVisibleUser(owner)) {
        return false;
      }

      if (ownOnly) {
        return plan.userId === viewerId;
      }

      return canUserViewTripPlan(viewer, owner, plan.visibility);
    })
    .map((plan) => formatTripPlan(plan, database, viewerId))
    .filter(Boolean)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  sendJson(response, 200, { tripPlans: plans });
}

async function handlePostCreate(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { userId, country, cities, description, travelDate, returnDate, ratings, photos } = body;

    if (!userId || !country || !travelDate || !ratings) {
      sendJson(response, 400, { message: "Fill in the basic details of the publication." });
      return;
    }

    if (returnDate && returnDate < travelDate) {
      sendJson(response, 400, { message: "The return date must be after the departure date." });
      return;
    }

    const photoList = Array.isArray(photos) ? photos.filter(Boolean).slice(0, 10) : [];
    const cityList = Array.isArray(cities)
      ? cities.map((city) => String(city).trim()).filter(Boolean)
      : [];
    const postDescription = String(description || "").trim();

    const ratingKeys = ["sights", "food", "activities", "ease", "cost"];
    const values = ratingKeys.map((key) => Number(ratings[key]));

    if (values.some((value) => Number.isNaN(value) || value < 0 || value > MAX_RATING)) {
      sendJson(response, 400, { message: `Scores must be from 0 to ${MAX_RATING}.` });
      return;
    }

    const averageRating = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
    const totalDays = calculateTripDurationDays(travelDate, returnDate || "");

    const database = readDatabase();
    const user = database.users.find((entry) => entry.id === userId);

    if (!user) {
      sendJson(response, 404, { message: "The user was not found." });
      return;
    }

    const post = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
      country,
      cities: cityList,
      description: postDescription,
      travelDate,
      returnDate: returnDate || "",
      totalDays,
      ratings: {
        sights: values[0],
        food: values[1],
        activities: values[2],
        ease: values[3],
        cost: values[4]
      },
      averageRating,
      photos: photoList,
      likes: [],
      comments: [],
      sharesCount: 0,
      createdAt: new Date().toISOString()
    };

    database.posts.push(post);
    user.postsCount = (user.postsCount || 0) + 1;

    const followerIds = Array.isArray(user.followers) ? user.followers : [];
    followerIds.forEach((followerId) => {
      if (followerId === user.id) {
        return;
      }

      createNotification(database, {
        userId: followerId,
        fromUserId: user.id,
        type: "post",
        text: `${user.nickname || user.username} posted a new update.`,
        href: "./home.html",
        time: "Τώρα",
        read: false
      });
    });

    writeDatabase(database);

    sendJson(response, 201, {
      message: "The publication was successfully saved.",
      post: formatPost(post, database),
      user: sanitizeUser(user)
    });
  } catch (error) {
    sendJson(response, 400, { message: "Invalid publication data." });
  }
}

async function handlePostUpdate(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { postId, userId, country, cities, description, travelDate, returnDate, ratings, photos } = body;

    if (!postId || !userId || !country || !travelDate || !ratings) {
      sendJson(response, 400, { message: "Fill in the basic details of the publication." });
      return;
    }

    if (returnDate && returnDate < travelDate) {
      sendJson(response, 400, { message: "The return date must be after the departure date." });
      return;
    }

    const photoList = Array.isArray(photos) ? photos.filter(Boolean).slice(0, 10) : [];
    const cityList = Array.isArray(cities)
      ? cities.map((city) => String(city).trim()).filter(Boolean)
      : [];
    const postDescription = String(description || "").trim();

    const ratingKeys = ["sights", "food", "activities", "ease", "cost"];
    const values = ratingKeys.map((key) => Number(ratings[key]));

    if (values.some((value) => Number.isNaN(value) || value < 0 || value > MAX_RATING)) {
      sendJson(response, 400, { message: `Scores must be from 0 to${MAX_RATING}.` });
      return;
    }

    const averageRating = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
    const totalDays = calculateTripDurationDays(travelDate, returnDate || "");

    const database = readDatabase();
    const user = database.users.find((entry) => entry.id === userId);
    const post = database.posts.find((entry) => entry.id === postId);

    if (!user || !post) {
      sendJson(response, 404, { message: "The post or user was not found." });
      return;
    }

    if (post.userId !== userId) {
      sendJson(response, 403, { message: "You cannot edit this post." });
      return;
    }

    post.country = country;
    post.cities = cityList;
    post.description = postDescription;
    post.travelDate = travelDate;
    post.returnDate = returnDate || "";
    post.totalDays = totalDays;
    post.ratings = {
      sights: values[0],
      food: values[1],
      activities: values[2],
      ease: values[3],
      cost: values[4]
    };
    post.averageRating = averageRating;
    post.photos = photoList;
    writeDatabase(database);

    sendJson(response, 200, {
      message: "The publication has been successfully updated.",
      post: formatPost(post, database),
      user: sanitizeUser(user)
    });
  } catch (error) {
    sendJson(response, 400, { message: "Invalid publication data." });
  }
}

async function handlePostDelete(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { postId, userId } = body;

    if (!postId || !userId) {
      sendJson(response, 400, { message: "Information required for the deletion is missing." });
      return;
    }

    const database = readDatabase();
    const user = database.users.find((entry) => entry.id === userId);
    const postIndex = database.posts.findIndex((entry) => entry.id === postId);

    if (!user || postIndex === -1) {
      sendJson(response, 404, { message: "The post or user was not found." });
      return;
    }

    if (database.posts[postIndex].userId !== userId) {
      sendJson(response, 403, { message: "You cannot delete this post." });
      return;
    }

    database.posts.splice(postIndex, 1);
    user.postsCount = Math.max(0, (user.postsCount || 0) - 1);
    writeDatabase(database);

    sendJson(response, 200, {
      message: "The post was successfully deleted.",
      user: sanitizeUser(user)
    });
  } catch (error) {
    sendJson(response, 400, { message: "It was not possible to delete the post." });
  }
}

async function handlePostLikeToggle(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { postId, userId } = body;

    if (!postId || !userId) {
      sendJson(response, 400, { message: "Information regarding the 'like' is missing." });
      return;
    }

    const database = readDatabase();
    const post = database.posts.find((entry) => entry.id === postId);
    const user = database.users.find((entry) => entry.id === userId);

    if (!post || !user) {
      sendJson(response, 404, { message: "The post or user was not found." });
      return;
    }

    post.likes = Array.isArray(post.likes) ? post.likes : [];
    const alreadyLiked = post.likes.includes(userId);
    post.likes = alreadyLiked
      ? post.likes.filter((id) => id !== userId)
      : [...post.likes, userId];

    writeDatabase(database);
    sendJson(response, 200, {
      message: alreadyLiked ? "The like was removed." : "The post was liked.",
      post: formatPost(post, database)
    });
  } catch (error) {
    sendJson(response, 400, { message: "Unable to update the like." });
  }
}

async function handlePostSaveToggle(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { postId, userId } = body;

    if (!postId || !userId) {
      sendJson(response, 400, { message: "Storage details are missing." });
      return;
    }

    const database = readDatabase();
    const post = database.posts.find((entry) => entry.id === postId);
    const user = database.users.find((entry) => entry.id === userId);

    if (!post || !isVisibleUser(user)) {
      sendJson(response, 404, { message: "The post or user was not found." });
      return;
    }

    post.savedBy = Array.isArray(post.savedBy) ? post.savedBy : [];
    const alreadySaved = post.savedBy.includes(userId);

    if (alreadySaved) {
      post.savedBy = post.savedBy.filter((id) => id !== userId);
    } else {
      post.savedBy.push(userId);
    }

    writeDatabase(database);
    sendJson(response, 200, {
      message: alreadySaved ? "The post was removed from saved items." : "The post was saved.",
      post: formatPost(post, database)
    });
  } catch (error) {
    sendJson(response, 400, { message: "It was not possible to save the post." });
  }
}

async function handlePostCommentCreate(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { postId, userId, text, parentCommentId } = body;

    if (!postId || !userId || !String(text || "").trim()) {
      sendJson(response, 400, { message: "Write a comment before sending." });
      return;
    }

    const database = readDatabase();
    const post = database.posts.find((entry) => entry.id === postId);
    const user = database.users.find((entry) => entry.id === userId);

    if (!post || !user) {
      sendJson(response, 404, { message: "The post or user was not found." });
      return;
    }

    post.comments = Array.isArray(post.comments) ? post.comments : [];
    const newComment = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
      text: String(text).trim(),
      createdAt: new Date().toISOString()
    };

    if (parentCommentId) {
      const parentComment = post.comments.find((comment) => comment.id === parentCommentId);
      if (!parentComment) {
        sendJson(response, 404, { message: "The comment you want to reply to was not found." });
        return;
      }

      parentComment.replies = Array.isArray(parentComment.replies) ? parentComment.replies : [];
      parentComment.replies.push(newComment);
    } else {
      post.comments.push({
        ...newComment,
        replies: []
      });
    }

    const ownerId = post.userId;
    if (ownerId && ownerId !== user.id) {
      createNotification(database, {
        userId: ownerId,
        fromUserId: user.id,
        type: "comment",
        text: `${user.nickname || user.username} commented on your post.`,
        href: `./post.html?postId=${encodeURIComponent(post.id)}`,
        time: "Τώρα",
        read: false
      });
    }

    writeDatabase(database);
    sendJson(response, 201, {
      message: parentCommentId ? "The reply was sent successfully." : "The comment was added successfully.",
      post: formatPost(post, database)
    });
  } catch (error) {
    sendJson(response, 400, { message: "The comment could not be sent." });
  }
}

async function handleTripPlanCreate(request, response) {
  try {
    const body = await collectRequestBody(request);
    const {
      userId,
      country,
      cities,
      startDate,
      returnDate,
      requestedPeople,
      genderPreference,
      ageMin,
      ageMax,
      budget,
      description,
      visibility
    } = body;

    if (
      !userId ||
      !country ||
      !startDate ||
      !returnDate ||
      !requestedPeople ||
      !genderPreference ||
      !ageMin ||
      !ageMax ||
      !budget ||
      !visibility
    ) {
      sendJson(response, 400, { message: "Fill in the basic trip details." });
      return;
    }

    const today = getTodayDateString();
    if (String(startDate) < today || String(returnDate) < today) {
      sendJson(response, 400, { message: "The travel dates cannot be in the past." });
      return;
    }

    if (String(returnDate) < String(startDate)) {
      sendJson(response, 400, { message: "The return date must be after the start date." });
      return;
    }

    const normalizedVisibility = String(visibility);
    if (!["friends", "all"].includes(normalizedVisibility)) {
      sendJson(response, 400, { message: "Invalid visibility option." });
      return;
    }

    const normalizedRequestedPeople = Number(requestedPeople);
    const normalizedAgeMin = Number(ageMin);
    const normalizedAgeMax = Number(ageMax);
    const allowedGenderPreferences = ["men", "women", "both"];
    const allowedBudgets = ["low", "medium", "high"];

    if (!Number.isInteger(normalizedRequestedPeople) || normalizedRequestedPeople < 1 || normalizedRequestedPeople > 50) {
      sendJson(response, 400, { message: "Enter a valid number of people." });
      return;
    }

    if (
      !Number.isInteger(normalizedAgeMin) ||
      !Number.isInteger(normalizedAgeMax) ||
      normalizedAgeMin < 18 ||
      normalizedAgeMax > 100 ||
      normalizedAgeMax < normalizedAgeMin
    ) {
      sendJson(response, 400, { message: "The age range is invalid." });
      return;
    }

    if (!allowedGenderPreferences.includes(String(genderPreference))) {
      sendJson(response, 400, { message: "Invalid gender preference." });
      return;
    }

    if (!allowedBudgets.includes(String(budget))) {
      sendJson(response, 400, { message: "Invalid budget selection." });
      return;
    }

    const cityList = Array.isArray(cities)
      ? cities.map((city) => String(city).trim()).filter(Boolean)
      : [];
    const tripDescription = String(description || "").trim();

    if (!cityList.length) {
      sendJson(response, 400, { message: "Add at least one destination city." });
      return;
    }

    const database = readDatabase();
    cleanupExpiredTripPlans(database);
    const user = database.users.find((entry) => entry.id === userId);

    if (!isVisibleUser(user)) {
      sendJson(response, 404, { message: "The user was not found." });
      return;
    }

    const tripPlan = {
      id: crypto.randomUUID(),
      userId,
      country: String(country).trim(),
      cities: cityList,
      startDate: String(startDate),
      returnDate: String(returnDate),
      requestedPeople: normalizedRequestedPeople,
      genderPreference: String(genderPreference),
      ageMin: normalizedAgeMin,
      ageMax: normalizedAgeMax,
      budget: String(budget),
      description: tripDescription,
      visibility: normalizedVisibility,
      interestedUserIds: [],
      createdAt: new Date().toISOString()
    };

    database.tripPlans.push(tripPlan);
    writeDatabase(database);

    sendJson(response, 201, {
      message: "The new trip has been published.",
      tripPlan: formatTripPlan(tripPlan, database, userId)
    });
  } catch (error) {
    sendJson(response, 400, { message: "It was not possible to create the trip." });
  }
}

async function handleTripPlanUpdate(request, response) {
  try {
    const body = await collectRequestBody(request);
    const {
      tripPlanId,
      userId,
      country,
      cities,
      startDate,
      returnDate,
      requestedPeople,
      genderPreference,
      ageMin,
      ageMax,
      budget,
      description,
      visibility
    } = body;

    if (
      !tripPlanId ||
      !userId ||
      !country ||
      !startDate ||
      !returnDate ||
      !requestedPeople ||
      !genderPreference ||
      !ageMin ||
      !ageMax ||
      !budget ||
      !visibility
    ) {
      sendJson(response, 400, { message: "Fill in the basic details of the trip." });
      return;
    }

    const today = getTodayDateString();
    if (String(startDate) < today || String(returnDate) < today) {
      sendJson(response, 400, { message: "The travel dates cannot be in the past." });
      return;
    }

    if (String(returnDate) < String(startDate)) {
      sendJson(response, 400, { message: "The return date must be after the start date." });
      return;
    }

    const normalizedVisibility = String(visibility);
    if (!["friends", "all"].includes(normalizedVisibility)) {
      sendJson(response, 400, { message: "Invalid visibility option." });
      return;
    }

    const normalizedRequestedPeople = Number(requestedPeople);
    const normalizedAgeMin = Number(ageMin);
    const normalizedAgeMax = Number(ageMax);
    const allowedGenderPreferences = ["men", "women", "both"];
    const allowedBudgets = ["low", "medium", "high"];

    if (!Number.isInteger(normalizedRequestedPeople) || normalizedRequestedPeople < 1 || normalizedRequestedPeople > 50) {
      sendJson(response, 400, { message: "Enter a valid number of people." });
      return;
    }

    if (
      !Number.isInteger(normalizedAgeMin) ||
      !Number.isInteger(normalizedAgeMax) ||
      normalizedAgeMin < 18 ||
      normalizedAgeMax > 100 ||
      normalizedAgeMax < normalizedAgeMin
    ) {
      sendJson(response, 400, { message: "The age range is invalid." });
      return;
    }

    if (!allowedGenderPreferences.includes(String(genderPreference))) {
      sendJson(response, 400, { message: "Invalid gender preference." });
      return;
    }

    if (!allowedBudgets.includes(String(budget))) {
      sendJson(response, 400, { message: "Invalid budget selection." });
      return;
    }

    const cityList = Array.isArray(cities)
      ? cities.map((city) => String(city).trim()).filter(Boolean)
      : [];
    const tripDescription = String(description || "").trim();

    if (!cityList.length) {
      sendJson(response, 400, { message: "Add at least one destination city." });
      return;
    }

    const database = readDatabase();
    cleanupExpiredTripPlans(database);

    const user = database.users.find((entry) => entry.id === userId);
    const tripPlan = database.tripPlans.find((entry) => entry.id === tripPlanId);

    if (!isVisibleUser(user) || !tripPlan) {
      sendJson(response, 404, { message: "The trip or the user was not found." });
      return;
    }

    if (tripPlan.userId !== userId) {
      sendJson(response, 403, { message: "You cannot edit this trip." });
      return;
    }

    tripPlan.country = String(country).trim();
    tripPlan.cities = cityList;
    tripPlan.startDate = String(startDate);
    tripPlan.returnDate = String(returnDate);
    tripPlan.requestedPeople = normalizedRequestedPeople;
    tripPlan.genderPreference = String(genderPreference);
    tripPlan.ageMin = normalizedAgeMin;
    tripPlan.ageMax = normalizedAgeMax;
    tripPlan.budget = String(budget);
    tripPlan.description = tripDescription;
    tripPlan.visibility = normalizedVisibility;

    if (!Array.isArray(tripPlan.interestedUserIds)) {
      tripPlan.interestedUserIds = [];
    }

    writeDatabase(database);

    sendJson(response, 200, {
      message: "The trip has been successfully updated.",
      tripPlan: formatTripPlan(tripPlan, database, userId)
    });
  } catch (error) {
    sendJson(response, 400, { message: "It was not possible to update the trip." });
  }
}

async function handleTripPlanInterestToggle(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { tripPlanId, userId } = body;

    if (!tripPlanId || !userId) {
      sendJson(response, 400, { message: "Information regarding the interest is missing." });
      return;
    }

    const database = readDatabase();
    const changed = cleanupExpiredTripPlans(database);
    const user = database.users.find((entry) => entry.id === userId);
    const tripPlan = database.tripPlans.find((entry) => entry.id === tripPlanId);
    const owner = tripPlan ? database.users.find((entry) => entry.id === tripPlan.userId) : null;

    if (!isVisibleUser(user) || !tripPlan || !isVisibleUser(owner)) {
      sendJson(response, 404, { message: "The trip or the user was not found." });
      return;
    }

    if (!canUserViewTripPlan(user, owner, tripPlan.visibility)) {
      sendJson(response, 403, { message: "You cannot interact with this journey." });
      return;
    }

    if (userId === owner.id) {
      sendJson(response, 400, { message: "You cannot express interest in your own trip." });
      return;
    }

    tripPlan.interestedUserIds = Array.isArray(tripPlan.interestedUserIds) ? tripPlan.interestedUserIds : [];
    const isInterested = tripPlan.interestedUserIds.includes(userId);

    if (isInterested) {
      tripPlan.interestedUserIds = tripPlan.interestedUserIds.filter((id) => id !== userId);
    } else {
      tripPlan.interestedUserIds.push(userId);
      database.messages.push({
        id: crypto.randomUUID(),
        fromUserId: userId,
        toUserId: owner.id,
        type: "direct",
        text: `${user.nickname || user.username} interested in joining your journey for ${tripPlan.country} (${tripPlan.startDate} έως ${tripPlan.returnDate || tripPlan.endDate}).`,
        hiddenFor: [],
        createdAt: new Date().toISOString()
      });
      createNotification(database, {
        userId: owner.id,
        fromUserId: userId,
        type: "trip-interest",
        text: `${user.nickname || user.username} interested in your trip to ${tripPlan.country}.`,
        href: "./trip-plans.html",
        time: "Τώρα",
        read: false
      });
    }

    writeDatabase(database);

    sendJson(response, 200, {
      message: isInterested
        ? "Your interest in the trip has been removed."
        : `A message was sent to ${owner.nickname || owner.username} that you are interested.`,
      tripPlan: formatTripPlan(tripPlan, database, userId),
      cleanedExpired: changed
    });
  } catch (error) {
    sendJson(response, 400, { message: "It was not possible to update the interest." });
  }
}

async function handleTripPlanDelete(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { tripPlanId, userId } = body;

    if (!tripPlanId || !userId) {
      sendJson(response, 400, { message: "Information required to delete the trip is missing." });
      return;
    }

    const database = readDatabase();
    const tripPlanIndex = database.tripPlans.findIndex((entry) => entry.id === tripPlanId);
    const user = database.users.find((entry) => entry.id === userId);

    if (tripPlanIndex === -1 || !isVisibleUser(user)) {
      sendJson(response, 404, { message: "The trip or the user was not found." });
      return;
    }

    if (database.tripPlans[tripPlanIndex].userId !== userId) {
      sendJson(response, 403, { message: "You cannot delete this trip." });
      return;
    }

    database.tripPlans.splice(tripPlanIndex, 1);
    writeDatabase(database);

    sendJson(response, 200, { message: "The trip was permanently cancelled." });
  } catch (error) {
    sendJson(response, 400, { message: "It was not possible to delete the trip." });
  }
}

async function handlePostCommentDelete(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { postId, userId, commentId, parentCommentId } = body;

    if (!postId || !userId || !commentId) {
      sendJson(response, 400, { message: "Information required to delete the comment is missing." });
      return;
    }

    const database = readDatabase();
    const post = database.posts.find((entry) => entry.id === postId);
    const user = database.users.find((entry) => entry.id === userId);

    if (!post || !user) {
      sendJson(response, 404, { message: "The post or user was not found." });
      return;
    }

    post.comments = Array.isArray(post.comments) ? post.comments : [];
    const canModeratePost = post.userId === userId;

    if (parentCommentId) {
      const parentComment = post.comments.find((comment) => comment.id === parentCommentId);
      if (!parentComment || !Array.isArray(parentComment.replies)) {
        sendJson(response, 404, { message: "The answer was not found." });
        return;
      }

      const replyIndex = parentComment.replies.findIndex((reply) => reply.id === commentId);
      if (replyIndex === -1) {
        sendJson(response, 404, { message: "The answer was not found." });
        return;
      }

      const reply = parentComment.replies[replyIndex];
      if (!canModeratePost && reply.userId !== userId) {
        sendJson(response, 403, { message: "You can only delete your own answers." });
        return;
      }

      parentComment.replies.splice(replyIndex, 1);
    } else {
      const commentIndex = post.comments.findIndex((comment) => comment.id === commentId);
      if (commentIndex === -1) {
        sendJson(response, 404, { message: "The comment was not found." });
        return;
      }

      const comment = post.comments[commentIndex];
      if (!canModeratePost && comment.userId !== userId) {
        sendJson(response, 403, { message: "You can only delete your own comments." });
        return;
      }

      post.comments.splice(commentIndex, 1);
    }

    writeDatabase(database);
    sendJson(response, 200, {
      message: "The comment was successfully deleted.",
      post: formatPost(post, database)
    });
  } catch (error) {
    sendJson(response, 400, { message: "It was not possible to delete the comment." });
  }
}

async function handlePostShare(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { postId, fromUserId, toUserId, text } = body;

    if (!postId || !fromUserId || !toUserId) {
      sendJson(response, 400, { message: "Details regarding the notification are missing." });
      return;
    }

    const database = readDatabase();
    const post = database.posts.find((entry) => entry.id === postId);
    const fromUser = database.users.find((entry) => entry.id === fromUserId);
    const toUser = database.users.find((entry) => entry.id === toUserId);

    if (!post || !isVisibleUser(fromUser) || !isVisibleUser(toUser)) {
      sendJson(response, 404, { message: "Notification information not found." });
      return;
    }

    const message = {
      id: crypto.randomUUID(),
      fromUserId,
      toUserId,
      type: "post_share",
      postId,
      text: String(text || "").trim(),
      hiddenFor: [],
      createdAt: new Date().toISOString()
    };

    database.messages.push(message);
    post.sharesCount = (post.sharesCount || 0) + 1;
    writeDatabase(database);

    sendJson(response, 201, {
      message: `The publication was shared with ${toUser.nickname || toUser.username}.`,
      post: formatPost(post, database)
    });
  } catch (error) {
    sendJson(response, 400, { message: "The post could not be shared." });
  }
}

async function handleDirectMessageSend(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { fromUserId, toUserId, text, attachment } = body;
    const messageText = String(text || "").trim();
    const normalizedAttachment = normalizeMessageAttachment(attachment);

    if (!fromUserId || !toUserId || (!messageText && !normalizedAttachment)) {
      sendJson(response, 400, { message: "Write a message or add a file before sending." });
      return;
    }

    if (fromUserId === toUserId) {
      sendJson(response, 400, { message: "You can't message yourself." });
      return;
    }

    const database = readDatabase();
    const fromUser = database.users.find((entry) => entry.id === fromUserId);
    const toUser = database.users.find((entry) => entry.id === toUserId);

    if (!isVisibleUser(fromUser) || !isVisibleUser(toUser)) {
      sendJson(response, 404, { message: "The chat user was not found." });
      return;
    }

    const message = {
      id: crypto.randomUUID(),
      fromUserId,
      toUserId,
      type: "direct",
      text: messageText,
      attachment: normalizedAttachment,
      hiddenFor: [],
      createdAt: new Date().toISOString()
    };

    database.messages.push(message);
    createNotification(database, {
      userId: toUserId,
      fromUserId: fromUserId,
      type: "message",
      text: `${fromUser.nickname || fromUser.username} σου έστειλε μήνυμα.`,
      href: "./conversations.html",
      time: "Τώρα",
      read: false
    });
    writeDatabase(database);

    sendJson(response, 201, {
      message: "The message was sent.",
      sentMessage: formatMessage(message, database)
    });
  } catch (error) {
    sendJson(response, 400, { message: "The message could not be sent." });
  }
}

async function handleConversationClear(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { currentUserId, partnerUserId } = body;

    if (!currentUserId || !partnerUserId) {
      sendJson(response, 400, { message: "Information regarding the conversation cleanup is missing." });
      return;
    }

    const database = readDatabase();
    const currentUser = database.users.find((entry) => entry.id === currentUserId);
    const partnerUser = database.users.find((entry) => entry.id === partnerUserId);

    if (!isVisibleUser(currentUser) || !isVisibleUser(partnerUser)) {
      sendJson(response, 404, { message: "The chat user was not found." });
      return;
    }

    database.messages = database.messages.filter((message) => {
      const isDirectConversation =
        (message.fromUserId === currentUserId && message.toUserId === partnerUserId) ||
        (message.fromUserId === partnerUserId && message.toUserId === currentUserId);

      if (!isDirectConversation) {
        return true;
      }

      message.hiddenFor = Array.isArray(message.hiddenFor) ? message.hiddenFor : [];
      if (!message.hiddenFor.includes(currentUserId)) {
        message.hiddenFor.push(currentUserId);
      }

      const participants = [message.fromUserId, message.toUserId];
      const isHiddenForEveryone = participants.every((participantId) => message.hiddenFor.includes(participantId));
      return !isHiddenForEveryone;
    });

    writeDatabase(database);
    sendJson(response, 200, { message: "The conversation has been cleared just for you." });
  } catch (error) {
    sendJson(response, 400, { message: "It was not possible to clear the conversation." });
  }
}

async function handleFollowToggle(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { currentUserId, targetUserId } = body;

    if (!currentUserId || !targetUserId) {
      sendJson(response, 400, { message: "Information for the follow is missing." });
      return;
    }

    if (currentUserId === targetUserId) {
      sendJson(response, 400, { message: "You cannot follow your own profile." });
      return;
    }

    const database = readDatabase();
    const currentUser = database.users.find((entry) => entry.id === currentUserId);
    const targetUser = database.users.find((entry) => entry.id === targetUserId);

    if (!isVisibleUser(currentUser) || !isVisibleUser(targetUser)) {
      sendJson(response, 404, { message: "The user was not found." });
      return;
    }

    currentUser.following = Array.isArray(currentUser.following) ? currentUser.following : [];
    currentUser.followers = Array.isArray(currentUser.followers) ? currentUser.followers : [];
    targetUser.following = Array.isArray(targetUser.following) ? targetUser.following : [];
    targetUser.followers = Array.isArray(targetUser.followers) ? targetUser.followers : [];

    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
      currentUser.following = currentUser.following.filter((id) => id !== targetUserId);
      targetUser.followers = targetUser.followers.filter((id) => id !== currentUserId);
    } else {
      currentUser.following = [...currentUser.following, targetUserId];
      targetUser.followers = [...targetUser.followers, currentUserId];
      createNotification(database, {
        userId: targetUserId,
        fromUserId: currentUserId,
        type: "follow",
        text: `${currentUser.nickname || currentUser.username} σε ακολούθησε.`,
        href: `./profile.html?userId=${encodeURIComponent(currentUserId)}`,
        time: "Τώρα",
        read: false
      });
    }

    currentUser.followingCount = currentUser.following.length;
    currentUser.followersCount = currentUser.followers.length;
    targetUser.followingCount = targetUser.following.length;
    targetUser.followersCount = targetUser.followers.length;

    writeDatabase(database);

    sendJson(response, 200, {
      message: isFollowing
        ? `Σταμάτησες να ακολουθείς τον ${targetUser.nickname || targetUser.username}.`
        : `Ακολουθείς πλέον τον ${targetUser.nickname || targetUser.username}.`,
      currentUser: sanitizeUser(currentUser),
      targetUser: sanitizeUser(targetUser),
      isFollowing: !isFollowing
    });
  } catch (error) {
    sendJson(response, 400, { message: "Unable to update the follow." });
  }
}

async function handleProfileUpdate(request, response) {
  try {
    const body = await collectRequestBody(request);
    const {
      id,
      username,
      nickname,
      email,
      birthDate,
      gender,
      residenceCountry,
      residenceCity,
      phoneCountryCode,
      phoneNumber,
      bio,
      profileImage,
      profileImagePosition,
      currentPassword,
      newPassword,
      confirmPassword
    } = body;

    if (
      !id ||
      !username ||
      !nickname ||
      !email ||
      !birthDate ||
      !gender ||
      !residenceCountry ||
      !residenceCity ||
      !phoneCountryCode ||
      !phoneNumber
    ) {
      sendJson(response, 400, { message: "Fill in all the basic profile details." });
      return;
    }

    const database = readDatabase();
    const user = database.users.find((entry) => entry.id === id);

    if (!user) {
      sendJson(response, 404, { message: "The user was not found." });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const currentStoredEmail = String(user.email || "").trim().toLowerCase();

    if (normalizedEmail !== currentStoredEmail && !isAllowedEmail(email)) {
      sendJson(response, 400, {
        message: "The email must be a gmail.com, hotmail.com, yahoo.com or outlook.com address."
      });
      return;
    }

    if (calculateAge(birthDate) <= 18) {
      sendJson(response, 400, { message: "Processing is permitted only for users over the age of 18." });
      return;
    }

    if (String(residenceCountry).trim().length < 2 || String(residenceCity).trim().length < 2) {
      sendJson(response, 400, { message: "Provide a valid country and city of residence." });
      return;
    }

    if (!/^\+\d{1,4}$/.test(String(phoneCountryCode).trim())) {
      sendJson(response, 400, { message: "The mobile country code is invalid." });
      return;
    }

    if (!/^[0-9]{5,15}$/.test(String(phoneNumber).trim())) {
      sendJson(response, 400, { message: "The mobile number must contain only digits." });
      return;
    }

    const usernameTaken = database.users.find((entry) => entry.username === username && entry.id !== id);
    if (usernameTaken) {
      sendJson(response, 409, { message: "The username is already in use." });
      return;
    }

    const emailTaken = database.users.find(
      (entry) => String(entry.email).toLowerCase() === normalizedEmail && entry.id !== id
    );
    if (emailTaken) {
      sendJson(response, 409, { message: "The email is already in use." });
      return;
    }

    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        sendJson(response, 400, { message: "All 3 fields are required to change the password." });
        return;
      }

      if (user.passwordHash !== hashPassword(currentPassword)) {
        sendJson(response, 401, { message: "The old password is incorrect." });
        return;
      }

      if (newPassword !== confirmPassword) {
        sendJson(response, 400, { message: "The new password and the confirmation do not match." });
        return;
      }

      user.passwordHash = hashPassword(newPassword);
    }

    user.username = username;
    user.nickname = nickname;
    user.email = email;
    user.birthDate = birthDate;
    user.gender = gender;
    user.residenceCountry = String(residenceCountry).trim();
    user.residenceCity = String(residenceCity).trim();
    user.phoneCountryCode = String(phoneCountryCode).trim();
    user.phoneNumber = String(phoneNumber).trim();
    user.bio = bio || "";
    user.profileImage = typeof profileImage === "string" ? profileImage : (user.profileImage || "");
    user.profileImagePosition = normalizeProfileImagePosition(profileImagePosition);

    writeDatabase(database);

    sendJson(response, 200, {
      message: "The profile was updated successfully.",
      user: sanitizeUser(user)
    });
  } catch (error) {
    sendJson(response, 400, { message: "Invalid profile processing data." });
  }
}

async function handleProfileDelete(request, response) {
  try {
    const body = await collectRequestBody(request);
    const { id } = body;

    if (!id) {
      sendJson(response, 400, { message: "The user ID is missing." });
      return;
    }

    const database = readDatabase();
    const userIndex = database.users.findIndex((entry) => entry.id === id);

    if (userIndex === -1) {
      sendJson(response, 404, { message: "The user was not found." });
      return;
    }

    database.users.splice(userIndex, 1);
    database.posts = database.posts
      .filter((post) => post.userId !== id)
      .map((post) => ({
        ...post,
        likes: Array.isArray(post.likes) ? post.likes.filter((entryId) => entryId !== id) : [],
        savedBy: Array.isArray(post.savedBy) ? post.savedBy.filter((entryId) => entryId !== id) : [],
        comments: Array.isArray(post.comments)
          ? post.comments
              .filter((comment) => comment.userId !== id)
              .map((comment) => ({
                ...comment,
                replies: Array.isArray(comment.replies)
                  ? comment.replies.filter((reply) => reply.userId !== id)
                  : []
              }))
          : []
      }));
    database.tripPlans = database.tripPlans
      .filter((plan) => plan.userId !== id)
      .map((plan) => ({
        ...plan,
        interestedUserIds: Array.isArray(plan.interestedUserIds)
          ? plan.interestedUserIds.filter((entryId) => entryId !== id)
          : []
      }));
    database.messages = database.messages.filter((message) => message.fromUserId !== id && message.toUserId !== id);
    database.notifications = Array.isArray(database.notifications)
      ? database.notifications.filter(
          (notification) => notification.userId !== id && notification.fromUserId !== id && notification.toUserId !== id
        )
      : [];

    database.users.forEach((user) => {
      user.followers = Array.isArray(user.followers) ? user.followers.filter((entryId) => entryId !== id) : [];
      user.following = Array.isArray(user.following) ? user.following.filter((entryId) => entryId !== id) : [];
      user.followersCount = user.followers.length;
      user.followingCount = user.following.length;
    });

    writeDatabase(database);

    sendJson(response, 200, { message: "The account has been permanently deleted." });
  } catch (error) {
    sendJson(response, 400, { message: "It was not possible to delete the account." });
  }
}

ensureDatabase();

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/api/status") {
    handleDatabaseStatus(response);
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/api/profile")) {
    handleProfileRead(request, response);
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/api/users")) {
    handleUsersRead(request, response);
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/api/messages")) {
    handleMessagesRead(request, response);
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/api/notifications")) {
    handleNotificationsRead(request, response);
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/api/posts")) {
    handlePostsRead(request, response);
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/api/trip-plans")) {
    handleTripPlansRead(request, response);
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/api/travel/nearest-airport")) {
    handleNearestAirportRead(request, response);
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/api/location/countries")) {
    handleCountryMetadataRead(response);
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/api/offers")) {
    handleOffersRead(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/offers/scrape") {
    await handleOfferPageScrape(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/register") {
    await handleRegister(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/login") {
    await handleLogin(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/profile/update") {
    await handleProfileUpdate(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/profile/delete") {
    await handleProfileDelete(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/profile/follow") {
    await handleFollowToggle(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/messages/send") {
    await handleDirectMessageSend(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/notifications/read") {
    await handleNotificationsMarkRead(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/messages/clear") {
    await handleConversationClear(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/posts/create") {
    await handlePostCreate(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/posts/update") {
    await handlePostUpdate(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/posts/delete") {
    await handlePostDelete(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/posts/like") {
    await handlePostLikeToggle(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/posts/save") {
    await handlePostSaveToggle(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/posts/comment") {
    await handlePostCommentCreate(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/trip-plans/create") {
    await handleTripPlanCreate(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/trip-plans/update") {
    await handleTripPlanUpdate(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/trip-plans/delete") {
    await handleTripPlanDelete(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/trip-plans/interest") {
    await handleTripPlanInterestToggle(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/travel/hotel-automation") {
    await handleHotelAutomation(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/posts/comment/delete") {
    await handlePostCommentDelete(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/posts/share") {
    await handlePostShare(request, response);
    return;
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(baseDir, safePath);

  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(filePath, response);
      return;
    }

    sendFile(path.join(baseDir, "index.html"), response);
  });
});

server.listen(PORT, () => {
  console.log(`TripNest is running at http://localhost:${PORT}`);
  console.log(`Local database file: ${dbPath}`);
});
