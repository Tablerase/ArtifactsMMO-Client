import { api } from "./api.ts";
import { CharacterSchema } from "./interface/character.ts";
import {
  MainToWorkerMessage,
  WorkerToMainMessage,
} from "./interface/messages.ts";
import { c } from "./utils/logger.ts";
import { gameData } from "./utils/game-data.ts";

const TOKEN = Deno.env.get("ARTIFACTS_TOKEN");

if (!TOKEN) {
  throw new Error("ARTIFACTS_TOKEN environment variable is not set.");
}

// 🚀 Pre-load all game metadata (Items, Maps, Resources) once at startup!
await gameData.loadAllData();

// Retrieving Characters infos
const characters: CharacterSchema[] = await api.getCharacters();

const activeWorkers: Worker[] = [];

for (const character of characters) {
  const worker = new Worker(
    import.meta.resolve("./character-worker.ts"),
    { type: "module" },
  );

  worker.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
    const msg = event.data;

    if (msg.type == "LOG") {
      console.log(
        `${c.blue}[${msg.characterName}]${c.reset} ${msg.message}`,
      );
    } else if (msg.type === "FINISHED") {
      console.log(
        `${c.green}🎉 Character ${msg.characterName} finished its task!${c.reset}`,
      );
    }
  };

  const startMsg: MainToWorkerMessage = {
    type: "START_BOT",
    character: character,
    objective: {
      type: "TASK",
      code: "unknown",
      quantity: 1,
    },
  };

  worker.postMessage(startMsg);

  activeWorkers.push(worker);
}
