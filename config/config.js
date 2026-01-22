/**
 * Configuration de l'application
 * Charge les variables d'environnement et définit les valeurs par défaut
 */

// Charger les variables d'environnement depuis .env
require('dotenv').config();

module.exports = {
    // Port du serveur (par défaut: 3000)
    port: process.env.PORT || 3000,

    // Secret pour signer les tokens JWT
    // IMPORTANT: En production, utilisez une chaîne longue et aléatoire
    jwtSecret: process.env.JWT_SECRET || 'secret_jwt_par_defaut_a_changer_absolument',

    // Durée de validité du token JWT (en heures)
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

    // Configuration Supabase
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,

    // Chemins des fichiers de données (pour fallback/migration)
    dataPath: {
        videos: './data/videos.json',
        admin: './data/admin.json'
    }
};
