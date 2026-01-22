/**
 * Application du panel admin
 * Gestion de l'authentification et du CRUD des videos
 */

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = '/api';
const TOKEN_KEY = 'portfolio_admin_token';

// ============================================
// ELEMENTS DOM
// ============================================

// Pages
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');

// Formulaire de connexion
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

// Dashboard
const logoutBtn = document.getElementById('logout-btn');
const addVideoForm = document.getElementById('add-video-form');
const videoUrlInput = document.getElementById('video-url');
const videoTitleInput = document.getElementById('video-title');
const videoDescriptionInput = document.getElementById('video-description');
const addVideoError = document.getElementById('add-video-error');
const videosLoading = document.getElementById('videos-loading');
const videosEmpty = document.getElementById('videos-empty');
const videosList = document.getElementById('videos-list');
const videoCount = document.getElementById('video-count');

// Modal d'edition
const editModal = document.getElementById('edit-modal');
const editVideoForm = document.getElementById('edit-video-form');
const editVideoId = document.getElementById('edit-video-id');
const editYoutubeId = document.getElementById('edit-youtube-id');
const editTitle = document.getElementById('edit-title');
const editDescription = document.getElementById('edit-description');
const editVideoError = document.getElementById('edit-video-error');

// Modal de suppression
const deleteModal = document.getElementById('delete-modal');
const deleteVideoId = document.getElementById('delete-video-id');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

// Toast
const toastContainer = document.getElementById('toast-container');

// ============================================
// GESTION DU TOKEN
// ============================================

/**
 * Sauvegarder le token dans localStorage
 */
function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Recuperer le token depuis localStorage
 */
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Supprimer le token
 */
function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('admin_user');
}

/**
 * Sauvegarder les infos utilisateur
 */
function saveUser(user) {
    localStorage.setItem('admin_user', JSON.stringify(user));
}

/**
 * Recuperer les infos utilisateur
 */
function getUser() {
    const userStr = localStorage.getItem('admin_user');
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * Verifier si l'utilisateur est connecte
 */
function isAuthenticated() {
    return !!getToken();
}

// ============================================
// REQUETES API
// ============================================

/**
 * Faire une requete API avec le token
 */
async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    // Si le token est invalide, deconnecter l'utilisateur
    if (response.status === 401 && token) {
        removeToken();
        showLoginPage();
        showToast('Session expiree. Veuillez vous reconnecter.', 'error');
        throw new Error('Session expiree');
    }

    if (!response.ok) {
        throw new Error(data.message || 'Erreur serveur');
    }

    return data;
}

// ============================================
// NAVIGATION
// ============================================

/**
 * Afficher la page de connexion
 */
function showLoginPage() {
    loginPage.classList.remove('hidden');
    dashboardPage.classList.add('hidden');
    loginForm.reset();
    loginError.classList.add('hidden');
}

/**
 * Afficher le dashboard
 */
function showDashboard() {
    loginPage.classList.add('hidden');
    dashboardPage.classList.remove('hidden');

    // Vérifier les permissions utilisateur
    const user = getUser();
    if (user && user.username !== 'admin') {
        // Masquer le bouton de création d'utilisateur si pas admin
        const createUserBtn = document.getElementById('show-create-user-btn');
        if (createUserBtn) {
            createUserBtn.style.display = 'none';
        }
    }

    loadVideos();
    loadUsers(); // Charger les utilisateurs
}

// ============================================
// AUTHENTIFICATION
// ============================================

/**
 * Gestion de la connexion
 */
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showError(loginError, 'Veuillez remplir tous les champs.');
        return;
    }

    try {
        const data = await apiRequest('/admin/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        saveToken(data.token);
        saveUser(data.user); // Sauvegarder les infos utilisateur
        showToast('Connexion reussie!', 'success');
        showDashboard();
    } catch (error) {
        showError(loginError, error.message);
    }
});

/**
 * Gestion de la deconnexion
 */
logoutBtn.addEventListener('click', () => {
    removeToken();
    showToast('Deconnexion reussie.', 'info');
    showLoginPage();
});

// ============================================
// GESTION DES VIDEOS
// ============================================

/**
 * Charger la liste des videos
 */
