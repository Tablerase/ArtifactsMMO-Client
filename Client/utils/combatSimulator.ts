import type { CharacterSchema } from "../interface/character.ts";
import type { MonsterSchema } from "../interface/monster.ts";

export interface LocalSimulationResult {
  wins: number;
  losses: number;
  winrate: number;
  avgTurns: number;
  avgPlayerHpRemaining: number;
  results: {
    result: "win" | "loss";
    turns: number;
    playerHpRemaining: number;
    monsterHpRemaining: number;
  }[];
}

/**
 * Simulates N combat runs locally using the official Artifacts MMO damage & resistance formulas
 */
export function simulateCombatLocal(
  character: CharacterSchema,
  monster: MonsterSchema,
  iterations: number = 50,
): LocalSimulationResult {
  let wins = 0;
  let losses = 0;
  let totalTurns = 0;
  let totalHpRemaining = 0;
  const results = [];

  for (let i = 0; i < iterations; i++) {
    const singleRun = runSingleFight(character, monster);
    if (singleRun.result === "win") {
      wins++;
      totalHpRemaining += singleRun.playerHpRemaining;
    } else {
      losses++;
    }
    totalTurns += singleRun.turns;
    if (i < 5) results.push(singleRun);
  }

  const winrate = (wins / iterations) * 100;
  const avgTurns = totalTurns / iterations;
  const avgPlayerHpRemaining = wins > 0 ? totalHpRemaining / wins : 0;

  return {
    wins,
    losses,
    winrate: Number(winrate.toFixed(1)),
    avgTurns: Number(avgTurns.toFixed(1)),
    avgPlayerHpRemaining: Math.round(avgPlayerHpRemaining),
    results,
  };
}

function runSingleFight(player: CharacterSchema, monster: MonsterSchema) {
  let playerHp = player.hp;
  let monsterHp = monster.hp;

  const elements: ("fire" | "earth" | "water" | "air")[] = [
    "fire",
    "earth",
    "water",
    "air",
  ];

  let turns = 0;

  while (playerHp > 0 && monsterHp > 0 && turns < 100) {
    turns++;

    // 1. Initiative turn order
    const playerFirst = player.initiative >= monster.initiative;

    const attacker1 = playerFirst ? "player" : "monster";
    const attacker2 = playerFirst ? "monster" : "player";

    // First attacker phase
    if (attacker1 === "player") {
      monsterHp -= dealDamageToMonster(player, monster, elements);
      if (monsterHp <= 0) break;
    } else {
      playerHp -= dealDamageToPlayer(monster, player, elements);
      if (playerHp <= 0) break;
    }

    // Second attacker phase
    if (attacker2 === "player") {
      monsterHp -= dealDamageToMonster(player, monster, elements);
    } else {
      playerHp -= dealDamageToPlayer(monster, player, elements);
    }
  }

  const isWin = monsterHp <= 0 && playerHp > 0;

  return {
    result: isWin ? ("win" as const) : ("loss" as const),
    turns,
    playerHpRemaining: Math.max(0, playerHp),
    monsterHpRemaining: Math.max(0, monsterHp),
  };
}

function dealDamageToMonster(
  player: CharacterSchema,
  monster: MonsterSchema,
  elements: ("fire" | "earth" | "water" | "air")[],
): number {
  let totalDmg = 0;

  for (const el of elements) {
    const baseAttack =
      (player[`attack_${el}` as keyof CharacterSchema] as number) || 0;
    if (baseAttack <= 0) continue;

    const bonusDmg = (player.dmg || 0) +
      ((player[`dmg_${el}` as keyof CharacterSchema] as number) || 0);
    const elementalAttack = Math.round(baseAttack * (1 + bonusDmg / 100));

    const res = (monster[`res_${el}` as keyof MonsterSchema] as number) || 0;
    let finalDmg = Math.round(elementalAttack * (1 - res / 100));

    // Critical strike check (1 point = 1%)
    const isCrit = Math.random() * 100 < (player.critical_strike || 0);
    if (isCrit) {
      finalDmg = Math.round(finalDmg * 1.5);
    }

    totalDmg += Math.max(0, finalDmg);
  }

  return totalDmg;
}

function dealDamageToPlayer(
  monster: MonsterSchema,
  player: CharacterSchema,
  elements: ("fire" | "earth" | "water" | "air")[],
): number {
  let totalDmg = 0;

  for (const el of elements) {
    const baseAttack =
      (monster[`attack_${el}` as keyof MonsterSchema] as number) || 0;
    if (baseAttack <= 0) continue;

    const elementalAttack = baseAttack;

    const res = (player[`res_${el}` as keyof CharacterSchema] as number) || 0;
    let finalDmg = Math.round(elementalAttack * (1 - res / 100));

    // Critical strike check (1 point = 1%)
    const isCrit = Math.random() * 100 < (monster.critical_strike || 0);
    if (isCrit) {
      finalDmg = Math.round(finalDmg * 1.5);
    }

    totalDmg += Math.max(0, finalDmg);
  }

  return totalDmg;
}
