import Dexie, { type EntityTable } from "dexie";
import type { WeightEntry, Setting } from "./schema";

export class WeightTrackerDB extends Dexie {
  weightEntries!: EntityTable<WeightEntry, "id">;
  settings!: EntityTable<Setting, "key">;

  constructor() {
    super("WeightTrackerDB");
    this.version(1).stores({
      weightEntries: "++id, &date, weight, createdAt, updatedAt",
      settings: "&key, value",
    });
  }
}

export const db = new WeightTrackerDB();

export type { WeightEntry, Setting };

