import { api } from "../api.ts";
import { CharacterSchema } from "../interface/character.ts";
import { Objective } from "../interface/objective.ts";
import { CraftActionPlan } from "../planBuilder.ts";

export async function combatPlanner(
  objective: Objective,
  character: CharacterSchema,
): Promise<CraftActionPlan | null> {
  const plan: CraftActionPlan | null = null;

  // 1. Check for available inventory slot (needed to allow fight)
  if (character.inventory.length >= character.inventory_max_items) {
    console.log(
      `Character ${character.name} inventory is at ${character.inventory} / ${character.inventory_max_items}`,
    );
    return null;
  }

  // 2. Retrieve monster metadata
  const monsterInfo = await api.getMonster(objective.code);

  // 3. Check if fight possible
  const winnable = await api.simulateCombat({
    characters: [character],
    monster: monsterInfo.code,
    iterations: 10,
  });
  if (winnable.winrate < 90) {
    console.log(
      `Character ${character.name} is not strong enough to fight ${monsterInfo.name}`,
    );
    return null;
  }

  return plan;
}

const character = await api.getCharacter("Heolig");

combatPlanner({
  type: "COMBAT",
  code: "chicken",
  quantity: 1,
}, character);
