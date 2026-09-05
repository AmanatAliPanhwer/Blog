"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan",
  "02": "Feb",
  "03": "Mar",
  "04": "Apr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Aug",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dec",
};

interface FilterPanelProps {
  years: string[];
  months: string[];
  days: string[];
}

export default function FilterPanel({ years, months, days }: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const year = searchParams.get("year") ?? "";
  const month = searchParams.get("month") ?? "";
  const day = searchParams.get("day") ?? "";
  const hasFilter = !!(year || month || day);

  const updateFilter = (key: "year" | "month" | "day", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "any") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  const resetFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("year");
    params.delete("month");
    params.delete("day");
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={year || "any"}
        onValueChange={(v) => updateFilter("year", v)}
      >
        <SelectTrigger className="h-8 w-28" aria-label="Filter by year">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any year</SelectItem>
          {years.map((y) => (
            <SelectItem key={y} value={y}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={month || "any"}
        onValueChange={(v) => updateFilter("month", v)}
      >
        <SelectTrigger className="h-8 w-28" aria-label="Filter by month">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any month</SelectItem>
          {months.map((m) => (
            <SelectItem key={m} value={m}>
              {MONTH_LABELS[m] ?? m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={day || "any"} onValueChange={(v) => updateFilter("day", v)}>
        <SelectTrigger className="h-8 w-24" aria-label="Filter by day">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any day</SelectItem>
          {days.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilter ? (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <RotateCcw />
          Reset
        </Button>
      ) : null}
    </div>
  );
}