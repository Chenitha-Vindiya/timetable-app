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
const githubOwnerInput = document.getElementById('github-owner-input');
const githubRepoInput = document.getElementById('github-repo-input');
const githubBranchInput = document.getElementById('github-branch-input');
const githubTokenInput = document.getElementById('github-token-input');
const githubSaveConfigBtn = document.getElementById('github-save-config-btn');
const githubConfigStatus = document.getElementById('github-config-status');

let adminConfig = null;
let academicData = null;

// ---- GitHub-backed announcements storage ----
// The token/owner/repo/branch are kept ONLY in sessionStorage (cleared when the tab closes)
// so they are never written into the repo itself.
const GITHUB_API = 'https://api.github.com';
const ANNOUNCEMENTS_PATH = 'announcements.json';

function loadGithubConfig() {
    try {
        const raw = sessionStorage.getItem('gh-admin-config');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function populateGithubConfigInputs() {
    const config = loadGithubConfig();
    if (!config) return;
    if (githubOwnerInput) githubOwnerInput.value = config.owner || '';
    if (githubRepoInput) githubRepoInput.value = config.repo || '';
    if (githubBranchInput) githubBranchInput.value = config.branch || '';
    // Token intentionally left blank in the field even if saved, so it isn't shown on screen reload.
}

function saveGithubConfigFromInputs() {
    const owner = githubOwnerInput?.value.trim();
    const repo = githubRepoInput?.value.trim();
    const branch = githubBranchInput?.value.trim();
    const token = githubTokenInput?.value.trim();

    if (!owner || !repo || !branch || !token) {
        if (githubConfigStatus) githubConfigStatus.textContent = 'Please fill in owner, repo, branch, and token.';
        return;
    }

    sessionStorage.setItem('gh-admin-config', JSON.stringify({ owner, repo, branch, token }));
    if (githubConfigStatus) {
        githubConfigStatus.textContent = 'Connection saved for this browser session.';
        githubConfigStatus.style.color = '#4ade80';
    }
    githubTokenInput.value = '';
}

function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

function base64ToUtf8(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
}

async function fetchAnnouncementsFile() {
    const config = loadGithubConfig();
    if (!config) throw new Error('GitHub connection not set up yet. Fill in the GitHub Connection section above.');

    const url = `${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/${ANNOUNCEMENTS_PATH}?ref=${encodeURIComponent(config.branch)}`;
    const response = await fetch(url, {
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${config.token}`,
        },
        cache: 'no-store',
    });

    if (response.status === 404) {
        // File doesn't exist yet on this branch - treat as empty.
        return { data: { announcements: [] }, sha: null };
    }
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Could not read announcements.json (${response.status}). ${detail}`);
    }

    const json = await response.json();
    const decoded = base64ToUtf8(json.content);
    let data;
    try {
        data = JSON.parse(decoded);
    } catch {
        data = { announcements: [] };
    }
    if (!Array.isArray(data.announcements)) data.announcements = [];
    return { data, sha: json.sha };
}

async function writeAnnouncementsFile(data, sha, commitMessage) {
    const config = loadGithubConfig();
    if (!config) throw new Error('GitHub connection not set up yet.');

    const url = `${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/${ANNOUNCEMENTS_PATH}`;
    const body = {
        message: commitMessage,
        content: utf8ToBase64(JSON.stringify(data, null, 2)),
        branch: config.branch,
    };
    if (sha) body.sha = sha;

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${config.token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Could not publish to GitHub (${response.status}). ${detail}`);
    }
    return response.json();
}

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
    populateGithubConfigInputs();
    if (loadGithubConfig()) {
        renderAdminAnnouncements();
    }
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

async function renderAdminAnnouncements() {
    if (!announcementItems) return;

    let announcements;
    try {
        const { data } = await fetchAnnouncementsFile();
        announcements = data.announcements || [];
    } catch (error) {
        announcementItems.innerHTML = `<p>${error.message}</p>`;
        announcementList.classList.remove('hidden');
        return;
    }

    announcementItems.innerHTML = '';

    if (!announcements.length) {
        announcementItems.innerHTML = '<p>No announcements have been sent yet.</p>';
        announcementList.classList.remove('hidden');
        return;
    }

    // Newest first
    announcements.slice().reverse().forEach((announcement) => {
        const item = document.createElement('article');
        item.className = 'announcement-item';
        item.innerHTML = `
            <h4>${announcement.title || 'Announcement'}</h4>
            <p>${announcement.body || announcement.message || ''}</p>
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

async function publishAnnouncement() {
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
    };

    publishAnnouncementBtn.disabled = true;
    publishAnnouncementBtn.textContent = 'Publishing...';
    announcementError.textContent = '';

    try {
        const { data, sha } = await fetchAnnouncementsFile();
        data.announcements.push(announcement);
        await writeAnnouncementsFile(data, sha, `Add announcement: ${title}`);
        closeAnnouncementModal();
        await renderAdminAnnouncements();
    } catch (error) {
        announcementError.textContent = error.message;
    } finally {
        publishAnnouncementBtn.disabled = false;
        publishAnnouncementBtn.textContent = 'Send Announcement';
    }
}

async function deleteAnnouncement(id) {
    try {
        const { data, sha } = await fetchAnnouncementsFile();
        data.announcements = data.announcements.filter((a) => a.id !== id);
        await writeAnnouncementsFile(data, sha, `Remove announcement ${id}`);
        await renderAdminAnnouncements();
    } catch (error) {
        alert(error.message);
    }
}

githubSaveConfigBtn?.addEventListener('click', () => {
    saveGithubConfigFromInputs();
    if (loadGithubConfig()) {
        renderAdminAnnouncements();
    }
});

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
});
