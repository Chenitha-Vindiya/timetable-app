// Variables //

// store last version number to display update alerts

// Add to DOM constants
const darkModeToggle = document.getElementById("dark-mode-toggle");

// Check for saved mode on load
window.addEventListener("load", () => {
  if (getCookie("theme") === "dark") {
    document.body.classList.add("dark-mode");
    darkModeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }
});

// Toggle Logic
darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  
  if (document.body.classList.contains("dark-mode")) {
    setCookie("theme", "dark", 90);
    darkModeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  } else {
    setCookie("theme", "light", 90);
    darkModeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }
});

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
select_main_group.addEventListener("change", function() {
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
    sub = `${mainG}.${subG}`; 
  }
});

// run the displayTime() function in 1 sec intervals
let intervalHandle = setInterval(displayTime, 1000);