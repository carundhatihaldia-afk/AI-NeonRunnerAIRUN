export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type Lane = -1 | 0 | 1; // Left (-2.5), Center (0), Right (+2.5)

export type AnimationState = 'RUN' | 'JUMP' | 'SLIDE' | 'LAND' | 'HIT';

export type ObstacleType = 
  | 'LOW_BARRIER'     // Must jump over (laser barricade)
  | 'HIGH_BEAM'       // Must slide under (overhead scan pipe/energy beam)
  | 'HOVER_CAR'       // Must switch lane (blocked lane)
  | 'SENTINEL_TURRET' // Must switch lane (security drone block)
  | 'DOUBLE_BARRIER'; // 2 lanes blocked, 1 open

export type PowerUpType = 
  | 'SHIELD' 
  | 'MAGNET' 
  | 'DASH' 
  | 'MULTIPLIER';

export interface PowerUpActive {
  type: PowerUpType;
  duration: number;
  maxDuration: number;
}

export interface CharacterSkin {
  id: string;
  name: string;
  jacketColor: string;
  accentColor: string;
  hairColor: string;
  visorColor: string;
}

export const CHARACTER_SKINS: CharacterSkin[] = [
  {
    id: 'cyber-cyan',
    name: 'Neo Cyan',
    jacketColor: '#1e293b',
    accentColor: '#06b6d4',
    hairColor: '#0891b2',
    visorColor: '#22d3ee',
  },
  {
    id: 'solar-amber',
    name: 'Solar Surge',
    jacketColor: '#27272a',
    accentColor: '#f59e0b',
    hairColor: '#d97706',
    visorColor: '#fbbf24',
  },
  {
    id: 'neon-magenta',
    name: 'Vapor Wave',
    jacketColor: '#18181b',
    accentColor: '#ec4899',
    hairColor: '#db2777',
    visorColor: '#f472b6',
  },
  {
    id: 'matrix-lime',
    name: 'Matrix Echo',
    jacketColor: '#14532d',
    accentColor: '#22c55e',
    hairColor: '#16a34a',
    visorColor: '#4ade80',
  },
];

export const LANE_WIDTH = 2.5;
export const LANES: Lane[] = [-1, 0, 1];
export const BASE_SPEED = 24.0;
export const MAX_SPEED = 48.0;
export const JUMP_HEIGHT = 2.6;
export const JUMP_DURATION = 0.65;
export const SLIDE_DURATION = 0.75;
