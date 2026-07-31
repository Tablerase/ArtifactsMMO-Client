import { ItemSlotType } from "./character.ts";

export type QueuedAction =
  | { type: "move"; x: number; y: number; name?: string }
  | { type: "gather"; itemCode: string; times: number }
  | { type: "fight" }
  | { type: "rest" }
  | {
    type: "craft";
    itemCode: string;
    quantity: number;
    workshopX: number;
    workshopY: number;
  }
  | { type: "equip"; itemCode: string; slot: ItemSlotType }
  | { type: "unequip"; slot: ItemSlotType; quantity?: number }
  | { type: "accept_task" }
  | { type: "complete_task" }
  | { type: "trade_task"; itemCode: string; quantity: number }
  | { type: "cancel_task" }
  | { type: "exchange_task" };

