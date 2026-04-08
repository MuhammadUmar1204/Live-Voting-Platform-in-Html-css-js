/* ========================================
    VoteLive - Production-Ready JavaScript
    Backend Integration with Socket.io
    Enhanced for Real-time Election Management
    ======================================== */

// ========== BACKEND CONFIGURATION ==========
const BACKEND_CONFIG = {
    API_URL: 'http://localhost:3000/api',
    SOCKET_URL: 'http://localhost:3000',
    ADMIN_LOGIN: 'http://localhost:3000/api/admin/login',
    RECONNECT_INTERVAL: 5000
};

// ========== APPLICATION STATE ==========
const APP_STATE = {
    // Backend connection
    socket: null,
    socketConnected: false,
    apiToken: null,
    
    // Admin authentication
    adminAuthenticated: false,
    adminUsername: 'admin',
    adminPassword: 'password123',
    sessionId: null,
    adminId: null,
    
    // Election data
    currentElectionId: null,
    currentElection: null,
    candidates: [],
    voters: [],
    votes: [],
    
    // UI/login control
    wantAdminRedirect: false,
    loginLock: false,
    
    // Current state
    currentUser: null,
    currentVoterId: null,
    hasVoted: false,
    currentTab: 'dashboard'
};

// ========== DOM ELEMENTS CACHE ==========
const DOM = {
    // Navigation
    navbar: document.getElementById('navbar'),
    hamburger: document.getElementById('hamburger'),
    navMenu: document.getElementById('nav-menu'),
    navLinks: document.querySelectorAll('[data-scroll]'),
    navAdminBtn: document.getElementById('nav-admin-btn'),
    navVoteBtn: document.getElementById('nav-vote-btn'),
    
    // Hero section
    typingText: document.getElementById('typing-text'),
    heroVoteBtn: document.getElementById('hero-vote-btn'),
    heroAdminBtn: document.getElementById('hero-admin-btn'),
    
    // Modals
    loginModal: document.getElementById('login-modal'),
    loginForm: document.getElementById('login-form'),
    loginCloseBtn: document.getElementById('login-close-btn'),
    loginError: document.getElementById('login-error'),
    
    candidateModal: document.getElementById('candidate-modal'),
    candidateForm: document.getElementById('candidate-form'),
    candidateCloseBtn: document.getElementById('candidate-close-btn'),
    candidateCancelBtn: document.getElementById('candidate-cancel-btn'),
    
    confirmationModal: document.getElementById('confirmation-modal'),
    
    // Admin dashboard
    adminDashboard: document.getElementById('admin-dashboard'),
    adminTabs: document.querySelectorAll('[data-tab]'),
    adminNavButtons: document.querySelectorAll('.admin-nav-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Dashboard stats
    totalCandidates: document.getElementById('total-candidates'),
    totalVoters: document.getElementById('total-voters'),
    totalVotes: document.getElementById('total-votes'),
    participationRate: document.getElementById('participation-rate'),
    votesList: document.getElementById('votes-list'),
    
    // Candidates management
    candidatesList: document.getElementById('candidates-list'),
    addCandidateBtn: document.getElementById('add-candidate-btn'),
    
    // Voters list
    votersList: document.getElementById('voters-list'),
    
    // Results
    resultsSection: document.getElementById('results-section'),
    exportResultsBtn: document.getElementById('export-results-btn'),
    resetElectionBtn: document.getElementById('reset-election-btn'),
    
    // Voter section
    voterSection: document.getElementById('voter-section'),
    candidatesContainer: document.getElementById('candidates-container'),
    voterBadge: document.getElementById('voter-badge'),
    voterLogoutBtn: document.getElementById('voter-logout-btn'),
    
    // FAQ
    faqQuestions: document.querySelectorAll('.faq-question'),
    
    // Other
    toastContainer: document.getElementById('toast-container')
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing VoteLive Frontend...');
    initializeSocketConnection();
    initializeApp();
    setupEventListeners();
    startTypingAnimation();
    checkAdminSession();
});

// ========== SOCKET.IO INITIALIZATION ==========
function initializeSocketConnection() {
    console.log('🔌 Connecting to Socket.io...');
    
    try {
        // Dynamically load Socket.io client
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
        script.onload = () => {
            if (typeof io !== 'undefined') {
                APP_STATE.socket = io(BACKEND_CONFIG.SOCKET_URL, {
                    reconnection: true,
                    reconnectionDelay: BACKEND_CONFIG.RECONNECT_INTERVAL,
                    reconnectionAttempts: 5
                });
                
                setupSocketListeners();
                console.log('✅ Socket.io connected');
            }
        };
        document.head.appendChild(script);
    } catch (error) {
        console.error('❌ Socket.io connection failed:', error);
        showToast('Real-time updates unavailable', 'warning');
    }
}

