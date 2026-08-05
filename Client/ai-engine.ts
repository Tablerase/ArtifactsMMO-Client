import { CharacterSchema, ItemSlotType } from "./interface/character.ts";
import { ItemSchema } from "./interface/item.ts";
import { Objective } from "./interface/objective.ts";
import { QueuedAction } from "./interface/queue.ts";
import { GatheringSkill, ResourceSchema } from "./interface/resource.ts";
import { executeQueue } from "./queue-executor.ts";
import { findItemOnCharacter } from "./utils/search-items.ts";
import type { Logger } from "./utils/logger.ts";
import { gameData } from "./utils/game-data.ts";
import { MonsterSchema } from "./interface/monster.ts";
import { simulateCombatLocal } from "./utils/combat-simulator.ts";
import { MapSchema } from "./interface/map.ts";
import { TaskFullSchema } from "./interface/task.ts";

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

    const queue: QueuedAction[] = [];
    switch (this.objective.type) {
      case "CRAFT": {
        const resQueue = await this.craft(
          this.objective.code,
          this.objective.quantity,
        );
        queue.push(...resQueue);
        break;
      }
      case "GATHERING": {
        const resource = gameData.getResourceByDrop(this.objective.code);
        if (resource) {
          const resQueue = await this.gather(resource, this.objective.quantity);
          queue.push(...resQueue);
        }
        break;
      }
      case "COMBAT": {
        const resQueue = await this.combat(
          this.objective.code,
          this.objective.quantity,
        );
        queue.push(...resQueue);
        break;
      }
      case "TASK": {
        const resQueue = await this.task(
          this.objective.quantity,
          this.objective.code,
        );
        queue.push(...resQueue);
        break;
      }
      default:
        await this.logger?.info(
          "OBJECTIVE",
          `Unhandled objective type: ${this.objective.type}`,
        );
        break;
    }

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

  private bestGatheringEquipmentInInventory(
    skill: GatheringSkill,
  ): ItemSchema | null {
    const skillRelatedItems: ItemSchema[] = [];
    for (const item of this.character.inventory) {
      const itemInfo = gameData.getItem(item.code);
      if (
        itemInfo && itemInfo.effects &&
        itemInfo.effects.find((effect) => effect.code === skill)
      ) {
        skillRelatedItems.push(itemInfo);
      }
    }

    let bestTool: ItemSchema | null = null;
    let bestValue: number = 0;
    for (const equipment of skillRelatedItems) {
      if (equipment.effects) {
        for (const effect of equipment.effects) {
          // Effect for gathering are negative effect on the skill (ex: mining -10 => 10% cooldown reduction)
          if (effect.value < bestValue) {
            bestTool = equipment;
            bestValue = effect.value;
          }
        }
      }
    }

    console.log(this.character.name, "bestTool", bestTool);

    if (bestTool) {
      const slot: ItemSlotType = bestTool.type as ItemSlotType;
      const slotKey = `${slot}_slot` as keyof CharacterSchema;

      const currentlyEquipped: string = this.character[slotKey] as string;
      const currentlyEquippedInfo = currentlyEquipped
        ? gameData.getItem(currentlyEquipped)
        : null;
      const currentEffectEquipped =
        currentlyEquippedInfo?.effects?.find((effect) => effect.code === skill)
          ?.value || 0;
      return bestValue < currentEffectEquipped ? bestTool : null;
    }
    return null;
  }

  async gather(
    resource: ResourceSchema,
    quantity: number,
  ): Promise<QueuedAction[]> {
    const actionQueue: QueuedAction[] = [];

    const resCode = resource.code;
    const maps = gameData.getResourceMaps(resCode);

    const skill = resource.skill;
    if (skill) {
      const itemToEquip: ItemSchema | null = this
        .bestGatheringEquipmentInInventory(
          skill,
        );
      if (itemToEquip) {
        await this.logger?.info("EQUIP", `Equip ${itemToEquip}`);
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

    const resource = gameData.getResourceByDrop(itemCode);
    if (!resource) {
      await this.logger?.warn(
        "RESOURCE_NOT_FOUND",
        `No resource drop found in cache for ${itemCode}`,
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
      .map((loc) => loc.slotName.replace("_slot", "") as ItemSlotType);

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

    const itemInfo = gameData.getItem(currentItemCode);
    await this.logger?.debug("gameData", "itemInfo", itemInfo);
    const craftRecipe = itemInfo?.craft;

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

      if (craftRecipe.skill) {
        const workshopTile = gameData.getWorkshopMap(craftRecipe.skill);
        if (workshopTile) {
          await this.logger?.info(
            "WORKSHOP_FOUND",
            `Found ${craftRecipe.skill} workshop at (${workshopTile.x}, ${workshopTile.y})`,
          );

          actionQueue.push({
            type: "move",
            x: workshopTile.x,
            y: workshopTile.y,
            name:
              `Move to ${craftRecipe.skill} Workshop (${workshopTile.x}, ${workshopTile.y})`,
          });

          actionQueue.push({
            type: "craft",
            itemCode: currentItemCode,
            quantity: missingInventoryQuantity,
            workshopX: workshopTile.x,
            workshopY: workshopTile.y,
          });
        }
      }

      return actionQueue;
    }
  }

  async combat(
    monster: MonsterSchema | string,
    quantity: number,
  ): Promise<QueuedAction[]> {
    const actionQueue: QueuedAction[] = [];
    // Check for available inventory slot (needed to allow fight)
    let itemQuantityInInventory = 0;
    this.character.inventory.forEach((slot) =>
      itemQuantityInInventory += slot.quantity
    );
    if (itemQuantityInInventory > this.character.inventory_max_items) {
      await this.logger?.info(
        "INVENTORY",
        `Not enough space inventory is at ${itemQuantityInInventory} / ${this.character.inventory_max_items}`,
        this.character,
      );
      return [];
    }

    // Retrieve monster metadata
    const monsterInfo = gameData.getMonster(
      typeof monster === "string" ? monster : monster.code,
    );
    if (!monsterInfo) return [];

    // Simulation

    // !! Simulate is a prenium feature
    // const fakeCharacter = toFakeCharacter(this.character);
    // const simulateCombat = await api.simulateCombat({
    //   characters: [fakeCharacter],
    //   monster: monsterInfo.code,
    //   iterations: 10,
    // });
    // if (simulateCombat && simulateCombat.winrate < 90) {
    //   console.log(
    //     `Character ${this.character.name} is not strong enough to fight ${monsterInfo.name}`,
    //   );
    //   return [];
    // }

    // TODO: best equipment for monster function
    // Can be equiped on a fake character
    const fakeCharacter = this.character;

    const simulatedCombat = simulateCombatLocal(fakeCharacter, monsterInfo);
    if (simulatedCombat.winrate <= 90) {
      await this.logger?.warn(
        "COMBAT",
        `Character is strong enough to fight ${monsterInfo.name}`,
        { monster: monsterInfo, character: this.character },
      );
    }

    // TODO: Equip best gear - rm temporary hard coded equip
    actionQueue.push({
      "type": "equip",
      "itemCode": "copper_dagger",
      "slot": "weapon",
    });

    // Move to monster location
    const mapsForMonster = gameData.getMonsterMaps(monsterInfo.code);
    const targetTile = mapsForMonster[0];
    actionQueue.push({
      "type": "move",
      "x": targetTile.x,
      "y": targetTile.y,
      "name":
        `Move to ${targetTile.name} (${targetTile.x}, ${targetTile.y}) where ${monsterInfo.name} can be fought`,
    });

    // Fight and Rest till quantity reached
    // TODO: Maybe action loop refactoring because in case of unexpected death break action queue because move to monster is needed
    let remainingQuantity = quantity;
    let charHP = this.character.hp;
    while (remainingQuantity > 0) {
      const possibleFight = Math.floor(
        charHP / (charHP - simulatedCombat.avgPlayerHpRemaining),
      );
      // console.log(
      //   `possibleFight: ${possibleFight}, avgPlayerHpRemaining: ${simulatedCombat.avgPlayerHpRemaining}, hp: ${charHP} ratio: ${
      //     charHP / (charHP - simulatedCombat.avgPlayerHpRemaining)
      //   }`,
      // );
      if (possibleFight >= 1) {
        for (let i = 0; i < possibleFight; i++) {
          actionQueue.push({
            "type": "fight",
          });
        }
      }
      remainingQuantity -= possibleFight;
      actionQueue.push({
        "type": "rest",
      });
      charHP = this.character.max_hp;
    }

    return actionQueue;
  }

  private async taskActions(taskToDo: TaskFullSchema): Promise<QueuedAction[]> {
    const actionQueue: QueuedAction[] = [];

    let taskLocation: MapSchema[];
    let taskMasterLocation: MapSchema | undefined;
    if (taskToDo?.type == "monsters") {
      taskLocation = gameData.getMonsterMaps(taskToDo.code);
      taskMasterLocation = gameData.getTaskMasterLocationByType(taskToDo.type);
    } else if (taskToDo?.type == "items") {
      taskLocation = gameData.getResourceMaps(taskToDo.code);
      taskMasterLocation = gameData.getTaskMasterLocationByType(taskToDo.type);
    } else return [];

    if (!taskMasterLocation) {
      this.logger?.warn(
        "TASK",
        "Task master couldnt be found",
        taskToDo,
      );
      return [];
    }

    // Check if already doing this task
    if (this.character.task.length === 0) {
      // Go to task master
      actionQueue.push({
        type: "move",
        x: taskMasterLocation.x,
        y: taskMasterLocation.y,
      });
      // Accept task
      actionQueue.push({
        type: "accept_task",
      });
    } else if (this.character.task === taskToDo.code) {
      taskToDo.min_quantity = this.character.task_total -
        this.character.task_progress;
    }

    // Executing the task
    if (taskToDo.type === "monsters") {
      actionQueue.push(
        ...await this.combat(taskToDo.code, taskToDo.min_quantity),
      );
    } else {
      actionQueue.push(
        ...await this.craft(taskToDo.code, taskToDo.min_quantity),
      );
    }
    // Go complete the task
    actionQueue.push({
      type: "move",
      x: taskMasterLocation.x,
      y: taskMasterLocation.y,
    });
    actionQueue.push({
      type: "complete_task",
    });
    return actionQueue;
  }

  private bestTask(tasks: TaskFullSchema[]) {
    // TODO: best task value / coin level / durations
    if (tasks.length <= 0) return null;
    return tasks[tasks.length - 1];
  }

  private cancelTaskActions(): QueuedAction[] {
    const actionQueue: QueuedAction[] = [];

    let taskMasterLocation: MapSchema | undefined;
    taskMasterLocation = gameData.getTaskMasterLocationByType(
      this.character.task_type,
    );
    if (!taskMasterLocation) {
      this.logger?.error(
        "TASK",
        "Could not find task master",
        this.character.task,
      );
      return [];
    }

    // Go to task master
    actionQueue.push({
      type: "move",
      x: taskMasterLocation.x,
      y: taskMasterLocation.y,
    });
    // Cancel
    actionQueue.push({
      type: "cancel_task",
    });

    return actionQueue;
  }

  async task(
    quantity: number,
    taskCode: string,
    cancelPrevious: boolean = false,
  ) {
    const actionQueue: QueuedAction[] = [];

    // Check previous task
    if (this.character.task.length > 0 && cancelPrevious != true) {
      await this.logger?.info(
        "TASK",
        `Task ${this.character.task} already in progress ${this.character.task_progress}/${this.character.task_total}`,
      );
      const taskToDo = gameData.getTask(this.character.task);
      actionQueue.push(...await this.taskActions(taskToDo!));
      return actionQueue;
    }
    if (this.character.task.length > 0 && cancelPrevious == true) {
      await this.logger?.info(
        "TASK",
        "Cancelling previous task",
        this.character.task,
      );
      actionQueue.push(...this.cancelTaskActions());
    }

    if (taskCode !== "unknown") {
      const taskToDo = gameData.getTask(taskCode);
      if (!taskToDo) {
        await this.logger?.warn("TASK", "Task couldnt be found", taskCode);
        return actionQueue;
      }
      actionQueue.push(...await this.taskActions(taskToDo));
      return actionQueue;
    } else {
      // Recover tasks
      const availableTasks = gameData.getTasksByMaxLevel(this.character.level);

      // Find best tasks value/coin/level/durations
      const taskToDo = this.bestTask(availableTasks);
      if (!taskToDo) {
        await this.logger?.warn(
          "TASK",
          "No appropriate task found",
          availableTasks,
        );
        return [];
      }
      // Create queue for tasks
      for (let i = 0; i < quantity; i++) {
        actionQueue.push(...await this.taskActions(taskToDo));
      }
      return actionQueue;
    }
  }
}
