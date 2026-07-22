const TOKEN = Deno.env.get("ARTIFACTS_TOKEN");
const CHARACTER_NAME = "Heolig";

if (!TOKEN) {
  throw new Error("ARTIFACTS_TOKEN environment variable is not set.");
}

// Authentication headers — your token identifies you on the server
const headers = {
  "Accept": "application/json",
  "Content-Type": "application/json",
  "Authorization": `Bearer ${TOKEN}`,
};

//
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
const url = `https://api.artifactsmmo.com/my/${CHARACTER_NAME}/action/fight`;

try {
  const response = await fetch(url, { method: "POST", headers });
  const data = await response.json();

  if (data.error) throw new Error(data.error.message);

  const { fight, cooldown } = data.data;
  const fightStats = fight.characters[0];

  console.log(fight.result === "win" ? "🏆 Fight won!" : "💀 Fight lost!");
  console.log(
    `⚔️  XP gained: ${fightStats.xp} | HP remaining: ${fightStats.final_hp}`,
  );

  if (fightStats.drops && fightStats.drops.length > 0) {
    const dropsStr = fightStats.drops.map((d: any) =>
      `${d.quantity}x ${d.code}`
    )
      .join(", ");
    console.log(`🎁 Loot dropped: ${dropsStr}`);
  }
} catch (error) {
  console.error("❌ " + error);
}
