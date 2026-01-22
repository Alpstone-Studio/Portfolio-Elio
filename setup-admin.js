/**
 * Script pour créer le premier compte administrateur
 * Usage: node setup-admin.js
 */

const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Charger la configuration
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Erreur: SUPABASE_URL et SUPABASE_ANON_KEY doivent être définis dans .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    console.log('\n🔧 Configuration du compte administrateur\n');

    // Vérifier si un admin existe déjà
    const { data: existingAdmins, error: checkError } = await supabase
        .from('admins')
        .select('username')
        .eq('username', 'admin')
        .limit(1);

    if (checkError) {
        console.error('❌ Erreur lors de la vérification:', checkError.message);
        process.exit(1);
    }

    if (existingAdmins && existingAdmins.length > 0) {
        console.log('✅ Le compte "admin" existe déjà dans la base de données.');
        console.log('\nSi vous avez oublié le mot de passe, vous devez le réinitialiser manuellement dans Supabase.\n');
        rl.close();
        return;
    }

    console.log('📝 Aucun compte admin trouvé. Création d\'un nouveau compte...\n');

    // Demander le mot de passe
    const password = await question('Mot de passe pour le compte "admin" (min 6 caractères): ');

    if (password.length < 6) {
        console.error('❌ Le mot de passe doit contenir au moins 6 caractères.');
        rl.close();
        process.exit(1);
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Créer l'admin
    const { data: newAdmin, error: insertError } = await supabase
        .from('admins')
        .insert([{
            username: 'admin',
            password_hash: passwordHash
        }])
        .select('username')
        .single();

    if (insertError) {
        console.error('❌ Erreur lors de la création:', insertError.message);
        rl.close();
        process.exit(1);
    }

    console.log('\n✅ Compte administrateur créé avec succès!');
    console.log('   Username: admin');
    console.log('   Mot de passe: (celui que vous venez de saisir)\n');
    console.log('Vous pouvez maintenant vous connecter au portail admin.\n');

    rl.close();
}

main().catch(err => {
    console.error('❌ Erreur:', err);
    rl.close();
    process.exit(1);
});
