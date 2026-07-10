const configUrl = './admin-config.json';
const loginForm = document.getElementById('admin-login-form');
const passwordInput = document.getElementById('admin-password-input');
const errorText = document.getElementById('admin-login-error');
const dashboard = document.getElementById('admin-dashboard');
const loginCard = document.getElementById('admin-login-card');
const logoutButton = document.getElementById('admin-logout-btn');
const configRows = document.getElementById('config-rows');
const statusBadge = document.getElementById('admin-status-badge');
const adminHeadline = document.querySelector('.admin-headline');
const adminSubtitle = document.querySelector('.admin-subtitle');
const createAnnouncementBtn = document.getElementById('create-announcement-btn');
const announcementModal = document.getElementById('announcement-modal');
const announcementModalClose = document.getElementById('announcement-modal-close');
const announcementModalCancel = document.getElementById('announcement-modal-cancel');
const announcementFaculty = document.getElementById('announcement-faculty');
const announcementYear = document.getElementById('announcement-year');
const announcementSemester = document.getElementById('announcement-semester');
const announcementSpec = document.getElementById('announcement-spec');
const announcementGroup = document.getElementById('announcement-group');
const announcementTitle = document.getElementById('announcement-title');
const announcementText = document.getElementById('announcement-text');
const publishAnnouncementBtn = document.getElementById('publish-announcement-btn');
const announcementError = document.getElementById('announcement-error');
const announcementList = document.getElementById('announcement-list');
const announcementItems = document.querySelector('.announcement-items');

let adminConfig = null;
let academicData = null;

async function loadAdminConfig() {
    try {
        const response = await fetch(configUrl, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('Unable to load admin configuration.');
        }
        adminConfig = await response.json();
    } catch (error) {
        errorText.textContent = error.message;
        passwordInput.disabled = true;
        loginForm.querySelector('button').disabled = true;
    }
}

function setSelectOptions(select, values) {
    if (!select) return;
    select.innerHTML = values
        .map((value) => `<option value="${value}">${value === 'all' ? 'All' : value}</option>`)
        .join('');
}

function loadAcademicOptions() {
    return fetch('./data.json', { cache: 'no-store' })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Unable to load academic options.');
            }
            return response.json();
        })
        .then((data) => {
            academicData = data;
            populateFacultySelect();
        })
        .catch((error) => {
            console.error('Failed to load academic data:', error);
            academicData = null;
            setSelectOptions(announcementFaculty, ['all']);
            setSelectOptions(announcementYear, ['all']);
            setSelectOptions(announcementSemester, ['all']);
            setSelectOptions(announcementSpec, ['all']);
            setSelectOptions(announcementGroup, ['all']);
        });
}

function populateFacultySelect() {
    if (!academicData?.fac) {
        setSelectOptions(announcementFaculty, ['all']);
        setSelectOptions(announcementYear, ['all']);
        setSelectOptions(announcementSemester, ['all']);
        setSelectOptions(announcementSpec, ['all']);
        setSelectOptions(announcementGroup, ['all']);
        return;
    }

    const faculties = ['all', ...Object.keys(academicData.fac)];
    setSelectOptions(announcementFaculty, faculties);
    populateYearSelect();
}

function populateYearSelect() {
    const faculty = announcementFaculty?.value;
    if (faculty === 'all' || !academicData?.fac?.[faculty]) {
        setSelectOptions(announcementYear, ['all']);
        setSelectOptions(announcementSemester, ['all']);
        setSelectOptions(announcementSpec, ['all']);
        setSelectOptions(announcementGroup, ['all']);
        return;
    }

    const years = ['all', ...Object.keys(academicData.fac[faculty])];
    setSelectOptions(announcementYear, years);
    populateSemesterSelect();
}

