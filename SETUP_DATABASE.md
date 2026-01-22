# Configuration de la base de données Supabase

## 1. Créer les tables

Exécutez ce SQL dans l'éditeur SQL de Supabase :

```sql
-- Table des administrateurs
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table des vidéos
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    "order" INTEGER NOT NULL,
    visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_videos_order ON videos("order");
CREATE INDEX IF NOT EXISTS idx_videos_visible ON videos(visible);
```

## 2. Créer le compte administrateur

### Option A: Avec le script Node.js (recommandé)

```bash
node setup-admin.js
```

Le script vous demandera de saisir un mot de passe et créera automatiquement le compte "admin".

### Option B: Manuellement dans Supabase

1. **Générer un hash du mot de passe**

Utilisez ce script Node.js pour générer le hash :

```javascript
const bcrypt = require('bcryptjs');
const password = 'VotreMotDePasse'; // Remplacez par votre mot de passe
bcrypt.hash(password, 10).then(hash => console.log(hash));
```

2. **Insérer dans la base de données**

Exécutez ce SQL en remplaçant `VOTRE_HASH_ICI` par le hash généré :

```sql
INSERT INTO admins (username, password_hash)
VALUES ('admin', 'VOTRE_HASH_ICI');
```

## 3. Vérifier que le compte existe

```sql
SELECT username, created_at FROM admins;
```

Vous devriez voir une ligne avec le username "admin".

## 4. Configurer les variables d'environnement

Assurez-vous que votre fichier `.env` et Vercel contiennent :

```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-clé-anon
JWT_SECRET=votre-secret-jwt
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=production
```

## Dépannage

### Le compte admin ne peut pas créer d'utilisateurs

1. Vérifiez que le username dans la base est exactement "admin" (en minuscules) :
   ```sql
   SELECT username FROM admins WHERE username = 'admin';
   ```

2. Si le username est différent, mettez-le à jour :
   ```sql
   UPDATE admins SET username = 'admin' WHERE id = 'VOTRE_ID';
   ```

3. Déconnectez-vous et reconnectez-vous pour obtenir un nouveau token JWT avec les bonnes informations.

### Réinitialiser le mot de passe d'un compte

```sql
-- Remplacez 'NOUVEAU_HASH' par le hash de votre nouveau mot de passe
UPDATE admins
SET password_hash = 'NOUVEAU_HASH', updated_at = now()
WHERE username = 'admin';
```
