import { CharacterSchema } from "./character.ts";
import { Objective } from "./objective.ts";

export type MainToWorkerMessage =
  | { type: "START_BOT"; character: CharacterSchema; objective: Objective }
  | { type: "STOP_BOT" };

export type WorkerToMainMessage =
  | { type: "LOG"; characterName: string; message: string }
  | { type: "COOLDOWN"; characterName: string; seconds: number }
  | { type: "FINISHED"; characterName: string };
