import { CharacterSchema } from "./character.ts";

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

export function toFakeCharacter(char: CharacterSchema): FakeCharacterSchema {
  // Convert empty string "" to null for the simulation API
  const slot = (
    val?: string | null,
  ) => (val && val.trim().length > 0 ? val : null);

  return {
    level: char.level,
    weapon_slot: slot(char.weapon_slot),
    shield_slot: slot(char.shield_slot),
    helmet_slot: slot(char.helmet_slot),
    body_armor_slot: slot(char.body_armor_slot),
    leg_armor_slot: slot(char.leg_armor_slot),
    boots_slot: slot(char.boots_slot),
    rune_slot: slot(char.rune_slot),
    amulet_slot: slot(char.amulet_slot),
    ring1_slot: slot(char.ring1_slot),
    ring2_slot: slot(char.ring2_slot),
    artifact1_slot: slot(char.artifact1_slot),
    artifact2_slot: slot(char.artifact2_slot),
    artifact3_slot: slot(char.artifact3_slot),
    utility1_slot: slot(char.utility1_slot),
    utility1_slot_quantity: char.utility1_slot
      ? char.utility1_slot_quantity
      : undefined,
    utility2_slot: slot(char.utility2_slot),
    utility2_slot_quantity: char.utility2_slot
      ? char.utility2_slot_quantity
      : undefined,
  };
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
