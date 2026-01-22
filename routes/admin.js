/**
 * Routes API admin
 * Endpoints protégés pour la gestion du portfolio
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const authMiddleware = require('../middleware/auth');
const supabase = require('../db/supabase');

/**
 * POST /api/admin/login
 * Authentification admin - retourne un token JWT
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Vérifier que les champs sont fournis
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nom d\'utilisateur et mot de passe requis.'
            });
        }

        console.log('Tentative de connexion pour:', username);

        // Récupérer l'admin depuis Supabase
        const { data: admins, error } = await supabase
            .from('admins')
            .select('*')
            .eq('username', username)
            .limit(1);

        if (error) {
            console.error('Erreur Supabase (login):', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur lors de la connexion.'
            });
        }

        // Vérifier si l'utilisateur existe
        if (!admins || admins.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Identifiants incorrects.'
            });
        }

        const admin = admins[0];

        // Vérifier le mot de passe avec bcrypt
        const passwordMatch = await bcrypt.compare(password, admin.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Identifiants incorrects.'
            });
        }

        // Générer le token JWT avec l'ID et le username
        const token = jwt.sign(
            {
                id: admin.id,
                username: admin.username
            },
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );

        console.log('Connexion réussie pour:', username);

        res.json({
            success: true,
            message: 'Connexion réussie.',
            token: token,
            user: {
                id: admin.id,
                username: admin.username
            }
        });
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la connexion.'
        });
    }
});

/**
 * GET /api/admin/profile
 * Récupérer les informations du profil admin connecté
 * Route protégée par JWT
 */
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Récupérer les infos de l'admin
        const { data: admin, error } = await supabase
            .from('admins')
            .select('id, username, created_at, updated_at')
            .eq('id', userId)
            .single();

        if (error || !admin) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé.'
            });
        }

        res.json({
            success: true,
            user: {
                id: admin.id,
                username: admin.username,
                createdAt: admin.created_at,
                updatedAt: admin.updated_at
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération du profil.'
        });
    }
});

/**
 * GET /api/admin/users
 * Liste tous les comptes admin
 * Route protégée par JWT
 */
router.get('/users', authMiddleware, async (req, res) => {
    try {
        const { data: admins, error } = await supabase
            .from('admins')
            .select('id, username, created_at, updated_at')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erreur Supabase (list users):', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des utilisateurs.'
            });
        }

        res.json({
            success: true,
            users: admins.map(admin => ({
                id: admin.id,
                username: admin.username,
                createdAt: admin.created_at,
                updatedAt: admin.updated_at
            }))
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des utilisateurs.'
        });
    }
});

/**
 * POST /api/admin/users
 * Créer un nouveau compte admin (réservé au compte "admin" uniquement)
 * Route protégée par JWT
 */
router.post('/users', authMiddleware, async (req, res) => {
    try {
        console.log('Tentative de création d\'utilisateur par:', req.user);
        console.log('req.user.username:', req.user.username);
        console.log('Type de req.user.username:', typeof req.user.username);
        console.log('Comparaison avec "admin":', req.user.username === 'admin');

        // Vérifier que l'utilisateur connecté est bien "admin"
        if (req.user.username !== 'admin') {
            console.log('Accès refusé: utilisateur non admin');
            return res.status(403).json({
                success: false,
                message: 'Seul le compte admin peut créer de nouveaux utilisateurs.'
            });
        }

        console.log('Accès autorisé: utilisateur admin confirmé');

        const { username, password } = req.body;

        // Vérifier que les champs sont fournis
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nom d\'utilisateur et mot de passe requis.'
            });
        }

        // Vérifier la longueur du mot de passe
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Le mot de passe doit contenir au moins 6 caractères.'
            });
        }

        // Vérifier que le username n'existe pas déjà
        const { data: existingUsers, error: checkError } = await supabase
            .from('admins')
            .select('id')
            .eq('username', username)
            .limit(1);

        if (checkError) {
            console.error('Erreur Supabase (check user):', checkError);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la vérification du nom d\'utilisateur.'
            });
        }

        if (existingUsers && existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ce nom d\'utilisateur existe déjà.'
            });
        }

        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(password, 10);

        // Créer le nouvel admin
        const { data: newAdmin, error: insertError } = await supabase
            .from('admins')
            .insert([{
                username: username,
                password_hash: passwordHash
            }])
            .select('id, username, created_at, updated_at')
            .single();

        if (insertError) {
            console.error('Erreur Supabase (create user):', insertError);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la création de l\'utilisateur.'
            });
        }

        console.log('Nouvel admin créé:', username, 'par', req.user.username);

        res.status(201).json({
            success: true,
            message: 'Utilisateur créé avec succès.',
            user: {
                id: newAdmin.id,
                username: newAdmin.username,
                createdAt: newAdmin.created_at,
                updatedAt: newAdmin.updated_at
            }
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la création de l\'utilisateur.'
        });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Supprimer son propre compte admin
 * Route protégée par JWT
 */
