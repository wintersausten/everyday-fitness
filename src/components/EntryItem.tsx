import React, { useState } from "react";
import type { WeightEntry } from "../db/schema";
import { useWeightStore } from "../store";
import { convertWeight, parseLocalDate } from "../utils";
import { DeleteConfirmationModal } from "./ui/DeleteConfirmationModal";

interface EntryItemProps {
  entry: WeightEntry;
  showAverage?: boolean;
  averageValue?: number;
}

export const EntryItem: React.FC<EntryItemProps> = ({
  entry,
  showAverage = false,
  averageValue,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editWeight, setEditWeight] = useState(entry.weight.toString());
  const [editError, setEditError] = useState("");

  const { updateEntry, deleteEntry, settings, loading } = useWeightStore();

  const displayWeight = convertWeight(entry.weight, "kg", settings.unit);
  const displayAverage = averageValue
    ? convertWeight(averageValue, "kg", settings.unit)
    : null;

  const handleEdit = async () => {
    const weightNum = parseFloat(editWeight);

    if (!weightNum || weightNum <= 0) {
      setEditError("Please enter a valid weight");
      return;
    }

    try {
      await updateEntry(entry.id!, { weight: weightNum });
      setIsEditing(false);
      setEditError("");
    } catch {
      setEditError("Failed to update entry");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEntry(entry.id!);
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditWeight(entry.weight.toString());
    setEditError("");
  };

  const formatDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <div className="entry-item group">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4">
                {/* Date */}
                <div className="flex flex-col">
                  <div className="text-sm font-semibold">
                    {formatDate(entry.date)}
                  </div>
                  <div className="text-xs text-secondary">
                    {parseLocalDate(entry.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>

                {/* Weight Display/Edit */}
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value)}
                      step="0.1"
                      min="0"
                      className="edit-input"
                    />
                    <span className="text-sm text-secondary">{settings.unit}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <div className="weight-badge">
                      <span className="text-lg font-bold text-primary">
                        {displayWeight.toFixed(1)}
                      </span>
                      <span className="text-sm text-primary ml-1">
                        {settings.unit}
                      </span>
                    </div>
                    
                    {showAverage && displayAverage && (
                      <div className="average-badge">
                        <span className="text-sm font-medium text-success">
                          7-day avg: {displayAverage.toFixed(1)} {settings.unit}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {editError && (
                <div className="error-message">
                  <svg className="icon-sm mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {editError}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              {isEditing ? (
                <>
                  <button
                    onClick={handleEdit}
                    disabled={loading || !editWeight}
                    className="btn btn-sm btn-primary"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={loading}
                    className="btn btn-sm btn-secondary"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    disabled={loading}
                    className="icon-button icon-button-edit"
                    title="Edit entry"
                  >
                    <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    disabled={loading}
                    className="icon-button icon-button-delete"
                    title="Delete entry"
                  >
                    <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Weight Entry"
        description="Are you sure you want to delete the entry for"
        itemName={formatDate(entry.date)}
        loading={loading}
      />
    </>
  );
};