async function loadVideos() {
    videosLoading.classList.remove('hidden');
    videosEmpty.classList.add('hidden');
    videosList.classList.add('hidden');

    try {
        const data = await apiRequest('/admin/videos');
        displayVideos(data.videos);
    } catch (error) {
        showToast('Erreur lors du chargement des videos.', 'error');
        videosLoading.classList.add('hidden');
    }
}

/**
 * Afficher les videos dans la liste
 */
function displayVideos(videos) {
    videosLoading.classList.add('hidden');

    // Mettre a jour le compteur
    videoCount.textContent = `${videos.length} video${videos.length > 1 ? 's' : ''}`;

    if (videos.length === 0) {
        videosEmpty.classList.remove('hidden');
        return;
    }

    // Creer les elements de la liste
    videosList.innerHTML = '';
    const totalVideos = videos.length;
    videos.forEach((video, index) => {
        const item = createVideoItem(video, index, totalVideos);
        videosList.appendChild(item);
    });

    videosList.classList.remove('hidden');

    // Initialiser le drag & drop
    initDragAndDrop();
}

/**
 * Creer un element video
 */
function createVideoItem(video, index, totalVideos) {
    const item = document.createElement('div');
    item.className = 'video-item';
    item.dataset.id = video.id;
    item.dataset.order = video.order; // Stocker l'ordre de la BD
    item.draggable = true;

    // URL de la miniature YouTube
    const thumbnailUrl = `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`;

    item.innerHTML = `
        <div class="drag-handle" title="Glisser pour reorganiser">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
            </svg>
        </div>

        <div class="video-thumbnail">
            <img src="${thumbnailUrl}" alt="${escapeHtml(video.title)}" loading="lazy">
            <span class="video-order-badge" style="position: absolute; top: 5px; left: 5px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">#${video.order}</span>
        </div>

        <div class="video-details">
            <h3>${escapeHtml(video.title)}</h3>
            <p>${video.description ? escapeHtml(video.description) : 'Aucune description'}</p>
        </div>

        <div class="video-status">
            <div class="toggle-wrapper">
                <span class="status-badge ${video.visible ? 'visible' : 'hidden'}">
                    ${video.visible ? 'Visible' : 'Masque'}
                </span>
                <div class="toggle ${video.visible ? 'active' : ''}"
                     data-toggle-visibility="${video.id}"
                     title="Cliquer pour ${video.visible ? 'masquer' : 'afficher'}">
                </div>
            </div>
        </div>

        <div class="video-actions">
            <button class="btn btn-secondary btn-icon btn-move-up" data-video-id="${video.id}" title="Monter" ${index === 0 ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
            </button>
            <button class="btn btn-secondary btn-icon btn-move-down" data-video-id="${video.id}" title="Descendre" ${index === totalVideos - 1 ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>
            <button class="btn btn-secondary btn-icon" data-edit="${video.id}" title="Modifier">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
            <button class="btn btn-danger btn-icon" data-delete="${video.id}" title="Supprimer">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
        </div>
    `;

    return item;
}

/**
 * Ajouter une video
 */
addVideoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = videoUrlInput.value.trim();
    const title = videoTitleInput.value.trim();
    const description = videoDescriptionInput.value.trim();

    // Extraire l'ID YouTube de l'URL
    const youtubeId = extractYoutubeId(url);

    if (!youtubeId) {
        showError(addVideoError, 'URL YouTube invalide. Formats acceptes: youtube.com/watch?v=ID ou youtu.be/ID');
        return;
    }

    if (!title) {
        showError(addVideoError, 'Le titre est requis.');
        return;
    }

    try {
        await apiRequest('/admin/videos', {
            method: 'POST',
            body: JSON.stringify({ youtubeId, title, description })
        });

        showToast('Video ajoutee avec succes!', 'success');
        addVideoForm.reset();
        addVideoError.classList.add('hidden');
        loadVideos();
    } catch (error) {
        showError(addVideoError, error.message);
    }
});

/**
 * Extraire l'ID YouTube d'une URL
 */
