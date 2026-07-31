/* Définition des niveaux et génération de plateaux toujours solvables */

export interface Pos {
  x: number;
  y: number;
  z: number;
}

export interface Level {
  id: number;
  name: string;
  subtitle: string;
  difficulty: number; // 1 à 5
  positions: Pos[];
}

function grid(x0: number, y0: number, w: number, h: number, z: number): Pos[] {
  const out: Pos[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.push({ x: x0 + x, y: y0 + y, z });
  return out;
}

function row(x0: number, y: number, w: number, z: number): Pos[] {
  return grid(x0, y, w, 1, z);
}

/* Niveau 1 : Initiation : petite pyramide simple */
const INITIATION: Pos[] = [
  ...grid(0, 0, 8, 4, 0),
  ...grid(2, 1, 4, 2, 1),
  ...grid(3, 1.5, 2, 1, 2),
];

/* Niveau 2 : Jardin de Bambous */
const JARDIN: Pos[] = [
  ...grid(0, 0, 10, 5, 0),
  ...grid(2, 1, 6, 3, 1),
  ...grid(3, 2, 4, 1, 2),
];

/* Niveau 3 : La Tortue (classique, 144 tuiles) */
const TORTUE: Pos[] = [
  // Couche 0
  ...row(1, 0, 12, 0),
  ...row(3, 1, 8, 0),
  ...row(2, 2, 10, 0),
  ...row(1, 3, 12, 0),
  ...row(1, 4, 12, 0),
  ...row(2, 5, 10, 0),
  ...row(3, 6, 8, 0),
  ...row(1, 7, 12, 0),
  { x: 0, y: 3.5, z: 0 },
  { x: 13, y: 3.5, z: 0 },
  { x: 14, y: 3.5, z: 0 },
  // Couche 1
  ...grid(4, 1, 6, 6, 1),
  // Couche 2
  ...grid(5, 2, 4, 4, 2),
  // Couche 3
  ...grid(6, 3, 2, 2, 3),
  // Couche 4 (sommet)
  { x: 6.5, y: 3.5, z: 4 },
];

/* Niveau 4 : La Forteresse : deux tours massives */
const FORTERESSE: Pos[] = [
  ...grid(0, 0, 12, 6, 0),
  ...grid(1, 1, 4, 4, 1),
  ...grid(7, 1, 4, 4, 1),
  ...grid(2, 2, 2, 2, 2),
  ...grid(8, 2, 2, 2, 2),
  { x: 5.5, y: 2.5, z: 1 },
  { x: 5.5, y: 2.5, z: 2 },
];

/* Niveau 5 : Le Dragon Céleste : empilement de 5 couches très bloquant */
const DRAGON: Pos[] = [
  ...grid(0, 0, 14, 4, 0),
  ...grid(1, 0.5, 12, 3, 1),
  ...grid(2, 1, 10, 2, 2),
  ...grid(3, 1.5, 8, 1, 3),
  ...grid(5, 1.5, 4, 1, 4),
];

export const LEVELS: Level[] = [
  { id: 1, name: 'Initiation', subtitle: 'Premiers pas, 42 tuiles', difficulty: 1, positions: INITIATION },
  { id: 2, name: 'Jardin de Bambous', subtitle: 'Échauffement, 72 tuiles', difficulty: 2, positions: JARDIN },
  { id: 3, name: 'La Tortue', subtitle: 'Le grand classique, 144 tuiles', difficulty: 3, positions: TORTUE },
  { id: 4, name: 'La Forteresse', subtitle: 'Tours jumelles, 114 tuiles', difficulty: 4, positions: FORTERESSE },
  { id: 5, name: 'Le Dragon Céleste', subtitle: 'Cinq couches infernales, 124 tuiles', difficulty: 5, positions: DRAGON },
];

/* ---------- Types de tuiles ---------- */

export const STANDARD_TYPES = [
  'd1','d2','d3','d4','d5','d6','d7','d8','d9',
  'b1','b2','b3','b4','b5','b6','b7','b8','b9',
  'c1','c2','c3','c4','c5','c6','c7','c8','c9',
  'we','ws','ww','wn',
  'dr','dg','dw',
];

export function isMatchable(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.startsWith('f') && b.startsWith('f')) return true;
  if (a.startsWith('s') && b.startsWith('s')) return true;
  return false;
}

