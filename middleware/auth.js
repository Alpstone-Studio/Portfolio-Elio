/**
 * Middleware d'authentification JWT
 * Vérifie la validité du token JWT pour protéger les routes admin
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Middleware pour vérifier l'authentification
 * Extrait et valide le token JWT du header Authorization
 *
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {Function} next - Fonction suivante dans la chaîne
 */
const authMiddleware = (req, res, next) => {
    // Récupérer le header Authorization
    const authHeader = req.headers.authorization;

    // Vérifier que le header existe et commence par 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Accès non autorisé. Token manquant.'
        });
    }

    // Extraire le token (enlever 'Bearer ')
    const token = authHeader.substring(7);

    try {
        // Vérifier et décoder le token
        const decoded = jwt.verify(token, config.jwtSecret);

        // Ajouter les informations de l'utilisateur à la requête
        req.user = decoded;

        // Passer à la suite
        next();
    } catch (error) {
        // Token invalide ou expiré
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Session expirée. Veuillez vous reconnecter.'
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Token invalide.'
        });
    }
};

module.exports = authMiddleware;
