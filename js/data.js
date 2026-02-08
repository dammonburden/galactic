export const TOWERS = [
  { n: 'Scout Spire', i: '🛰️', c: 60, r: 182, rm: 1.14, fr: 1.05 },
  { n: 'Bastion Ring', i: '🛡️', c: 85, r: 156, rm: 1.0, fr: 1.08 },
  { n: 'Reactor Pike', i: '⚛️', c: 95, r: 152, rm: 0.98, fr: 1.18 },
  { n: 'Echo Relay', i: '📡', c: 105, r: 178, rm: 1.12, fr: 1.02 },
  { n: 'Prism Node', i: '🔷', c: 110, r: 166, rm: 1.06, fr: 1.08 },
  { n: 'Nebula Veil', i: '🌫️', c: 115, r: 192, rm: 1.16, fr: 0.98 },
  { n: 'Gravity Anchor', i: '🪐', c: 120, r: 172, rm: 1.03, fr: 1.0 },
  { n: 'Forge Turret', i: '🏭', c: 130, r: 160, rm: 1.0, fr: 1.12 },
  { n: 'Genesis Foundry', i: '🧬', c: 140, r: 140, rm: 1.0, fr: 0.85, spawn: 1 },
  { n: 'Rift Obelisk', i: '🌀', c: 150, r: 176, rm: 1.06, fr: 1.04 },
];

export const WEAPONS = [
  { n: 'Ion Swarm', i: '🧿', c: 65, d: 10, f: 10.6, r: 190, ao: 0.16, ch: 2, h: 0.85 },
  { n: 'Photon Lance', i: '🔆', c: 70, d: 16, f: 7.6, r: 196, ao: 0, ch: 0, h: 0.9 },
  { n: 'Rail Spike', i: '🧲', c: 75, d: 54, f: 2.5, r: 182, ao: 0, ch: 0, h: 1.05 },
  { n: 'Quantum Shards', i: '✨', c: 78, d: 16, f: 6.4, r: 186, ao: 0.12, ch: 0, h: 0.98 },
  { n: 'Arc Chain', i: '⚡', c: 80, d: 24, f: 4.6, r: 178, ao: 0.06, ch: 5, h: 1.0 },
  { n: 'Plasma Mortar', i: '💥', c: 85, d: 50, f: 2.0, r: 168, ao: 0.52, ch: 0, h: 1.15 },
  { n: 'Void Needle', i: '🕳️', c: 88, d: 26, f: 4.2, r: 216, ao: 0, ch: 0, h: 0.92 },
  { n: 'Graviton Beam', i: '🪢', c: 90, d: 14, f: 8.0, r: 208, ao: 0.18, ch: 1, h: 0.92 },
  { n: 'Antimatter Mine', i: '☢️', c: 95, d: 74, f: 1.65, r: 152, ao: 0.66, ch: 0, h: 1.2 },
  { n: 'Singularity Driver', i: '🌀', c: 105, d: 12, f: 7.2, r: 200, ao: 0.46, ch: 0, h: 1.02 },
];

export const ENEMIES = [
  { n: 'Drone Cluster', i: '👾', hp: 0.34, sp: 0.86, c: 1.25, b: 0.18, core: 0.68 },
  { n: 'Skiff Swarm', i: '🛸', hp: 0.38, sp: 0.92, c: 1.05, b: 0.2, core: 0.78 },
  { n: 'Bruiser Pack', i: '🤖', hp: 0.52, sp: 0.78, c: 0.62, b: 0.3, core: 1.05 },
  { n: 'Shard Cloud', i: '🔺', hp: 0.42, sp: 0.84, c: 1.35, b: 0.16, core: 0.64 },
  { n: 'Wisp Flock', i: '🫧', hp: 0.28, sp: 0.98, c: 1.1, b: 0.14, core: 0.58 },
  { n: 'Goliath', i: '🦾', hp: 0.78, sp: 0.68, c: 0.22, b: 0.7, core: 1.55 },
  { n: 'Phantom Wing', i: '👻', hp: 0.46, sp: 0.88, c: 0.8, b: 0.26, core: 0.94 },
  { n: 'Carrier', i: '📦', hp: 0.5, sp: 0.76, c: 0.38, b: 0.5, core: 1.25 },
];

export const BOSS = {
  n: 'Worldbreaker',
  i: '👑',
  hp: 5.2,
  sp: 0.58,
  c: 0.08,
  b: 3.4,
  core: 3.8,
};

export const MEGA_BOSS = {
  n: 'Abyss Titan',
  i: '🛑',
  hp: 9.2,
  sp: 0.32,
  c: 0.05,
  b: 9.5,
  core: 12000,
};
