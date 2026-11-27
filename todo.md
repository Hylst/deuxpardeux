# TODO de Deux par Deux

Audit fait le 2026-07-31 sur l'export brut (`build-mahjong-solitaire-game.zip`), suivi d'une
passe QA navigateur (Playwright + Chromium) avec vérification réelle de la mécanique centrale.

---

## ✅ Corrigé — bugs

- [x] **Les tuiles restaurées par « Annuler » restaient invisibles jusqu'à 1,3 seconde.**
  Chaque tuile porte `animationDelay: tile.id * 9ms` pour l'effet de distribution en cascade
  au début de la partie, et l'animation `.tile-in` est déclarée avec le mode de remplissage
  `backwards` — ce qui signifie que pendant tout le délai, la tuile garde l'état de l'image
  clé 0 %, c'est-à-dire `opacity: 0`. Une tuile retirée puis restaurée par « Annuler » est
  démontée puis remontée par React, donc son animation se rejoue **avec son délai d'origine** :
  sur La Tortue (144 tuiles), annuler un coup portant sur une tuile d'indice élevé la laissait
  totalement transparente pendant plus d'une seconde, comme si l'annulation n'avait pas
  fonctionné. Corrigé avec un ensemble `undoneIds` : les tuiles remises en jeu par une
  annulation reçoivent un délai de 0 ms. **Vérifié en navigateur** : 120 ms après un clic sur
  « Annuler », 0 tuile transparente (mesure de l'`opacity` calculée de toutes les tuiles).
- [x] **Deux boutons inatteignables sur téléphone.** La barre d'outils du bandeau supérieur
  était un conteneur flex **sans `flex-wrap`**. Sur un écran de 390 px, les deux derniers
  boutons débordaient hors de l'écran : « Plein écran » (381 à 419 px) et surtout
  **« Nouvelle partie » (425 à 513 px)**, qui devenait donc impossible à utiliser sur mobile.
  Le débordement était invisible au test classique `body.scrollWidth > body.clientWidth`
  (le conteneur racine porte `overflow-hidden`, donc le corps de page ne débordait pas : les
  boutons étaient simplement rognés). Corrigé avec `flex-wrap` + `justify-center`.
  **Vérifié en navigateur** : mesure de la position de chacun des 9 boutons, 0 hors écran
  après correction, et plus aucun défilement horizontal du bandeau.

## ✅ Corrigé — poids et intégration

- [x] **`public/tiles.png` supprimé : 2,2 Mo d'asset mort.** Ce fichier n'était référencé
  nulle part dans le code (les faces de tuiles sont dessinées en SVG dans `TileFace.tsx`).
  Comme il vivait dans `public/`, Vite le copiait tel quel dans `dist/` : il aurait été
  déployé pour rien, et à lui seul il pesait plus de deux fois le reste du jeu.
- [x] Renommé en **Deux par Deux** — le nom d'origine, « Mahjong Solitaire », était le nom
  générique du genre. Titre affiché, titre de page, clés `localStorage`
  (`mahjong_niveau`/`mahjong_best_*` → `d2d_niveau`/`d2d_best_*`, pour éviter toute collision
  avec un autre jeu du hub partageant le même domaine).
- [x] `base: '/deuxpardeux/'` ajouté dans `vite.config.ts`, il n'y en avait aucun.
- [x] `index.html` : `lang="en"` corrigé en `lang="fr"`, bloc SEO complet (description,
  keywords, og, twitter, robots, canonical, theme-color), `<link rel="icon">`.
- [x] `package.json` : `react-vite-tailwind` v0.0.0 devenu `deux-par-deux` v1.0.0.
- [x] Tirets longs retirés du code et des libellés (règle de ton du hub).

## ✅ Corrigé — qualité de code

- [x] **La détection de victoire vivait à l'intérieur d'un updater `setTiles`.** Le callback
  passé à `setTiles` appelait `setGameWon`, `audio.win()`, `saveProgress()` et `saveBest()` :
  un updater doit être une fonction pure, React se réserve le droit de le rejouer (c'est
  systématique en mode strict de développement). La fanfare et la sauvegarde pouvaient donc
  partir deux fois. Déplacé dans un `useEffect` dédié, ce qui corrige au passage une
  imprécision : `saveBest` recevait la valeur de `time` capturée au moment du clic, soit
  jusqu'à une seconde de retard sur le chrono réel.

## ✅ La passe QA navigateur

- [x] 0 erreur console, 0 exception non gérée
- [x] Menu, déverrouillage progressif des 5 plateaux, chargement d'un niveau
- [x] **Mécanique centrale observée réellement** : 42 tuiles distribuées (DOM et HUD
  concordants), paires réellement retirées du plateau (restantes 42 → 40 → 38), compteur de
  coups et score qui suivent (0 → 1 → 2 coups, score 15 après deux paires et un indice à
  −5 points, arithmétique conforme)
- [x] Indice : surligne bien une paire réellement jouable
- [x] Mélange : conserve le nombre de tuiles et régénère des paires disponibles
- [x] Annuler : restaure bien 2 tuiles (38 → 40) et elles sont visibles immédiatement
- [x] Viewport mobile 390×844 : aucun débordement, plateau redimensionné, 9 boutons accessibles
- [x] Screenshot réel du plateau « La Tortue » (144 tuiles) pour `og-image.png`/`.webp`

## Vérification de la génération de plateaux

Test direct de `assignSolvable` hors navigateur (200 tirages, 40 par plateau) : **0 échec**
sur les 5 niveaux, tous les types de tuiles en nombre pair, aucune longueur incorrecte, aucun
type vide. La génération par placement inverse garantit bien un plateau résolvable.

---

## ⬜ Idées d'amélioration

### Robustesse
- [ ] **Le repli de `startGame` produirait un plateau impossible.** Si `assignSolvable`
  échouait, le code retombe sur `lvl.positions.map((_, i) => \`d${(i % 9) + 1}\`)`, qui répartit
  9 types sur un nombre de tuiles non multiple de 9 : sur 42 tuiles, les types `d1` à `d6`
  sortiraient 5 fois (nombre **impair**), rendant le plateau mathématiquement ingagnable. Ce
  repli est aujourd'hui inatteignable (0 échec sur 200 tirages), donc rien n'a été touché,
  mais si les plateaux évoluent un jour il faudrait générer des paires plutôt qu'un cycle.

### Game design
- [ ] Le chronomètre continue de tourner pendant l'écran « Plus aucun coup possible »
- [ ] Le combo (+5 points si deux paires en moins de 3 s) n'est indiqué nulle part à l'écran
- [ ] Les tuiles fleurs et saisons n'apparaissent que si leur paire tombe dans la tranche
  tirée par `buildPairPool` : sur les petits plateaux elles sont souvent absentes

### Technique
- [ ] `src/utils/cn.ts` et les dépendances `clsx` / `tailwind-merge` ne sont jamais utilisés
- [ ] `availablePairs` calcule toutes les paires possibles à chaque rendu en O(n²) sur les
  tuiles libres ; sans impact perceptible ici (au plus quelques dizaines de tuiles libres),
  mais un simple compteur suffirait puisque seul `.length` est utilisé en dehors de l'indice
- [ ] Aucun test automatisé embarqué sur `isFreeAt` / `assignSolvable`, alors que ce sont des
  fonctions pures faciles à couvrir

## Audit du 27/11/2026

- [ ] Prouver la résolvabilité des 5 plateaux sur 1000 mélanges, puis supprimer le repli aléatoire si nécessaire.
- [ ] Documenter l'origine de `src/assets/bg.jpg` ou le remplacer par un fond CSS.
