import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LEVELS, type Level, isFreeAt, isMatchable, assignSolvable, typesToPairs } from './layouts';
import { TileFace } from './TileFace';
import { audio } from './audio';
import bgImage from './assets/bg.jpg';

/* ---------- Constantes d'affichage ---------- */
const TW = 54;   // pas horizontal
const TH = 66;   // pas vertical
const TILE_W = 52;
const TILE_H = 64;
const ZX = 7;    // décalage x par couche
const ZY = 9;    // décalage y par couche

interface Tile {
  id: number;
  type: string;
  removed: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
}

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function loadProgress(): number {
  try { return parseInt(localStorage.getItem('d2d_niveau') || '1', 10) || 1; } catch { return 1; }
}
function saveProgress(n: number) {
  try { localStorage.setItem('d2d_niveau', String(n)); } catch { /* ignore */ }
}
function loadBest(lvl: number): number | null {
  try { const v = localStorage.getItem(`d2d_best_${lvl}`); return v ? parseInt(v, 10) : null; } catch { return null; }
}
function saveBest(lvl: number, t: number) {
  const b = loadBest(lvl);
  if (b === null || t < b) { try { localStorage.setItem(`d2d_best_${lvl}`, String(t)); } catch { /* ignore */ } }
}

let particleId = 0;

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'jeu'>('menu');
  const [level, setLevel] = useState<Level>(LEVELS[0]);
  const [unlocked, setUnlocked] = useState(loadProgress());

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [removing, setRemoving] = useState<Set<number>>(new Set());
  const [hintPair, setHintPair] = useState<[number, number] | null>(null);
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [shuffles, setShuffles] = useState(0);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [dealKey, setDealKey] = useState(0);
  const [flipKey, setFlipKey] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [undoStack, setUndoStack] = useState<Array<[number, number]>>([]);
  // Tuiles remises en jeu par un annuler : elles doivent reapparaitre tout de suite,
  // sans le decalage en cascade de la distribution initiale (voir animationDelay plus bas).
  const [undoneIds, setUndoneIds] = useState<Set<number>>(new Set());
  const [showFree, setShowFree] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const lastMatchTime = useRef(0);

  const positions = level.positions;

  /* ---------- Dimensions du plateau ---------- */
  const bounds = useMemo(() => {
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    const zs = positions.map(p => p.z);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const maxZ = Math.max(...zs);
    return {
      minX, minY, maxZ,
      w: (maxX - minX + 1) * TW + maxZ * ZX + 8,
      h: (maxY - minY + 1) * TH + maxZ * ZY + 8,
    };
  }, [positions]);

  useEffect(() => {
    const compute = () => {
      const availW = window.innerWidth - 48;
      const availH = window.innerHeight - 210;
      setScale(Math.min(1.12, availW / bounds.w, availH / bounds.h));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [bounds]);

  /* ---------- Nouvelle partie ---------- */
  const startGame = useCallback((lvl: Level) => {
    const types = assignSolvable(lvl.positions) ?? lvl.positions.map((_, i) => `d${(i % 9) + 1}`);
    setLevel(lvl);
    setTiles(types.map((t, i) => ({ id: i, type: t, removed: false })));
    setSelected(null);
    setRemoving(new Set());
    setHintPair(null);
    setMoves(0);
    setHintsUsed(0);
    setShuffles(0);
    setScore(0);
    setTime(0);
    setGameWon(false);
    setStuck(false);
    setUndoStack([]);
    setUndoneIds(new Set());
    setParticles([]);
    setDealKey(k => k + 1);
    setScreen('jeu');
  }, []);

  /* ---------- Chronomètre ---------- */
  useEffect(() => {
    if (screen !== 'jeu' || gameWon) return;
    const t = window.setInterval(() => setTime(v => v + 1), 1000);
    return () => clearInterval(t);
  }, [screen, gameWon]);

  /* ---------- Plein écran ---------- */
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  };

  /* ---------- Logique de jeu ---------- */
  const occupied = useCallback(
    (i: number) => tiles[i] !== undefined && !tiles[i].removed && !removing.has(i),
    [tiles, removing]
  );

  const freeIds = useMemo(() => {
    const out = new Set<number>();
    for (let i = 0; i < tiles.length; i++) {
      if (occupied(i) && isFreeAt(i, positions, occupied)) out.add(i);
    }
    return out;
  }, [tiles, positions, occupied]);

  const availablePairs = useMemo(() => {
    const ids = [...freeIds];
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        if (isMatchable(tiles[ids[i]].type, tiles[ids[j]].type)) pairs.push([ids[i], ids[j]]);
      }
    }
    return pairs;
  }, [freeIds, tiles]);

  const remaining = useMemo(() => tiles.filter(t => !t.removed).length, [tiles]);

  /* Détection de victoire (tiles.length > 0 : sinon un plateau vide compterait comme gagné) */
  useEffect(() => {
    if (screen !== 'jeu' || gameWon || tiles.length === 0) return;
    if (!tiles.every(t => t.removed)) return;
    setGameWon(true);
    audio.win();
    const next2 = Math.max(loadProgress(), Math.min(level.id + 1, LEVELS.length));
    saveProgress(next2);
    setUnlocked(next2);
    saveBest(level.id, time);
  }, [tiles, screen, gameWon, level, time]);

  /* Détection de blocage */
  useEffect(() => {
    if (screen !== 'jeu' || gameWon || remaining === 0 || removing.size > 0) return;
    setStuck(availablePairs.length === 0 && remaining > 0);
  }, [availablePairs, remaining, gameWon, screen, removing]);

  const spawnParticles = (tileIdx: number) => {
    const p = positions[tileIdx];
    const x = (p.x - bounds.minX) * TW + p.z * ZX + TILE_W / 2;
    const y = (p.y - bounds.minY) * TH - p.z * ZY + (bounds.maxZ * ZY) + TILE_H / 2;
    const burst: Particle[] = Array.from({ length: 8 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 28 + Math.random() * 38;
      return {
        id: particleId++,
        x, y,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 18,
        color: Math.random() < 0.5 ? '#fbbf24' : '#fb7185',
      };
    });
    setParticles(prev => [...prev, ...burst]);
    setTimeout(() => {
      setParticles(prev => prev.filter(pt => !burst.some(b => b.id === pt.id)));
    }, 750);
  };

  const handleTileClick = (id: number) => {
    audio.unlock();
    if (gameWon || removing.has(id)) return;
    const tile = tiles[id];
    if (!tile || tile.removed) return;

    if (!freeIds.has(id)) {
      audio.locked();
      return;
    }

    if (selected === id) {
      setSelected(null);
      audio.deselect();
      return;
    }

    if (selected !== null && isMatchable(tiles[selected].type, tile.type)) {
      // Paire trouvée !
      const a = selected, b = id;
      setSelected(null);
      setHintPair(null);
      audio.match();
      spawnParticles(a);
      spawnParticles(b);
      setRemoving(prev => new Set([...prev, a, b]));

      const now = Date.now();
      const combo = now - lastMatchTime.current < 3000 ? 5 : 0;
      lastMatchTime.current = now;
      setScore(s => s + 10 + combo);
      setMoves(m => m + 1);
      setUndoStack(st => [...st, [a, b]]);

      setTimeout(() => {
        // La detection de victoire vit dans un useEffect dedie : declencher un setState
        // depuis l'interieur d'un updater rend celui-ci impur (React peut le rejouer,
        // et la fanfare partirait deux fois).
        setTiles(prev => prev.map(t => (t.id === a || t.id === b ? { ...t, removed: true } : t)));
        setRemoving(prev => {
          const n = new Set(prev);
          n.delete(a); n.delete(b);
          return n;
        });
      }, 430);
    } else {
      setSelected(id);
      audio.select();
    }
  };

  const giveHint = () => {
    audio.unlock();
    if (availablePairs.length === 0) return;
    const pair = availablePairs[Math.floor(Math.random() * availablePairs.length)];
    setHintPair(pair);
    setHintsUsed(h => h + 1);
    setScore(s => Math.max(0, s - 5));
    audio.hint();
    setTimeout(() => setHintPair(null), 2600);
  };

  const doShuffle = () => {
    audio.unlock();
    if (gameWon || remaining === 0) return;
    const remIdx = tiles.filter(t => !t.removed && !removing.has(t.id)).map(t => t.id);
    const remTypes = remIdx.map(i => tiles[i].type);
    const subPositions = remIdx.map(i => positions[i]);
    const pairs = typesToPairs(remTypes);
    const newTypes = assignSolvable(subPositions, pairs);
    const finalTypes = newTypes ?? remTypes.sort(() => Math.random() - 0.5);

    setTiles(prev => {
      const next = [...prev];
      remIdx.forEach((origIdx, k) => {
        next[origIdx] = { ...next[origIdx], type: finalTypes[k] };
      });
      return next;
    });
    setSelected(null);
    setHintPair(null);
    setStuck(false);
    setShuffles(s => s + 1);
    setScore(s => Math.max(0, s - 10));
    setFlipKey(k => k + 1);
    audio.shuffle();
  };

  const doUndo = () => {
    audio.unlock();
    if (undoStack.length === 0 || gameWon) return;
    const [a, b] = undoStack[undoStack.length - 1];
    setTiles(prev => prev.map(t => (t.id === a || t.id === b ? { ...t, removed: false } : t)));
    setUndoneIds(prev => new Set([...prev, a, b]));
    setUndoStack(st => st.slice(0, -1));
    setMoves(m => Math.max(0, m - 1));
    setScore(s => Math.max(0, s - 10));
    setSelected(null);
    setStuck(false);
    audio.undo();
  };

  const toggleMusic = () => {
    audio.unlock();
    const v = !musicOn;
    setMusicOn(v);
    audio.setMusic(v);
  };
  const toggleSfx = () => {
    audio.unlock();
    const v = !sfxOn;
    setSfxOn(v);
    audio.setSfx(v);
  };

  const progress = positions.length > 0 ? Math.round(((positions.length - remaining) / positions.length) * 100) : 0;

  /* ================== RENDU ================== */

  const bgStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(rgba(8,10,18,0.78), rgba(8,10,18,0.86)), url(${bgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  /* ---------- Écran menu ---------- */
  if (screen === 'menu') {
    return (
      <div className="min-h-screen text-white flex flex-col" style={bgStyle} onClick={() => audio.unlock()}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          <div className="float-slow text-center mb-8">
            <div className="text-7xl mb-3">🀄</div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight shimmer-text font-serif">Deux par Deux</h1>
            <p className="mt-3 text-zinc-300 text-sm tracking-[0.3em] uppercase">L'art ancestral des tuiles</p>
          </div>

          <div className="grid gap-3 w-full max-w-2xl">
            {LEVELS.map(lvl => {
              const locked = lvl.id > unlocked;
              const best = loadBest(lvl.id);
              return (
                <button
                  key={lvl.id}
                  disabled={locked}
                  onClick={() => { audio.unlock(); startGame(lvl); }}
                  className={`group flex items-center justify-between gap-4 rounded-2xl border px-6 py-4 text-left transition-all
                    ${locked
                      ? 'border-white/5 bg-black/40 opacity-50 cursor-not-allowed'
                      : 'border-amber-400/20 bg-black/50 hover:bg-amber-950/40 hover:border-amber-400/60 hover:scale-[1.015] active:scale-[0.99] cursor-pointer backdrop-blur-sm'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold font-serif
                      ${locked ? 'bg-zinc-800 text-zinc-500' : 'bg-gradient-to-br from-amber-400 to-orange-600 text-black shadow-lg shadow-amber-900/40'}`}>
                      {locked ? '🔒' : lvl.id}
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{lvl.name}</div>
                      <div className="text-xs text-zinc-400">{lvl.subtitle}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 text-sm tracking-wider">
                      {'★'.repeat(lvl.difficulty)}<span className="text-zinc-600">{'★'.repeat(5 - lvl.difficulty)}</span>
                    </div>
                    {best !== null && <div className="text-[11px] text-emerald-400 mt-1">Record : {fmtTime(best)}</div>}
                    {locked && <div className="text-[11px] text-zinc-500 mt-1">Terminez le niveau {lvl.id - 1}</div>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button onClick={toggleMusic} title="Musique d'ambiance"
              className={`rounded-xl border px-4 py-2.5 text-sm transition-colors ${musicOn ? 'border-amber-400/50 bg-amber-400/10 text-amber-300' : 'border-white/10 bg-black/40 text-zinc-500'}`}>
              🎵 Musique {musicOn ? 'ON' : 'OFF'}
            </button>
            <button onClick={toggleSfx} title="Effets sonores"
              className={`rounded-xl border px-4 py-2.5 text-sm transition-colors ${sfxOn ? 'border-amber-400/50 bg-amber-400/10 text-amber-300' : 'border-white/10 bg-black/40 text-zinc-500'}`}>
              🔊 Sons {sfxOn ? 'ON' : 'OFF'}
            </button>
            <button onClick={toggleFullscreen} title="Mode plein écran"
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-zinc-300 hover:border-amber-400/50 hover:text-amber-300 transition-colors">
              ⛶ {fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            </button>
          </div>
        </div>

        <footer className="pb-5 text-center text-xs text-zinc-500">
          Créé par <span className="text-amber-400/80 font-medium">Hylst, Geoffroy</span>, avec l'aide d'une IA
        </footer>
      </div>
    );
  }

  /* ---------- Écran de jeu ---------- */
  return (
    <div className="min-h-screen text-white flex flex-col overflow-hidden" style={bgStyle} onClick={() => audio.unlock()}>
      {/* Barre supérieure */}
      <header className="border-b border-white/10 bg-black/60 backdrop-blur-md z-40">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button onClick={() => setScreen('menu')} title="Retour au menu"
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm hover:border-amber-400/50 transition-colors">
              ← Menu
            </button>
            <div>
              <div className="font-serif font-bold text-amber-300 leading-tight">{level.name}</div>
              <div className="text-[10px] text-zinc-400 -mt-0.5">
                Niveau {level.id} · {'★'.repeat(level.difficulty)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 text-center">
            <div><div className="text-[10px] text-zinc-400 uppercase">Temps</div><div className="font-mono text-lg tabular-nums leading-tight">{fmtTime(time)}</div></div>
            <div><div className="text-[10px] text-zinc-400 uppercase">Coups</div><div className="font-mono text-lg tabular-nums leading-tight">{moves}</div></div>
            <div><div className="text-[10px] text-zinc-400 uppercase">Paires dispo.</div><div className={`font-mono text-lg tabular-nums leading-tight ${availablePairs.length <= 2 ? 'text-red-400' : 'text-emerald-400'}`}>{availablePairs.length}</div></div>
            <div><div className="text-[10px] text-zinc-400 uppercase">Score</div><div className="font-mono text-lg tabular-nums leading-tight text-amber-300">{score}</div></div>
            <div><div className="text-[10px] text-zinc-400 uppercase">Restantes</div><div className="font-mono text-lg tabular-nums leading-tight">{remaining}</div></div>
          </div>

          {/* flex-wrap + justify-center : sinon sur telephone les 2 derniers boutons
              (plein ecran et Nouvelle partie) sortent de l'ecran et sont inatteignables */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button onClick={giveHint} title="Indice (−5 pts)"
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm hover:border-amber-400/60 hover:bg-amber-400/10 transition-colors active:scale-95">💡 Indice</button>
            <button onClick={doShuffle} title="Mélanger les tuiles (−10 pts)"
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm hover:border-amber-400/60 hover:bg-amber-400/10 transition-colors active:scale-95">🔀 Mélanger</button>
            <button onClick={doUndo} disabled={undoStack.length === 0} title="Annuler le dernier coup"
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm hover:border-amber-400/60 transition-colors active:scale-95 disabled:opacity-30">↩</button>
            <button onClick={() => setShowFree(v => !v)} title="Surligner les tuiles libres"
              className={`rounded-xl border px-3 py-2 text-sm transition-colors active:scale-95 ${showFree ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-black/40'}`}>👁</button>
            <button onClick={toggleMusic} title="Musique"
              className={`rounded-xl border px-3 py-2 text-sm transition-colors active:scale-95 ${musicOn ? 'border-amber-400/40 bg-amber-400/10' : 'border-white/10 bg-black/40 opacity-50'}`}>🎵</button>
            <button onClick={toggleSfx} title="Effets sonores"
              className={`rounded-xl border px-3 py-2 text-sm transition-colors active:scale-95 ${sfxOn ? 'border-amber-400/40 bg-amber-400/10' : 'border-white/10 bg-black/40 opacity-50'}`}>🔊</button>
            <button onClick={toggleFullscreen} title="Plein écran"
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm hover:border-amber-400/50 transition-colors active:scale-95">⛶</button>
            <button onClick={() => startGame(level)} title="Recommencer"
              className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 px-4 py-2 text-sm font-semibold text-black hover:brightness-110 transition-all active:scale-95">Nouvelle partie</button>
          </div>
        </div>
        <div className="h-1 bg-black/60">
          <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-yellow-200 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* Plateau */}
      <main className="flex-1 flex items-center justify-center overflow-hidden px-4 py-3">
        <div style={{ width: bounds.w * scale, height: bounds.h * scale }}>
          <div className="relative" style={{ width: bounds.w, height: bounds.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            {/* Ombre du plateau */}
            <div className="absolute inset-x-10 bottom-0 h-10 rounded-full bg-black/50 blur-2xl" />

            {tiles.map(tile => {
              if (tile.removed) return null;
              const p = positions[tile.id];
              const isRemoving = removing.has(tile.id);
              const isSel = selected === tile.id;
              const isHint = hintPair !== null && (hintPair[0] === tile.id || hintPair[1] === tile.id);
              const free = freeIds.has(tile.id) || isRemoving;

              const left = (p.x - bounds.minX) * TW + p.z * ZX;
              const top = (p.y - bounds.minY) * TH - p.z * ZY + bounds.maxZ * ZY;

              return (
                <div
                  key={`${dealKey}-${tile.id}`}
                  onClick={(e) => { e.stopPropagation(); handleTileClick(tile.id); }}
                  className={`absolute tile-in ${isRemoving ? 'tile-vanish' : ''}`}
                  style={{
                    left, top,
                    width: TILE_W, height: TILE_H,
                    zIndex: p.z * 100 + Math.round(p.y * 2) + (isSel || isHint ? 500 : 0),
                    animationDelay: isRemoving || undoneIds.has(tile.id) ? '0ms' : `${tile.id * 9}ms`,
                    cursor: free ? 'pointer' : 'default',
                  }}
                >
                  <div
                    key={`flip-${flipKey}`}
                    className={`relative h-full w-full rounded-lg transition-transform duration-150 ${flipKey > 0 && !isRemoving ? 'tile-flip' : ''} ${isSel ? 'tile-selected -translate-y-1' : ''} ${isHint ? 'tile-hint' : ''} ${free && !isSel ? 'hover:-translate-y-0.5' : ''}`}
                    style={{
                      background: free
                        ? 'linear-gradient(145deg, #fdf6e3 0%, #f5e9c9 55%, #e8d5a3 100%)'
                        : 'linear-gradient(145deg, #b8ab8d 0%, #a39576 55%, #8f8060 100%)',
                      boxShadow: isSel || isHint
                        ? undefined
                        : `3px 4px 0 ${free ? '#a9854f' : '#6b5a3a'}, 4px 6px 0 ${free ? '#7c5f33' : '#4a3e26'}, 7px 10px 14px rgba(0,0,0,0.55)${showFree && free ? ', 0 0 0 1.5px rgba(52,211,153,0.55), 0 0 10px rgba(52,211,153,0.25)' : ''}`,
                      border: '1px solid rgba(120, 90, 40, 0.45)',
                    }}
                  >
                    {/* Reflet supérieur */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-3 rounded-t-lg bg-gradient-to-b from-white/60 to-transparent" />
                    {/* Face */}
                    <div className={`absolute inset-[2px] rounded-md ${free ? 'bg-[#fffdf5]' : 'bg-[#c5bb9f]'}`} style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.12)' }}>
                      <div className={free ? '' : 'opacity-55 saturate-50'}>
                        <div style={{ width: TILE_W - 4, height: TILE_H - 4 }}>
                          <TileFace type={tile.type} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Particules d'étincelles */}
            {particles.map(pt => (
              <span
                key={pt.id}
                className="spark"
                style={{
                  left: pt.x, top: pt.y,
                  background: pt.color,
                  ['--sx' as string]: `${pt.dx}px`,
                  ['--sy' as string]: `${pt.dy}px`,
                  zIndex: 999,
                }}
              />
            ))}
          </div>
        </div>
      </main>

      <footer className="pb-2 text-center text-[11px] text-zinc-500">
        Cliquez sur deux tuiles libres identiques pour les retirer · Créé par <span className="text-amber-400/80">Hylst, Geoffroy</span>, avec l'aide d'une IA
      </footer>

      {/* Écran de victoire */}
      {gameWon && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md">
          {Array.from({ length: 60 }).map((_, i) => (
            <span
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                background: ['#fbbf24', '#fb7185', '#34d399', '#60a5fa', '#f472b6'][i % 5],
                animationDuration: `${2.5 + Math.random() * 2.5}s`,
                animationDelay: `${Math.random() * 2}s`,
                borderRadius: i % 3 === 0 ? '50%' : '2px',
              }}
            />
          ))}
          <div className="overlay-in text-center px-6">
            <div className="text-7xl mb-4">🏆</div>
            <h2 className="text-5xl font-serif font-bold shimmer-text mb-3">Victoire !</h2>
            <p className="text-zinc-300 mb-1">
              <span className="text-amber-300 font-semibold">{level.name}</span> terminé en <span className="font-mono">{fmtTime(time)}</span>
            </p>
            <p className="text-sm text-zinc-400 mb-8">
              {moves} coups · {hintsUsed} indice{hintsUsed > 1 ? 's' : ''} · {shuffles} mélange{shuffles > 1 ? 's' : ''} · Score final : <span className="text-amber-300 font-bold">{score}</span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {level.id < LEVELS.length && (
                <button onClick={() => startGame(LEVELS[level.id])}
                  className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 px-8 py-3.5 font-semibold text-black hover:brightness-110 transition-all active:scale-95">
                  Niveau suivant →
                </button>
              )}
              <button onClick={() => startGame(level)}
                className="rounded-2xl border border-white/20 px-6 py-3.5 hover:bg-white/10 transition-colors active:scale-95">
                Rejouer
              </button>
              <button onClick={() => setScreen('menu')}
                className="rounded-2xl border border-white/20 px-6 py-3.5 hover:bg-white/10 transition-colors active:scale-95">
                Menu des niveaux
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Écran de blocage */}
      {stuck && !gameWon && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="overlay-in text-center px-6">
            <div className="text-6xl mb-4">🧱</div>
            <h2 className="text-3xl font-serif font-bold text-red-300 mb-2">Plus aucun coup possible</h2>
            <p className="text-zinc-400 mb-8">Il reste {remaining} tuiles, mais aucune paire n'est jouable.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={doShuffle}
                className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 px-8 py-3.5 font-semibold text-black hover:brightness-110 transition-all active:scale-95">
                🔀 Mélanger les tuiles
              </button>
              <button onClick={doUndo} disabled={undoStack.length === 0}
                className="rounded-2xl border border-white/20 px-6 py-3.5 hover:bg-white/10 transition-colors disabled:opacity-30 active:scale-95">
                ↩ Annuler
              </button>
              <button onClick={() => startGame(level)}
                className="rounded-2xl border border-white/20 px-6 py-3.5 hover:bg-white/10 transition-colors active:scale-95">
                Recommencer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
