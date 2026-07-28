import { findResources } from "../actionPlanner.ts";
import { api } from "../api.ts";
import {
  CharacterSchema,
  InventorySlot,
  ItemSlotType,
} from "../interface/character.ts";
import { ItemSchema } from "../interface/item.ts";
import { MapSchema } from "../interface/map.ts";
import { Objective } from "../interface/objective.ts";
import { QueuedAction } from "../interface/queue.ts";
import { GatheringSkill, ResourceSchema } from "../interface/resource.ts";
import { executeQueue } from "../queueExecutor.ts";
import { findItemOnCharacter } from "../utils/search_items.ts";
import type { Logger } from "../utils/logger.ts";

interface CraftEnrichedDependency {
  itemCode: string;
  neededQuantity: number;
  unequipSlots?: ItemSlotType[];
  resource?: {
    code: string;
    targetTile?: { x: number; y: number } | null;
    locations?: MapSchema[];
  };
}

interface CraftActionPlan {
  objective: Objective;
  workshopLocation?: { x: number; y: number } | null;
  dependencies: CraftEnrichedDependency[];
}

export class AiEngine {
  character: CharacterSchema;
  objective: Objective;
  logger?: Logger;

  constructor(
    character: CharacterSchema,
    objective: Objective,
    logger?: Logger,
  ) {
    this.character = character;
    this.objective = objective;
    this.logger = logger;
  }

  async doObjective() {
    await this.logger?.info(
      "ENGINE_START",
      `Executing objective: ${this.objective.type} ${this.objective.code} (x${this.objective.quantity})`,
      this.objective,
    );

    const queue = await this.craft(
      this.objective.code,
      this.objective.quantity,
    );

    await this.logger?.info(
      "PLAN_BUILT",
      `Generated ${queue.length} action(s)`,
      queue,
    );

    const char = await executeQueue(this.character, queue, this.logger);
    this.character = char;
  }

  async craft(
    item: ItemSchema | string,
    quantity: number,
  ): Promise<QueuedAction[]> {
    const actionQueue: QueuedAction[] = [];

    const buildingCraftActions = await this.craftItemRecursive(item, quantity);
    actionQueue.push(...buildingCraftActions);

    return actionQueue;
  }

  private async bestGatheringEquipmentInInventory(
    skill: GatheringSkill,
  ): Promise<ItemSchema | null> {
    // Find better tools available
    let skillRelatedItems: ItemSchema[] = [];
    for (const item of this.character.inventory) {
      const itemInfo = await api.getItem(item.code);
      if (
        itemInfo && itemInfo.effects &&
        itemInfo.effects.find((effect) => effect.code === skill)
      ) {
        skillRelatedItems.push(itemInfo);
      }
    }
    // return skillRelatedItems.sort((a, b) => b.level - a.level);
    // Equip better tools
    let bestTool: ItemSchema | null = null;
    let bestValue: number = 0;
    for (const equipment of skillRelatedItems) {
      if (equipment.effects) {
        for (const effect of equipment.effects) {
          if (effect.value > bestValue) {
            bestTool = equipment;
            bestValue = effect.value;
          }
        }
      }
    }
    if (bestTool) {
      const slot: ItemSlotType =
        (bestTool.type === "tool" || bestTool.type === "weapon")
          ? "weapon"
          : (bestTool.type as ItemSlotType);

      const slotKey = `${slot}_slot` as keyof CharacterSchema;

      const currentlyEquipped: string = this.character[slotKey] as string;
      const currentlyEquippedInfo = await api.getItem(currentlyEquipped);
      const res = currentlyEquippedInfo.level > bestTool.level
        ? null
        : bestTool;
      return res ?? null;
    }
    return null;
  }

  async gather(
    resource: ResourceSchema | string,
    quantity: number,
  ): Promise<QueuedAction[]> {
    const actionQueue: QueuedAction[] = [];
    const resCode = typeof resource === "string" ? resource : resource.code;

    const maps = await api.getMaps(resCode);

    const skill: GatheringSkill | null = typeof resource === "string"
      ? null
      : resource.skill;
    if (skill) {
      const itemToEquip: ItemSchema | null = await this
        .bestGatheringEquipmentInInventory(
          skill,
        );
      if (itemToEquip) {
        actionQueue.push({
          type: "equip",
          itemCode: itemToEquip.code,
          slot: itemToEquip.type as ItemSlotType,
        });
      }
    }

    const targetTile = maps[0];
    if (quantity > 0 && resource && targetTile) {
      await this.logger?.info(
        "GATHER_PLAN",
        `Target resource ${resCode} at (${targetTile.x}, ${targetTile.y}) x${quantity}`,
      );

      actionQueue.push({
        type: "move",
        x: targetTile.x,
        y: targetTile.y,
        name: `Move to ${resCode} (${targetTile.x}, ${targetTile.y})`,
      });

      actionQueue.push({
        type: "gather",
        itemCode: resCode,
        times: quantity,
      });
    }

    return actionQueue;
  }

