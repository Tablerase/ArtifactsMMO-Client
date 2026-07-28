import type { ConditionSchema } from "./item.ts";

export type MapLayer = "interior" | "overworld" | "underground";

export type MapContentType =
  | "monster"
  | "resource"
  | "workshop"
  | "bank"
  | "grand_exchange"
  | "tasks_master"
  | "npc"
  | "raid";

export interface MapContentSchema {
  type: MapContentType; // e.g. "resource"
  code: string; // e.g. "ash_tree"
}

export interface InteractionSchema {
  content?: MapContentSchema | null;
  transition?: any | null;
}

export interface AccessSchema {
  type: string; // e.g. "free", "blocked"
  conditions?: ConditionSchema[] | null;
}

export interface MapSchema {
  map_id: number;
  name: string;
  skin: string;
  x: number;
  y: number;
  layer: MapLayer;
  access: AccessSchema;
  interactions: InteractionSchema;
}

export interface MapResponseSchema {
  data: MapSchema;
}

export interface MapsPageResponseSchema {
  data: MapSchema[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
