import type { DropRateSchema } from "./drop.ts";

export type GatheringSkill = "mining" | "woodcutting" | "fishing" | "alchemy";

export interface ResourceSchema {
  name: string; // Name of the resource (e.g. "Ash Tree")
  code: string; // Unique code ID (e.g. "ash_tree")
  skill: GatheringSkill; // Required gathering skill
  level: number; // Required skill level (>= 1)
  drops: DropRateSchema[]; // List of items dropped by this resource
}

export interface ResourceResponseSchema {
  data: ResourceSchema;
}

export interface ResourcesPageResponseSchema {
  data: ResourceSchema[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