  private async bestAction(
    item: ItemSchema | string,
    quantity: number,
  ): Promise<QueuedAction[]> {
    const actionQueue: QueuedAction[] = [];
    const itemCode = typeof item === "string" ? item : item.code;

    const resource = await findResources(itemCode);
    if (!resource) {
      await this.logger?.warn(
        "RESOURCE_NOT_FOUND",
        `No resource drop found for ${itemCode}`,
      );
      return actionQueue;
    } else {
      return await this.gather(resource, quantity);
    }
  }

  private async craftItemRecursive(
    item: ItemSchema | string,
    quantity: number,
  ): Promise<QueuedAction[]> {
    const actionQueue: QueuedAction[] = [];
    const currentItemCode = typeof item === "string" ? item : item.code;

    const characterSearchResult = findItemOnCharacter(
      this.character,
      currentItemCode,
    );

    await this.logger?.debug(
      "SEARCH_ITEM",
      `Searching inventory for x${quantity} ${currentItemCode}`,
      characterSearchResult,
    );

    const equippedSlots = characterSearchResult.locations
      .filter((loc) => loc.location === "equipped")
      .map((loc) => loc.slotName.replace("_slot", "") as any);

    const inventoryQuantity = characterSearchResult.locations
      .filter((loc) => loc.location === "inventory")
      .reduce((sum, loc) => sum + loc.quantity, 0);

    const missingInventoryQuantity = quantity - inventoryQuantity;
    if (missingInventoryQuantity <= 0) {
      await this.logger?.info(
        "GOAL_SATISFIED",
        `Already has ${currentItemCode} (x${characterSearchResult.totalQuantity})`,
      );
      return actionQueue;
    } else if (missingInventoryQuantity - equippedSlots.length <= 0) {
      for (const slot of equippedSlots) {
        actionQueue.push({
          type: "unequip",
          slot: slot,
        });
      }
      await this.logger?.info(
        "UNEQUIP_PLAN",
        `Unequipping ${equippedSlots.length} slot(s) for ${currentItemCode}`,
      );
      return actionQueue;
    }

    const itemInfo = await api.getItem(currentItemCode);
    const craftRecipe = itemInfo.craft;

    if (!craftRecipe || !craftRecipe.items) {
      const actions = await this.bestAction(item, missingInventoryQuantity);
      actionQueue.push(...actions);
      return actionQueue;
    } else {
      await this.logger?.info(
        "RECIPE_FOUND",
        `Crafting ${missingInventoryQuantity}x ${currentItemCode} requires ingredients`,
        craftRecipe.items,
      );

      for (const neededItem of craftRecipe.items) {
        const totalIngredientNeeded = neededItem.quantity *
          missingInventoryQuantity;
        const actions = await this.craftItemRecursive(
          neededItem.code,
          totalIngredientNeeded,
        );
        actionQueue.push(...actions);
      }

      let workshopLocation: { x: number; y: number } | null = null;
      if (craftRecipe.skill) {
        const workshopMaps = await api.getMaps(craftRecipe.skill, "workshop");
        if (workshopMaps.length > 0) {
          workshopLocation = { x: workshopMaps[0].x, y: workshopMaps[0].y };
          await this.logger?.info(
            "WORKSHOP_FOUND",
            `Found ${craftRecipe.skill} workshop at (${workshopLocation.x}, ${workshopLocation.y})`,
          );

          if (workshopLocation) {
            actionQueue.push({
              type: "move",
              x: workshopLocation.x,
              y: workshopLocation.y,
              name:
                `Move to Workshop (${workshopLocation.x}, ${workshopLocation.y})`,
            });

            actionQueue.push({
              type: "craft",
              itemCode: currentItemCode,
              quantity: missingInventoryQuantity,
              workshopX: workshopLocation.x,
              workshopY: workshopLocation.y,
            });
          }
        }
      }

      return actionQueue;
    }
  }
}
