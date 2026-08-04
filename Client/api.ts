import type { CharacterSchema, ItemSlotType } from "./interface/character.ts";
import type {
  CharacterMovementDataSchema,
  CharacterRestDataSchema,
  CooldownSchema,
  DestinationSchema,
} from "./interface/action.ts";
import type { CraftSkill, ItemSchema } from "./interface/item.ts";
import { MapContentType, MapLayer, MapSchema } from "./interface/map.ts";
import { GatheringSkill, ResourceSchema } from "./interface/resource.ts";
import { MonsterSchema } from "./interface/monster.ts";
import {
  CombatSimulationDataSchema,
  CombatSimulationRequestSchema,
} from "./interface/simulation.ts";
import { RateLimitsDataSchema } from "./interface/rates.ts";
import type {
  RewardDataSchema,
  TaskCancelledSchema,
  TaskDataSchema,
  TaskFullSchema,
  TaskTradeDataSchema,
  TaskType,
} from "./interface/task.ts";

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
  retryCount: number = 0,
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

  if (result.status === 429 && retryCount < 3) {
    const retryAfterSeconds = json.error?.data?.reset ?? 2;
    console.warn(
      `⚠️ Rate limit hit on ${path}. Retrying in ${retryAfterSeconds}s...`,
    );
    await new Promise((r) => setTimeout(r, retryAfterSeconds * 1000));
    return endpointRequest<T>(path, options, retryCount + 1);
  }

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

  getRateLimits: () => endpointRequest<RateLimitsDataSchema>("/my/rates"),

  // Actions

  /**
   * Moves character to destination coordinates (x, y) or map_id
   */
  move: (
    character: string,
    destination: DestinationSchema | { x: number; y: number } | number,
  ) => {
    const body: DestinationSchema = typeof destination === "number"
      ? { map_id: destination }
      : destination;

    return endpointRequest<CharacterMovementDataSchema>(
      `/my/${character}/action/move`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  },

  /**
   * Rest character to recover HP (1 second per 5 HP restored, min 3s)
   */
  rest: (character: string) =>
    endpointRequest<CharacterRestDataSchema>(`/my/${character}/action/rest`, {
      method: "POST",
    }),

  fight: (character: string, characters?: string[]) =>
    endpointRequest<any>(`/my/${character}/action/fight`, {
      method: "POST",
      body: JSON.stringify(characters ? { participants: characters } : {}),
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

  // Tasks API
  getTasks: (
    page: number = 1,
    size: number = 50,
    max_level?: number,
    min_level?: number,
    skill?: CraftSkill | GatheringSkill,
    type?: TaskType,
  ) => {
    const params = new URLSearchParams({
      "page": page.toString(),
      "size": size.toString(),
    });
    if (skill) params.append("skill", skill);
    if (type) params.append("type", type);
    if (max_level) params.append("max_level", max_level.toString());
    if (min_level) params.append("min_level", min_level.toString());

    return endpointRequest<TaskFullSchema[]>(
      `/tasks/list?${params.toString()}`,
    );
  },

  acceptTask: (character: string) =>
    endpointRequest<TaskDataSchema>(`/my/${character}/action/task/new`, {
      method: "POST",
    }),

  completeTask: (character: string) =>
    endpointRequest<RewardDataSchema>(`/my/${character}/action/task/complete`, {
      method: "POST",
    }),

  tradeTask: (character: string, code: string, quantity: number) =>
    endpointRequest<TaskTradeDataSchema>(`/my/${character}/action/task/trade`, {
      method: "POST",
      body: JSON.stringify({ code, quantity }),
    }),

  cancelTask: (character: string) =>
    endpointRequest<TaskCancelledSchema>(
      `/my/${character}/action/task/cancel`,
      {
        method: "POST",
      },
    ),

  exchangeTaskCoins: (character: string) =>
    endpointRequest<RewardDataSchema>(`/my/${character}/action/task/exchange`, {
      method: "POST",
    }),

  // Items / Catalog

  getItem: (code: string) => endpointRequest<ItemSchema>(`/items/${code}`),
  getItemsPage: (page = 1, size = 100) =>
    endpointRequest<ItemSchema[]>(`/items?page=${page}&size=${size}`),

  // Resources

  getResources: (page: number = 1, drop?: string, min_level?: number) =>
    endpointRequest<ResourceSchema[]>(
      `/resources?page=${page}${drop ? `&drop=${drop}` : ""}${
        min_level ? `&min_level=${min_level}` : ""
      }`,
    ),
  getResourcesPage: (page = 1, size = 100) =>
    endpointRequest<ResourceSchema[]>(`/resources?page=${page}&size=${size}`),

  // Monsters

  getMonster: (code: string) =>
    endpointRequest<MonsterSchema>(`/monsters/${code}`),
  getMonstersByDrop: (itemCode: string) =>
    endpointRequest<MonsterSchema[]>(`/monsters?drop=${itemCode}`),
  getMonstersPage: (page = 1, size = 100) =>
    endpointRequest<MonsterSchema[]>(`/monsters?page=${page}&size=${size}`),

  // Simulation

  simulateCombat: async (req: CombatSimulationRequestSchema) => {
    // ⏳ Ensure at least 1050ms between simulation requests across all worker calls
    await throttler.waitForScope("simulation", 1050);
    return endpointRequest<CombatSimulationDataSchema>("/simulation/fight", {
      method: "POST",
      body: JSON.stringify(req),
    });
  },

  //Maps

  getMapsPage: (page = 1, size = 100) =>
    endpointRequest<MapSchema[]>(`/maps?page=${page}&size=${size}`),

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

  getMapByPosition: (layer: MapLayer, x: number, y: number) =>
    endpointRequest<MapSchema>(`/maps/${layer}/${x}/${y}`),

  getMapById: (map_id: number) =>
    endpointRequest<MapSchema>(`/maps/id/${map_id}`),
};

class ScopeThrottler {
  private lastCallTimes = new Map<string, number>();

  /**
   * Waits if necessary to respect minimum delay between requests in a scope
   * @param scope Identifier for the endpoint group (e.g. "simulation" = 1000ms delay)
   * @param minDelayMs Minimum milliseconds required between calls
   */
  async waitForScope(scope: string, minDelayMs: number) {
    const now = Date.now();
    const lastTime = this.lastCallTimes.get(scope) || 0;
    const elapsed = now - lastTime;

    if (elapsed < minDelayMs) {
      const waitMs = minDelayMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    this.lastCallTimes.set(scope, Date.now());
  }
}

const throttler = new ScopeThrottler();
