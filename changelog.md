# Changelog de Deux par Deux

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage
[SemVer](https://semver.org/lang/fr/).

## [1.1.0] 2026-08-02

### Ajouté
- Modale « ℹ️ Infos » (bouton dans l'écran de sélection de niveau) expliquant la stack,
  les graphismes, la musique, les interactions, l'architecture et les algorithmes notables
  (règle du mahjong pour une tuile « libre », génération de plateau à l'envers pour
  garantir la solvabilité). Étape 15 du chantier de retrofit décrit dans `todo.md` racine
  du monorepo.

### Vérifié
- Build propre, modale testée à l'ouverture/fermeture, aucune erreur console, aucun
  débordement horizontal en 390×844 (écran de menu et écran de jeu).

## [1.0.0] 2026-07-31

Première version intégrable à Hylst.Games, partie d'un export brut audité puis corrigé.

### Ajouté
- Bloc SEO complet dans `index.html` (description, keywords, og, twitter, robots, canonical,
  theme-color) et `lang="fr"`
- `favicon.png` 32×32, `og-image.png` 1024×576 (capture réelle du plateau La Tortue) et sa
  variante `og-image.webp`, `icon.webp` 128×128 pour la carte du menu
- `base: '/deuxpardeux/'` dans `vite.config.ts`
- La doc : `about.md`, `README.md`, `structure.md`, `features.md`, `todo.md`, `changelog.md`

### Modifié
- Renommé en **Deux par Deux**. Le nom précédent, « Mahjong Solitaire », était le nom
  générique du genre. Titre affiché, titre de page, clés `localStorage`
  (`mahjong_niveau`/`mahjong_best_*` → `d2d_niveau`/`d2d_best_*`).
- `package.json` : `react-vite-tailwind` v0.0.0 devenu `deux-par-deux` v1.0.0
- Détection de victoire déplacée de l'intérieur d'un updater `setTiles` vers un `useEffect`
  dédié : un updater doit rester pur, sinon la fanfare et la sauvegarde du record peuvent
  partir deux fois. Corrige au passage le record du temps, qui était enregistré avec la
  valeur du chrono capturée au clic (jusqu'à une seconde de retard).
- Tirets longs retirés du code et des libellés

### Corrigé
- Les tuiles restaurées par « Annuler » restaient invisibles jusqu'à 1,3 seconde : l'animation
  de distribution rejouait son délai en cascade (`tile.id * 9ms`) avec un mode de remplissage
  `backwards`, donc à `opacity: 0` pendant toute l'attente. Vérifié après correction : 0 tuile
  transparente 120 ms après l'annulation.
- Sur téléphone (390 px), les boutons « Plein écran » et « Nouvelle partie » débordaient hors
  de l'écran et étaient donc inutilisables, la barre d'outils n'ayant pas de retour à la ligne.
  Vérifié après correction : les 9 boutons sont dans l'écran.

### Supprimé
- `public/tiles.png`, 2,2 Mo d'asset jamais référencé (les faces de tuiles sont du SVG). Il
  aurait été copié tel quel dans le build et déployé pour rien.
