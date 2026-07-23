export type ConditionOperator =
  | "eq" // equal
  | "ne" // not equal
  | "gt" // greater than
  | "lt" // less than
  | "cost" // has enough currency
  | "has_item" // has item
  | "achievement_unlocked";

export type CraftSkill =
  | "weaponcrafting"
  | "gearcrafting"
  | "jewelrycrafting"
  | "cooking"
  | "woodcutting"
  | "mining"
  | "alchemy";

export interface SimpleItemSchema {
  code: string;
  quantity: number;
}

export interface ConditionSchema {
  code: string;
  operator: ConditionOperator;
  value: number;
}

export interface SimpleEffectSchema {
  code: string;
  value: number;
  description: string;
}

export interface CraftSchema {
  skill?: CraftSkill;
  level?: number;
  items?: SimpleItemSchema[];
  quantity?: number;
}

export interface ItemSchema {
  name: string;
  code: string;
  level: number;
  type: string;
  subtype: string;
  description: string;
  tradeable: boolean;
  recyclable?: boolean;
  conditions?: ConditionSchema[];
  effects?: SimpleEffectSchema[];
  craft?: CraftSchema | null;
}

export interface ItemResponseSchema {
  data: ItemSchema;
}
export interface ItemsPageResponseSchema {
  data: ItemSchema[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
