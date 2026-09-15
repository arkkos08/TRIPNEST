document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("tripnest_user") || "null");
  const searchInput = document.querySelector(".tripnest-topbar-search");

  const languageState = {
    current: localStorage.getItem("tripnest_language") || "en"
  };
  localStorage.setItem("tripnest_language", "en");

  const ensureLanguageButtonState = () => {
    const languageButton = document.querySelector(".tripnest-language-toggle");
    if (!languageButton) {
      return;
    }

    languageButton.textContent = languageState.current === "el" ? "🇬🇷" : "🇺🇸";
    languageButton.setAttribute("aria-label", languageState.current === "el" ? "Switch to English" : "Εναλλαγή στα ελληνικά");
  };

  const textTranslations = {
    el: {
      "My profile": "Το προφίλ μου",
      "Conversations": "Συνομιλίες",
      "Saved": "Αποθηκευμένα",
      "Trip planning": "Οργάνωση ταξιδιού",
      "Offers": "Προσφορές",
      "Search": "Αναζήτηση",
      "Back to map": "Επιστροφή στον χάρτη",
      "Notifications": "Ειδοποιήσεις",
      "No notifications.": "Δεν υπάρχουν ειδοποιήσεις.",
      "Inbox and messages": "Inbox και messages",
      "My saved posts": "Τα saved posts μου",
      "Plan and find a crew": "Οργάνωσε και βρες παρέα",
      "Cheap flights and stays": "Φθηνές πτήσεις και stays",
      "My map": "Ο χάρτης μου",
      "New posts": "Νέες δημοσιεύσεις",
      "Follow users to see their posts here.": "Ακολούθησε χρήστες για να βλέπεις εδώ τις δημοσιεύσεις τους.",
      "Scroll down and see all the latest posts.": "Κατέβα κάτω και δες όλες τις νέες δημοσιεύσεις.",
      "Plan your next trip and see who wants to join.": "Προγραμμάτισε το επόμενο ταξίδι και δες ποιοι θέλουν να συμμετέχουν.",
      "My trips": "Τα ταξίδια μου",
      "Trips you've scheduled.": "Τα ταξίδια που έχεις προγραμματίσει.",
      "Other users' trips": "Δημιουργίες άλλων χρηστών",
      "Trips your friends can view and share with you.": "Ταξίδια που μπορούν να δουν και να μοιραστούν μαζί σου οι φίλοι σου.",
      "Search by country, city or user": "Αναζήτηση σε χώρα, πόλη ή χρήστη",
      "All trips": "Όλα τα ταξίδια",
      "Friends only": "Μόνο φίλοι",
      "All countries": "Όλες οι χώρες",
      "You have not created a trip yet.": "Δεν έχεις δημιουργήσει ταξίδι ακόμα.",
      "There are no active trips to view yet.": "Δεν υπάρχουν ενεργά ταξίδια που να μπορείς να δεις ακόμα.",
      "Type at least 2 characters": "Πληκτρολόγησε τουλάχιστον 2 χαρακτήρες",
      "Add country": "Προσθήκη χώρας",
      "Remove country": "Αφαίρεση χώρας",
      "Remove all": "Αφαίρεση όλων",
      "Countries I've visited": "Χώρες που έχω επισκεφτεί",
      "Add city": "Προσθήκη πόλης",
      "Remove": "Αφαίρεση",
      "Choose country": "Επιλογή χώρας",
      "No countries found.": "Δεν βρέθηκαν χώρες.",
      "Add post": "Προσθήκη δημοσίευσης",
      "Remove photo": "Αφαίρεση φωτογραφίας",
      "There are no conversations yet.": "Δεν υπάρχουν διαθέσιμες συνομιλίες ακόμη.",
      "No user found with that name.": "Δεν βρέθηκε χρήστης με αυτό το όνομα.",
      "Search user": "Αναζήτηση χρήστη",
      "Type your message...": "Γράψε το μήνυμά σου...",
      "Send": "Αποστολή",
      "Search users, cities or countries": "Αναζήτηση χρηστών, πόλεων ή χωρών",
      "Visit": "Επίσκεψη",
      "Edit profile": "Επεξεργασία προφίλ",
      "Posts": "Δημοσιεύσεις",
      "World percentage": "Ποσοστό κόσμου",
      "Username": "Username",
      "Email": "Email",
      "followers": "followers",
      "following": "following",
      "friends": "friends",
      "countries": "countries",
      "User not found.": "Ο χρήστης δεν βρέθηκε.",
      "There are no interested users yet.": "Δεν υπάρχουν ακόμη ενδιαφερόμενοι χρήστες.",
      "Thanks": "Χάρηκα",
      "Search by country": "Αναζήτηση σε χώρα",
      "Search by user": "Αναζήτηση σε χρήστη",
      "At least one city is required for booking.": "Για κράτηση χρειάζεται τουλάχιστον μία πόλη στο ταξίδι.",
      "The airport to be used is": "Θα χρησιμοποιηθεί το αεροδρόμιο",
      "Nearby airport": "Κοντινό αεροδρόμιο",
      "To add a country, open the menu and choose an option.": "Για να προσθέσεις μια χώρα, άνοιξε το μενού και διάλεξε μια επιλογή.",
      "Profile": "Προφίλ",
      "Sign in": "Συνδέσου",
      "New message": "Νέο μήνυμα",
      "Messages": "Μηνύματα",
      "All": "Όλα",
      "Follow": "Ακολουθήστε",
      "Message": "Μήνυμα",
      "for": "για",
      "" : ""
    },
    en: {
      "Το προφίλ μου": "My profile",
      "Συνομιλίες": "Conversations",
      "Αποθηκευμένα": "Saved",
      "Οργάνωση ταξιδιού": "Trip planning",
      "Προσφορές": "Offers",
      "Αναζήτηση": "Search",
      "Επιστροφή στον χάρτη": "Back to map",
      "Ειδοποιήσεις": "Notifications",
      "Δεν υπάρχουν ειδοποιήσεις.": "No notifications.",
      "Inbox και messages": "Inbox and messages",
      "Τα saved posts μου": "My saved posts",
      "Οργάνωσε και βρες παρέα": "Plan and find a crew",
      "Φθηνές πτήσεις και stays": "Cheap flights and stays",
      "Ο χάρτης μου": "My map",
      "Νέες δημοσιεύσεις": "New posts",
      "Ακολούθησε χρήστες για να βλέπεις εδώ τις δημοσιεύσεις τους.": "Follow users to see their posts here.",
      "Κατέβα κάτω και δες όλες τις νέες δημοσιεύσεις.": "Scroll down and see all the latest posts.",
      "Προγραμμάτισε το επόμενο ταξίδι και δες ποιοι θέλουν να συμμετέχουν.": "Plan your next trip and see who wants to join.",
      "Τα ταξίδια μου": "My trips",
      "Τα ταξίδια που έχεις προγραμματίσει.": "Trips you've scheduled.",
      "Δημιουργίες άλλων χρηστών": "Other users' trips",
      "Ταξίδια που μπορούν να δουν και να μοιραστούν μαζί σου οι φίλοι σου.": "Trips your friends can view and share with you.",
      "Αναζήτηση σε χώρα, πόλη ή χρήστη": "Search by country, city or user",
      "Όλα τα ταξίδια": "All trips",
      "Μόνο φίλοι": "Friends only",
      "Όλες οι χώρες": "All countries",
      "Δεν έχεις δημιουργήσει ταξίδι ακόμα.": "You have not created a trip yet.",
      "Δεν υπάρχουν ενεργά ταξίδια που να μπορείς να δεις ακόμα.": "There are no active trips to view yet.",
      "Πληκτρολόγησε τουλάχιστον 2 χαρακτήρες": "Type at least 2 characters",
      "Προσθήκη χώρας": "Add country",
      "Αφαίρεση χώρας": "Remove country",
      "Αφαίρεση όλων": "Remove all",
      "Χώρες που έχω επισκεφτεί": "Countries I've visited",
      "Προσθήκη πόλης": "Add city",
      "Αφαίρεση": "Remove",
      "Επιλογή χώρας": "Choose country",
      "Δεν βρέθηκαν χώρες.": "No countries found.",
      "Προσθήκη δημοσίευσης": "Add post",
      "Αφαίρεση φωτογραφίας": "Remove photo",
      "Δεν υπάρχουν διαθέσιμες συνομιλίες ακόμη.": "There are no conversations yet.",
      "Δεν βρέθηκε χρήστης με αυτό το όνομα.": "No user found with that name.",
      "Αναζήτηση χρήστη": "Search user",
      "Γράψε το μήνυμά σου...": "Type your message...",
      "Αποστολή": "Send",
      "Αναζήτηση χρηστών, πόλεων ή χωρών": "Search users, cities or countries",
      "Επίσκεψη": "Visit",
      "Επεξεργασία προφίλ": "Edit profile",
      "Δημοσιεύσεις": "Posts",
      "Ποσοστό κόσμου": "World percentage",
      "Username": "Username",
      "Email": "Email",
      "followers": "followers",
      "following": "following",
      "friends": "friends",
      "countries": "countries",
      "Ο χρήστης δεν βρέθηκε.": "User not found.",
      "Δεν υπάρχουν ακόμη ενδιαφερόμενοι χρήστες.": "There are no interested users yet.",
      "Χάρηκα": "Thanks",
      "Αναζήτηση σε χώρα": "Search by country",
      "Αναζήτηση σε χρήστη": "Search by user",
      "Για κράτηση χρειάζεται τουλάχιστον μία πόλη στο ταξίδι.": "At least one city is required for booking.",
      "Θα χρησιμοποιηθεί το αεροδρόμιο": "The airport to be used is",
      "Κοντινό αεροδρόμιο": "Nearby airport",
      "Για να προσθέσεις μια χώρα, άνοιξε το μενού και διάλεξε μια επιλογή.": "To add a country, open the menu and choose an option.",
      "Προφίλ": "Profile",
      "Συνδέσου": "Sign in",
      "Νέο μήνυμα": "New message",
      "Μηνύματα": "Messages",
      "Όλα": "All",
      "Ακολουθήστε": "Follow",
      "Μήνυμα": "Message",
      "για": "for"
    }
  };

  function translateTextValue(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      return value;
    }

    const localeMap = textTranslations[languageState.current] || textTranslations.el;
    if (localeMap[trimmed]) {
      return localeMap[trimmed];
    }

    const countMatch = trimmed.match(/^(\d+)\s*(posts|followers|following|friends|countries)$/i);
    if (countMatch) {
      const [, count, label] = countMatch;
      const translation = {
        posts: languageState.current === "en" ? "posts" : "δημοσιεύσεις",
        followers: languageState.current === "en" ? "followers" : "ακολουθούν",
        following: languageState.current === "en" ? "following" : "ακολουθεί",
        friends: languageState.current === "en" ? "friends" : "φίλοι",
        countries: languageState.current === "en" ? "countries" : "χώρες"
      }[label.toLowerCase()];
      return `${count} ${translation}`;
    }

    return value;
  }

  function applyTextTranslations() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach((node) => {
      const value = node.textContent.trim();
      const translated = translateTextValue(value);
      if (translated !== value) {
        node.textContent = translated;
      }
    });

    document.querySelectorAll(".tripnest-topbar-search, .tripnest-trip-plan-filter-input, #offersSearchInput, .tripnest-map-search").forEach((input) => {
      const currentPlaceholder = input.getAttribute("placeholder") || "";
      const translated = translateTextValue(currentPlaceholder);
      if (translated !== currentPlaceholder) {
        input.setAttribute("placeholder", translated);
      }
    });

    document.querySelectorAll(".tripnest-sidebar-title, .tripnest-sidebar-subtitle").forEach((node) => {
      const value = node.textContent.trim();
      const translated = translateTextValue(value);
      if (translated !== value) {
        node.textContent = translated;
      }
    });

    document.documentElement.lang = languageState.current === "en" ? "en" : "el";
    ensureLanguageButtonState();
  }

  function setLanguage(lang) {
    languageState.current = lang === "en" ? "en" : "en";
    localStorage.setItem("tripnest_language", "en");
    applyTextTranslations();
  }

  function toggleLanguage() {
    setLanguage("en");
  }

  function ensureLanguageToggle() {
    const topbar = document.querySelector(".tripnest-topbar");
    if (!topbar) {
      return;
    }

    document.querySelectorAll(".tripnest-language-toggle").forEach((button) => button.remove());
    ensureLanguageButtonState();
    applyTextTranslations();
  }

  function readNotificationsForUser(username) {
    if (!username) {
      return [];
    }

    const key = `tripnest_notifications_${username}`;
    const stored = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(stored) ? stored : [];
  }

  function writeNotificationsForUser(username, items) {
    if (!username) {
      return;
    }

    localStorage.setItem(`tripnest_notifications_${username}`, JSON.stringify(items));
  }

  function addNotificationForUser(username, notification) {
    if (!username) {
      return;
    }

    const next = readNotificationsForUser(username);
    const message = {
      id: notification.id || (crypto.randomUUID ? crypto.randomUUID() : `notif-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      text: notification.text || "Νέα ειδοποίηση.",
      type: notification.type || "info",
      href: notification.href || "./home.html",
      time: notification.time || "Τώρα",
      read: Boolean(notification.read),
      createdAt: new Date().toISOString()
    };

    const updated = [message, ...next].slice(0, 30);
    writeNotificationsForUser(username, updated);
    return message;
  }

  function markNotificationsReadForUser(username) {
    if (!username) {
      return;
    }

    const items = readNotificationsForUser(username).map((item) => ({ ...item, read: true }));
    writeNotificationsForUser(username, items);
  }

  async function refreshNotificationsList() {
    if (!user?.id || !user?.username) {
      return [];
    }

    try {
      const response = await fetch(`/api/notifications?userId=${encodeURIComponent(user.id)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Δεν ήταν δυνατή η φόρτωση ειδοποιήσεων.");
      }

      const nextItems = Array.isArray(data.notifications) ? data.notifications : [];
      writeNotificationsForUser(user.username, nextItems);
      return nextItems;
    } catch (error) {
      return readNotificationsForUser(user.username);
    }
  }

  async function markNotificationsAsReadOnServer() {
    if (!user?.id) {
      return;
    }

    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
    } catch (error) {
      // ignore and keep local fallback
    }
  }

  window.tripnestAddNotificationForUser = addNotificationForUser;
  window.tripnestMarkNotificationsRead = markNotificationsReadForUser;

  const topbar = document.querySelector(".tripnest-topbar");
  const logoutButton = document.querySelector(".tripnest-logout-btn, #savedLogoutBtn, #tripPlansLogoutBtn");

  if (topbar && logoutButton) {
    const actionGroup = document.createElement("div");
    actionGroup.className = "tripnest-topbar-actions";

    const bellButton = document.createElement("button");
    bellButton.type = "button";
    bellButton.className = "tripnest-notification-btn";
    bellButton.setAttribute("aria-label", "Ειδοποιήσεις");
    bellButton.innerHTML = `
      <span class="tripnest-notification-icon">🔔</span>
      <span class="tripnest-notification-badge">0</span>
    `;

    const panel = document.createElement("div");
    panel.className = "tripnest-notification-panel";
    panel.hidden = true;

    function renderNotifications(items = []) {
      const notifications = items.length ? items : readNotificationsForUser(user.username);
      const unreadCount = notifications.filter((item) => !item.read).length;
      const badge = bellButton.querySelector(".tripnest-notification-badge");
      if (badge) {
        badge.textContent = String(unreadCount);
      }

      panel.innerHTML = notifications.length
        ? notifications.map((item) => `
            <button type="button" class="tripnest-notification-item${item.read ? " is-read" : ""}" data-href="${String(item.href || "./home.html")}" data-notification-id="${String(item.id || "")}">
              <span>${item.text}</span>
              <small>${item.time}</small>
            </button>
          `).join("")
        : '<div class="tripnest-notification-empty">Δεν υπάρχουν ειδοποιήσεις.</div>';

      panel.querySelectorAll(".tripnest-notification-item").forEach((button) => {
        button.addEventListener("click", async () => {
          const itemId = button.dataset.notificationId;
          const href = String(button.dataset.href || "./home.html");
          const items = readNotificationsForUser(user.username);
          writeNotificationsForUser(
            user.username,
            items.map((item) => (String(item.id) === String(itemId) ? { ...item, read: true } : item))
          );
          await markNotificationsAsReadOnServer();
          renderNotifications(readNotificationsForUser(user.username));
          panel.hidden = true;
          bellButton.classList.remove("is-open");
          if (href) {
            window.location.assign(href);
          }
        });
      });
    }

    bellButton.addEventListener("click", async () => {
      const nextHidden = !panel.hidden;
      panel.hidden = nextHidden;
      bellButton.classList.toggle("is-open", !nextHidden);
      if (!nextHidden) {
        const notifications = await refreshNotificationsList();
        renderNotifications(notifications);
        await markNotificationsAsReadOnServer();
        renderNotifications(readNotificationsForUser(user.username));
      }
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!panel.contains(target) && !bellButton.contains(target)) {
        panel.hidden = true;
        bellButton.classList.remove("is-open");
      }
    });

    refreshNotificationsList().then((notifications) => renderNotifications(notifications));
    actionGroup.appendChild(bellButton);
    actionGroup.appendChild(logoutButton);
    topbar.appendChild(actionGroup);
    topbar.appendChild(panel);
  }

  ensureLanguageToggle();
  applyTextTranslations();

  if (!user || !searchInput) {
    return;
  }

  const countries = [
    { name: "Afghanistan", wiki: "Afghanistan" },
    { name: "Albania", wiki: "Albania" },
    { name: "Algeria", wiki: "Algeria" },
    { name: "Andorra", wiki: "Andorra" },
    { name: "Angola", wiki: "Angola" },
    { name: "Antigua and Barbuda", wiki: "Antigua_and_Barbuda" },
    { name: "Argentina", wiki: "Argentina" },
    { name: "Armenia", wiki: "Armenia" },
    { name: "Australia", wiki: "Australia" },
    { name: "Austria", wiki: "Austria" },
    { name: "Azerbaijan", wiki: "Azerbaijan" },
    { name: "Bahamas", wiki: "The_Bahamas" },
    { name: "Bahrain", wiki: "Bahrain" },
    { name: "Bangladesh", wiki: "Bangladesh" },
    { name: "Barbados", wiki: "Barbados" },
    { name: "Belarus", wiki: "Belarus" },
    { name: "Belgium", wiki: "Belgium" },
    { name: "Belize", wiki: "Belize" },
    { name: "Benin", wiki: "Benin" },
    { name: "Bhutan", wiki: "Bhutan" },
    { name: "Bolivia", wiki: "Bolivia" },
    { name: "Bosnia and Herzegovina", wiki: "Bosnia_and_Herzegovina" },
    { name: "Botswana", wiki: "Botswana" },
    { name: "Brazil", wiki: "Brazil" },
    { name: "Brunei", wiki: "Brunei" },
    { name: "Bulgaria", wiki: "Bulgaria" },
    { name: "Burkina Faso", wiki: "Burkina_Faso" },
    { name: "Burundi", wiki: "Burundi" },
    { name: "Cabo Verde", wiki: "Cape_Verde" },
    { name: "Cambodia", wiki: "Cambodia" },
    { name: "Cameroon", wiki: "Cameroon" },
    { name: "Canada", wiki: "Canada" },
    { name: "Central African Republic", wiki: "Central_African_Republic" },
    { name: "Chad", wiki: "Chad" },
    { name: "Chile", wiki: "Chile" },
    { name: "China", wiki: "China" },
    { name: "Colombia", wiki: "Colombia" },
    { name: "Comoros", wiki: "Comoros" },
    { name: "Congo", wiki: "Republic_of_the_Congo" },
    { name: "Costa Rica", wiki: "Costa_Rica" },
    { name: "Cote d'Ivoire", wiki: "Ivory_Coast" },
    { name: "Croatia", wiki: "Croatia" },
    { name: "Cuba", wiki: "Cuba" },
    { name: "Cyprus", wiki: "Cyprus" },
    { name: "Czechia", wiki: "Czech_Republic" },
    { name: "Democratic Republic of the Congo", wiki: "Democratic_Republic_of_the_Congo" },
    { name: "Denmark", wiki: "Denmark" },
    { name: "Djibouti", wiki: "Djibouti" },
    { name: "Dominica", wiki: "Dominica" },
    { name: "Dominican Republic", wiki: "Dominican_Republic" },
    { name: "Ecuador", wiki: "Ecuador" },
    { name: "Egypt", wiki: "Egypt" },
    { name: "El Salvador", wiki: "El_Salvador" },
    { name: "Equatorial Guinea", wiki: "Equatorial_Guinea" },
    { name: "Eritrea", wiki: "Eritrea" },
    { name: "Estonia", wiki: "Estonia" },
    { name: "Eswatini", wiki: "Eswatini" },
    { name: "Ethiopia", wiki: "Ethiopia" },
    { name: "Fiji", wiki: "Fiji" },
    { name: "Finland", wiki: "Finland" },
    { name: "France", wiki: "France" },
    { name: "Gabon", wiki: "Gabon" },
    { name: "Gambia", wiki: "The_Gambia" },
    { name: "Georgia", wiki: "Georgia_(country)" },
    { name: "Germany", wiki: "Germany" },
    { name: "Ghana", wiki: "Ghana" },
    { name: "Greece", wiki: "Greece" },
    { name: "Grenada", wiki: "Grenada" },
    { name: "Guatemala", wiki: "Guatemala" },
    { name: "Guinea", wiki: "Guinea" },
    { name: "Guinea-Bissau", wiki: "Guinea-Bissau" },
    { name: "Guyana", wiki: "Guyana" },
    { name: "Haiti", wiki: "Haiti" },
    { name: "Holy See", wiki: "Holy_See" },
    { name: "Honduras", wiki: "Honduras" },
    { name: "Hungary", wiki: "Hungary" },
    { name: "Iceland", wiki: "Iceland" },
    { name: "India", wiki: "India" },
    { name: "Indonesia", wiki: "Indonesia" },
    { name: "Iran", wiki: "Iran" },
    { name: "Iraq", wiki: "Iraq" },
    { name: "Ireland", wiki: "Ireland" },
    { name: "Israel", wiki: "Israel" },
    { name: "Italy", wiki: "Italy" },
    { name: "Jamaica", wiki: "Jamaica" },
    { name: "Japan", wiki: "Japan" },
    { name: "Jordan", wiki: "Jordan" },
    { name: "Kazakhstan", wiki: "Kazakhstan" },
    { name: "Kenya", wiki: "Kenya" },
    { name: "Kiribati", wiki: "Kiribati" },
    { name: "Kuwait", wiki: "Kuwait" },
    { name: "Kyrgyzstan", wiki: "Kyrgyzstan" },
    { name: "Laos", wiki: "Laos" },
    { name: "Latvia", wiki: "Latvia" },
    { name: "Lebanon", wiki: "Lebanon" },
    { name: "Lesotho", wiki: "Lesotho" },
    { name: "Liberia", wiki: "Liberia" },
    { name: "Libya", wiki: "Libya" },
    { name: "Liechtenstein", wiki: "Liechtenstein" },
    { name: "Lithuania", wiki: "Lithuania" },
    { name: "Luxembourg", wiki: "Luxembourg" },
    { name: "Madagascar", wiki: "Madagascar" },
    { name: "Malawi", wiki: "Malawi" },
    { name: "Malaysia", wiki: "Malaysia" },
    { name: "Maldives", wiki: "Maldives" },
    { name: "Mali", wiki: "Mali" },
    { name: "Malta", wiki: "Malta" },
    { name: "Marshall Islands", wiki: "Marshall_Islands" },
    { name: "Mauritania", wiki: "Mauritania" },
    { name: "Mauritius", wiki: "Mauritius" },
    { name: "Mexico", wiki: "Mexico" },
    { name: "Micronesia", wiki: "Federated_States_of_Micronesia" },
    { name: "Moldova", wiki: "Moldova" },
    { name: "Monaco", wiki: "Monaco" },
    { name: "Mongolia", wiki: "Mongolia" },
    { name: "Montenegro", wiki: "Montenegro" },
    { name: "Morocco", wiki: "Morocco" },
    { name: "Mozambique", wiki: "Mozambique" },
    { name: "Myanmar", wiki: "Myanmar" },
    { name: "Namibia", wiki: "Namibia" },
    { name: "Nauru", wiki: "Nauru" },
    { name: "Nepal", wiki: "Nepal" },
    { name: "Netherlands", wiki: "Netherlands" },
    { name: "New Zealand", wiki: "New_Zealand" },
    { name: "Nicaragua", wiki: "Nicaragua" },
    { name: "Niger", wiki: "Niger" },
    { name: "Nigeria", wiki: "Nigeria" },
    { name: "North Korea", wiki: "North_Korea" },
    { name: "North Macedonia", wiki: "North_Macedonia" },
    { name: "Norway", wiki: "Norway" },
    { name: "Oman", wiki: "Oman" },
    { name: "Pakistan", wiki: "Pakistan" },
    { name: "Palau", wiki: "Palau" },
    { name: "Palestine", wiki: "State_of_Palestine" },
    { name: "Panama", wiki: "Panama" },
    { name: "Papua New Guinea", wiki: "Papua_New_Guinea" },
    { name: "Paraguay", wiki: "Paraguay" },
    { name: "Peru", wiki: "Peru" },
    { name: "Philippines", wiki: "Philippines" },
    { name: "Poland", wiki: "Poland" },
    { name: "Portugal", wiki: "Portugal" },
    { name: "Qatar", wiki: "Qatar" },
    { name: "Romania", wiki: "Romania" },
    { name: "Russia", wiki: "Russia" },
    { name: "Rwanda", wiki: "Rwanda" },
    { name: "Saint Kitts and Nevis", wiki: "Saint_Kitts_and_Nevis" },
    { name: "Saint Lucia", wiki: "Saint_Lucia" },
    { name: "Saint Vincent and the Grenadines", wiki: "Saint_Vincent_and_the_Grenadines" },
    { name: "Samoa", wiki: "Samoa" },
    { name: "San Marino", wiki: "San_Marino" },
    { name: "Sao Tome and Principe", wiki: "São_Tomé_and_Príncipe" },
    { name: "Saudi Arabia", wiki: "Saudi_Arabia" },
    { name: "Senegal", wiki: "Senegal" },
    { name: "Serbia", wiki: "Serbia" },
    { name: "Seychelles", wiki: "Seychelles" },
    { name: "Sierra Leone", wiki: "Sierra_Leone" },
    { name: "Singapore", wiki: "Singapore" },
    { name: "Slovakia", wiki: "Slovakia" },
    { name: "Slovenia", wiki: "Slovenia" },
    { name: "Solomon Islands", wiki: "Solomon_Islands" },
    { name: "Somalia", wiki: "Somalia" },
    { name: "South Africa", wiki: "South_Africa" },
    { name: "South Korea", wiki: "South_Korea" },
    { name: "South Sudan", wiki: "South_Sudan" },
    { name: "Spain", wiki: "Spain" },
    { name: "Sri Lanka", wiki: "Sri_Lanka" },
    { name: "Sudan", wiki: "Sudan" },
    { name: "Suriname", wiki: "Suriname" },
    { name: "Sweden", wiki: "Sweden" },
    { name: "Switzerland", wiki: "Switzerland" },
    { name: "Syria", wiki: "Syria" },
    { name: "Tajikistan", wiki: "Tajikistan" },
    { name: "Tanzania", wiki: "Tanzania" },
    { name: "Thailand", wiki: "Thailand" },
    { name: "Timor-Leste", wiki: "East_Timor" },
    { name: "Togo", wiki: "Togo" },
    { name: "Tonga", wiki: "Tonga" },
    { name: "Trinidad and Tobago", wiki: "Trinidad_and_Tobago" },
    { name: "Tunisia", wiki: "Tunisia" },
    { name: "Turkey", wiki: "Turkey" },
    { name: "Turkmenistan", wiki: "Turkmenistan" },
    { name: "Tuvalu", wiki: "Tuvalu" },
    { name: "Uganda", wiki: "Uganda" },
    { name: "Ukraine", wiki: "Ukraine" },
    { name: "United Arab Emirates", wiki: "United_Arab_Emirates" },
    { name: "United Kingdom", wiki: "United_Kingdom" },
    { name: "United States", wiki: "United_States" },
    { name: "Uruguay", wiki: "Uruguay" },
    { name: "Uzbekistan", wiki: "Uzbekistan" },
    { name: "Vanuatu", wiki: "Vanuatu" },
    { name: "Venezuela", wiki: "Venezuela" },
    { name: "Vietnam", wiki: "Vietnam" },
    { name: "Yemen", wiki: "Yemen" },
    { name: "Zambia", wiki: "Zambia" },
    { name: "Zimbabwe", wiki: "Zimbabwe" }
  ];

  const parent = searchInput.parentElement;
  if (!parent) {
    return;
  }

  const shell = document.createElement("div");
  shell.className = "tripnest-topbar-search-shell";
  parent.insertBefore(shell, searchInput);
  shell.appendChild(searchInput);

  const results = document.createElement("div");
  results.className = "tripnest-topbar-search-results";
  results.hidden = true;
  shell.appendChild(results);

  let users = [];
  let hasLoadedUsers = false;

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  async function loadUsers() {
    if (hasLoadedUsers) {
      return users;
    }

    const response = await fetch(`/api/users?excludeUserId=${encodeURIComponent(user.id)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Δεν ήταν δυνατή η φόρτωση των χρηστών.");
    }

    users = Array.isArray(data.users) ? data.users : [];
    hasLoadedUsers = true;
    return users;
  }

  function closeResults() {
    results.hidden = true;
    results.innerHTML = "";
  }

  function renderResults(matches) {
    results.innerHTML = "";

    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "tripnest-topbar-search-empty";
      empty.textContent = "Δεν βρέθηκαν χρήστες ή χώρες.";
      results.appendChild(empty);
      results.hidden = false;
      return;
    }

    matches.forEach((entry) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "tripnest-topbar-search-item";

      if (entry.type === "user") {
        item.dataset.userId = entry.id;
        item.innerHTML = `
          <span class="tripnest-topbar-search-avatar">${(entry.nickname || entry.username || "U").charAt(0).toUpperCase()}</span>
          <span class="tripnest-topbar-search-copy">
            <strong>${entry.nickname || entry.username}</strong>
            <span>@${entry.username}</span>
          </span>
        `;
      } else {
        item.dataset.countryWiki = entry.wiki;
        item.innerHTML = `
          <span class="tripnest-topbar-search-avatar">C</span>
          <span class="tripnest-topbar-search-copy">
            <strong>${entry.name}</strong>
            <span>Wikipedia (EN)</span>
          </span>
        `;
      }

      results.appendChild(item);
    });

    results.hidden = false;
  }

  async function handleSearch() {
    const query = normalizeText(searchInput.value);
    if (!query) {
      closeResults();
      return;
    }

    try {
      const userList = await loadUsers();
      const userMatches = userList
        .filter((entry) => {
          const nickname = normalizeText(entry.nickname);
          const username = normalizeText(entry.username);
          return nickname.includes(query) || username.includes(query);
        })
        .map((entry) => ({ ...entry, type: "user" }));

      const countryMatches = countries
        .filter((entry) => normalizeText(entry.name).includes(query))
        .map((entry) => ({ ...entry, type: "country" }));

      renderResults([...userMatches, ...countryMatches].slice(0, 8));
    } catch (error) {
      results.innerHTML = `<div class="tripnest-topbar-search-empty">${error.message}</div>`;
      results.hidden = false;
    }
  }

  searchInput.addEventListener("input", handleSearch);
  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim()) {
      handleSearch();
    }
  });

  results.addEventListener("click", (event) => {
    const userItem = event.target.closest("[data-user-id]");
    if (userItem?.dataset.userId) {
      window.location.href = `./profile.html?userId=${encodeURIComponent(userItem.dataset.userId)}`;
      return;
    }

    const countryItem = event.target.closest("[data-country-wiki]");
    if (!countryItem?.dataset.countryWiki) {
      return;
    }

    window.open(`https://en.wikipedia.org/wiki/${countryItem.dataset.countryWiki}`, "_blank", "noopener");
  });

  document.addEventListener("click", (event) => {
    if (!shell.contains(event.target)) {
      closeResults();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeResults();
    }
  });
});
