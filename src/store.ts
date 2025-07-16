import { create } from "zustand";
import type {
  WeightEntry,
  AppSettings,
  RollingAverageEntry,
  Unit,
  Theme,
} from "./db/schema";
import { db } from "./db/dexie";
import { calculateRollingAverage, convertWeight } from "./utils";

interface WeightStore {
  // State
  entries: WeightEntry[];
  settings: AppSettings;
  loading: boolean;
  error: string | null;

  // Actions
  loadEntries: () => Promise<void>;
  addEntry: (
    entry: Omit<WeightEntry, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateEntry: (id: number, updates: Partial<WeightEntry>) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
  clearAllEntries: () => Promise<void>;

  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;

  // Computed values
  getRollingAverages: () => RollingAverageEntry[];
  getEntriesInUserUnit: () => WeightEntry[];

  // Utility
  clearError: () => void;
}

export const useWeightStore = create<WeightStore>((set, get) => ({
  // Initial state
  entries: [],
  settings: {
    unit: "kg",
    theme: "system",
  },
  loading: false,
  error: null,

  // Actions
  loadEntries: async () => {
    set({ loading: true, error: null });
    try {
      const entries = await db.weightEntries
        .orderBy("date")
        .reverse()
        .toArray();
      set({ entries, loading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to load entries",
        loading: false,
      });
    }
  },

  addEntry: async (entry) => {
    set({ loading: true, error: null });
    try {
      // Validate entry before adding
      if (!entry.date || !entry.weight) {
        throw new Error("Date and weight are required");
      }

      const now = new Date();
      const newEntry = {
        ...entry,
        createdAt: now,
        updatedAt: now,
      };

      await db.weightEntries.add(newEntry);
      await get().loadEntries(); // Refresh entries
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to add entry",
        loading: false,
      });
      throw error;
    }
  },

  updateEntry: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      await db.weightEntries.update(id, {
        ...updates,
        updatedAt: new Date(),
      });
      await get().loadEntries(); // Refresh entries
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to update entry",
        loading: false,
      });
      throw error;
    }
  },

  deleteEntry: async (id) => {
    set({ loading: true, error: null });
    try {
      await db.weightEntries.delete(id);
      await get().loadEntries(); // Refresh entries
      set({ loading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to delete entry",
        loading: false,
      });
      throw error;
    }
  },

  clearAllEntries: async () => {
    set({ loading: true, error: null });
    try {
      await db.weightEntries.clear();
      set({ entries: [], loading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to clear entries",
        loading: false,
      });
      throw error;
    }
  },

  loadSettings: async () => {
    try {
      const unitSetting = await db.settings.get("unit");
      const themeSetting = await db.settings.get("theme");

      set({
        settings: {
          unit: (unitSetting?.value as Unit) || "kg",
          theme: (themeSetting?.value as Theme) || "light",
        },
      });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to load settings",
      });
    }
  },

  updateSettings: async (updates) => {
    try {
      const currentSettings = get().settings;
      const newSettings = { ...currentSettings, ...updates };

      // Save to database
      if (updates.unit) {
        await db.settings.put({ key: "unit", value: updates.unit });
      }
      if (updates.theme) {
        await db.settings.put({ key: "theme", value: updates.theme });
      }

      set({ settings: newSettings });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to update settings",
      });
      throw error;
    }
  },

  // Computed values
  getRollingAverages: () => {
    const entries = get().entries;
    return calculateRollingAverage(entries, 7);
  },

  getEntriesInUserUnit: () => {
    const { entries, settings } = get();
    return entries.map((entry) => ({
      ...entry,
      weight: convertWeight(entry.weight, "kg", settings.unit),
    }));
  },

  // Utility
  clearError: () => set({ error: null }),
}));

