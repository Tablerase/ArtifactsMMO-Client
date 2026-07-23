import type { DropRateSchema } from "./drop.ts";
import type { SimpleEffectSchema } from "./item.ts";

export type MonsterType = "normal" | "elite" | "boss" | "raid_boss";

export interface MonsterSchema {
  name: string; // Name of the monster (e.g. "Chicken")
  code: string; // Unique code ID (e.g. "chicken")
  level: number; // Monster level
  type: MonsterType; // 'normal', 'elite', 'boss', 'raid_boss'

  // Combat stats
  hp: number;
  attack_fire: number;
  attack_earth: number;
  attack_water: number;
  attack_air: number;

  // Defensive stats (% resistances)
  res_fire: number;
  res_earth: number;
  res_water: number;
  res_air: number;

  critical_strike: number; // Critical strike %
  initiative: number; // Initiative turn order

  // Gold drops
  min_gold: number;
  max_gold: number;

  // Item drops
  drops: DropRateSchema[];

  // Optional status effects
  effects?: SimpleEffectSchema[];
}

export interface MonsterResponseSchema {
  data: MonsterSchema;
}

export interface MonstersPageResponseSchema {
  data: MonsterSchema[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
