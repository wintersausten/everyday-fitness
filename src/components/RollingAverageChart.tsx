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
import type { RollingAverageEntry } from "../db/schema";
import { useWeightStore } from "../store";
import { convertWeight, parseLocalDate } from "../utils";

interface RollingAverageChartProps {
  averages: RollingAverageEntry[];
  timeRange?: "1w" | "1m" | "3m" | "6m" | "1y" | "all";
}

export const RollingAverageChart: React.FC<RollingAverageChartProps> = ({
  averages,
  timeRange = "3m",
}) => {
  const { settings } = useWeightStore();

  // Filter averages based on time range
  const filterAveragesByTimeRange = (
    averages: RollingAverageEntry[],
    range: string,
  ) => {
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
        return averages;
    }

    return averages.filter((avg) => parseLocalDate(avg.date) >= cutoffDate);
  };

  const filteredAverages = filterAveragesByTimeRange(averages, timeRange);

  // Sort averages by date and convert weights to user's preferred unit
  const chartData = filteredAverages
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((avg) => ({
      date: avg.date,
      average: convertWeight(avg.average, "kg", settings.unit),
      formattedDate: parseLocalDate(avg.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }));

  if (chartData.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">
            7-Day Rolling Average
          </h3>
        </div>
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
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <p className="text-sm">No rolling average data available</p>
          <p className="text-xs mt-1">
            Add at least 7 weight entries to see trends
          </p>
        </div>
      </div>
    );
  }

  // Calculate Y-axis domain with some padding
  const averages_values = chartData.map((d) => d.average);
  const minAverage = Math.min(...averages_values);
  const maxAverage = Math.max(...averages_values);
  const padding = (maxAverage - minAverage) * 0.1 || 1;
  const yAxisDomain = [Math.max(0, minAverage - padding), maxAverage + padding];

  const formatTooltip = (value: number, name: string) => {
    if (name === "average") {
      return [`${value.toFixed(1)} ${settings.unit}`, "7-Day Average"];
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

  // Calculate trend (slope of the line)
  const calculateTrend = () => {
    if (chartData.length < 2) return 0;

    const firstValue = chartData[0].average;
    const lastValue = chartData[chartData.length - 1].average;
    const daysDiff =
      (parseLocalDate(chartData[chartData.length - 1].date).getTime() -
        parseLocalDate(chartData[0].date).getTime()) /
      (1000 * 60 * 60 * 24);

    return daysDiff > 0 ? ((lastValue - firstValue) / daysDiff) * 7 : 0; // Weekly trend
  };

  const weeklyTrend = calculateTrend();
  const trendColor =
    weeklyTrend > 0 ? "#ef4444" : weeklyTrend < 0 ? "#10b981" : "#64748b";
  const trendText =
    weeklyTrend > 0 ? "increasing" : weeklyTrend < 0 ? "decreasing" : "stable";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">
          7-Day Rolling Average
        </h3>
        {chartData.length > 0 && (
          <div className="text-sm text-gray-600">
            <span className="mr-2">Trend:</span>
            <span className="font-medium" style={{ color: trendColor }}>
              {Math.abs(weeklyTrend).toFixed(1)} {settings.unit}/week{" "}
              {trendText}
            </span>
          </div>
        )}
      </div>

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
              dataKey="average"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2 }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

