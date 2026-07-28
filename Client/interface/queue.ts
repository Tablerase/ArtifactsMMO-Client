import { ItemSlotType } from "./character.ts";

export type QueuedAction =
  | { type: "move"; x: number; y: number; name?: string }
  | { type: "gather"; itemCode: string; times: number }
  | { type: "fight"; monsterCode: string; times: number }
  | {
    type: "craft";
    itemCode: string;
    quantity: number;
    workshopX: number;
    workshopY: number;
  }
  | { type: "equip"; itemCode: string; slot: ItemSlotType }
  | { type: "unequip"; slot: ItemSlotType; quantity?: number };
