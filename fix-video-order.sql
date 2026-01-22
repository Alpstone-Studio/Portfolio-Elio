-- ============================================
-- Script pour corriger l'ordre des vidéos
-- ============================================

-- 1. Vérifier l'état actuel des ordres
-- Exécutez ceci en premier pour voir l'état actuel
SELECT
    id,
    title,
    "order",
    visible,
    created_at
FROM videos
ORDER BY "order" ASC NULLS LAST;

-- ============================================
-- 2. Réinitialiser l'ordre de manière séquentielle
-- ============================================

-- Option A: Réorganiser par date de création (les plus anciennes en premier)
WITH numbered_videos AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_order
    FROM videos
)
UPDATE videos
SET "order" = numbered_videos.new_order
FROM numbered_videos
WHERE videos.id = numbered_videos.id;

-- OU Option B: Réorganiser en gardant l'ordre actuel (si défini) puis par date
-- Décommentez si vous préférez cette option
/*
WITH numbered_videos AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY
            CASE WHEN "order" IS NULL THEN 999999 ELSE "order" END ASC,
            created_at ASC
        ) as new_order
    FROM videos
)
UPDATE videos
SET "order" = numbered_videos.new_order
FROM numbered_videos
WHERE videos.id = numbered_videos.id;
*/

-- ============================================
-- 3. S'assurer que le champ "order" ne peut pas être NULL
-- ============================================

-- D'abord, mettre à jour les NULL s'il y en a
UPDATE videos
SET "order" = (
    SELECT COALESCE(MAX("order"), 0) + 1
    FROM videos v2
    WHERE v2."order" IS NOT NULL
)
WHERE "order" IS NULL;

-- Puis ajouter une contrainte NOT NULL
ALTER TABLE videos
ALTER COLUMN "order" SET NOT NULL;

-- ============================================
-- 4. Vérifier le résultat final
-- ============================================
SELECT
    id,
    title,
    "order",
    visible,
    created_at
FROM videos
ORDER BY "order" ASC;

-- ============================================
-- 5. (Optionnel) Ajouter une contrainte d'unicité sur l'ordre
-- ============================================
-- Ceci garantit qu'aucune vidéo ne peut avoir le même ordre
-- ATTENTION: Cela peut compliquer les réorganisations, à n'utiliser que si nécessaire
/*
CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_order_unique ON videos("order");
*/
