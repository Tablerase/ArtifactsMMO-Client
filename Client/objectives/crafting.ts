import { api } from "../api.ts";
import { CharacterSchema } from "../interface/character.ts";
import { findItemOnCharacter } from "../utils/search_items.ts";
import { CraftActionPlan, CraftEnrichedDependency } from "../planBuilder.ts";
import { Objective } from "../interface/objective.ts";
import { findResources } from "../actionPlanner.ts";

export async function craftingPlanner(
  objective: Objective,
  character: CharacterSchema,
): Promise<CraftActionPlan | null> {
  // 1. Check if character already has the objective item
  const searchResult = findItemOnCharacter(character, objective.code);
  if (searchResult.found && searchResult.totalQuantity >= objective.quantity) {
    console.log(
      `✅ Character ${character.name} already has ${objective} (x${searchResult.totalQuantity})`,
    );
    return null;
  }

  // 2. Retrieve item metadata & craft recipes
  const itemInfo = await api.getItem(objective.code);
  const craftRecipe = itemInfo.craft;

  if (!craftRecipe || !craftRecipe.items) {
    // Item cannot be crafted directly — check if it's a raw resource
    const resource = await findResources(objective.code);
    if (!resource) {
      return { objective: objective, dependencies: [] };
    }

    const maps = await api.getMaps(resource.code);
    return {
      objective: objective,

      dependencies: [
        {
          itemCode: objective.code,
          neededQuantity: objective.quantity,
          resource: {
            code: resource.code,
            targetTile: maps[0] ?? null,
            locations: maps,
          },
        },
      ],
    };
  }

  // 3. Dynamically fetch workshop location based on crafting skill (e.g. "weaponcrafting")
  let workshopLocation: { x: number; y: number } | null = null;
  if (craftRecipe.skill) {
    console.log(`🏭 Searching workshop map for skill: ${craftRecipe.skill}`);
    const workshopMaps = await api.getMaps(craftRecipe.skill, "workshop");
    if (workshopMaps.length > 0) {
      workshopLocation = { x: workshopMaps[0].x, y: workshopMaps[0].y };
      console.log(
        `📍 Found ${craftRecipe.skill} workshop at (${workshopLocation.x}, ${workshopLocation.y})`,
      );
    }
  }

  // 4. Analyze craft dependencies
  console.log(
    `🛠️ Craft recipe for ${objective.code} requires:`,
    craftRecipe.items,
  );

  const missingDepsPromises = craftRecipe.items.map(async (requiredItem) => {
    const charItemSearch = findItemOnCharacter(character, requiredItem.code);

    // Identify equipped slots holding this required item
    const equippedSlots = charItemSearch.locations
      .filter((loc) => loc.location === "equipped")
      .map((loc) => loc.slotName.replace("_slot", "") as any);

    // Count items already available in inventory
    const inventoryQuantity = charItemSearch.locations
      .filter((loc) => loc.location === "inventory")
      .reduce((sum, loc) => sum + loc.quantity, 0);

    const neededInventoryQuantity =
      (requiredItem.quantity * objective.quantity) - inventoryQuantity;

    // Check if ingredient is missing from inventory
    if (neededInventoryQuantity <= 0) {
      console.log(
        `✅ Character ${character.name} already has ${objective.code} (x${searchResult.totalQuantity})`,
      );
      return null;
    }

    console.log(
      `⚠️ Missing ${neededInventoryQuantity}x ${requiredItem.code} in inventory. Analyzing...`,
    );

    // Calculate if we need to gather missing items from resources
    const missingTotal = (requiredItem.quantity * objective.quantity) -
      charItemSearch.totalQuantity;
    const resource = missingTotal > 0
      ? await findResources(requiredItem.code)
      : undefined;

    return {
      itemCode: requiredItem.code,
      neededQuantity: Math.max(0, missingTotal),
      unequipSlots: equippedSlots.length > 0 ? equippedSlots : undefined,
      resource,
    };
  });

  const rawDeps = await Promise.all(missingDepsPromises);
  const missingDependencies = rawDeps.filter(
    (dep): dep is NonNullable<typeof dep> => dep !== null,
  );

  // 5. Searching and adding Resources Location on the map
  const enrichedDependencies: CraftEnrichedDependency[] = await Promise.all(
    missingDependencies.map(async (dep) => {
      if (!dep.resource?.code) return dep;

      const maps = await api.getMaps(dep.resource.code);
      return {
        ...dep,
        resource: {
          code: dep.resource.code,
          targetTile: maps[0] ?? null,
          locations: maps,
        },
      };
    }),
  );

  return {
    objective: objective,
    workshopLocation,
    dependencies: enrichedDependencies,
  };
}
