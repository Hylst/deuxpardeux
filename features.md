# Fonctionnalités de Deux par Deux

## Gameplay

- ✅ Règle classique du solitaire de tuiles : paires identiques, tuiles libres uniquement
- ✅ Fleurs entre elles et saisons entre elles, sans exiger l'identité stricte
- ✅ 5 plateaux à difficulté croissante (42, 72, 144, 114, 124 tuiles)
- ✅ Déblocage progressif : terminer un plateau ouvre le suivant
- ✅ **Génération toujours résolvable** par placement inverse (vérifié : 0 échec sur 200 tirages)
- ✅ Mélange en cours de partie qui conserve la résolvabilité
- ✅ Détection automatique de blocage avec écran dédié
- ✅ Annulation du dernier coup
- ⬜ Le repli de génération (inatteignable en pratique) produirait un plateau ingagnable

## Score et progression

- ✅ Score : +10 par paire, +5 de bonus si deux paires en moins de 3 secondes
- ✅ Pénalités : −5 par indice, −10 par mélange, −10 par annulation
- ✅ Meilleur temps mémorisé par plateau
- ✅ Progression sauvegardée en `localStorage`
- ⬜ Le bonus de combo n'est signalé nulle part à l'écran

## Interface

- ✅ Menu de sélection avec difficulté en étoiles et meilleur temps par plateau
- ✅ HUD : temps, coups, paires disponibles, score, tuiles restantes
- ✅ Barre de progression
- ✅ Mise en valeur optionnelle des tuiles libres
- ✅ Effet 3D par superposition de couches, avec ombres en escalier
- ✅ Animations : distribution en cascade, disparition, étincelles, confettis de victoire
- ✅ Plateau redimensionné automatiquement selon la fenêtre
- ✅ Mode plein écran
- ✅ Barre d'outils qui passe à la ligne sur mobile (9 boutons tous accessibles en 390 px)

## Audio

- ✅ Musique d'ambiance générative en Web Audio
- ✅ Effets sonores : sélection, désélection, paire, tuile bloquée, indice, mélange, annulation, victoire
- ✅ Coupure indépendante musique / effets

## Technique

- ✅ Build en un seul fichier (~421 Ko), fonctionne hors ligne
- ✅ TypeScript strict
- ✅ Logique de jeu (`layouts.ts`) séparée du rendu, entièrement pure et testable
- ✅ Faces de tuiles en SVG, aucun sprite à charger
- ✅ Bloc SEO complet, favicon, og-image (capture réelle du plateau La Tortue)
- ⬜ `utils/cn.ts` et ses dépendances jamais utilisés
- ⬜ Pas de tests automatisés embarqués