function setupSocketListeners() {
    if (!APP_STATE.socket) return;
    
    APP_STATE.socket.on('connect', () => {
        console.log('✅ Socket connected');
        APP_STATE.socketConnected = true;
        showToast('Connected to server ✓', 'success');
    });
    
    APP_STATE.socket.on('disconnect', () => {
        console.log('⚠️ Socket disconnected');
        APP_STATE.socketConnected = false;
    });
    
    // Admin events
    APP_STATE.socket.on('election:live', (election) => {
        console.log('🗳️ Election started:', election);
        APP_STATE.currentElection = election;
        showToast(`Election started: ${election.title}`, 'info');
    });
    
    // Vote events
    APP_STATE.socket.on('vote:recorded', (voteData) => {
        console.log('🗳️ Vote recorded');
        const candidate = APP_STATE.candidates.find(c => c.id === voteData.candidateId);
        if (candidate) {
            candidate.voteCount = voteData.voteCount;
        }
        updateAllStats();
    });
    
    // Candidate events
    APP_STATE.socket.on('candidate:added', (candidate) => {
        const idx = APP_STATE.candidates.findIndex(c => c.id === candidate.id);
        if (idx < 0) {
            APP_STATE.candidates.push(candidate);
            renderCandidatesList();
            renderVoterCandidates();
        }
    });
}

