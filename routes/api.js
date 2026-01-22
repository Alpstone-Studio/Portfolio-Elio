/**
 * Routes API publiques
 * Endpoints accessibles sans authentification
 */

const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

/**
 * GET /api/videos
 * Retourne la liste des vidéos visibles, triées par ordre
 */
router.get('/videos', async (req, res) => {
    try {
        // Récupérer les vidéos visibles depuis Supabase
        const { data: videos, error } = await supabase
            .from('videos')
            .select('id, youtube_id, title, description')
            .eq('visible', true)
            .order('order', { ascending: true });

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des vidéos.'
            });
        }

        // Formater la réponse (snake_case → camelCase)
        const formattedVideos = videos.map(video => ({
            id: video.id,
            youtubeId: video.youtube_id,
            title: video.title,
            description: video.description
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

module.exports = router;
