import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WeightEntry } from "../db/schema";
import { useWeightStore } from "../store";
import { convertWeight, parseLocalDate } from "../utils";

interface WeightChartProps {
  entries: WeightEntry[];
  timeRange?: "1w" | "1m" | "3m" | "6m" | "1y" | "all";
}

export const WeightChart: React.FC<WeightChartProps> = ({
  entries,
  timeRange = "3m",
}) => {
  const { settings } = useWeightStore();

  // Filter entries based on time range
  const filterEntriesByTimeRange = (entries: WeightEntry[], range: string) => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (range) {
      case "1w":
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case "1m":
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case "3m":
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case "6m":
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case "1y":
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case "all":
      default:
        return entries;
    }

    return entries.filter((entry) => parseLocalDate(entry.date) >= cutoffDate);
  };

  const filteredEntries = filterEntriesByTimeRange(entries, timeRange);

  // Sort entries by date and convert weights to user's preferred unit
  const chartData = filteredEntries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      date: entry.date,
      weight: convertWeight(entry.weight, "kg", settings.unit),
      formattedDate: parseLocalDate(entry.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg
          className="w-12 h-12 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-sm">No data available for the selected time range</p>
        <p className="text-xs mt-1">Add weight entries to see your progress</p>
      </div>
    );
  }

  // Calculate Y-axis domain with some padding
  const weights = chartData.map((d) => d.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const padding = (maxWeight - minWeight) * 0.1 || 1;
  const yAxisDomain = [Math.max(0, minWeight - padding), maxWeight + padding];

  const formatTooltip = (value: number, name: string) => {
    if (name === "weight") {
      return [`${value.toFixed(1)} ${settings.unit}`, "Weight"];
    }
    return [value, name];
  };

  const formatXAxisTick = (tickItem: string) => {
    const date = parseLocalDate(tickItem);
    if (timeRange === "1w") {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else if (timeRange === "1m") {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <div className="w-full h-64 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxisTick}
            stroke="#64748b"
            fontSize={12}
            tick={{ fill: "#64748b" }}
          />
          <YAxis
            domain={yAxisDomain}
            tickFormatter={(value) => `${value.toFixed(0)}`}
            stroke="#64748b"
            fontSize={12}
            tick={{ fill: "#64748b" }}
          />
          <Tooltip
            formatter={formatTooltip}
            labelFormatter={(label) => {
              const date = parseLocalDate(label);
              return date.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              });
            }}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
            }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

