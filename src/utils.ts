import type {
  WeightEntry,
  Unit,
  AppSettings,
  ExportData,
  RollingAverageEntry,
} from "./db/schema";

// Unit conversion constants
const KG_TO_LB = 2.20462;
const ST_TO_KG = 6.35029; // 1 stone = 6.35029 kg

export function convertWeight(
  weight: number,
  fromUnit: Unit,
  toUnit: Unit,
): number {
  if (fromUnit === toUnit) return weight;

  // Convert to kg first
  let weightInKg: number;
  switch (fromUnit) {
    case "kg":
      weightInKg = weight;
      break;
    case "lb":
      weightInKg = weight / KG_TO_LB;
      break;
    case "st":
      weightInKg = weight * ST_TO_KG;
      break;
    default:
      throw new Error(`Invalid from unit: ${fromUnit}`);
  }

  // Convert from kg to target unit
  switch (toUnit) {
    case "kg":
      return weightInKg;
    case "lb":
      return weightInKg * KG_TO_LB;
    case "st":
      return weightInKg / ST_TO_KG;
    default:
      throw new Error(`Invalid to unit: ${toUnit}`);
  }
}

export function calculateRollingAverage(
  entries: WeightEntry[],
  days: number,
): RollingAverageEntry[] {
  if (entries.length < days) return [];

  const sortedEntries = [...entries].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const result: RollingAverageEntry[] = [];

  for (let i = days - 1; i < sortedEntries.length; i++) {
    const windowEntries = sortedEntries.slice(i - days + 1, i + 1);
    const average =
      windowEntries.reduce((sum, entry) => sum + entry.weight, 0) / days;

    result.push({
      date: sortedEntries[i].date,
      average: Math.round(average * 100) / 100, // Round to 2 decimal places
    });
  }

  return result;
}

export function formatDate(date: Date | string): string {
  if (typeof date === "string") return date;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function validateWeight(weight: number): boolean {
  return (
    typeof weight === "number" &&
    !isNaN(weight) &&
    isFinite(weight) &&
    weight > 0 && // Minimum 0kg (exclusive)
    weight < 500 // Maximum 500kg
  );
}

export function validateDate(date: string): boolean {
  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  // Parse date components to avoid timezone issues
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day); // month is 0-indexed
  if (isNaN(dateObj.getTime())) return false;

  // Check if the parsed date matches the input (validates actual date)
  if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
    return false;
  }

  // Check if date is not in the future (using local date comparison)
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return dateObj <= todayDate;
}

export function exportData(
  entries: WeightEntry[],
  settings: AppSettings,
): ExportData {
  return {
    entries: entries.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })),
    settings,
    exportDate: new Date(),
    version: "1.0.0",
  };
}

export function importData(jsonString: string): ExportData {
  try {
    const data = JSON.parse(jsonString);

    // Validate required fields
    if (!data.entries || !Array.isArray(data.entries)) {
      throw new Error("Invalid data format: entries must be an array");
    }

    if (!data.settings || typeof data.settings !== "object") {
      throw new Error("Invalid data format: settings must be an object");
    }

    // Validate entries
    for (const entry of data.entries) {
      if (!entry.date || !validateDate(entry.date)) {
        throw new Error(`Invalid date in entry: ${entry.date}`);
      }
      if (!entry.weight || !validateWeight(entry.weight)) {
        throw new Error(`Invalid weight in entry: ${entry.weight}`);
      }
    }

    // Convert date strings back to Date objects
    const processedEntries = data.entries.map((entry: WeightEntry & { createdAt: string; updatedAt: string }) => ({
      ...entry,
      createdAt: new Date(entry.createdAt),
      updatedAt: new Date(entry.updatedAt),
    }));

    return {
      entries: processedEntries,
      settings: data.settings,
      exportDate: data.exportDate ? new Date(data.exportDate) : new Date(),
      version: data.version || "1.0.0",
    };
  } catch (error) {
    throw new Error(
      `Failed to import data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

