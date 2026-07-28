export type ObjectiveType =
  | "CRAFT"
  | "COMBAT"
  | "GATHERING";

export interface Objective {
  type: ObjectiveType;
  code: string; // item code - monster code - ...
  quantity: number;
}
