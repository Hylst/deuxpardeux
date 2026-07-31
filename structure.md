# Structure de Deux par Deux

## Arborescence

```
deux-par-deux-game-development/
├── index.html              # template Vite + bloc SEO (lang=fr)
├── package.json            # deux-par-deux v1.0.0
├── vite.config.ts          # base '/deuxpardeux/', react + tailwind + singlefile
├── tsconfig.json
├── .gitignore                # deps, secrets, fichiers d'agents IA
├── about.md / README.md / structure.md / features.md / todo.md / changelog.md
├── og-image.png / favicon.png
├── public/
│   ├── favicon.png
│   ├── og-image.png / og-image.webp
│   └── icon.webp             # carte du menu, 128x128
└── src/
    ├── main.tsx
    ├── App.tsx                # ecrans menu/jeu, etat de partie, rendu du plateau
    ├── layouts.ts             # LOGIQUE PURE : plateaux, liberte, generation resolvable
    ├── TileFace.tsx           # dessin SVG des 42 faces de tuiles
    ├── audio.ts               # classe AudioEngine (musique + SFX Web Audio)
    ├── index.css              # Tailwind + keyframes
    ├── utils/cn.ts            # non utilise
    └── assets/bg.jpg          # decor de fond (129 Ko, inline en base64 au build)
```

## `layouts.ts` : le coeur du jeu

Module entierement pur, sans React, donc testable directement (c'est ce qui a permis de
valider la generation hors navigateur pendant l'audit).

| Export | Role |
|--------|------|
| `LEVELS` | les 5 plateaux, chacun une liste de positions `{x, y, z}` |
| `isFreeAt(idx, positions, occupied)` | une tuile est libre si rien ne la recouvre (couche superieure) et si au moins un cote est degage |
| `isMatchable(a, b)` | identite stricte, sauf fleurs entre elles et saisons entre elles |
| `assignSolvable(positions, pairs?)` | **generation par placement inverse** |
| `typesToPairs(types)` | regroupe un multiensemble de types restants en paires appariables (utilise par le melange) |

### Le placement inverse, en deux mots

Plutot que de distribuer les tuiles au hasard puis d'esperer que la partie soit gagnable,
`assignSolvable` part d'un plateau **plein mais sans types**, puis retire repetitivement deux
tuiles actuellement libres et leur affecte une paire. Comme chaque retrait respecte la regle
de liberte, la sequence inverse constitue une solution valide. Jusqu'a 60 tentatives, mais en
pratique la premiere suffit toujours (mesure : 0 echec sur 200 tirages).

## Positions et rendu

Les positions utilisent des demi-unites (`y: 1.5`, `x: 6.5`) pour les decalages classiques du
mahjong. Le rendu convertit en pixels :

```
left = (p.x - minX) * TW + p.z * ZX
top  = (p.y - minY) * TH - p.z * ZY + maxZ * ZY
```

avec `TW/TH` le pas de la grille et `ZX/ZY` le decalage de perspective par couche. Le
`zIndex` combine la couche et la ligne pour que l'empilement se lise correctement.

## Points d'attention pour un audit futur

- **`animationDelay: tile.id * 9ms`** cree la distribution en cascade, mais l'animation
  `.tile-in` est en mode `backwards` : pendant le delai la tuile est a `opacity: 0`. Toute
  tuile **remontee** par React (c'est le cas d'une tuile restauree par « Annuler », puisque
  les tuiles retirees renvoient `null`) rejoue donc son delai d'origine. D'ou l'ensemble
  `undoneIds`, qui force un delai nul sur ces tuiles. Ne pas retirer ce garde-fou.
- **La detection de victoire est dans un `useEffect`**, pas dans l'updater `setTiles` : un
  updater doit rester pur, sinon la fanfare et la sauvegarde peuvent partir deux fois.
- **Le repli de `startGame`** (`d${(i % 9) + 1}`) produirait des types en nombre impair donc
  un plateau ingagnable. Inatteignable en pratique, voir todo.md.

## Build

`vite-plugin-singlefile` inline le JS, le CSS et `bg.jpg` (en base64) dans `index.html`
(~421 Ko). Le `dist/` contient en plus `favicon.png`, `og-image.png/webp` et `icon.webp`
copies depuis `public/`. `base: '/deuxpardeux/'` fait resoudre ces assets sous
`https://games.hylst.fr/deuxpardeux/`.

Note : l'export d'origine embarquait aussi `public/tiles.png` (2,2 Mo) qui n'etait reference
nulle part — supprime pendant l'audit, il aurait ete deploye pour rien.
