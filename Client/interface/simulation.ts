export interface FakeCharacterSchema {
  level: number; // 1 to 50

  // Equipment Slots (Item codes)
  weapon_slot?: string | null;
  shield_slot?: string | null;
  helmet_slot?: string | null;
  body_armor_slot?: string | null;
  leg_armor_slot?: string | null;
  boots_slot?: string | null;
  rune_slot?: string | null;
  amulet_slot?: string | null;
  ring1_slot?: string | null;
  ring2_slot?: string | null;
  artifact1_slot?: string | null;
  artifact2_slot?: string | null;
  artifact3_slot?: string | null;

  // Consumables / Utility
  utility1_slot?: string | null;
  utility1_slot_quantity?: number; // 1 to 100
  utility2_slot?: string | null;
  utility2_slot_quantity?: number; // 1 to 100
}

export interface CombatSimulationRequestSchema {
  characters: FakeCharacterSchema[]; // 1 to 3 characters
  monster: string; // Monster code (e.g. "chicken", "flying_serpent")
  iterations: number; // 1 to 100 simulation runs
}

export type CombatResultStatus = "win" | "loss";

export interface CombatResultSchema {
  /** Combat result status ('win' or 'loss') */
  result: CombatResultStatus;

  /** Total number of turns the fight lasted */
  turns: number;

  /** Detailed turn-by-turn fight logs */
  logs: string[];

  /** Individual character end stats (HP remaining, damage dealt, XP, etc.) */
  character_results: Record<string, any>[];
}

export interface CombatSimulationDataSchema {
  /** Total number of victories across all iterations */
  wins: number;

  /** Total number of defeats across all iterations */
  losses: number;

  /** Win rate percentage (0 - 100) */
  winrate: number;

  /** Detailed results from each combat iteration */
  results: CombatResultSchema[];
}

export interface CombatSimulationResponseSchema {
  data: CombatSimulationDataSchema;
}
