import type { CharacterSchema } from "./character.ts";
import type { CooldownSchema } from "./action.ts";
import type { SimpleItemSchema } from "./item.ts";

export type TaskType = "monsters" | "items";

export interface RewardsSchema {
  items: SimpleItemSchema[];
  gold: number;
}

export interface TaskSchema {
  code: string;
  type: TaskType;
  total: number;
  rewards: RewardsSchema;
}

export interface TaskFullSchema {
  code: string;
  level: number;
  type: TaskType;
  min_quantity: number;
  max_quantity: number;
  skill?: string | null;
  rewards: RewardsSchema;
}

export interface TaskDataSchema {
  cooldown: CooldownSchema;
  task: TaskSchema;
  character: CharacterSchema;
}

export interface RewardDataSchema {
  cooldown: CooldownSchema;
  rewards: RewardsSchema;
  character: CharacterSchema;
}

export interface TaskTradeSchema {
  code: string;
  quantity: number;
}

export interface TaskTradeDataSchema {
  cooldown: CooldownSchema;
  trade: TaskTradeSchema;
  character: CharacterSchema;
}

export interface TaskCancelledSchema {
  cooldown: CooldownSchema;
  character: CharacterSchema;
}

export interface TaskResponseSchema {
  data: TaskDataSchema;
}

export interface TaskFullResponseSchema {
  data: TaskFullSchema;
}

export interface RewardDataResponseSchema {
  data: RewardDataSchema;
}

export interface TaskTradeResponseSchema {
  data: TaskTradeDataSchema;
}

export interface TaskCancelledResponseSchema {
  data: TaskCancelledSchema;
}
