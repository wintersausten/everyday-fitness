import React, { useState } from "react";
import { Layout } from "../components/Layout";
import { useWeightStore } from "../store";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { exportData, importData } from "../utils";
import { useToast } from "../hooks/useToast";

export const Settings: React.FC = () => {
  const { settings, updateSettings, entries, clearAllEntries } =
    useWeightStore();
  const toast = useToast();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleUnitChange = (unit: "kg" | "lb" | "st") => {
    updateSettings({ unit });
    toast.success("Unit preference updated");
  };

  const handleThemeChange = (theme: "light" | "dark" | "system") => {
    updateSettings({ theme });
    toast.success("Theme preference updated");
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const data = exportData(entries, settings);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `weight-tracker-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const text = await file.text();
      const { entries: importedEntries, settings: importedSettings } =
        importData(text);

      // Import entries
      for (const entry of importedEntries) {
        await useWeightStore
          .getState()
          .addEntry({ date: entry.date, weight: entry.weight });
      }

      // Import settings
      if (importedSettings) {
        updateSettings(importedSettings);
      }

      toast.success(`Imported ${importedEntries.length} entries successfully`);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import data. Please check the file format.");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllEntries();
      setShowClearConfirm(false);
      toast.success("All data cleared successfully");
    } catch (error) {
      console.error("Clear data error:", error);
      toast.error("Failed to clear data");
    }
  };

  return (
    <Layout title="Settings">
      <div className="content-section">
        {/* Unit Preferences */}
        <div className="enhanced-card">
          <div className="form-section">
            <h2 className="form-section-title">Unit Preferences</h2>
            <div className="radio-group">
              <label
                className={`radio-option ${settings.unit === "kg" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="unit"
                  value="kg"
                  checked={settings.unit === "kg"}
                  onChange={() => handleUnitChange("kg")}
                  className="radio-input"
                />
                <span className="radio-label">Kilograms (kg)</span>
              </label>
              <label
                className={`radio-option ${settings.unit === "lb" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="unit"
                  value="lb"
                  checked={settings.unit === "lb"}
                  onChange={() => handleUnitChange("lb")}
                  className="radio-input"
                />
                <span className="radio-label">Pounds (lb)</span>
              </label>
              <label
                className={`radio-option ${settings.unit === "st" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="unit"
                  value="st"
                  checked={settings.unit === "st"}
                  onChange={() => handleUnitChange("st")}
                  className="radio-input"
                />
                <span className="radio-label">Stones (st)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="content-section">
        {/* Theme Preferences */}
        <div className="enhanced-card">
          <div className="form-section">
            <h2 className="form-section-title">Theme</h2>
            <div className="radio-group">
              <label
                className={`radio-option ${settings.theme === "light" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={settings.theme === "light"}
                  onChange={() => handleThemeChange("light")}
                  className="radio-input"
                />
                <span className="radio-label">Light</span>
              </label>
              <label
                className={`radio-option ${settings.theme === "dark" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={settings.theme === "dark"}
                  onChange={() => handleThemeChange("dark")}
                  className="radio-input"
                />
                <span className="radio-label">Dark</span>
              </label>
              <label
                className={`radio-option ${settings.theme === "system" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="theme"
                  value="system"
                  checked={settings.theme === "system"}
                  onChange={() => handleThemeChange("system")}
                  className="radio-input"
                />
                <span className="radio-label">System</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="content-section">
        {/* Data Management */}
        <div className="enhanced-card">
          <div className="form-section">
            <h2 className="form-section-title">Data Management</h2>

            <div className="grid-container">
              <div>
                <h3 className="font-medium mb-2">Export Data</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Export all your weight entries and settings to a JSON file
                </p>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="action-button primary"
                >
                  {exporting ? "Exporting..." : "Export Data"}
                </button>
              </div>

              <div>
                <h3 className="font-medium mb-2">Import Data</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Import weight entries and settings from a JSON file
                </p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={importing}
                  className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                />
              </div>

              <div>
                <h3 className="font-medium mb-2 text-red-600">
                  Clear All Data
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Permanently delete all weight entries. This cannot be undone.
                </p>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="action-button danger"
                >
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear All Data?"
        size="md"
      >
        <p className="text-gray-600 mb-6">
          This will permanently delete all your weight entries and cannot be
          undone. Are you sure you want to continue?
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowClearConfirm(false)}
            className="action-button secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleClearAll}
            className="action-button danger flex-1"
          >
            Clear All Data
          </button>
        </div>
      </Modal>
    </Layout>
  );
};