router.delete('/users/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user.id;

        // Vérifier que l'utilisateur supprime bien son propre compte
        if (id !== currentUserId) {
            return res.status(403).json({
                success: false,
                message: 'Vous ne pouvez supprimer que votre propre compte.'
            });
        }

        // Vérifier qu'il restera au moins un admin
        const { data: admins, error: countError } = await supabase
            .from('admins')
            .select('id');

        if (countError) {
            console.error('Erreur Supabase (count admins):', countError);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la vérification des comptes.'
            });
        }

        if (admins.length <= 1) {
            return res.status(400).json({
                success: false,
                message: 'Impossible de supprimer le dernier compte admin.'
            });
        }

        // Supprimer l'admin
        const { error: deleteError } = await supabase
            .from('admins')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Erreur Supabase (delete user):', deleteError);
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé ou erreur lors de la suppression.'
            });
        }

        console.log('Admin supprimé:', id, 'par lui-même');

        res.json({
            success: true,
            message: 'Compte supprimé avec succès.'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la suppression de l\'utilisateur.'
        });
    }
});

/**
 * PUT /api/admin/change-password
 * Changer le mot de passe de l'admin
 * Route protégée par JWT
 */
router.put('/change-password', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        // Vérifier que les champs sont fournis
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Mot de passe actuel et nouveau mot de passe requis.'
            });
        }

        // Vérifier la longueur du nouveau mot de passe
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.'
            });
        }

        // Récupérer l'admin depuis Supabase
        const { data: admins, error: selectError } = await supabase
            .from('admins')
            .select('*')
            .eq('id', userId)
            .limit(1);

        if (selectError || !admins || admins.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé.'
            });
        }

        const admin = admins[0];

        // Vérifier l'ancien mot de passe
        const passwordMatch = await bcrypt.compare(currentPassword, admin.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Mot de passe actuel incorrect.'
            });
        }

        // Hasher le nouveau mot de passe
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Mettre à jour dans Supabase
        const { error: updateError } = await supabase
            .from('admins')
            .update({ password_hash: newPasswordHash })
            .eq('id', userId);

        if (updateError) {
            console.error('Erreur Supabase (change password):', updateError);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors du changement de mot de passe.'
            });
        }

        console.log('Mot de passe changé pour:', admin.username);

        res.json({
            success: true,
            message: 'Mot de passe changé avec succès.'
        });
    } catch (error) {
        console.error('Erreur lors du changement de mot de passe:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors du changement de mot de passe.'
        });
    }
});

/**
 * GET /api/admin/videos
 * Liste toutes les vidéos (y compris les non-visibles)
 * Route protégée par JWT
 */
router.get('/videos', authMiddleware, async (req, res) => {
    try {
        const { data: videos, error } = await supabase
            .from('videos')
            .select('*')
            .order('order', { ascending: true });

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des vidéos.'
            });
        }

        // Convertir les noms de colonnes de snake_case à camelCase
        const formattedVideos = videos.map(video => ({
            id: video.id,
            youtubeId: video.youtube_id,
            title: video.title,
            description: video.description,
            order: video.order,
            visible: video.visible,
            createdAt: video.created_at
        }));

        res.json({
            success: true,
            videos: formattedVideos
        });
    } catch (error) {
        console.error('Erreur lors de la lecture des vidéos:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des vidéos.'
        });
    }
});

/**
 * POST /api/admin/videos
 * Ajouter une nouvelle vidéo
 * Route protégée par JWT
 */
router.post('/videos', authMiddleware, async (req, res) => {
    try {
        const { youtubeId, title, description } = req.body;

        // Vérifier les champs requis
        if (!youtubeId || !title) {
            return res.status(400).json({
                success: false,
                message: 'L\'ID YouTube et le titre sont requis.'
            });
        }

        // Récupérer le plus grand ordre actuel
        const { data: videos, error: selectError } = await supabase
            .from('videos')
            .select('order')
            .order('order', { ascending: false })
            .limit(1);

        if (selectError) {
            console.error('Erreur Supabase (select):', selectError);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de l\'ordre.'
            });
        }

        const maxOrder = videos && videos.length > 0 ? videos[0].order : 0;

        // Insérer la nouvelle vidéo
        const { data: newVideo, error: insertError } = await supabase
            .from('videos')
            .insert([{
                youtube_id: youtubeId,
                title: title,
                description: description || '',
                order: maxOrder + 1,
                visible: true
            }])
            .select()
            .single();

        if (insertError) {
            console.error('Erreur Supabase (insert):', insertError);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'ajout de la vidéo.'
            });
        }

        // Formater la réponse
        const formattedVideo = {
            id: newVideo.id,
            youtubeId: newVideo.youtube_id,
            title: newVideo.title,
            description: newVideo.description,
            order: newVideo.order,
            visible: newVideo.visible,
            createdAt: newVideo.created_at
        };

        res.status(201).json({
            success: true,
            message: 'Vidéo ajoutée avec succès.',
            video: formattedVideo
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la vidéo:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de l\'ajout de la vidéo.'
        });
    }
});

