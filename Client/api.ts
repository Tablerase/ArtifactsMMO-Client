import type { CharacterSchema } from "./interface/character.ts";
import type { ItemSchema } from "./interface/item.ts";
import { ResourceSchema } from "./interface/resource.ts";

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

  if (json.error) {
    throw new ApiError(json.error.code, json.error.message);
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

  // Items / Catalog
  getItem: (code: string) => endpointRequest<ItemSchema>(`/items/${code}`),

  // Resources
  getRessources: (page: number = 1) =>
    endpointRequest<ResourceSchema>(`/resources?page=${page}`),
};
