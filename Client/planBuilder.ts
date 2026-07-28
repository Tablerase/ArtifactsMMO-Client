import type { QueuedAction } from "./interface/queue.ts";
import type { MapSchema } from "./interface/map.ts";
import type { ItemSlotType } from "./interface/character.ts";
import { Objective } from "./interface/objective.ts";

export interface CraftEnrichedDependency {
  itemCode: string;
  neededQuantity: number;
  unequipSlots?: ItemSlotType[];
  resource?: {
    code: string;
    targetTile?: { x: number; y: number } | null;
    locations?: MapSchema[];
  };
}

export interface CraftActionPlan {
  objective: Objective;
  workshopLocation?: { x: number; y: number } | null;
  dependencies: CraftEnrichedDependency[];
}

export function buildActionQueue(plan: CraftActionPlan): QueuedAction[] {
  const queue: QueuedAction[] = [];
  const { objective: objective, dependencies, workshopLocation } = plan;

  // 1. Loop through all missing dependencies (e.g. Ash Wood, Copper Ore)
  for (const dep of dependencies) {
    if (dep.neededQuantity > 0 && dep.resource && dep.resource.targetTile) {
      const tile = dep.resource.targetTile;

      // A. Move to resource location
      queue.push({
        type: "move",
        x: tile.x,
        y: tile.y,
        name: `Move to ${dep.resource.code} (${tile.x}, ${tile.y})`,
      });

      // B. Gather resource N times
      queue.push({
        type: "gather",
        itemCode: dep.itemCode,
        times: dep.neededQuantity,
      });
    }
  }

  // 2. Move to Crafting Workshop (dynamically fetched from API)
  if (workshopLocation) {
    queue.push({
      type: "move",
      x: workshopLocation.x,
      y: workshopLocation.y,
      name: `Move to Workshop (${workshopLocation.x}, ${workshopLocation.y})`,
    });
  }

  // 3. Unequip any equipped ingredients required for crafting
  for (const dep of dependencies) {
    if (dep.unequipSlots) {
      for (const slot of dep.unequipSlots) {
        queue.push({
          type: "unequip",
          slot,
        });
      }
    }
  }

  // 4. Craft Item
  if (workshopLocation) {
    queue.push({
      type: "craft",
      itemCode: objective.code,
      quantity: objective.quantity,
      workshopX: workshopLocation.x,
      workshopY: workshopLocation.y,
    });
  }

  // 5. Equip Crafted Item
  // queue.push({
  //   type: "equip",
  //   itemCode: objective.code,
  //   slot: "boots",
  // });

  return queue;
}

// TODO: make a strategy pattern for crafting, combat ... (plan builder and action planner there)