function populateSemesterSelect() {
    const faculty = announcementFaculty?.value;
    const year = announcementYear?.value;
    if (faculty === 'all' || year === 'all' || !academicData?.fac?.[faculty]?.[year]) {
        setSelectOptions(announcementSemester, ['all']);
        setSelectOptions(announcementSpec, ['all']);
        setSelectOptions(announcementGroup, ['all']);
        return;
    }

    const semesters = ['all', ...Object.keys(academicData.fac[faculty][year])];
    setSelectOptions(announcementSemester, semesters);
    populateSpecSelect();
}

function populateSpecSelect() {
    const faculty = announcementFaculty?.value;
    const year = announcementYear?.value;
    const semester = announcementSemester?.value;
    if (
        faculty === 'all' ||
        year === 'all' ||
        semester === 'all' ||
        !academicData?.fac?.[faculty]?.[year]?.[semester]
    ) {
        setSelectOptions(announcementSpec, ['all']);
        setSelectOptions(announcementGroup, ['all']);
        return;
    }

    const specs = ['all', ...Object.keys(academicData.fac[faculty][year][semester])];
    setSelectOptions(announcementSpec, specs);
    populateGroupSelect();
}

function populateGroupSelect() {
    const faculty = announcementFaculty?.value;
    const year = announcementYear?.value;
    const semester = announcementSemester?.value;
    const spec = announcementSpec?.value;
    if (
        faculty === 'all' ||
        year === 'all' ||
        semester === 'all' ||
        spec === 'all' ||
        !academicData?.fac?.[faculty]?.[year]?.[semester]?.[spec]
    ) {
        setSelectOptions(announcementGroup, ['all']);
        return;
    }

    const groups = ['all', ...Object.keys(academicData.fac[faculty][year][semester][spec])];
    setSelectOptions(announcementGroup, groups);
}

function renderConfigSummary() {
    if (!configRows || !adminConfig) return;
    configRows.innerHTML = Object.entries(adminConfig)
        .map(([key, value]) => `<div class="config-row"><strong>${key}</strong>: ${value}</div>`)
        .join('');
}

function showDashboard() {
    loginCard.classList.add('hidden');
    dashboard.classList.remove('hidden');
    statusBadge.textContent = 'Secure Access Granted';
    statusBadge.classList.remove('status-pill');
    statusBadge.classList.remove('hidden');
    adminHeadline.textContent = 'Welcome to the Admin Dashboard';
    adminSubtitle.textContent = 'Manage announcements, review settings, and clear dashboard state below.';
    renderConfigSummary();
}

function hideDashboard() {
    loginCard.classList.remove('hidden');
    dashboard.classList.add('hidden');
    statusBadge.textContent = 'Admin Mode';
    statusBadge.className = 'status-pill hidden';
    passwordInput.value = '';
    errorText.textContent = '';
    adminHeadline.textContent = 'Admin Login';
    adminSubtitle.textContent = 'Secure access for timetable configuration.';
    closeAnnouncementModal();
    hideAnnouncements();
}

async function openAnnouncementModal() {
    announcementModal.classList.remove('hidden');
    if (!academicData) {
        await loadAcademicOptions();
    }
    populateFacultySelect();
    announcementTitle.value = '';
    announcementText.value = '';
    announcementError.textContent = '';
}

function closeAnnouncementModal() {
    announcementModal.classList.add('hidden');
    announcementError.textContent = '';
}

function hideAnnouncements() {
    announcementList.classList.add('hidden');
}

function authenticate(event) {
    event.preventDefault();
    if (!adminConfig) {
        errorText.textContent = 'Configuration unavailable.';
        return;
    }

    const enteredPassword = passwordInput.value.trim();
    if (!enteredPassword) {
        errorText.textContent = 'Please enter the admin password.';
        return;
    }

    if (enteredPassword === String(adminConfig.password)) {
        showDashboard();
    } else {
        errorText.textContent = 'Incorrect password. Please try again.';
        passwordInput.focus();
    }
}

function logoutAdmin() {
    hideDashboard();
}

