import type { CharacterSchema } from "../interface/character.ts";

export interface ItemLocation {
  location: "equipped" | "inventory";
  slotName: string; // e.g. "weapon_slot", "utility1_slot", or "inventory_slot_1"
  quantity: number;
}

export interface CharacterSearchResult {
  characterName: string;
  itemCode: string;
  found: boolean;
  totalQuantity: number;
  locations: ItemLocation[];
}

/**
 * Searches a character's equipment slots and inventory for a specific item code.
 */
export function findItemOnCharacter(
  character: CharacterSchema,
  itemCode: string,
): CharacterSearchResult {
  const locations: ItemLocation[] = [];

  // 1. List of all equipment slot keys to check
  const equipmentSlots: Array<keyof CharacterSchema> = [
    "weapon_slot",
    "shield_slot",
    "helmet_slot",
    "body_armor_slot",
    "leg_armor_slot",
    "boots_slot",
    "ring1_slot",
    "ring2_slot",
    "amulet_slot",
    "rune_slot",
    "artifact1_slot",
    "artifact2_slot",
    "artifact3_slot",
    "bag_slot",
  ];

  // Check standard equipment slots (quantity is 1 if equipped)
  for (const slotKey of equipmentSlots) {
    if (character[slotKey] === itemCode) {
      locations.push({
        location: "equipped",
        slotName: slotKey,
        quantity: 1,
      });
    }
  }

  // Check utility equipment slots (which have custom quantities)
  if (
    character.utility1_slot === itemCode && character.utility1_slot_quantity > 0
  ) {
    locations.push({
      location: "equipped",
      slotName: "utility1_slot",
      quantity: character.utility1_slot_quantity,
    });
  }

  if (
    character.utility2_slot === itemCode && character.utility2_slot_quantity > 0
  ) {
    locations.push({
      location: "equipped",
      slotName: "utility2_slot",
      quantity: character.utility2_slot_quantity,
    });
  }

  // 2. Search inventory slots
  if (character.inventory) {
    for (const invSlot of character.inventory) {
      if (invSlot.code === itemCode && invSlot.quantity > 0) {
        locations.push({
          location: "inventory",
          slotName: `inventory_slot_${invSlot.slot}`,
          quantity: invSlot.quantity,
        });
      }
    }
  }

  // 3. Calculate total quantity across all locations
  const totalQuantity = locations.reduce((sum, loc) => sum + loc.quantity, 0);

  return {
    characterName: character.name,
    itemCode,
    found: locations.length > 0,
    totalQuantity,
    locations,
  };
}

/**
 * Helper to quickly check if a character has an item (equipped or in inventory).
 */
export function hasItem(character: CharacterSchema, itemCode: string): boolean {
  return findItemOnCharacter(character, itemCode).found;
}

/**
 * Searches across an array of characters (e.g. all 5 characters on your account).
 */
export function findItemAcrossAllCharacters(
  characters: CharacterSchema[],
  itemCode: string,
): CharacterSearchResult[] {
  return characters
    .map((char) => findItemOnCharacter(char, itemCode))
    .filter((result) => result.found);
}