// ========== API HELPER FUNCTIONS ==========
async function apiCall(endpoint, options = {}) {
    const url = `${BACKEND_CONFIG.API_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (APP_STATE.apiToken) {
        headers['Authorization'] = `Bearer ${APP_STATE.apiToken}`;
    }
    
    try {
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error(`❌ API Error: ${endpoint}`, error);
        showToast(`Error: ${error.message}`, 'error');
        throw error;
    }
}

function initializeApp() {
    checkAdminSession();
}

// ========== ADMIN AUTHENTICATION ==========
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        showToast('Username and password required', 'error');
        return;
    }
    
    try {
        showToast('Authenticating...', 'info');
        const response = await apiCall('/admin/login', {
            method: 'POST',
            body: { username, password }
        });
        
        if (response.success) {
            APP_STATE.adminAuthenticated = true;
            APP_STATE.apiToken = response.token;
            APP_STATE.adminId = response.admin.id;
            APP_STATE.sessionId = generateSessionId();
            
            sessionStorage.setItem('adminSessionId', APP_STATE.sessionId);
            sessionStorage.setItem('adminToken', response.token);
            
            APP_STATE.loginLock = false;
            closeLoginModal();
            showAdminDashboard();
            
            await loadElections();
            updateAllStats();
            
            showToast('✅ Admin login successful!', 'success');
        }
    } catch (error) {
        const errorMsg = DOM.loginError;
        errorMsg.textContent = '❌ Invalid credentials';
        errorMsg.classList.remove('hidden');
        
        DOM.loginForm.style.animation = 'none';
        setTimeout(() => {
            DOM.loginForm.style.animation = 'shake 0.5s';
        }, 10);
    }
}

function checkAdminSession() {
    const sessionId = sessionStorage.getItem('adminSessionId');
    const token = sessionStorage.getItem('adminToken');
    
    if (sessionId && token) {
        APP_STATE.adminAuthenticated = true;
        APP_STATE.apiToken = token;
        APP_STATE.sessionId = sessionId;
    }
}

function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ========== ELECTIONS MANAGEMENT ==========
async function loadElections() {
    try {
        const response = await apiCall('/admin/elections');
        if (response.success) {
            const activeElection = response.elections.find(e => e.status === 'active');
            if (activeElection) {
                APP_STATE.currentElectionId = activeElection.id;
                APP_STATE.currentElection = activeElection;
                await loadElectionCandidates(activeElection.id);
                await loadVoters();
            }
        }
    } catch (error) {
        console.error('Failed to load elections:', error);
    }
}

async function loadElectionCandidates(electionId) {
    try {
        const response = await apiCall(`/admin/elections/${electionId}/candidates`);
        if (response.success) {
            APP_STATE.candidates = response.candidates.map(c => ({
                ...c,
                voteCount: c.voteCount || 0,
                votes: c.voteCount || 0
            }));
            renderCandidatesList();
            renderVoterCandidates();
        }
    } catch (error) {
        console.error('Failed to load candidates:', error);
    }
}

// ========== EVENT LISTENERS SETUP ==========
function setupEventListeners() {
    // Navigation hamburger
    if (DOM.hamburger) DOM.hamburger.addEventListener('click', toggleMobileMenu);

    // Admin buttons
    if (DOM.navAdminBtn) DOM.navAdminBtn.addEventListener('click', openAdminPage);
    if (DOM.heroAdminBtn) DOM.heroAdminBtn.addEventListener('click', openAdminPage);

    // Vote buttons
    if (DOM.navVoteBtn) DOM.navVoteBtn.addEventListener('click', openVoterPage);
    if (DOM.heroVoteBtn) DOM.heroVoteBtn.addEventListener('click', openVoterPage);

    // Modal controls
    if (DOM.loginCloseBtn) DOM.loginCloseBtn.addEventListener('click', closeLoginModal);
    if (DOM.loginForm) DOM.loginForm.addEventListener('submit', handleAdminLogin);

    // Admin dashboard listeners
    if (DOM.logoutBtn) DOM.logoutBtn.addEventListener('click', handleAdminLogout);
    if (DOM.adminNavButtons) {
        DOM.adminNavButtons.forEach(btn => {
            btn.addEventListener('click', (e) => switchAdminTab(e.target.closest('.admin-nav-btn')));
        });
    }
    
    // Candidates management
    if (DOM.addCandidateBtn) DOM.addCandidateBtn.addEventListener('click', openCandidateModal);
    if (DOM.candidateForm) DOM.candidateForm.addEventListener('submit', handleAddCandidate);
    if (DOM.candidateCloseBtn) DOM.candidateCloseBtn.addEventListener('click', closeCandidateModal);
    if (DOM.candidateCancelBtn) DOM.candidateCancelBtn.addEventListener('click', closeCandidateModal);
    
    // Results export and reset
    if (DOM.exportResultsBtn) DOM.exportResultsBtn.addEventListener('click', exportResults);
    if (DOM.resetElectionBtn) {
        DOM.resetElectionBtn.addEventListener('click', resetElection);
    }

    // Election controls
    const startBtn = document.getElementById('start-election-btn');
    const pauseBtn = document.getElementById('pause-election-btn');
    const closeBtn = document.getElementById('close-election-btn');
    if (startBtn) startBtn.addEventListener('click', startElection);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseElection);
    if (closeBtn) closeBtn.addEventListener('click', closeElection);
    
    // Voter logout
    if (DOM.voterLogoutBtn) {
        DOM.voterLogoutBtn.addEventListener('click', () => {
            hideVoterSection();
            showToast('Logged out', 'success');
        });
    }
    
    // FAQ accordions
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.closest('.faq-item');
            if (!faqItem) return;
            const answer = faqItem.querySelector('.faq-answer');
            const isActive = faqItem.classList.toggle('active');
            if (answer) answer.style.display = isActive ? 'block' : 'none';
        });
    });
    
    // Modal close on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (modal.id === 'login-modal' && APP_STATE.loginLock) return;
                modal.classList.remove('active');
            }
        });
    });
}

// ========== TYPING ANIMATION ==========
function startTypingAnimation() {
    const text = 'Reinventing the Future of Elections';
    const element = DOM.typingText;
    let index = 0;
    element.textContent = '';
    
    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, 50);
        }
    }
    
    type();
}

// ========== NAVIGATION MOBILE MENU ==========
function toggleMobileMenu() {
    DOM.hamburger.classList.toggle('active');
    DOM.navMenu.classList.toggle('active');
}

function scrollToVoterSection() {
    hideAdminDashboard();
    showVoterSection();
    document.getElementById('voter-section').scrollIntoView({ behavior: 'smooth' });
}

// Open admin page in new tab/window (separate dashboard)
function openAdminPage() {
    // Only allow opening admin page if admin is authenticated
    const sessionId = sessionStorage.getItem('adminSessionId');
    if (APP_STATE.adminAuthenticated || sessionId) {
        // Show in-page admin dashboard
        showAdminDashboard();
        return;
    }

    // Not authenticated: show login modal and require login
    APP_STATE.wantAdminRedirect = false;
    APP_STATE.loginLock = true;
    openLoginModal();
}

// Open voter page in new tab/window
function openVoterPage() {
    // Open in-page voter dashboard
    showVoterSection();
    document.getElementById('voter-section').scrollIntoView({ behavior: 'smooth' });
}

// ========== ADMIN AUTHENTICATION ==========
function openLoginModal() {
    DOM.loginModal.classList.add('active');
    DOM.loginError.classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    // if login is locked (forced by admin redirect intent), hide close control
    if (APP_STATE.loginLock && DOM.loginCloseBtn) DOM.loginCloseBtn.style.display = 'none';
}

function closeLoginModal() {
    // Prevent closing when login is locked (must authenticate)
    if (APP_STATE.loginLock) return;
    DOM.loginModal.classList.remove('active');
    DOM.loginError.classList.add('hidden');
    if (DOM.loginCloseBtn) DOM.loginCloseBtn.style.display = '';
}

function handleAdminLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    // Validate credentials
    if (username === APP_STATE.adminUsername && password === APP_STATE.adminPassword) {
        // Set authenticated state
        APP_STATE.adminAuthenticated = true;
        APP_STATE.sessionId = generateSessionId();
        
        // Store session
        sessionStorage.setItem('adminSessionId', APP_STATE.sessionId);
        
        // Show dashboard
        // clear any login lock and close modal
        APP_STATE.loginLock = false;
        closeLoginModal();
        showAdminDashboard();
        showToast('Login successful! Welcome Admin', 'success');
        updateAllStats();
        // login successful — admin dashboard shown above
    } else {
        // Show error with animation
        const errorMsg = DOM.loginError;
        errorMsg.textContent = '❌ Invalid credentials. Your access is denied.';
        errorMsg.classList.remove('hidden');
        
        // Shake animation
        DOM.loginForm.style.animation = 'none';
        setTimeout(() => {
            DOM.loginForm.style.animation = 'shake 0.5s';
        }, 10);
    }
}

function handleAdminLogout() {
    showConfirmation('Logout', 'Are you sure you want to logout?', () => {
        APP_STATE.adminAuthenticated = false;
        APP_STATE.sessionId = null;
        sessionStorage.removeItem('adminSessionId');
        hideAdminDashboard();
        document.getElementById('hero').scrollIntoView({ behavior: 'smooth' });
        showToast('Logged out successfully', 'success');
    });
}

function checkAdminSession() {
    const sessionId = sessionStorage.getItem('adminSessionId');
    if (!sessionId) {
        APP_STATE.adminAuthenticated = false;
        hideAdminDashboard();
    }
}

function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ========== ADMIN DASHBOARD VIEWS ==========
function showAdminDashboard() {
    if (DOM.adminDashboard) DOM.adminDashboard.style.display = 'grid';
    if (DOM.voterSection) {
        DOM.voterSection.style.display = 'none';
        hideVoterSection();
    }
}

function hideAdminDashboard() {
    if (DOM.adminDashboard) DOM.adminDashboard.style.display = 'none';
}

function switchAdminTab(button) {
    const tab = button.getAttribute('data-tab');
    
    // Update active button
    DOM.adminNavButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Update active tab
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"].admin-tab`).classList.add('active');
    
    APP_STATE.currentTab = tab;
    
    // Refresh data based on tab
    if (tab === 'dashboard') {
        updateAllStats();
    } else if (tab === 'candidates') {
        renderCandidatesList();
    } else if (tab === 'voters') {
        renderVotersList();
    } else if (tab === 'results') {
        renderResults();
    }
}

