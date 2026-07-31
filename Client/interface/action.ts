export interface CooldownSchema {
  total_seconds: number;
  remaining_seconds: number;
  started_at: string;
  expiration: string;
  reason: string;
}

export interface CooldownResponse {
  "cooldown": CooldownSchema;
}

import type { CharacterSchema } from "./character.ts";
import type { MapSchema } from "./map.ts";

export interface DestinationSchema {
  x?: number;
  y?: number;
  map_id?: number;
}

export interface CharacterMovementDataSchema {
  cooldown: CooldownSchema;
  destination: MapSchema;
  path: [number, number][];
  character: CharacterSchema;
}

export interface CharacterMovementResponseSchema {
  data: CharacterMovementDataSchema;
}

export interface CharacterRestDataSchema {
  cooldown: CooldownSchema;
  hp_restored: number;
  character: CharacterSchema;
}

export interface CharacterRestResponseSchema {
  data: CharacterRestDataSchema;
}

export type ActionType =
  | "move"
  | "fight"
  | "gather"
  | "craft"
  | "rest"
  | "equip"
  | "unequip"
  | "deposit_bank"
  | "withdraw_bank";

export interface MovePayload {
  x: number;
  y: number;
  map_id?: number; // Optional map id for multi-map moves, defaults to current map if not provided
}

export interface CraftPayload {
  code: string;
  quantity?: number;
}

export interface EquipPayload {
  code: string;
  slot:
    | "weapon"
    | "shield"
    | "helmet"
    | "body_armor"
    | "leg_armor"
    | "boots"
    | "ring1"
    | "ring2"
    | "amulet"
    | "utility1"
    | "utility2";
  quantity?: number;
}

export interface UnequipPayload {
  slot: EquipPayload["slot"];
  quantity?: number;
}

export type ActionPayloadMap = {
  move: MovePayload;
  fight: Record<string, never>; // No parameters needed
  gather: Record<string, never>;
  craft: CraftPayload;
  rest: Record<string, never>;
  equip: EquipPayload[];
  unequip: UnequipPayload[];
  deposit_bank: { code: string; quantity: number }[];
  withdraw_bank: { code: string; quantity: number }[];
};

export interface CharacterAction<T extends ActionType = ActionType> {
  id: string; // Unique action UUID
  characterName: string; // Name of character executing it
  type: T; // Discriminator key
  payload: ActionPayloadMap[T]; // Type-safe payload
  status: "pending" | "in_progress" | "completed" | "failed";
  retryCount: number;
  maxRetries: number;
  createdAt: string; // ISO Timestamp
  executedAt?: string; // Timestamp when sent to server
  cooldownEnd?: string; // When character becomes free again
  result?: unknown; // API response payload
  error?: string; // Error message if failed
}
