import { api } from "../api.ts";
import type { ItemSchema } from "../interface/item.ts";
import type { MapSchema } from "../interface/map.ts";
import type { MonsterSchema } from "../interface/monster.ts";
import type { ResourceSchema } from "../interface/resource.ts";
import { TaskFullSchema } from "../interface/task.ts";

const CACHE_FILE = "./cache/gameData.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

interface SerializedCache {
  timestamp: number;
  items: ItemSchema[];
  resources: ResourceSchema[];
  maps: MapSchema[];
  monsters: MonsterSchema[];
  tasks: TaskFullSchema[];
}

export class GameData {
  private static instance: GameData;

  public items = new Map<string, ItemSchema>();
  public mapsByContent = new Map<string, MapSchema[]>();
  public workshopsBySkill = new Map<string, MapSchema>();
  public taskMasterLocationByType = new Map<string, MapSchema>();
  public resources = new Map<string, ResourceSchema>();
  public resourcesByDrop = new Map<string, ResourceSchema[]>();
  public monsters = new Map<string, MonsterSchema>();
  public monstersByDrop = new Map<string, MonsterSchema[]>();
  public tasks = new Map<string, TaskFullSchema>();
  public tasksByLevel = new Map<number, TaskFullSchema[]>();
  public isLoaded = false;

  private constructor() {}

  public static getInstance(): GameData {
    if (!GameData.instance) {
      GameData.instance = new GameData();
    }
    return GameData.instance;
  }

  /** Load static game data from local disk cache, or fetch from API if missing/expired */
  async loadAllData() {
    if (this.isLoaded) return;

    // 1. Try loading from local disk cache first!
    const loadedFromDisk = await this.loadFromDiskCache();
    if (loadedFromDisk) {
      this.isLoaded = true;
      return;
    }

    // 2. Cache miss or expired: Fetch fresh data from API
    console.log("⏳ Fetching static game data from API...");
    const rawItems: ItemSchema[] = [];
    const rawResources: ResourceSchema[] = [];
    const rawMaps: MapSchema[] = [];
    const rawMonsters: MonsterSchema[] = [];
    const rawTasks: TaskFullSchema[] = [];

    // Fetch Items
    let page = 1;
    while (true) {
      const items = await api.getItemsPage(page, 100);
      if (!items || items.length === 0) break;
      rawItems.push(...items);
      if (items.length < 100) break;
      page++;
    }

    // Fetch Resources
    page = 1;
    while (true) {
      const resList = await api.getResourcesPage(page, 100);
      if (!resList || resList.length === 0) break;
      rawResources.push(...resList);
      if (resList.length < 100) break;
      page++;
    }

    // Fetch Maps
    page = 1;
    while (true) {
      const maps = await api.getMapsPage(page, 100);
      if (!maps || maps.length === 0) break;
      rawMaps.push(...maps);
      if (maps.length < 100) break;
      page++;
    }

    // Fetch tasks
    page = 1;
    while (true) {
      const tasks = await api.getTasks(page, 50);
      if (!tasks || tasks.length === 0) break;
      rawTasks.push(...tasks);
      if (tasks.length < 50) break;
      page++;
    }

    // Fetch Monsters
    page = 1;
    while (true) {
      const monsters = await api.getMonstersPage(page, 100);
      if (!monsters || monsters.length === 0) break;
      rawMonsters.push(...monsters);
      if (monsters.length < 100) break;
      page++;
    }

    // Populate In-Memory Maps
    this.populateMemoryMaps(
      rawItems,
      rawResources,
      rawMaps,
      rawMonsters,
      rawTasks,
    );

    // Save to Disk for instant future startups
    await this.saveToDiskCache(
      rawItems,
      rawResources,
      rawMaps,
      rawMonsters,
      rawTasks,
    );
    this.isLoaded = true;
  }

