import { api } from "./api.ts";
import { CharacterSchema } from "./interface/character.ts";
import { ResourceSchema } from "./interface/resource.ts";
import { CraftActionPlan, CraftEnrichedDependency } from "./planBuilder.ts";
import { Objective } from "./interface/objective.ts";
import { craftingPlanner } from "./objectives/crafting.ts";

/**
 * Finds which resource node drops a specific item code in 1 fast API request.
 */
export async function findResources(
  objectToFindCode: string,
): Promise<ResourceSchema | undefined> {
  console.log("🔍 Searching resources for drop:", objectToFindCode);

  const resources = await api.getResources(1, objectToFindCode);
  return resources.length > 0 ? resources[0] : undefined;
}

export async function actionPlanner(
  objective: Objective,
  character: CharacterSchema,
): Promise<CraftActionPlan | null> {
  let plan: CraftActionPlan | null = null;

  switch (objective.type) {
    case "CRAFT":
      plan = await craftingPlanner(objective, character);
      break;

    default:
      break;
  }

  return plan;
}
