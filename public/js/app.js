/**
 * Application frontend du Portfolio YouTube
 * Gestion de l'affichage des videos et du Konami Code
 */

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = '/api';

// ============================================
// ELEMENTS DOM
// ============================================

const loadingEl = document.getElementById('loading');
const emptyStateEl = document.getElementById('empty-state');
const videosGridEl = document.getElementById('videos-grid');

// ============================================
// KONAMI CODE
// ============================================

// Sequence du Konami Code: haut haut bas bas gauche droite gauche droite B A
// Utilise un tableau d'options pour supporter plusieurs layouts de clavier
const KONAMI_CODE = [
    ['ArrowUp'],           // Haut
    ['ArrowUp'],           // Haut
    ['ArrowDown'],         // Bas
    ['ArrowDown'],         // Bas
    ['ArrowLeft'],         // Gauche
    ['ArrowRight'],        // Droite
    ['ArrowLeft'],         // Gauche
    ['ArrowRight'],        // Droite
    ['b', 'B'],            // B (minuscule ou majuscule)
    ['a', 'A']             // A (minuscule ou majuscule)
];

let konamiIndex = 0;
let konamiTimeout = null;

/**
 * Verifier si une touche correspond a l'etape actuelle du Konami Code
 */
function isKonamiKeyMatch(event, expectedKeys) {
    // Pour les fleches, utiliser event.key (plus universel que event.code)
    if (expectedKeys.includes(event.key)) {
        return true;
    }

    // Fallback sur event.code pour les fleches (anciens navigateurs)
    if (expectedKeys.includes(event.code)) {
        return true;
    }

    return false;
}

/**
 * Gestion des touches pour le Konami Code
 * Support ameliore pour tous les OS, navigateurs et layouts de clavier
 */
document.addEventListener('keydown', (event) => {
    // Ignorer si l'utilisateur est dans un champ de saisie
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    // Verifier si la touche correspond a la sequence
    if (isKonamiKeyMatch(event, KONAMI_CODE[konamiIndex])) {
        konamiIndex++;

        // Reset le timeout - l'utilisateur a 3 secondes entre chaque touche
        clearTimeout(konamiTimeout);
        konamiTimeout = setTimeout(() => {
            konamiIndex = 0;
        }, 3000);

        // Si la sequence complete est entree
        if (konamiIndex === KONAMI_CODE.length) {
            clearTimeout(konamiTimeout);
            activateKonamiCode();
            konamiIndex = 0;
        }
    } else {
        // Reset si mauvaise touche
        konamiIndex = 0;
        clearTimeout(konamiTimeout);
    }
});

/**
 * Activation du Konami Code - redirection vers le panel admin
 */
function activateKonamiCode() {
    // Ajouter une animation visuelle
    document.body.classList.add('konami-active');

    // Rediriger vers le portal admin apres un court delai
    setTimeout(() => {
        window.location.href = '/portal';
    }, 500);
}

// ============================================
// CHARGEMENT DES VIDEOS
// ============================================

/**
 * Recuperer les videos depuis l'API
 */
async function fetchVideos() {
    try {
        const response = await fetch(`${API_BASE_URL}/videos`);
        const data = await response.json();

        if (data.success) {
            return data.videos;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des videos:', error);
        throw error;
    }
}

/**
 * Creer le HTML d'une carte video
 */
function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';

    // URL d'embed YouTube avec parametres de securite
    const embedUrl = `https://www.youtube.com/embed/${video.youtubeId}?rel=0&modestbranding=1`;

    card.innerHTML = `
        <div class="video-wrapper">
            <iframe
                src="${embedUrl}"
                title="${escapeHtml(video.title)}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                loading="lazy">
            </iframe>
        </div>
        <div class="video-info">
            <h3 class="video-title">${escapeHtml(video.title)}</h3>
            ${video.description ? `<p class="video-description">${escapeHtml(video.description)}</p>` : ''}
        </div>
    `;

    return card;
}

/**
 * Echapper les caracteres HTML pour prevenir les XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Afficher les videos dans la grille
 */
function displayVideos(videos) {
    // Masquer le loading
    loadingEl.classList.add('hidden');

    // Si aucune video, afficher l'etat vide
    if (!videos || videos.length === 0) {
        emptyStateEl.classList.remove('hidden');
        return;
    }

    // Creer les cartes video
    videos.forEach(video => {
        const card = createVideoCard(video);
        videosGridEl.appendChild(card);
    });

    // Afficher la grille
    videosGridEl.classList.remove('hidden');
}

/**
 * Afficher une erreur
 */
function displayError(message) {
    loadingEl.classList.add('hidden');
    emptyStateEl.classList.remove('hidden');
    emptyStateEl.querySelector('h2').textContent = 'Erreur de chargement';
    emptyStateEl.querySelector('p').textContent = message;
}

// ============================================
// INITIALISATION
// ============================================

/**
 * Initialisation de l'application
 */
async function init() {
    try {
        const videos = await fetchVideos();
        displayVideos(videos);
    } catch (error) {
        displayError('Impossible de charger les videos. Veuillez reessayer plus tard.');
    }
}

// Lancer l'initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', init);
