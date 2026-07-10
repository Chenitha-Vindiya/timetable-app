// Variables //

// store last version number to display update alerts

// Add to DOM constants
const settingsToggle = document.getElementById("settings-toggle");
const notificationsToggle = document.getElementById("notifications-toggle");
const notificationCount = document.getElementById("notification-count");
const settingsDarkMode = document.getElementById("settings-dark-mode");
const settingsNotifications = document.getElementById("settings-notifications");
const settingsThemeItem = document.getElementById("settings-theme-item");
const settingsNotificationsItem = document.getElementById("settings-notifications-item");

// Use querySelectorAll to get BOTH meta tags you added
const themeMetas = document.querySelectorAll('meta[name="theme-color"]');

// Helper function to update all theme tags at once
const updateThemeMeta = (color) => {
  themeMetas.forEach(meta => meta.setAttribute("content", color));
};

// Check for saved mode on load
window.addEventListener("load", () => {
  if (getCookie("theme") === "dark") {
    document.body.classList.add("dark-mode");
    if (settingsDarkMode) settingsDarkMode.checked = true;
    updateThemeMeta("#16172d");
  }

  const notificationEnabled = localStorage.getItem("notifications-enabled") === "true";
  if (settingsNotifications) settingsNotifications.checked = notificationEnabled;
  if (notificationEnabled) {
    askNotificationPermission();
  }

  updateSettingsUI();
  updateNotificationBadge();
});

function updateSettingsUI() {
  if (settingsDarkMode && settingsThemeItem) {
    settingsThemeItem.classList.toggle("selected", settingsDarkMode.checked);
  }
  if (settingsNotifications && settingsNotificationsItem) {
    settingsNotificationsItem.classList.toggle("selected", settingsNotifications.checked);
  }
}

function openSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (!modal) return;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (!modal) return;
  modal.style.display = "none";
  document.body.style.overflow = "auto";
}

function openNotificationsModal() {
  const modal = document.getElementById("notificationsModal");
  if (!modal) return;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  renderNotificationHistory();
  markNotificationsRead();
}

function closeNotificationsModal() {
  const modal = document.getElementById("notificationsModal");
  if (!modal) return;
  modal.style.display = "none";
  document.body.style.overflow = "auto";
}

function getNotificationHistory() {
  const raw = localStorage.getItem("timetable-notification-history");
  return raw ? JSON.parse(raw) : [];
}

function saveNotificationHistory(history) {
  localStorage.setItem("timetable-notification-history", JSON.stringify(history.slice(0, 50)));
}

function updateNotificationBadge() {
  if (!notificationCount) return;
  const unread = getNotificationHistory().filter((item) => item.unread).length;
  if (unread > 0) {
    notificationCount.textContent = unread > 9 ? "9+" : unread;
    notificationCount.classList.add("active");
  } else {
    notificationCount.textContent = "";
    notificationCount.classList.remove("active");
  }
}

function renderNotificationHistory() {
  const list = document.getElementById("notifications-list");
  if (!list) return;
  const history = getNotificationHistory();
  if (!history.length) {
    list.innerHTML = '<div class="notification-entry"><p>No notifications yet.</p></div>';
    return;
  }

  list.innerHTML = history.map((item) => {
    const date = new Date(item.createdAt).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const title = item.title || "Announcement";
    const body = item.body || item.message || "No message provided.";
    return `
        <div class="notification-entry">
          <h3>${title}</h3>
          <p>${body}</p>
          <div class="notification-meta">${date}</div>
        </div>
      `;
  }).join("");
}

function markNotificationsRead() {
  const history = getNotificationHistory();
  const updated = history.map((item) => ({ ...item, unread: false }));
  saveNotificationHistory(updated);
  updateNotificationBadge();
}

function applyDarkMode(enabled) {
  if (enabled) {
    document.body.classList.add("dark-mode");
    setCookie("theme", "dark", 90);
    updateThemeMeta("#16172d");
  } else {
    document.body.classList.remove("dark-mode");
    setCookie("theme", "light", 90);
    updateThemeMeta("#ff0000");
  }
}