function extractYoutubeId(url) {
    if (!url) return null;

    // Format: youtube.com/watch?v=ID
    let match = url.match(/[?&]v=([^&]+)/);
    if (match) return match[1];

    // Format: youtu.be/ID
    match = url.match(/youtu\.be\/([^?&]+)/);
    if (match) return match[1];

    // Format: youtube.com/embed/ID
    match = url.match(/youtube\.com\/embed\/([^?&]+)/);
    if (match) return match[1];

    // Si c'est deja juste un ID (11 caracteres)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
        return url;
    }

    return null;
}

// ============================================
// TOGGLE VISIBILITE
// ============================================

videosList.addEventListener('click', async (e) => {
    const toggle = e.target.closest('[data-toggle-visibility]');
    if (!toggle) return;

    const videoId = toggle.dataset.toggleVisibility;
    const isActive = toggle.classList.contains('active');

    try {
        await apiRequest(`/admin/videos/${videoId}`, {
            method: 'PUT',
            body: JSON.stringify({ visible: !isActive })
        });

        showToast(`Video ${isActive ? 'masquee' : 'visible'}.`, 'success');
        loadVideos();
    } catch (error) {
        showToast('Erreur lors de la modification.', 'error');
    }
});

// ============================================
// EDITION DE VIDEO
// ============================================

// Variable pour stocker les donnees de la video en cours d'edition
let currentEditVideo = null;

videosList.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit]');
    if (!editBtn) return;

    const videoId = editBtn.dataset.edit;

    try {
        const data = await apiRequest('/admin/videos');
        const video = data.videos.find(v => v.id === videoId);

        if (video) {
            currentEditVideo = video;
            editVideoId.value = video.id;
            editYoutubeId.value = video.youtubeId;
            editTitle.value = video.title;
            editDescription.value = video.description || '';
            editVideoError.classList.add('hidden');
            openModal(editModal);
        }
    } catch (error) {
        showToast('Erreur lors du chargement de la video.', 'error');
    }
});

editVideoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const videoId = editVideoId.value;
    const youtubeId = editYoutubeId.value.trim();
    const title = editTitle.value.trim();
    const description = editDescription.value.trim();

    if (!youtubeId || !title) {
        showError(editVideoError, 'L\'ID YouTube et le titre sont requis.');
        return;
    }

    try {
        await apiRequest(`/admin/videos/${videoId}`, {
            method: 'PUT',
            body: JSON.stringify({ youtubeId, title, description })
        });

        showToast('Video modifiee avec succes!', 'success');
        closeModal(editModal);
        loadVideos();
    } catch (error) {
        showError(editVideoError, error.message);
    }
});

// ============================================
// SUPPRESSION DE VIDEO
// ============================================

videosList.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('[data-delete]');
    if (!deleteBtn) return;

    const videoId = deleteBtn.dataset.delete;
    deleteVideoId.value = videoId;
    openModal(deleteModal);
});

confirmDeleteBtn.addEventListener('click', async () => {
    const videoId = deleteVideoId.value;

    try {
        await apiRequest(`/admin/videos/${videoId}`, {
            method: 'DELETE'
        });

        showToast('Video supprimee avec succes!', 'success');
        closeModal(deleteModal);
        loadVideos();
    } catch (error) {
        showToast('Erreur lors de la suppression.', 'error');
    }
});

// ============================================
// DRAG & DROP POUR REORGANISER
// ============================================

let draggedItem = null;

function initDragAndDrop() {
    const items = videosList.querySelectorAll('.video-item');

    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.video-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    if (this !== draggedItem) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    if (this === draggedItem) return;

    // Reorganiser les elements visuellement
    const allItems = [...videosList.querySelectorAll('.video-item')];
    const draggedIndex = allItems.indexOf(draggedItem);
    const targetIndex = allItems.indexOf(this);

    if (draggedIndex < targetIndex) {
        this.parentNode.insertBefore(draggedItem, this.nextSibling);
    } else {
        this.parentNode.insertBefore(draggedItem, this);
    }

    // Sauvegarder le nouvel ordre
    await saveNewOrder();
}