/**
 * PUT /api/admin/videos/reorder
 * Réorganiser les vidéos
 * Route protégée par JWT
 * Body: { videoIds: ['id1', 'id2', 'id3'] } dans le nouvel ordre
 * IMPORTANT: Cette route doit être AVANT /videos/:id pour éviter les conflits de routing
 */
router.put('/videos/reorder', authMiddleware, async (req, res) => {
    try {
        const { videoIds } = req.body;

        if (!videoIds || !Array.isArray(videoIds)) {
            return res.status(400).json({
                success: false,
                message: 'Liste des IDs de vidéos requise.'
            });
        }

        if (videoIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'La liste des vidéos est vide.'
            });
        }

        console.log('Réorganisation demandée pour', videoIds.length, 'vidéos');
        console.log('IDs:', videoIds);

        // Mettre à jour l'ordre de chaque vidéo dans Supabase
        // Note: "order" est un mot réservé SQL, mais Supabase l'échappe automatiquement
        const updatePromises = videoIds.map((id, index) => {
            return supabase
                .from('videos')
                .update({ order: index + 1 })
                .eq('id', id)
                .select(); // Ajouter .select() pour obtenir les données mises à jour
        });

        // Exécuter toutes les mises à jour en parallèle
        const results = await Promise.all(updatePromises);

        // Vérifier s'il y a eu des erreurs
        const errors = results.filter(result => result.error);
        if (errors.length > 0) {
            console.error('Erreurs Supabase (reorder):', errors.map(e => e.error));
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la réorganisation de certaines vidéos.',
                details: errors.map(e => e.error.message)
            });
        }

        // Vérifier que toutes les vidéos ont bien été mises à jour
        const successCount = results.filter(r => r.data && r.data.length > 0).length;
        console.log(`Réorganisation: ${successCount}/${videoIds.length} vidéos mises à jour`);

        res.json({
            success: true,
            message: 'Ordre des vidéos mis à jour avec succès.',
            updated: successCount
        });
    } catch (error) {
        console.error('Erreur lors de la réorganisation des vidéos:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la réorganisation des vidéos.',
            error: error.message
        });
    }
});

/**
 * PUT /api/admin/videos/:id
 * Modifier une vidéo existante
 * Route protégée par JWT
 */
router.put('/videos/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { youtubeId, title, description, visible } = req.body;

        // Construire l'objet de mise à jour (seulement les champs fournis)
        const updateData = {};
        if (youtubeId !== undefined) updateData.youtube_id = youtubeId;
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (visible !== undefined) updateData.visible = visible;

        // Mettre à jour dans Supabase
        const { data: updatedVideo, error } = await supabase
            .from('videos')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase (update):', error);
            return res.status(404).json({
                success: false,
                message: 'Vidéo non trouvée ou erreur lors de la mise à jour.'
            });
        }

        // Formater la réponse
        const formattedVideo = {
            id: updatedVideo.id,
            youtubeId: updatedVideo.youtube_id,
            title: updatedVideo.title,
            description: updatedVideo.description,
            order: updatedVideo.order,
            visible: updatedVideo.visible,
            createdAt: updatedVideo.created_at
        };

        res.json({
            success: true,
            message: 'Vidéo modifiée avec succès.',
            video: formattedVideo
        });
    } catch (error) {
        console.error('Erreur lors de la modification de la vidéo:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la modification de la vidéo.'
        });
    }
});

/**
 * DELETE /api/admin/videos/:id
 * Supprimer une vidéo
 * Route protégée par JWT
 */
router.delete('/videos/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Supprimer dans Supabase
        const { error } = await supabase
            .from('videos')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erreur Supabase (delete):', error);
            return res.status(404).json({
                success: false,
                message: 'Vidéo non trouvée ou erreur lors de la suppression.'
            });
        }

        res.json({
            success: true,
            message: 'Vidéo supprimée avec succès.'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de la vidéo:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la suppression de la vidéo.'
        });
    }
});

module.exports = router;