function updateNotificationSetting(enabled) {
  localStorage.setItem("notifications-enabled", enabled ? "true" : "false");
  if (enabled) {
    askNotificationPermission();
  }
}

if (settingsToggle) {
  settingsToggle.addEventListener("click", openSettingsModal);
}

if (settingsDarkMode) {
  settingsDarkMode.addEventListener("change", function () {
    applyDarkMode(this.checked);
    updateSettingsUI();
  });
}

if (settingsNotifications) {
  settingsNotifications.addEventListener("change", function () {
    updateNotificationSetting(this.checked);
    updateSettingsUI();
  });
}

if (settingsThemeItem) {
  settingsThemeItem.addEventListener("click", function () {
    if (!settingsDarkMode) return;
    const checked = !settingsDarkMode.checked;
    settingsDarkMode.checked = checked;
    applyDarkMode(checked);
    updateSettingsUI();
  });
}

if (settingsNotificationsItem) {
  settingsNotificationsItem.addEventListener("click", function () {
    if (!settingsNotifications) return;
    const checked = !settingsNotifications.checked;
    settingsNotifications.checked = checked;
    updateNotificationSetting(checked);
    updateSettingsUI();
  });
}

if (notificationsToggle) {
  notificationsToggle.addEventListener("click", openNotificationsModal);
}

// ---- Admin announcements polling ----
// Since this is a static site with no server, "push" is simulated by polling a
// shared announcements.json file (published by the admin panel via GitHub) while
// the app is open. This will NOT wake up a fully closed browser tab.
const ANNOUNCEMENTS_URL = "./announcements.json";
const ANNOUNCEMENTS_POLL_INTERVAL = 45000; // 45 seconds

function getSeenAnnouncementIds() {
  const raw = localStorage.getItem("seen-announcement-ids");
  return raw ? JSON.parse(raw) : [];
}

function markAnnouncementSeen(id) {
  const seen = getSeenAnnouncementIds();
  seen.push(id);
  localStorage.setItem("seen-announcement-ids", JSON.stringify(seen.slice(-200)));
}

function announcementMatchesUser(announcement) {
  const userFaculty = getCookie("faculty");
  const userYear = getCookie("year");
  const userSemester = getCookie("semester");
  const userSpec = getCookie("spec");
  const userGroup = getCookie("sub");

  const matches = (targetValue, userValue) =>
    !targetValue || targetValue === "all" || targetValue === userValue;

  return (
    matches(announcement.faculty, userFaculty) &&
    matches(announcement.year, userYear) &&
    matches(announcement.semester, userSemester) &&
    matches(announcement.spec, userSpec) &&
    matches(announcement.group, userGroup)
  );
}

function checkForAnnouncements() {
  const notificationsEnabled = localStorage.getItem("notifications-enabled") === "true";
  if (!notificationsEnabled) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  fetch(ANNOUNCEMENTS_URL, { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      if (!data || !Array.isArray(data.announcements)) return;
      const seen = getSeenAnnouncementIds();

      data.announcements.forEach((announcement) => {
        if (seen.includes(announcement.id)) return;

        if (!announcementMatchesUser(announcement)) {
          // Doesn't apply to this user - remember it so we don't re-check it every poll.
          markAnnouncementSeen(announcement.id);
          return;
        }

        const title = announcement.title || "Announcement";
        const body = announcement.body || announcement.message || "";

        if (typeof storeNotification === "function") {
          storeNotification(title, body);
        }

        if (navigator.serviceWorker) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, {
              body,
              icon: "./images/android-chrome-512x512.png",
              badge: "./images/favicon.ico",
              vibrate: [200, 100, 200],
              tag: `announcement-${announcement.id}`,
            });
          });
        }

        markAnnouncementSeen(announcement.id);
      });
    })
    .catch((err) => console.error("Failed to check announcements:", err));
}

