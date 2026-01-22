/**
 * Configuration du client Supabase
 * Gère la connexion à la base de données
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../config/config');

// Vérifier que les variables d'environnement sont définies
if (!config.supabaseUrl || !config.supabaseAnonKey) {
    console.error('⚠️  ERREUR: Variables Supabase manquantes!');
    console.error('Assurez-vous de définir SUPABASE_URL et SUPABASE_ANON_KEY dans .env');
}

// Créer le client Supabase
const supabase = createClient(
    config.supabaseUrl || '',
    config.supabaseAnonKey || ''
);

module.exports = supabase;