/* ---------- Vérification de liberté d'une tuile ---------- */

export function isFreeAt(
  idx: number,
  positions: Pos[],
  occupied: (i: number) => boolean
): boolean {
  const p = positions[idx];
  let leftBlocked = false;
  let rightBlocked = false;
  for (let j = 0; j < positions.length; j++) {
    if (j === idx || !occupied(j)) continue;
    const q = positions[j];
    if (q.z === p.z && Math.abs(q.y - p.y) < 1) {
      if (q.x < p.x && p.x - q.x < 1.5 && p.x - q.x > 0.5) leftBlocked = true;
      if (q.x > p.x && q.x - p.x < 1.5 && q.x - p.x > 0.5) rightBlocked = true;
    }
    if (q.z > p.z && Math.abs(q.x - p.x) < 1 && Math.abs(q.y - p.y) < 1) return false;
  }
  return !(leftBlocked && rightBlocked);
}

/* ---------- Construction de la réserve de paires ---------- */

function buildPairPool(nPairs: number): [string, string][] {
  const pool: [string, string][] = [];
  // Chaque type standard fournit 2 paires (4 tuiles)
  for (const t of STANDARD_TYPES) {
    pool.push([t, t], [t, t]);
  }
  // Fleurs et saisons : appariement par groupe
  pool.push(['f1', 'f2'], ['f3', 'f4'], ['s1', 's2'], ['s3', 's4']);
  // Mélange
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // Si besoin de plus de paires que la réserve (jamais le cas ici), on duplique
  while (pool.length < nPairs) pool.push(...pool.slice(0, nPairs - pool.length));
  return pool.slice(0, nPairs);
}

/* ---------- Génération solvable (placement inverse) ---------- */

export function assignSolvable(positions: Pos[], pairs?: [string, string][]): string[] | null {
  const n = positions.length;
  const need = n / 2;
  for (let attempt = 0; attempt < 60; attempt++) {
    const pool = pairs ? shufflePairs(pairs) : buildPairPool(need);
    const types: string[] = new Array(n).fill('');
    const occ = new Array(n).fill(true);
    let remaining = n;
    let pi = 0;
    let ok = true;
    while (remaining > 0) {
      const free: number[] = [];
      for (let i = 0; i < n; i++) {
        if (occ[i] && isFreeAt(i, positions, (j) => occ[j])) free.push(i);
      }
      if (free.length < 2) {
        ok = false;
        break;
      }
      const a = free.splice(Math.floor(Math.random() * free.length), 1)[0];
      const b = free.splice(Math.floor(Math.random() * free.length), 1)[0];
      const pair = pool[pi++];
      types[a] = pair[0];
      types[b] = pair[1];
      occ[a] = false;
      occ[b] = false;
      remaining -= 2;
    }
    if (ok) return types;
  }
  return null;
}

function shufflePairs(pairs: [string, string][]): [string, string][] {
  const p = pairs.map((x) => [...x] as [string, string]);
  for (let i = p.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}

/* Regroupe un multiset de types restants en paires appariables */
export function typesToPairs(types: string[]): [string, string][] {
  const flowers = types.filter((t) => t.startsWith('f'));
  const seasons = types.filter((t) => t.startsWith('s'));
  const std = types.filter((t) => !t.startsWith('f') && !t.startsWith('s'));
  const pairs: [string, string][] = [];
  const counts: Record<string, number> = {};
  std.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
  for (const t of Object.keys(counts)) {
    for (let i = 0; i < Math.floor(counts[t] / 2); i++) pairs.push([t, t]);
  }
  for (let i = 0; i + 1 < flowers.length; i += 2) pairs.push([flowers[i], flowers[i + 1]]);
  for (let i = 0; i + 1 < seasons.length; i += 2) pairs.push([seasons[i], seasons[i + 1]]);
  return pairs;
}
