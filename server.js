/**
 * Serveur principal du Portfolio YouTube
 * Point d'entrée de l'application
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');

// Importer les routes
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

// Créer l'application Express
const app = express();

// ============================================
// MIDDLEWARES
// ============================================

// Activer CORS pour toutes les origines (à restreindre en production)
app.use(cors());

// Parser le JSON dans les requêtes
app.use(express.json());

// Parser les données URL-encoded
app.use(express.urlencoded({ extended: true }));

// ============================================
// FICHIERS STATIQUES
// ============================================

// Servir les fichiers statiques du frontend public
app.use(express.static(path.join(__dirname, 'public')));

// Servir les fichiers statiques du panel admin sous /portal
app.use('/portal', express.static(path.join(__dirname, 'admin')));

// ============================================
// ROUTES API
// ============================================

// Routes API publiques
app.use('/api', apiRoutes);

// Routes API admin
app.use('/api/admin', adminRoutes);

// ============================================
// ROUTES DE PAGES
// ============================================

// Page d'accueil - servir index.html du frontend public
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Panel admin - servir index.html du panel admin
app.get('/portal', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// ============================================
// GESTION DES ERREURS
// ============================================

// Route 404 pour les API
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint non trouvé.'
    });
});

// Route 404 générale - rediriger vers la page d'accueil
app.use((req, res) => {
    res.redirect('/');
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur.'
    });
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

// Démarrer le serveur uniquement si ce fichier est exécuté directement
// (pas quand il est importé par Vercel ou d'autres modules)
if (require.main === module) {
    app.listen(config.port, () => {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║                                                            ║');
        console.log('║          PORTFOLIO YOUTUBE - SERVEUR DÉMARRÉ               ║');
        console.log('║                                                            ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log(`║  Port: ${config.port}                                               ║`);
        console.log(`║  URL locale: http://localhost:${config.port}                        ║`);
        console.log(`║  Panel admin: http://localhost:${config.port}/portal                ║`);
        console.log('║                                                            ║');
        console.log('║  Credentials par défaut:                                   ║');
        console.log('║    - Utilisateur: admin                                    ║');
        console.log('║    - Mot de passe: admin123                                ║');
        console.log('║                                                            ║');
        console.log('║  Secret Konami Code: haut haut bas bas gauche droite       ║');
        console.log('║                      gauche droite B A                     ║');
        console.log('║                                                            ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('');
    });
}

// Exporter l'app pour Vercel et autres environnements serverless
module.exports = app;
