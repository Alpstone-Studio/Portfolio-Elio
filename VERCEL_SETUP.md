# Configuration Vercel pour le Portfolio YouTube

## Problème : Erreur serveur lors de la connexion au portail admin

Si vous obtenez une erreur serveur lors de la connexion au portail admin (`/portal`), c'est probablement parce que les **variables d'environnement ne sont pas configurées sur Vercel**.

## Solution : Configurer les variables d'environnement

### Étape 1 : Accéder aux paramètres du projet Vercel

1. Connectez-vous à [Vercel](https://vercel.com)
2. Sélectionnez votre projet (Elio)
3. Cliquez sur **"Settings"** (Paramètres)
4. Dans le menu de gauche, cliquez sur **"Environment Variables"**

### Étape 2 : Ajouter les variables d'environnement requises

Ajoutez les variables suivantes :

#### 1. JWT_SECRET (OBLIGATOIRE)
- **Nom** : `JWT_SECRET`
- **Valeur** : Générez une chaîne aléatoire sécurisée (au moins 32 caractères)
  - Exemple : `3f8d9a7b2c4e6f1a5d8c9b7e4f2a1d3c5e8b9f7a4d2c6e1f8b3a5c7d9e2f4a6`
  - Vous pouvez générer une clé sécurisée avec Node.js :
    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```
- **Environnements** : Cochez **Production**, **Preview**, et **Development**

#### 2. JWT_EXPIRES_IN (Optionnel)
- **Nom** : `JWT_EXPIRES_IN`
- **Valeur** : `24` (durée en heures)
- **Environnements** : Cochez **Production**, **Preview**, et **Development**

### Étape 3 : Redéployer l'application

Une fois les variables ajoutées :

1. Retournez sur l'onglet **"Deployments"**
2. Cliquez sur les trois points `...` du dernier déploiement
3. Sélectionnez **"Redeploy"**
4. Confirmez le redéploiement

**Important** : Les variables d'environnement ne sont appliquées qu'aux **nouveaux déploiements**. Un redéploiement est nécessaire pour les activer.

### Étape 4 : Tester la connexion

1. Accédez à votre application : `https://votre-app.vercel.app/portal`
2. Essayez de vous connecter avec :
   - **Username** : `admin`
   - **Password** : `admin123`

Si tout fonctionne, vous devriez être redirigé vers le tableau de bord admin.

## Sécurité : Changer le mot de passe par défaut

### ⚠️ IMPORTANT : Pour la production

Le mot de passe par défaut est `admin123`. Vous devez **absolument le changer** avant de mettre en production.

### Comment changer le mot de passe

1. Générez un nouveau hash bcrypt pour votre mot de passe :
   ```bash
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('VotreNouveauMotDePasse', 10, (err, hash) => { console.log('Hash:', hash); });"
   ```

2. Ouvrez le fichier `routes/admin.js` et modifiez la constante `ADMIN_PASSWORD_HASH` (ligne ~17) :
   ```javascript
   const ADMIN_PASSWORD_HASH = 'COLLER_VOTRE_NOUVEAU_HASH_ICI';
   ```

3. Si vous voulez aussi changer le username, modifiez la constante `ADMIN_USERNAME` :
   ```javascript
   const ADMIN_USERNAME = 'votre_nouveau_username';
   ```

4. Commitez et poussez le changement :
   ```bash
   git add routes/admin.js
   git commit -m "chore: update admin credentials"
   git push
   ```

Vercel redéploiera automatiquement avec le nouveau mot de passe.

## Architecture technique

### Variables d'environnement utilisées

| Variable | Description | Valeur par défaut | Requis |
|----------|-------------|-------------------|---------|
| `JWT_SECRET` | Secret pour signer les tokens JWT | `secret_jwt_par_defaut_a_changer_absolument` | ⚠️ OUI |
| `JWT_EXPIRES_IN` | Durée de validité du token (heures) | `24` | Non |
| `PORT` | Port du serveur (géré par Vercel) | `3000` | Non |

### Fichiers de configuration

- **`vercel.json`** : Configuration Vercel pour Node.js/Express
- **`.env`** : Variables d'environnement locales (non commité dans Git)
- **`.env.example`** : Exemple de variables d'environnement

### Credentials admin

Les credentials sont **hardcodés directement dans le code** (`routes/admin.js`) pour simplifier le déploiement :
- **Username** : `admin`
- **Password** : `admin123` (hash bcrypt stocké dans le code)
- Le hash peut être changé en modifiant la constante `ADMIN_PASSWORD_HASH`

### Flux d'authentification

1. L'utilisateur soumet le formulaire de connexion (`/portal`)
2. Le frontend envoie une requête `POST /api/admin/login` avec username/password
3. Le backend lit `data/admin.json`
4. Vérifie le username et compare le password avec bcrypt
5. Si correct, génère un token JWT signé avec `JWT_SECRET`
6. Retourne le token au client
7. Le client stocke le token dans `localStorage`
8. Toutes les requêtes suivantes incluent le token dans l'en-tête `Authorization: Bearer <token>`

## Dépannage

### Erreur : "Erreur serveur lors de la connexion"

**Cause** : `JWT_SECRET` n'est pas défini dans les variables d'environnement

**Solution** :
1. Vérifiez que `JWT_SECRET` est bien défini dans les variables d'environnement Vercel
2. Redéployez l'application (important : les variables ne s'appliquent qu'aux nouveaux déploiements)
3. Vérifiez les logs Vercel pour plus de détails

### Erreur : "Identifiants incorrects"

**Cause** : Username ou password incorrect

**Solution** :
- Vérifiez que vous utilisez les bons identifiants (par défaut : `admin` / `admin123`)
- Si vous avez changé les credentials, vérifiez les constantes dans `routes/admin.js`

### Erreur 401 après connexion réussie

**Cause** : Token invalide ou expiré

**Solution** :
1. Videz le `localStorage` du navigateur
2. Reconnectez-vous
3. Vérifiez que `JWT_SECRET` est identique entre les déploiements

## Commandes utiles

### Développement local

```bash
# Installer les dépendances
npm install

# Lancer le serveur en local
npm start

# Tester la connexion
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Déploiement Vercel

```bash
# Installer Vercel CLI (optionnel)
npm i -g vercel

# Déployer manuellement
vercel --prod

# Voir les logs
vercel logs
```

## Support

Si le problème persiste après avoir suivi ce guide :

1. Vérifiez les logs Vercel : **Dashboard > Deployments > [Dernier déploiement] > Runtime Logs**
2. Vérifiez que `vercel.json` est bien présent dans le dépôt
3. Vérifiez que `data/admin.json` est bien commité dans Git

---

**Note** : Ce guide suppose que vous utilisez le plan gratuit de Vercel. Les étapes peuvent légèrement varier selon votre plan.
