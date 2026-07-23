import { actionPlanner } from "./actionPlanner.ts";
import { api } from "./api.ts";
import { CharacterSchema } from "./interface/character.ts";

const TOKEN = Deno.env.get("ARTIFACTS_TOKEN");

if (!TOKEN) {
  throw new Error("ARTIFACTS_TOKEN environment variable is not set.");
}

// Retrieving Characters infos
const characters: CharacterSchema[] = await api.getCharacters();

// Defining objective
// 1. Equipped wooden_staff

// Planning to reach objective
actionPlanner("wooden_staff");

// Executing action queue with one worker handling each character

// // API endpoint for the move action
// const url = `https://api.artifactsmmo.com/my/${CHARACTER_NAME}/action/move`;
//
// // Target coordinates: move to tile (0, 1) where the chicken is
// const body = JSON.stringify({ x: 0, y: 1 });
//
// try {
//   const response = await fetch(url, { method: "POST", headers, body });
//   const data = await response.json();
//
//   if (data.error) throw new Error(data.error.message);
//
//   const { destination, cooldown } = data.data;
//   console.log(
//     `✅ Moved to (${destination.x}, ${destination.y}) on ${destination.name}`,
//   );
//   console.log(`⏳ Cooldown started: ${cooldown.total_seconds} seconds`);
// } catch (error) {
//   console.error("❌ " + error);
// }
//

// API endpoint to start a fight against the monster on the current tile
// const url = `https://api.artifactsmmo.com/my/${CHARACTER_NAME}/action/fight`;
//
// try {
//   const response = await fetch(url, { method: "POST", headers });
//   const data = await response.json();
//
//   if (data.error) throw new Error(data.error.message);
//
//   const { fight, cooldown } = data.data;
//   const fightStats = fight.characters[0];
//
//   console.log(fight.result === "win" ? "🏆 Fight won!" : "💀 Fight lost!");
//   console.log(
//     `⚔️  XP gained: ${fightStats.xp} | HP remaining: ${fightStats.final_hp}`,
//   );
//
//   if (fightStats.drops && fightStats.drops.length > 0) {
//     const dropsStr = fightStats.drops.map((d: any) =>
//       `${d.quantity}x ${d.code}`
//     )
//       .join(", ");
//     console.log(`🎁 Loot dropped: ${dropsStr}`);
//   }
// } catch (error) {
//   console.error("❌ " + error);
// }

// API endpoint to make your character rest and recover HP
// const url = `https://api.artifactsmmo.com/my/${CHARACTER_NAME}/action/rest`;
//
// try {
//   const response = await fetch(url, { method: "POST", headers });
//   const data = await response.json();
//
//   if (data.error) throw new Error(data.error.message);
//
//   const { hp_restored } = data.data;
//   const hp = data.data.character.hp;
//   const max_hp = data.data.character.max_hp;
//
//   console.log(`🛏️  Rested and restored ${hp_restored} HP.`);
//   console.log(`❤️  Current HP: ${hp}/${max_hp}`);
// } catch (error) {
//   console.error("❌ " + error);
// }

// Move to tile (-1, 0) where the Ash Tree is located
// const url = `https://api.artifactsmmo.com/my/${CHARACTER_NAME}/action/move`;
//
// // Target coordinates: the Ash Tree resource node
// const body = JSON.stringify({ x: -1, y: 0 });
//
// try {
//   const response = await fetch(url, { method: "POST", headers, body });
//   const data = await response.json();
//
//   if (data.error) throw new Error(data.error.message);
//
//   const { destination, cooldown } = data.data;
//   console.log(
//     `✅ Moved to (${destination.x}, ${destination.y}) on ${destination.name}`,
//   );
//   console.log(`⏳ Wait ${cooldown.total_seconds}s before gathering!`);
// } catch (error) {
//   console.error("❌ " + error);
// }

// Gather the resource on the current tile (Ash Tree at -1,0)
// const url =
//   `https://api.artifactsmmo.com/my/${CHARACTER_NAME}/action/gathering`;
//
// try {
//   const response = await fetch(url, { method: "POST", headers });
//   const data = await response.json();
//
//   if (data.error) throw new Error(data.error.message);
//
//   const { details } = data.data;
//   const dropsStr = details.items.map((i) => `${i.quantity}x ${i.code}`).join(
//     ", ",
//   );
//
//   console.log(`🪓 Gathered successfully! Gained: ${dropsStr}`);
//   console.log(`🌟 ${details.xp} Woodcutting XP gained.`);
// } catch (error) {
//   console.error("❌ " + error);
// }

// Move to tile (2, 1) where the workshop is located
// const url = `https://api.artifactsmmo.com/my/${CHARACTER_NAME}/action/move`;
//
// // Target coordinates: the workshop
// const body = JSON.stringify({ x: 2, y: 1 });
//
// try {
//   const response = await fetch(url, { method: "POST", headers, body });
//   const data = await response.json();
//
//   if (data.error) throw new Error(data.error.message);
//
//   const { destination, cooldown } = data.data;
//   console.log(
//     `✅ Moved to (${destination.x}, ${destination.y}) on ${destination.name}`,
//   );
//   console.log(`⏳ Cooldown started: ${cooldown.total_seconds} seconds`);
// } catch (error) {
//   console.error("❌ " + error);
// }

// Unequip the item in the weapon slot — moves it back to your inventory
// const url = `https://api.artifactsmmo.com/my/${CHARACTER_NAME}/action/unequip`;
//
// // The payload is a list of slots to unequip.
// // "quantity" is optional and only applies to utility slots.
// const body = JSON.stringify([{ slot: "weapon" }]);
//
// try {
//   const response = await fetch(url, { method: "POST", headers, body });
//   const data = await response.json();
//
//   if (data.error) throw new Error(data.error.message);
//
//   console.log(`🎒 Unequipped weapon! It is now in your inventory.`);
//   console.log(
//     `📦 Inventory capacity: ${data.data.character.inventory.length} / ${data.data.character.inventory_max_items}`,
//   );
// } catch (error) {
//   console.error("❌ " + error);
// }

// Craft the wooden staff — requires 4x Ash Wood + 1x Wooden Stick in your inventory
// Make sure you are at the workshop (2,1) before running this!
// const url = `https://api.artifactsmmo.com/my/${CHARACTER_NAME}/action/crafting`;
//
// // "code" is the item identifier you want to craft
// const body = JSON.stringify({ code: "wooden_staff" });
//
// try {
//   const response = await fetch(url, { method: "POST", headers, body });
//   const data = await response.json();
//
//   if (data.error) throw new Error(data.error.message);
//
//   const { details } = data.data;
//   console.log(`🔨 Crafted 1x wooden_staff successfully!`);
//   console.log(`🌟 ${details.xp} Weaponcrafting XP gained.`);
// } catch (error) {
//   console.error("❌ " + error);
// }

// Equip the wooden staff from your inventory into the weapon slot
// const url = `https://api.artifactsmmo.com/my/${CHARACTER_NAME}/action/equip`;
//
// // The payload is a list of items to equip.
// // "quantity" is optional and only applies to utilities.
// const body = JSON.stringify([{ code: "wooden_staff", slot: "weapon" }]);
//
// try {
//   const response = await fetch(url, { method: "POST", headers, body });
//   const data = await response.json();
//
//   if (data.error) throw new Error(data.error.message);
//
//   const char = data.data.character;
//   console.log(`✅ Equipped wooden_staff in weapon slot!`);
//   console.log(`⚔️  Your earth attack is now ${char.earth_attack}`);
// } catch (error) {
//   console.error("❌ " + error);
// }
