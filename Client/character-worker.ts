// Worker thread context
declare const self: DedicatedWorkerGlobalScope;

// build/init gameData static object in worker thread
import { gameData } from "./utils/game-data.ts";

import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
} from "./interface/messages.ts";
import { ApiError } from "./api.ts";
import { AiEngine } from "./ai-engine.ts";
import { Logger } from "./utils/logger.ts";


function sendToMain(msg: WorkerToMainMessage) {
  self.postMessage(msg);
}

self.onmessage = async (event: MessageEvent<MainToWorkerMessage>) => {
  const data = event.data;

  if (data.type == "START_BOT") {
    const logger = new Logger(data.character.name);

    try {
      await gameData.loadAllData();
      await logger.info(
        "WORKER_INIT",
        `Worker initialized for ${data.character.name} with objective: ${data.objective.type} ${data.objective.code} (x${data.objective.quantity})`,
        data.objective,
      );

      const character = data.character;

      const aiEngine = new AiEngine(character, data.objective, logger);
      await aiEngine.doObjective();

      await logger.info("WORKER_FINISH", "Task finished successfully!");

      sendToMain({
        type: "FINISHED",
        characterName: character.name,
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError
        ? `[HTTP ${error.code}] ${error.message}`
        : error instanceof Error
        ? error.message
        : String(error);

      await logger.error(
        "WORKER_ERROR",
        `Worker failed: ${errorMessage}`,
        error,
      );
    }
  }

  self.close();
};