// ========== CANDIDATE MANAGEMENT ==========
async function handleAddCandidate(e) {
    e.preventDefault();
    
    const name = document.getElementById('candidate-name').value.trim();
    const party = document.getElementById('candidate-party').value.trim();
    const symbol = document.getElementById('candidate-symbol').value.trim();
    const image = document.getElementById('candidate-image').value.trim();
    const bio = document.getElementById('candidate-bio').value.trim();
    
    if (!name || !party || !symbol) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    if (symbol.length > 2) {
        showToast('Symbol must be 1-2 characters', 'warning');
        return;
    }
    
    try {
        showToast('Adding candidate...', 'info');
        
        const response = await apiCall(`/admin/elections/${APP_STATE.currentElectionId}/candidates`, {
            method: 'POST',
            body: { name, party, symbol, image, bio }
        });
        
        if (response.success) {
            APP_STATE.candidates.push(response.candidate);
            
            closeCandidateModal();
            renderCandidatesList();
            renderVoterCandidates();
            updateAllStats();
            showToast('✅ Candidate added successfully', 'success');
        }
    } catch (error) {
        console.error('Failed to add candidate:', error);
    }
}

async function deleteCandidate(candidateId) {
    showConfirmation('Delete Candidate', 'Are you sure?', async () => {
        try {
            await apiCall(`/admin/candidates/${candidateId}`, { method: 'DELETE' });
            APP_STATE.candidates = APP_STATE.candidates.filter(c => c.id !== candidateId);
            renderCandidatesList();
            renderVoterCandidates();
            showToast('Candidate deleted', 'success');
        } catch (error) {
            console.error('Failed to delete candidate:', error);
        }
    });
}