window.addEventListener("load", () => {
  // Delay slightly so the service worker + permission flow (in index.html) resolves first.
  setTimeout(checkForAnnouncements, 3000);
  setInterval(checkForAnnouncements, ANNOUNCEMENTS_POLL_INTERVAL);
});

const infoToggle = document.getElementById("info-toggle");

function openInfoModal() {
  const modal = document.getElementById("infoModal");
  if (!modal) return;
  document.getElementById("detail-faculty").innerText = faculty || "-";
  document.getElementById("detail-year").innerText = year || "-";
  document.getElementById("detail-semester").innerText = semester || "-";
  document.getElementById("detail-spec").innerText = spec || "-";
  document.getElementById("detail-group").innerText = sub || "-";
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeInfoModal() {
  const modal = document.getElementById("infoModal");
  if (!modal) return;
  modal.style.display = "none";
  document.body.style.overflow = "auto";
}

if (infoToggle) {
  infoToggle.addEventListener("click", openInfoModal);
}

var thisVersion = "1.2.4"; // this must be updated only on a major change (not patches and bug fixes)

var username;
var keys = [];
const options = []; //array to hold options

var faculty, year, semester, spec, sub, randomSeed; // read values

const weekday = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const d = new Date();
let currentDay = d.getDay();
let dateToday = d.getDate();
let realDay = weekday[currentDay];
let dayToday = realDay;

window.addEventListener("load", (event) => {
  const savedUser = getCookie("username");
  if (savedUser) {
    username = savedUser;
    faculty = getCookie("faculty");
    year = getCookie("year");
    semester = getCookie("semester");
    spec = getCookie("spec");
    sub = getCookie("sub"); // <--- ADD THIS LINE
    randomSeed = getCookie("seed");

    fetch("./data.json")
      .then((response) => response.json())
      .then((data) => {
        keys = data;
        displayUserData(); // This calls displayTable() internally
        transition("splash-section", "main-section");
      })
      .catch(err => console.error("Session restoration failed:", err));
  } else {
    transition("splash-section", "login-section");
    document.getElementById("username-field").focus();
  }
});

// DOM constants //
let continueBtn = document.getElementById("continue-btn");
let detailsBtn = document.getElementById("details-continue-btn");
let detailsBackBtn = document.getElementById("details-back-btn");
let mainBackBtn = document.getElementById("main-back-btn");
let logOutBtn = document.getElementById("logout-btn");
let username_field = document.getElementById("username-field");
let prev_btn = document.getElementById("left-nav-icon");
let next_btn = document.getElementById("right-nav-icon");
let select_main_group = document.getElementById("select-main-group");
// SEQUENCE //

continueBtn.addEventListener("click", readUsername);
detailsBtn.addEventListener("click", readDetails);

// navigate through the week
prev_btn.addEventListener("click", function () {
  currentDay = currentDay - 1;
  if (currentDay < 0) {
    currentDay = 6;
  }
  dayToday = weekday[currentDay];
  displayTable();
});

next_btn.addEventListener("click", function () {
  currentDay = currentDay + 1;
  if (currentDay > 6) {
    currentDay = 0;
  }
  dayToday = weekday[currentDay];
  displayTable();
});

// details section >> fetch options from databse and display within html
let select_fac = document.getElementById("select-fac");
let select_year = document.getElementById("select-year");
let select_1 = document.getElementById("select-1");
let select_2 = document.getElementById("select-2");
let select_3 = document.getElementById("select-3");


// back buttons
//back btn in details section
detailsBackBtn.addEventListener("click", function () {
  transition("details-section", "login-section");
});
// back btn in main section
mainBackBtn.addEventListener("click", function () {
  transition("main-section", "details-section");
  getFacList();
});

// logout button
logOutBtn.addEventListener("click", function () {
  logOut();
  // transition("main-section", "login-section");
});

/**
 * SELECTION DROPDOWN MENUS
 *
 * This works by fetching data from the JSON object in data.json file
 * the data is fetched in the order >>
 * faculty > year > semester > specialization > subgroup
 * and updates accordingly on change event
 */

// faculty selection
select_fac.addEventListener("change", function () {
  let selected = select_fac.value;
  faculty = selected; // assign to global

  if (selected == "Select") {
    select_year.value = 0;
    select_year.disabled = true;
    select_1.disabled = true;
    select_1.value = "0";
    select_2.disabled = true;
    select_2.value = "0";
    select_3.disabled = true;
    select_3.value = "0";
  } else {
    let resultArr = Object.keys(keys.fac[faculty]); // data from JSON
    let html_content = '<option value="0">Select</option>';
    resultArr.forEach((element) => {
      html_content +=
        '<option value="' + element + '">' + element + "</option>";
    });

    select_year.innerHTML = html_content;
    select_year.disabled = false;
  }
});

// year selection
select_year.addEventListener("change", function () {
  // let faculty = select_fac.value;
  let selected = select_year.value;
  year = selected;

  // if selected 'select'
  if (selected == "0") {
    select_1.disabled = true;
    select_1.value = "0";
    select_2.disabled = true;
    select_2.value = "0";
    select_3.disabled = true;
    select_3.value = "0";
  } else {
    let resultArr = Object.keys(keys.fac[faculty][year]);
    if (resultArr == "") {
      select_1.disabled = true;
      select_1.value = "0";
      select_2.disabled = true;
      select_2.value = "0";
      select_3.disabled = true;
      select_3.value = "0";
    } else {
      let html_content = '<option value="0">Select</option>';
      resultArr.forEach((element) => {
        html_content +=
          '<option value="' + element + '">' + element + "</option>";
      });
      select_1.innerHTML = html_content;
      select_1.disabled = false;
    }
  }
});

// semester selection
select_1.addEventListener("change", function () {
  // let faculty = select_fac.value;
  let selected = select_1.value;
  semester = selected; // assign to global

  // if selected 'select'
  if (selected == "0") {
    select_2.disabled = true;
    select_2.value = "0";
    select_3.disabled = true;
    select_3.value = "0";
  } else {
    let resultArr = Object.keys(keys.fac[faculty][year][semester]);
    if (resultArr == "") {
      select_2.disabled = true;
      select_2.value = "0";
      select_3.disabled = true;
      select_3.value = "0";
    } else {
      let html_content = '<option value="0">Select</option>';
      resultArr.forEach((element) => {
        html_content +=
          '<option value="' + element + '">' + element + "</option>";
      });
      select_2.innerHTML = html_content;
      select_2.disabled = false;
    }
  }
});

// 1. Modify the Specialization (select_2) listener to populate Main Groups
select_2.addEventListener("change", function () {
  let selected = select_2.value;
  spec = selected;

  if (selected == "0") {
    select_main_group.disabled = true;
    select_3.disabled = true;
  } else {
    // Get all keys like "07.01", "07.02", "08.01"
    let allGroups = Object.keys(keys.fac[faculty][year][semester][spec]);

    // Extract unique main groups (e.g., ["07", "08", "09"])
    let mainGroups = [...new Set(allGroups.map(g => g.split('.')[0]))];

    let html_content = '<option value="0">Select</option>';
    mainGroups.forEach((group) => {
      html_content += `<option value="${group}">${group}</option>`;
    });

    select_main_group.innerHTML = html_content;
    select_main_group.disabled = false;
  }
});

// 2. Add listener for Main Group to enable Subgroup selection
select_main_group.addEventListener("change", function () {
  if (this.value !== "0") {
    select_3.disabled = false;
  } else {
    select_3.disabled = true;
  }
});

// 3. Modify the Subgroup (select_3) listener to build the final key
select_3.addEventListener("change", function () {
  let mainG = select_main_group.value;
  let subG = select_3.value;

  if (mainG !== "0" && subG !== "0") {
    // Combine them to match JSON format "07.01"
    sub = `${mainG}.${subG} `;
  }
});

// run the displayTime() function in 1 sec intervals
let intervalHandle = setInterval(displayTime, 1000);