  private populateMemoryMaps(
    items: ItemSchema[],
    resources: ResourceSchema[],
    maps: MapSchema[],
    monsters: MonsterSchema[],
    tasks: TaskFullSchema[],
  ) {
    this.items.clear();
    this.resources.clear();
    this.mapsByContent.clear();
    this.workshopsBySkill.clear();
    this.taskMasterLocationByType.clear();
    this.resourcesByDrop.clear();
    this.monsters.clear();
    this.monstersByDrop.clear();
    this.tasks.clear();
    this.tasksByLevel.clear();

    for (const item of items) {
      this.items.set(item.code, item);
    }

    for (const res of resources) {
      this.resources.set(res.code, res);
      if (res.drops) {
        for (const drop of res.drops) {
          const existing = this.resourcesByDrop.get(drop.code) || [];
          existing.push(res);
          this.resourcesByDrop.set(drop.code, existing);
        }
      }
    }

    for (const mapTile of maps) {
      const content = mapTile.interactions?.content;
      if (content) {
        const contentCode = content.code;
        const existing = this.mapsByContent.get(contentCode) || [];
        existing.push(mapTile);
        this.mapsByContent.set(contentCode, existing);

        if (content.type === "workshop") {
          this.workshopsBySkill.set(contentCode, mapTile);
        }
        if (content.type === "tasks_master") {
          this.taskMasterLocationByType.set(contentCode, mapTile);
        }
      }
    }

    for (const task of tasks) {
      const level = task.level;
      const existing = this.tasksByLevel.get(level) || [];
      existing.push(task);
      this.tasksByLevel.set(level, existing);
      this.tasks.set(task.code, task);
    }

    for (const monster of monsters) {
      this.monsters.set(monster.code, monster);
      if (monster.drops) {
        for (const drop of monster.drops) {
          const existing = this.monstersByDrop.get(drop.code) || [];
          existing.push(monster);
          this.monstersByDrop.set(drop.code, existing);
        }
      }
    }
  }

  private async loadFromDiskCache(): Promise<boolean> {
    try {
      const text = await Deno.readTextFile(CACHE_FILE);
      const cache: SerializedCache = JSON.parse(text);

      const isExpired = Date.now() - cache.timestamp > CACHE_TTL_MS;
      if (isExpired || !cache.monsters) {
        console.log(
          "🔄 Disk cache missing monsters or expired (>24h). Refreshing from API...",
        );
        return false;
      }

      this.populateMemoryMaps(
        cache.items || [],
        cache.resources || [],
        cache.maps || [],
        cache.monsters || [],
        cache.tasks || [],
      );
      console.log(
        `⚡ Instant Startup: Loaded ${cache.items.length} items from local disk cache (${CACHE_FILE})`,
      );
      return true;
    } catch {
      return false; // File doesn't exist yet
    }
  }

  private async saveToDiskCache(
    items: ItemSchema[],
    resources: ResourceSchema[],
    maps: MapSchema[],
    monsters: MonsterSchema[],
    tasks: TaskFullSchema[],
  ) {
    try {
      await Deno.mkdir("./cache", { recursive: true });
      const cacheData: SerializedCache = {
        timestamp: Date.now(),
        items,
        resources,
        maps,
        monsters,
        tasks,
      };
      await Deno.writeTextFile(CACHE_FILE, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Saved game data cache to ${CACHE_FILE}`);
    } catch (err) {
      console.error("Failed to write game data disk cache:", err);
    }
  }

  getItem(code: string): ItemSchema | undefined {
    return this.items.get(code);
  }

  getWorkshopMap(skill: string): MapSchema | undefined {
    return this.workshopsBySkill.get(skill);
  }

  getResourceMaps(contentCode: string): MapSchema[] {
    return this.mapsByContent.get(contentCode) || [];
  }

  getResourceByDrop(dropItemCode: string): ResourceSchema | undefined {
    const list = this.resourcesByDrop.get(dropItemCode);
    return list && list.length > 0 ? list[0] : undefined;
  }

  getMonster(monsterCode: string): MonsterSchema | undefined {
    return this.monsters.get(monsterCode);
  }

  getMonsterByDrop(dropItemCode: string): MonsterSchema | undefined {
    const list = this.monstersByDrop.get(dropItemCode);
    return list && list.length > 0 ? list[0] : undefined;
  }

  getMonsterMaps(monsterCode: string): MapSchema[] {
    return this.mapsByContent.get(monsterCode) || [];
  }

  getTask(taskCode: string): TaskFullSchema | undefined {
    return this.tasks.get(taskCode);
  }

  getTasksByMaxLevel(max_level: number): TaskFullSchema[] {
    const res: TaskFullSchema[] = [];
    for (let level = 0; level < max_level; level++) {
      const tasks = this.tasksByLevel.get(level);
      if (tasks) {
        res.push(...tasks);
      }
    }
    return res;
  }

  getTaskMasterLocationByType(taskType: string): MapSchema | undefined {
    return this.taskMasterLocationByType.get(taskType);
  }
}

export const gameData = GameData.getInstance();
