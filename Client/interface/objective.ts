export type ObjectiveType =
  | "CRAFT"
  | "COMBAT"
  | "GATHERING"
  | "TASK";

export interface Objective {
  type: ObjectiveType;
  code: string; // item code - monster code - ...
  quantity: number;
}
