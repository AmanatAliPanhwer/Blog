"use client";

import { useState } from "react";

interface FilterPanelProps {
  years: string[];
  months: string[];
  days: string[];
  onFilter: (posts: import("@/types").Post[]) => void;
}

export default function FilterPanel({ years, months, days, onFilter }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState("any");
  const [selectedMonth, setSelectedMonth] = useState("any");
  const [selectedDay, setSelectedDay] = useState("any");
  const [loading, setLoading] = useState(false);

  const applyFilter = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear !== "any") params.set("year", selectedYear);
      if (selectedMonth !== "any") params.set("month", selectedMonth);
      if (selectedDay !== "any") params.set("day", selectedDay);
      const qs = params.toString();
      const url = qs ? `/api/filter?${qs}` : "/api/filter";
      const res = await fetch(url);
      const data = await res.json();
      if (data.posts) onFilter(data.posts);
    } catch (e) {
      console.error("Filter failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const resetFilter = async () => {
    setSelectedYear("any");
    setSelectedMonth("any");
    setSelectedDay("any");
    setLoading(true);
    try {
      const res = await fetch("/api/posts?page=1");
      const data = await res.json();
      if (data.posts) onFilter(data.posts);
    } catch (e) {
      console.error("Reset failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button id="toggleFilterBtn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Hide Filter Options" : "Show Filter Options"}
      </button>
      {isOpen && (
        <div id="filterPanel" className="filter-panel open">
          <div className="filter-form">
            <div className="filter-group">
              <label htmlFor="year">Year:</label>
              <select id="year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                <option value="any">Any</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="month">Month:</label>
              <select id="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                <option value="any">Any</option>
                {months.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="day">Day:</label>
              <select id="day" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                <option value="any">Any</option>
                {days.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <button type="button" onClick={applyFilter} disabled={loading}>
              {loading ? "Loading..." : "Apply Filter"}
            </button>
            <a href="#" onClick={(e) => { e.preventDefault(); resetFilter(); }} className="filter-reset-btn">Reset Filters</a>
          </div>
        </div>
      )}
    </>
  );
}