async function saveNewOrder() {
    const items = videosList.querySelectorAll('.video-item');
    const videoIds = Array.from(items).map(item => item.dataset.id);

    console.log('Sauvegarde du nouvel ordre:', videoIds);

    if (videoIds.length === 0) {
        console.error('Aucune vidéo à réorganiser');
        return;
    }

    try {
        const result = await apiRequest('/admin/videos/reorder', {
            method: 'PUT',
            body: JSON.stringify({ videoIds })
        });

        console.log('Réorganisation réussie:', result);
        showToast('Ordre mis a jour!', 'success');

        // Recharger pour afficher les nouveaux ordres
        await loadVideos();
    } catch (error) {
        console.error('Erreur lors de la reorganisation:', error);
        showToast('Erreur lors de la reorganisation.', 'error');
        loadVideos(); // Recharger pour revenir a l'etat precedent
    }
}

// ============================================
// BOUTONS MONTER/DESCENDRE
// ============================================

videosList.addEventListener('click', async (e) => {
    // Chercher le bouton cliqué (peut être le SVG ou un élément enfant)
    const moveUpBtn = e.target.closest('.btn-move-up');
    const moveDownBtn = e.target.closest('.btn-move-down');

    if (moveUpBtn && !moveUpBtn.disabled) {
        const videoId = moveUpBtn.dataset.videoId;
        console.log('Bouton Monter cliqué pour video:', videoId);
        await moveVideo(videoId, 'up');
    } else if (moveDownBtn && !moveDownBtn.disabled) {
        const videoId = moveDownBtn.dataset.videoId;
        console.log('Bouton Descendre cliqué pour video:', videoId);
        await moveVideo(videoId, 'down');
    }
});

async function moveVideo(videoId, direction) {
    const items = Array.from(videosList.querySelectorAll('.video-item'));
    const currentIndex = items.findIndex(item => item.dataset.id === videoId);

    console.log(`Déplacement de la vidéo ${videoId} vers ${direction}, index actuel: ${currentIndex}`);

    if (currentIndex === -1) {
        console.error('Vidéo non trouvée:', videoId);
        return;
    }

    const currentItem = items[currentIndex];
    let targetIndex;

    if (direction === 'up') {
        if (currentIndex === 0) {
            console.log('Déjà en haut');
            return;
        }
        targetIndex = currentIndex - 1;
    } else {
        if (currentIndex === items.length - 1) {
            console.log('Déjà en bas');
            return;
        }
        targetIndex = currentIndex + 1;
    }

    const targetItem = items[targetIndex];

    console.log(`Échange avec l'index ${targetIndex}`);

    // Déplacer visuellement
    if (direction === 'up') {
        videosList.insertBefore(currentItem, targetItem);
    } else {
        videosList.insertBefore(currentItem, targetItem.nextSibling);
    }

    // Sauvegarder le nouvel ordre
    await saveNewOrder();
}


// ============================================
// MODALS
// ============================================

function openModal(modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// Fermer les modals avec le bouton de fermeture ou le backdrop
document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        if (modal) closeModal(modal);
    });
});

document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', () => {
        const modal = backdrop.closest('.modal');
        if (modal) closeModal(modal);
    });
});

// Fermer avec Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
            closeModal(modal);
        });
    }
});

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Supprimer apres 3 secondes
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// ============================================
// UTILITIES
// ============================================

function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// INITIALISATION
// ============================================

function init() {
    // Verifier si l'utilisateur est deja connecte
    if (isAuthenticated()) {
        showDashboard();
    } else {
        showLoginPage();
    }
}


// ============================================
// GESTION DES UTILISATEURS ET MDP
// ============================================

// Elements du DOM
const changePasswordForm = document.getElementById('change-password-form');
const changePasswordError = document.getElementById('change-password-error');
const showCreateUserBtn = document.getElementById('show-create-user-btn');
const createUserFormContainer = document.getElementById('create-user-form-container');
const createUserForm = document.getElementById('create-user-form');
const cancelCreateUserBtn = document.getElementById('cancel-create-user-btn');
const createUserError = document.getElementById('create-user-error');
const usersList = document.getElementById('users-list');
const usersLoading = document.getElementById('users-loading');
const deleteUserModal = document.getElementById('delete-user-modal');
const confirmDeleteUserBtn = document.getElementById('confirm-delete-user-btn');

/**
 * Changer le mot de passe
 */
changePasswordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    changePasswordError.classList.add('hidden');

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Verifier que les mots de passe correspondent
    if (newPassword !== confirmPassword) {
        showError(changePasswordError, 'Les mots de passe ne correspondent pas.');
        return;
    }

    try {
        await apiRequest('/admin/change-password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });

        showToast('Mot de passe changé avec succès !', 'success');
        changePasswordForm.reset();
    } catch (error) {
        showError(changePasswordError, error.message);
    }
});

/**
 * Afficher/masquer le formulaire de création d'utilisateur
 */
showCreateUserBtn?.addEventListener('click', () => {
    createUserFormContainer.classList.remove('hidden');
    showCreateUserBtn.classList.add('hidden');
});

cancelCreateUserBtn?.addEventListener('click', () => {
    createUserFormContainer.classList.add('hidden');
    showCreateUserBtn.classList.remove('hidden');
    createUserForm.reset();
    createUserError.classList.add('hidden');
});

/**
 * Créer un nouvel utilisateur
 */
createUserForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    createUserError.classList.add('hidden');

    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-user-password').value;

    console.log('Tentative de création d\'utilisateur...');
    console.log('Utilisateur connecté:', getUser());
    console.log('Token présent:', !!getToken());

    try {
        const data = await apiRequest('/admin/users', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        showToast(`Utilisateur "${username}" créé avec succès !`, 'success');
        createUserForm.reset();
        createUserFormContainer.classList.add('hidden');
        showCreateUserBtn.classList.remove('hidden');

        // Recharger la liste des utilisateurs
        await loadUsers();
    } catch (error) {
        showError(createUserError, error.message);
    }
});

/**
 * Charger la liste des utilisateurs
 */
async function loadUsers() {
    usersLoading?.classList.remove('hidden');
    usersList.innerHTML = '';

    try {
        const data = await apiRequest('/admin/users');

        if (data.users && data.users.length > 0) {
            data.users.forEach(user => {
                const userItem = createUserItem(user);
                usersList.appendChild(userItem);
            });
        } else {
            usersList.innerHTML = '<p class="text-muted">Aucun utilisateur.</p>';
        }
    } catch (error) {
        showToast('Erreur lors du chargement des utilisateurs.', 'error');
        console.error(error);
    } finally {
        usersLoading?.classList.add('hidden');
    }
}

/**
 * Créer un élément utilisateur dans la liste
 */
function createUserItem(user) {
    const div = document.createElement('div');
    div.className = 'user-item';
    div.dataset.userId = user.id;

    const createdDate = new Date(user.createdAt).toLocaleDateString('fr-FR');
    const currentUser = getUser();
    const isOwnAccount = currentUser && currentUser.id === user.id;

    div.innerHTML = `
        <div class="user-info">
            <div class="user-username">${escapeHtml(user.username)}${isOwnAccount ? ' <span class="badge-self">(Vous)</span>' : ''}</div>
            <div class="user-meta">Créé le ${createdDate}</div>
        </div>
        <div class="user-actions">
            ${isOwnAccount ? `
                <button class="btn btn-danger btn-delete-user" data-user-id="${user.id}" data-username="${escapeHtml(user.username)}">
                    Supprimer mon compte
                </button>
            ` : ''}
        </div>
    `;

    // Gestion de la suppression (seulement si c'est son propre compte)
    if (isOwnAccount) {
        const deleteBtn = div.querySelector('.btn-delete-user');
        deleteBtn.addEventListener('click', () => {
            openDeleteUserModal(user.id, user.username);
        });
    }

    return div;
}

/**
 * Ouvrir le modal de suppression d'utilisateur
 */
function openDeleteUserModal(userId, username) {
    document.getElementById('delete-user-id').value = userId;
    document.getElementById('delete-user-name').textContent = `Utilisateur : ${username}`;
    deleteUserModal.classList.remove('hidden');
}

/**
 * Confirmer la suppression d'un utilisateur
 */
confirmDeleteUserBtn?.addEventListener('click', async () => {
    const userId = document.getElementById('delete-user-id').value;

    try {
        await apiRequest(`/admin/users/${userId}`, {
            method: 'DELETE'
        });

        showToast('Utilisateur supprimé avec succès.', 'success');
        closeModal(deleteUserModal);

        // Recharger la liste
        await loadUsers();
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// Lancer l'initialisation
document.addEventListener('DOMContentLoaded', init);
