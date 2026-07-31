import { api } from "./api.ts";
import type { QueuedAction } from "./interface/queue.ts";
import type { CharacterSchema } from "./interface/character.ts";
import type { Logger } from "./utils/logger.ts";

export async function executeQueue(
  character: CharacterSchema,
  queue: QueuedAction[],
  logger?: Logger,
): Promise<CharacterSchema> {
  await logger?.info(
    "QUEUE_START",
    `Starting execution of ${queue.length} queued action(s)`,
    queue,
  );

  for (let i = 0; i < queue.length; i++) {
    const action = queue[i];
    await logger?.info(
      "ACTION_EXEC",
      `[${i + 1}/${queue.length}] ${action.type.toUpperCase()}`,
      action,
    );

    let responseData: any;

    try {
      switch (action.type) {
        case "move":
          if (
            action.x !== undefined && action.y !== undefined &&
            character.x === action.x && character.y === action.y
          ) {
            await logger?.debug(
              "MOVE_SKIP",
              `Already at destination (${action.x}, ${action.y}).`,
            );
            continue;
          }

          await logger?.info("MOVE", `Moving to destination`, {
            x: action.x,
            y: action.y,
          });
          responseData = await api.move(character.name, {
            x: action.x,
            y: action.y,
          });
          break;

        case "rest":
          await logger?.info(
            "REST",
            `Resting to recover HP (${character.hp}/${character.max_hp} HP)`,
          );
          responseData = await api.rest(character.name);
          break;

        case "gather":
          await logger?.info(
            "GATHER_START",
            `Gathering ${action.itemCode} (${action.times} times)`,
          );
          for (let g = 0; g < action.times; g++) {
            responseData = await api.gather(character.name);

            if (responseData?.character) {
              character = responseData.character;
            }

            const cooldown = responseData?.cooldown?.remaining_seconds ?? 3;
            await logger?.info(
              "GATHER_STEP",
              `Gather ${
                g + 1
              }/${action.times} complete. Cooldown: ${cooldown}s`,
              { cooldown, drops: responseData?.details?.items },
            );
            await sleep(cooldown * 1000);
          }
          continue;

        case "fight":
          await logger?.info("FIGHT", `Fighting monster`);
          responseData = await api.fight(character.name);
          break;

        case "craft":
          await logger?.info(
            "CRAFT",
            `Crafting ${action.quantity}x ${action.itemCode}`,
          );
          responseData = await api.craft(
            character.name,
            action.itemCode,
            action.quantity,
          );
          break;

        case "equip":
          await logger?.info(
            "EQUIP",
            `Equipping ${action.itemCode} in ${action.slot}`,
          );
          responseData = await api.equip(character.name, [{
            code: action.itemCode,
            slot: action.slot,
          }]);
          break;

        case "unequip":
          await logger?.info("UNEQUIP", `Unequipping slot ${action.slot}`);
          responseData = await api.unequip(character.name, [{
            slot: action.slot,
          }]);
          break;

        case "accept_task":
          await logger?.info("ACCEPT_TASK", `Accepting new task from Tasks Master`);
          responseData = await api.acceptTask(character.name);
          break;

        case "complete_task":
          await logger?.info("COMPLETE_TASK", `Completing task and claiming rewards`);
          responseData = await api.completeTask(character.name);
          break;

        case "trade_task":
          await logger?.info("TRADE_TASK", `Trading ${action.quantity}x ${action.itemCode} for task requirement`);
          responseData = await api.tradeTask(character.name, action.itemCode, action.quantity);
          break;

        case "cancel_task":
          await logger?.info("CANCEL_TASK", `Cancelling active task`);
          responseData = await api.cancelTask(character.name);
          break;

        case "exchange_task":
          await logger?.info("EXCHANGE_TASK", `Exchanging 6 Task Coins for rewards`);
          responseData = await api.exchangeTaskCoins(character.name);
          break;

        default:
          await logger?.error(
            "UNKNOWN_ACTION",
            `Unknown action type`,
            action,
          );
          break;
      }


      if (responseData?.character) {
        character = responseData.character;
      } else if (responseData?.characters) {
        const updated = responseData.characters.find(
          (c: any) => c.name === character.name,
        );
        if (updated) character = updated;
      }

      const cooldownSeconds = responseData?.cooldown?.remaining_seconds ?? 0;
      if (cooldownSeconds > 0) {
        await logger?.debug(
          "COOLDOWN",
          `Waiting ${cooldownSeconds}s cooldown...`,
        );
        await sleep(cooldownSeconds * 1000);
      }
    } catch (err: any) {
      await logger?.error(
        "ACTION_FAILED",
        `Action failed: ${action.type}`,
        err,
      );
      break;
    }
  }

  await logger?.info(
    "QUEUE_END",
    `Queue execution complete for ${character.name}`,
  );
  return character;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