async function createAnnouncement() {
    await openAnnouncementModal();
}

function getNotificationHistory() {
    const raw = localStorage.getItem('timetable-notification-history');
    return raw ? JSON.parse(raw) : [];
}

function saveNotificationHistory(history) {
    localStorage.setItem('timetable-notification-history', JSON.stringify(history.slice(0, 100)));
}

function getLocalAdminAnnouncements() {
    return getNotificationHistory();
}

function renderAdminAnnouncements() {
    if (!announcementItems) return;
    const announcements = getLocalAdminAnnouncements();
    announcementItems.innerHTML = '';

    if (!announcements.length) {
        announcementItems.innerHTML = '<p>No announcements have been sent yet.</p>';
        announcementList.classList.add('hidden');
        return;
    }

    announcements.forEach((announcement) => {
        const item = document.createElement('article');
        item.className = 'announcement-item';
        item.innerHTML = `
            <h4>${announcement.title || 'Announcement'}</h4>
            <p>${announcement.message}</p>
            <div class="announcement-meta">
              <span>Faculty: ${announcement.faculty || 'All'}</span>
              <span>Year: ${announcement.year || 'All'}</span>
              <span>Semester: ${announcement.semester || 'All'}</span>
              <span>Spec: ${announcement.spec || 'All'}</span>
              <span>Group: ${announcement.group || 'All'}</span>
            </div>
            <div class="announcement-meta">
              <span>Sent: ${new Date(announcement.createdAt).toLocaleString()}</span>
              <button type="button" data-id="${announcement.id}" class="delete-announcement-btn">Delete</button>
            </div>
        `;
        announcementItems.appendChild(item);
    });

    announcementList.classList.remove('hidden');
    document.querySelectorAll('.delete-announcement-btn').forEach((btn) => {
        btn.addEventListener('click', () => deleteAnnouncement(btn.dataset.id));
    });
}

function publishAnnouncement() {
    const title = announcementTitle.value.trim();
    const message = announcementText.value.trim();
    const faculty = announcementFaculty.value || 'all';
    const year = announcementYear.value || 'all';
    const semester = announcementSemester.value || 'all';
    const spec = announcementSpec.value || 'all';
    const group = announcementGroup.value || 'all';

    if (!title) {
        announcementError.textContent = 'Please enter an announcement title.';
        return;
    }

    if (!message) {
        announcementError.textContent = 'Please enter an announcement message.';
        return;
    }

    const announcement = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        title,
        body: message,
        message,
        faculty,
        year,
        semester,
        spec,
        group,
        createdAt: new Date().toISOString(),
        unread: true,
    };

    const history = getLocalAdminAnnouncements();
    history.unshift(announcement);
    saveNotificationHistory(history);
    closeAnnouncementModal();
    renderAdminAnnouncements();
}

function deleteAnnouncement(id) {
    const history = getLocalAdminAnnouncements();
    const updated = history.filter((notification) => notification.id !== id);
    saveNotificationHistory(updated);
    renderAdminAnnouncements();
}

loginForm?.addEventListener('submit', authenticate);
logoutButton?.addEventListener('click', logoutAdmin);
createAnnouncementBtn?.addEventListener('click', createAnnouncement);
publishAnnouncementBtn?.addEventListener('click', publishAnnouncement);
announcementModalClose?.addEventListener('click', closeAnnouncementModal);
announcementModalCancel?.addEventListener('click', closeAnnouncementModal);
announcementFaculty?.addEventListener('change', populateYearSelect);
announcementYear?.addEventListener('change', populateSemesterSelect);
announcementSemester?.addEventListener('change', populateSpecSelect);
announcementSpec?.addEventListener('change', populateGroupSelect);

window.addEventListener('DOMContentLoaded', async () => {
    await loadAdminConfig();
    await loadAcademicOptions();
    hideDashboard();
    renderAdminAnnouncements();
});