function renderCandidatesList() {
    if (APP_STATE.candidates.length === 0) {
        DOM.candidatesList.innerHTML = `
            <div style="text-align: center; padding: 3rem 2rem; color: #666; grid-column: 1/-1;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                <p style="font-size: 1.125rem; font-weight: 600; color: #1f2937;">No candidates yet</p>
                <p style="color: #6b7280; margin-bottom: 0;">Add your first candidate to get started with the election!</p>
            </div>
        `;
        return;
    }
    
    DOM.candidatesList.innerHTML = APP_STATE.candidates.map((candidate, index) => `
        <div class="candidate-card">
            <div class="candidate-image">
                ${candidate.image ? `<img src="${escapeHtml(candidate.image)}" alt="${escapeHtml(candidate.name)}">` : `<div style="font-size: 4rem; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${candidate.symbol}</div>`}
            </div>
            <div class="candidate-info">
                <div class="candidate-name">${escapeHtml(candidate.name)}</div>
                <div class="candidate-party">
                    <span style="font-size: 1.5rem;">${candidate.symbol}</span>
                    <span>${escapeHtml(candidate.party)}</span>
                </div>
                <div class="candidate-votes">${candidate.votes}</div>
                ${candidate.bio ? `<div style="font-size: 0.875rem; color: #6b7280; margin-bottom: var(--spacing-md);">${escapeHtml(candidate.bio)}</div>` : ''}
                <div class="candidate-actions">
                    <button class="btn-edit" onclick="editCandidate('${candidate.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-delete" onclick="deleteCandidate('${candidate.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ========== VOTER MANAGEMENT ==========
function renderVotersList() {
    if (APP_STATE.voters.length === 0) {
        DOM.votersList.innerHTML = `
            <div style="text-align: center; padding: 3rem 2rem; color: #666;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
                <p style="font-size: 1.125rem; font-weight: 600; color: #1f2937;">No voters yet</p>
                <p style="color: #6b7280; margin-bottom: 0;">Voters will appear here after they cast their votes</p>
            </div>
        `;
        return;
    }
    
    DOM.votersList.innerHTML = `
        <table class="voters-table">
            <thead>
                <tr>
                    <th><i class="fas fa-id-card"></i> Voter ID</th>
                    <th><i class="fas fa-user"></i> Name</th>
                    <th><i class="fas fa-envelope"></i> Email</th>
                    <th><i class="fas fa-check"></i> Status</th>
                    <th><i class="fas fa-clock"></i> Timestamp</th>
                    <th><i class="fas fa-tools"></i> Actions</th>
                </tr>
            </thead>
            <tbody>
                ${APP_STATE.voters.map(voter => `
                    <tr>
                        <td><strong>${escapeHtml(voter.id.substring(0, 15))}...</strong></td>
                        <td>${escapeHtml(voter.name)}</td>
                        <td>${escapeHtml(voter.email)}</td>
                        <td>
                            <span style="display: inline-block; padding: 0.5rem 1rem; background: ${voter.voted ? '#d1fae5' : '#fecaca'}; color: ${voter.voted ? '#065f46' : '#7f1d1d'}; border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem;">
                                ${voter.voted ? '✅ Voted' : '❌ Not Voted'}
                            </span>
                        </td>
                        <td style="font-size: 0.875rem; color: #6b7280;">${new Date(voter.timestamp).toLocaleDateString()} ${new Date(voter.timestamp).toLocaleTimeString()}</td>
                        <td>
                            ${voter.voted ? `<button class="btn btn-sm btn-danger" onclick="removeVoterVotes('${voter.id}')">Remove Votes</button>` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Fetch voters for current election
async function loadVoters() {
    if (!APP_STATE.currentElectionId) return;
    try {
        const response = await apiCall(`/admin/elections/${APP_STATE.currentElectionId}/voters`);
        if (response.success) {
            APP_STATE.voters = response.voters || [];
            renderVotersList();
        }
    } catch (error) {
        console.error('Failed to load voters:', error);
    }
}

// Admin: remove votes cast by a voter (mark invalid/remove)
async function removeVoterVotes(voterId) {
    if (!APP_STATE.currentElectionId) return;
    showConfirmation('Remove Votes', 'Remove all votes cast by this voter? This action cannot be undone.', async () => {
        try {
            const response = await apiCall(`/admin/elections/${APP_STATE.currentElectionId}/voters/${voterId}`, { method: 'DELETE' });
            if (response.success) {
                showToast('Votes removed for voter', 'success');
                await loadElectionCandidates(APP_STATE.currentElectionId);
                await loadVoters();
                updateAllStats();
            }
        } catch (error) {
            console.error('Failed to remove votes:', error);
            showToast('Failed to remove votes', 'error');
        }
    });
}

// ========== VOTING LOGIC ==========
async function castVote(candidateId) {
    if (APP_STATE.hasVoted) {
        showToast('You have already voted', 'warning');
        return;
    }
    
    const candidate = APP_STATE.candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    
    // Get or register voter
    let voterId = localStorage.getItem('votelive_voter_id');
    
    if (!voterId) {
        try {
            const voterName = prompt('Enter your name:') || 'Anonymous';
            const voterEmail = prompt('Enter your email:') || `voter_${Date.now()}@votelive.local`;
            
            if (!voterName) {
                showToast('Registration cancelled', 'info');
                return;
            }
            
            const response = await apiCall('/voter/register', {
                method: 'POST',
                body: {
                    name: voterName,
                    email: voterEmail
                }
            });
            
            if (response.success) {
                voterId = response.voter.id;
                localStorage.setItem('votelive_voter_id', voterId);
                APP_STATE.currentVoterId = voterId;
                DOM.voterBadge.textContent = `👤 ${voterId.substring(0, 20)}...`;
            }
        } catch (error) {
            showToast('Voter registration failed', 'error');
            return;
        }
    }
    
    // Cast vote
    showConfirmation(
        'Confirm Vote',
        `Vote for <strong>${escapeHtml(candidate.name)}</strong>?`,
        async () => {
            try {
                showToast('Casting vote...', 'info');
                
                const response = await apiCall('/voter/vote', {
                    method: 'POST',
                    body: {
                        voterId,
                        electionId: APP_STATE.currentElectionId,
                        candidateId
                    }
                });
                
                if (response.success) {
                    APP_STATE.hasVoted = true;
                    renderVoterCandidates();
                    showToast(`✅ Vote cast!\nConfirmation: ${response.vote.confirmationCode}`, 'success');
                }
            } catch (error) {
                console.error('Failed to cast vote:', error);
            }
        }
    );
}

// ========== ELECTION CONTROL ==========
async function startElection() {
    if (!APP_STATE.currentElectionId) {
        showToast('No active election', 'error');
        return;
    }
    
    try {
        const response = await apiCall(`/admin/elections/${APP_STATE.currentElectionId}/start`, {
            method: 'POST'
        });
        
        if (response.success) {
            APP_STATE.currentElection = response.election;
            showToast('🗳️ Election started!', 'success');
            updateAllStats();
        }
    } catch (error) {
        console.error('Failed to start election:', error);
    }
}

async function pauseElection() {
    if (!APP_STATE.currentElectionId) return;
    
    try {
        const response = await apiCall(`/admin/elections/${APP_STATE.currentElectionId}/pause`, {
            method: 'POST'
        });
        
        if (response.success) {
            showToast('⏸️ Election paused', 'warning');
        }
    } catch (error) {
        console.error('Failed to pause election:', error);
    }
}

async function closeElection() {
    if (!APP_STATE.currentElectionId) return;
    
    try {
        const response = await apiCall(`/admin/elections/${APP_STATE.currentElectionId}/close`, {
            method: 'POST'
        });
        
        if (response.success) {
            showToast('🔒 Election closed', 'info');
            await new Promise(r => setTimeout(r, 1000));
            renderResults();
        }
    } catch (error) {
        console.error('Failed to close election:', error);
    }
}

async function resetElection() {
    if (!APP_STATE.currentElectionId) return;
    
    showConfirmation('Reset Election', 'Delete all votes?', async () => {
        try {
            await apiCall(`/admin/elections/${APP_STATE.currentElectionId}/reset`, {
                method: 'POST'
            });
            
            APP_STATE.candidates = [];
            APP_STATE.votes = [];
            APP_STATE.hasVoted = false;
            localStorage.removeItem('votelive_voter_id');
            
            updateAllStats();
            showToast('♻️ Election reset', 'success');
        } catch (error) {
            console.error('Failed to reset election:', error);
        }
    });
}

async function exportResults() {
    if (!APP_STATE.currentElectionId) return;
    
    try {
        showToast('Exporting...', 'info');
        
        const response = await apiCall(`/admin/elections/${APP_STATE.currentElectionId}/export`, {
            method: 'POST'
        });
        
        if (response.success) {
            const dataStr = JSON.stringify(response.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `votelive_results_${Date.now()}.json`;
            link.click();
            URL.revokeObjectURL(url);
            
            showToast('✅ Exported', 'success');
        }
    } catch (error) {
        console.error('Failed to export results:', error);
    }
}

// ========== DASHBOARD RENDERING ==========
async function updateAllStats() {
    if (!APP_STATE.currentElectionId) return;
    
    try {
        const [resultsResp, statsResp] = await Promise.all([
            apiCall(`/admin/elections/${APP_STATE.currentElectionId}/results`),
            apiCall(`/admin/elections/${APP_STATE.currentElectionId}/stats`)
        ]);
        
        if (resultsResp.success && statsResp.success) {
            const stats = statsResp.stats;
            DOM.totalCandidates.textContent = stats.totalCandidates;
            DOM.totalVoters.textContent = stats.totalVoters;
            DOM.totalVotes.textContent = stats.totalVotesCast;
            DOM.participationRate.textContent = `${stats.participationRate}%`;
            
            renderVotesChart(resultsResp.results);
        }
    } catch (error) {
        console.error('Failed to update stats:', error);
    }
}

function renderVotesChart(results) {
    if (!results || results.length === 0) {
        DOM.votesList.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No votes yet</p>';
        return;
    }
    
    const sorted = [...results].sort((a, b) => b.voteCount - a.voteCount);
    DOM.votesList.innerHTML = sorted.map((candidate, index) => {
        const maxVotes = Math.max(...results.map(c => c.voteCount), 1);
        const percentage = (candidate.voteCount / maxVotes) * 100;
        const colors = ['#0f766e', '#14b8a6', '#06b6d4', '#f59e0b', '#ef4444'];
        const color = colors[index % colors.length];
        
        return `
            <div class="vote-item">
                <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                    <div style="font-weight: 800; color: ${color}; font-size: 1.5rem; width: 40px;">${index + 1}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; color: #1f2937;">${escapeHtml(candidate.name)} ${candidate.symbol}</div>
                        <div style="font-size: 0.875rem; color: #6b7280;">${escapeHtml(candidate.party)}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 150px; height: 20px; background: #e5e7eb; border-radius: 10px; overflow: hidden;">
                        <div style="width: ${percentage}%; height: 100%; background: ${color}; transition: width 0.3s;"></div>
                    </div>
                    <span style="color: ${color}; font-weight: bold; min-width: 40px;">${candidate.voteCount}</span>
                </div>
            </div>
        `;
    }).join('');
}

async function renderResults() {
    if (!APP_STATE.currentElectionId) return;
    
    try {
        const response = await apiCall(`/admin/elections/${APP_STATE.currentElectionId}/results`);
        
        if (response.success) {
            const results = response.results;
            const colors = ['#0f766e', '#14b8a6', '#06b6d4', '#f59e0b', '#ef4444'];
            
            DOM.resultsSection.innerHTML = results.map((candidate, index) => {
                const color = colors[index % colors.length];
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                
                return `
                    <div style="margin-bottom: 2rem; padding: 1.5rem; background: linear-gradient(135deg, ${color}08, ${color}05); border-left: 5px solid ${color}; border-radius: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div style="width: 60px; height: 60px; background: ${color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: white;">
                                    ${candidate.symbol}
                                </div>
                                <div>
                                    <div style="font-weight: 800; font-size: 1.25rem;">${medal} ${escapeHtml(candidate.name)}</div>
                                    <div style="color: #6b7280;">${escapeHtml(candidate.party)}</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 2.5rem; font-weight: 900; color: ${color};">${candidate.percentage}%</div>
                                <div style="color: #6b7280;">${candidate.voteCount} votes</div>
                            </div>
                        </div>
                        <div style="width: 100%; height: 30px; background: #e5e7eb; border-radius: 15px; overflow: hidden;">
                            <div style="width: ${candidate.percentage}%; height: 100%; background: ${color}; transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Failed to render results:', error);
    }
}

function renderCandidatesList() {
    if (APP_STATE.candidates.length === 0) {
        DOM.candidatesList.innerHTML = `
            <div style="text-align: center; padding: 3rem 2rem; color: #666; grid-column: 1/-1;">
                <p style="font-size: 3rem; margin-bottom: 1rem;">📋</p>
                <p style="font-weight: 600;">No candidates yet</p>
            </div>
        `;
        return;
    }
    
    DOM.candidatesList.innerHTML = APP_STATE.candidates.map((candidate) => `
        <div class="candidate-card">
            <div class="candidate-image">
                ${candidate.image ? `<img src="${escapeHtml(candidate.image)}" alt="${escapeHtml(candidate.name)}">` : `<div style="font-size: 4rem; display: flex; align-items: center; justify-content: center;">${candidate.symbol}</div>`}
            </div>
            <div class="candidate-info">
                <div class="candidate-name">${escapeHtml(candidate.name)}</div>
                <div class="candidate-party">${escapeHtml(candidate.party)}</div>
                <div style="font-weight: bold; color: #0f766e; font-size: 1.25rem; margin: 0.5rem 0;">${candidate.voteCount || 0} votes</div>
                <div class="candidate-actions">
                    <button class="btn-delete" onclick="deleteCandidate('${candidate.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderVoterCandidates() {
    if (APP_STATE.candidates.length === 0) {
        DOM.candidatesContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #666; grid-column: 1/-1;">
                <p style="font-size: 3rem; margin-bottom: 1rem;">🗳️</p>
                <p style="font-weight: 600;">No candidates available</p>
            </div>
        `;
        return;
    }
    
    DOM.candidatesContainer.innerHTML = APP_STATE.candidates.map((candidate) => `
        <div class="candidate-voting-card">
            <div class="candidate-image">
                ${candidate.image ? `<img src="${escapeHtml(candidate.image)}" alt="${escapeHtml(candidate.name)}">` : ''}
                <div class="candidate-symbol">${candidate.symbol}</div>
            </div>
            <div class="candidate-voting-info">
                <div class="candidate-name">${escapeHtml(candidate.name)}</div>
                <div class="candidate-party-voting">
                    <i class="fas fa-ring"></i> ${escapeHtml(candidate.party)}
                </div>
                ${candidate.bio ? `<div class="candidate-bio">"${escapeHtml(candidate.bio)}"</div>` : ''}
                <button class="vote-button" ${APP_STATE.hasVoted ? 'disabled' : ''} onclick="castVote('${candidate.id}')">
                    ${APP_STATE.hasVoted ? '✅ Already Voted' : '🗳️ Cast Vote'}
                </button>
            </div>
        </div>
    `).join('');
}

function renderVotersList() {
    DOM.votersList.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">Voter list loading...</p>';
}

// ========== MODALS & CONFIRMATIONS ==========
function showConfirmation(title, message, onConfirm) {
    const modal = DOM.confirmationModal;
    document.getElementById('confirmation-title').textContent = title;
    document.getElementById('confirmation-message').innerHTML = message;
    
    const confirmBtn = modal.querySelector('.modal-confirm-btn');
    const cancelBtn = modal.querySelector('.modal-cancel-btn');
    
    // Remove old listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    newConfirmBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        onConfirm();
    });
    
    newCancelBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    modal.classList.add('active');
}

// ========== TOAST NOTIFICATIONS ==========
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };
    
    toast.innerHTML = `${icons[type]} ${message}`;
    DOM.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== UTILITY FUNCTIONS ==========
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ========== SMOOTH SCROLL BEHAVIOR ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        if (this.getAttribute('href') === '#') return;
        
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ========== NAVBAR SCROLL EFFECT ==========
window.addEventListener('scroll', () => {
    const navbar = DOM.navbar;
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
        navbar.style.boxShadow = '0 10px 30px rgba(15, 118, 110, 0.15)';
    } else {
        navbar.classList.remove('scrolled');
        navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    }
});

// ========== INTERSECTION OBSERVER FOR ANIMATIONS ==========
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements for animation on scroll
document.querySelectorAll('.feature-card, .step-card, .team-card, .faq-item').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
});

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', (e) => {
    // Escape key closes modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
    
    // Ctrl/Cmd + K opens login
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!APP_STATE.adminAuthenticated) {
            openLoginModal();
        }
    }
});

// ========== CSS ANIMATION SHAKES ==========
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);

console.log('VoteLive Application Initialized Successfully ✓');
// Feedback carousel removed
