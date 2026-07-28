import type { CharacterSchema, ItemSlotType } from "./interface/character.ts";
import type { CooldownSchema } from "./interface/action.ts";
import type { ItemSchema } from "./interface/item.ts";

export interface EquipSchema {
  code: string;
  slot: ItemSlotType;
  quantity?: number;
}

export interface UnequipSchema {
  slot: ItemSlotType;
  quantity?: number;
}

export interface EquipmentItemSchema {
  slot: ItemSlotType;
  item: ItemSchema;
  quantity?: number;
}

export interface EquipmentTransactionSchema {
  cooldown: CooldownSchema;
  items: EquipmentItemSchema[];
  character: CharacterSchema;
}

import { MapContentType, MapLayer, MapSchema } from "./interface/map.ts";
import { ResourceSchema } from "./interface/resource.ts";
import {
  MonsterResponseSchema,
  MonsterSchema,
  MonstersPageResponseSchema,
} from "./interface/monster.ts";
import {
  CombatSimulationDataSchema,
  CombatSimulationRequestSchema,
} from "./interface/simulation.ts";

const BASE_URL = "https://api.artifactsmmo.com";
const TOKEN = Deno.env.get("ARTIFACTS_TOKEN");

if (!TOKEN) throw new Error("ARTIFACTS_TOKEN is required");

// Unified Error Interface for Artifacts MMO
export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

async function endpointRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  // Authentication headers — your token identifies you on the server
  const headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": `Bearer ${TOKEN}`,
    ...options.headers,
  };

  const result = await fetch(url, { ...options, headers });
  const json = await result.json();

  if (!result.ok || json.error) {
    const errorCode = typeof json.error === "object" && json.error?.code
      ? json.error.code
      : result.status;

    const errorMessage = typeof json.error === "object" && json.error?.message
      ? json.error.message
      : typeof json.error === "string"
      ? json.error
      : json.message ?? result.statusText ?? "Unknown API Error";

    throw new ApiError(errorCode, errorMessage);
  }

  return json.data;
}

export const api = {
  // Account & Characters
  getCharacters: () => endpointRequest<CharacterSchema[]>("/my/characters"),

  getCharacter: (name: string) =>
    endpointRequest<CharacterSchema>(`/characters/${name}`),

  // Actions
  move: (character: string, x: number, y: number) =>
    endpointRequest<any>(`/my/${character}/action/move`, {
      method: "POST",
      body: JSON.stringify({ x, y }),
    }),

  fight: (character: string) =>
    endpointRequest<any>(`/my/${character}/action/fight`, {
      method: "POST",
    }),

  gather: (character: string) =>
    endpointRequest<any>(`/my/${character}/action/gathering`, {
      method: "POST",
    }),

  craft: (character: string, itemCode: string, quantity = 1) =>
    endpointRequest<any>(`/my/${character}/action/crafting`, {
      method: "POST",
      body: JSON.stringify({ code: itemCode, quantity }),
    }),

  equip: (character: string, items: EquipSchema[]) =>
    endpointRequest<EquipmentTransactionSchema>(
      `/my/${character}/action/equip`,
      {
        method: "POST",
        body: JSON.stringify(items),
      },
    ),

  unequip: (character: string, items: UnequipSchema[]) =>
    endpointRequest<EquipmentTransactionSchema>(
      `/my/${character}/action/unequip`,
      {
        method: "POST",
        body: JSON.stringify(items),
      },
    ),

  // Items / Catalog
  getItem: (code: string) => endpointRequest<ItemSchema>(`/items/${code}`),

  // Resources
  getResources: (page: number = 1, drop?: string, min_level?: number) =>
    endpointRequest<ResourceSchema[]>(
      `/resources?page=${page}${drop ? `&drop=${drop}` : ""}${
        min_level ? `&min_level=${min_level}` : ""
      }`,
    ),

  // Monsters
  getMonster: (code: string) =>
    endpointRequest<MonsterSchema>(`/monsters/${code}`),
  getMonstersByDrop: (itemCode: string) =>
    endpointRequest<MonsterSchema[]>(`/monsters?drop=${itemCode}`),

  // Simulation
  simulateCombat: (req: CombatSimulationRequestSchema) =>
    endpointRequest<CombatSimulationDataSchema>("/simulation/fight", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  //Maps
  getMaps: (
    content_code?: string,
    content_type?: MapContentType,
    page: number = 1,
    size: number = 50,
  ) => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (content_code) params.append("content_code", content_code);
    if (content_type) params.append("content_type", content_type);

    return endpointRequest<MapSchema[]>(`/maps?${params.toString()}`);
  },

  // 2. Get map info by (x, y) coordinates & layer
  getMapByPosition: (layer: MapLayer, x: number, y: number) =>
    endpointRequest<MapSchema>(`/maps/${layer}/${x}/${y}`),

  // 3. Get map info by Map ID
  getMapById: (map_id: number) =>
    endpointRequest<MapSchema>(`/maps/id/${map_id}`),
};
