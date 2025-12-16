import React, { useEffect, useMemo, useState, useCallback } from "react";
import { sportColor } from "./colors";
import { useNavigate, useSearchParams } from "react-router-dom";
import Loader from "../components/atoms/loader/index.jsx";
import useAuthStore from "../store/auth-store.js";

const API_BASE = "https://bettingforge.com/api/v1";

const toPercent = (v) =>
  (v ?? 0).toLocaleString(undefined, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ratingBadgeColor = (r10) => {
  if (r10 >= 8.5) return "bg-green-100 text-green-700";
  if (r10 >= 7.5) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-700";
};

const slugify = (s) => (s || "").toLowerCase().replace(/\s+/g, "_");

const capitalize = (s) => {
  const str = String(s || "");
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
};

function SegmentedSports({ items, value, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Sports"
      className="inline-flex flex-wrap gap-2"
    >
      {items.map((s) => (
        <button
          key={s.value}
          role="tab"
          aria-selected={value === s.value}
          className={
            value === s.value
              ? "px-3 py-1 text-sm rounded-full border bg-blue-500 text-white border-blue-500"
              : "px-3 py-1 text-sm rounded-full border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }
          onClick={() => onChange(s)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function SportIcon({ kind, className = "w-4 h-4" }) {
  const k = String(kind || "").toLowerCase();
  const color = sportColor(k);
  const common = `inline-block align-[-2px] ${className}`;
  if (k === "football" || k === "soccer") {
    // simple soccer ball
    return (
      <svg
        viewBox="0 0 24 24"
        className={common}
        aria-hidden="true"
        style={{ color }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <polygon
          points="12,7 9,9 10,13 14,13 15,9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M7 12l3 1M17 12l-3 1M9 9l-3-1M15 9l3-1M10 13l-2 4M14 13l2 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    );
  }
  if (k === "tennis") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={common}
        aria-hidden="true"
        style={{ color }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M4 12c4-6 12-6 16 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M4 12c4 6 12 6 16 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    );
  }
  if (k === "volleyball") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={common}
        aria-hidden="true"
        style={{ color }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M12 2a14 14 0 0 1 6 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M2 12a14 14 0 0 0 12 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M4 8c6 0 10 4 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M8 4c0 6 4 10 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    );
  }
  if (k === "cs2" || k.includes("cs")) {
    // simple gamepad
    return (
      <svg
        viewBox="0 0 24 24"
        className={common}
        aria-hidden="true"
        style={{ color }}
      >
        <rect
          x="3"
          y="9"
          width="18"
          height="8"
          rx="4"
          ry="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M9 13h-3M7.5 11.5v3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="16" cy="12.5" r="1" fill="currentColor" />
        <circle cx="18.5" cy="14" r="1" fill="currentColor" />
      </svg>
    );
  }
  // average/all-around: circular arrows
  if (k === "average") {
    return (
      <span
        className={`inline-flex items-center justify-center ${className} font-semibold`}
        style={{ color }}
        aria-hidden="true"
      >
        A
      </span>
    );
  }
  // fallback
  return (
    <svg
      viewBox="0 0 24 24"
      className={common}
      aria-hidden="true"
      style={{ color }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function BookmakerRatingsPage() {
  const isLogged = useAuthStore((state) => state.isLogged);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [locales, setLocales] = useState([]); // [{ id, code }]
  const [selectedLocaleCode, setSelectedLocaleCode] = useState(
    () => localStorage.getItem("odds_locale_code") || ""
  );
  const [selectedLocaleId, setSelectedLocaleId] = useState(() => {
    const saved = localStorage.getItem("odds_locale_id");
    return saved ? Number(saved) : undefined;
  });

  const [sports, setSports] = useState([
    { value: "average", label: "Average", apiValue: "Average" },
  ]);
  const [sport, setSport] = useState({
    value: "average",
    label: "Average",
    apiValue: "Average",
  });
  const [championships, setChampionships] = useState([
    { value: "all", label: "All Championships", apiValue: "" },
  ]);
  const [selectedChampionships, setSelectedChampionships] = useState([]); // applied selection (array of apiValue strings)
  const [draftChampionships, setDraftChampionships] = useState([]); // draft selection while dropdown is open
  const [isChampOpen, setIsChampOpen] = useState(false);

  const [showWinner, setShowWinner] = useState(true);
  const [showOU, setShowOU] = useState(false);

  const [ratings, setRatings] = useState([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [scope, setScope] = useState("overall");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // sync query string
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedLocaleCode) params.set("locale", selectedLocaleCode);
    if (sport?.value) params.set("sport", sport.value);
    // reflect single selection in URL for readability
    if (
      Array.isArray(selectedChampionships) &&
      selectedChampionships.length === 1
    ) {
      params.set("championship", slugify(selectedChampionships[0]));
    }
    setSearchParams(params, { replace: true });
  }, [setSearchParams, selectedLocaleCode, sport, selectedChampionships]);

  useEffect(() => {
    localStorage.setItem("odds_locale_code", selectedLocaleCode);
    if (selectedLocaleId)
      localStorage.setItem("odds_locale_id", String(selectedLocaleId));
  }, [selectedLocaleCode, selectedLocaleId]);

  const fetchJson = useCallback(async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error("Network error");
    return r.json();
  }, []);

  // removed client-side hasRatings check; backend /odds/locales already filtered

  // fetch locales once (odds endpoint returns only locales with ratings)
  useEffect(() => {
    let isCancelled = false;
    (async () => {
      try {
        const raw = await fetchJson(`${API_BASE}/odds/locales`).catch(() => []);
        const list = Array.isArray(raw) ? raw : raw?.data || raw?.results || [];
        const items = (list || [])
          .map((loc) => ({
            id: Number(loc?.id),
            code: String(loc?.locale_code || "").toUpperCase(),
          }))
          .filter((it) => it.id && it.code);
        if (isCancelled) return;
        setLocales(items);
        // init from query/local storage or fallback to first
        const fromQuery = (searchParams.get("locale") || "").toUpperCase();
        let code =
          fromQuery ||
          (localStorage.getItem("odds_locale_code") || "").toUpperCase();
        let id = localStorage.getItem("odds_locale_id");
        if (code) {
          const found = items.find((l) => l.code === code);
          if (found) {
            setSelectedLocaleCode(found.code);
            setSelectedLocaleId(found.id);
          }
        } else if (id) {
          const found = items.find((l) => l.id === Number(id));
          if (found) {
            setSelectedLocaleCode(found.code);
            setSelectedLocaleId(found.id);
          }
        } else if (items[0]) {
          setSelectedLocaleCode(items[0].code);
          setSelectedLocaleId(items[0].id);
        }
      } catch (e) {
        // fallback: if locales API fails, keep existing stored values if any
        if (!selectedLocaleCode) setSelectedLocaleCode("UK");
        if (!selectedLocaleId) setSelectedLocaleId(1);
      }
    })();
    return () => {
      isCancelled = true;
    };
  }, []);

  // fetch sports when locale changes
  useEffect(() => {
    let isCancelled = false;
    const current = locales.find((l) => l.code === selectedLocaleCode);
    const id = current?.id || selectedLocaleId || 1;
    if (id && id !== selectedLocaleId) setSelectedLocaleId(id);

    const run = async () => {
      try {
        const url = `${API_BASE}/odds/sports?locale_id=${id}`;
        const arr = await fetchJson(url).catch(() => []);
        const normalized = (arr || []).filter(Boolean).map((name) => {
          const raw = String(name);
          const label =
            raw.toLowerCase() === "average" ? "Average" : capitalize(raw);
          return { value: slugify(name), label, apiValue: String(name) };
        });
        if (isCancelled) return;
        setSports(normalized);
        // avoid redundant state changes that retrigger ratings
        if (selectedChampionships.length !== 0) setSelectedChampionships([]);
      } catch (e) {
        if (isCancelled) return;
        setSports([
          { value: "average", label: "Average", apiValue: "average" },
        ]);
        // sport уже по умолчанию average; не трогаем, чтобы не триггерить лишние эффекты
      }
    };
    run();
    return () => {
      isCancelled = true;
    };
  }, [selectedLocaleCode, selectedLocaleId, fetchJson]);

  // fetch championships when sport changes (except average)
  useEffect(() => {
    let isCancelled = false;
    const current = locales.find((l) => l.code === selectedLocaleCode);
    const id = current?.id || selectedLocaleId || 1;

    const run = async () => {
      if (!sport || sport.value === "average") {
        setChampionships([
          { value: "all", label: "All Championships", apiValue: "" },
        ]);
        if (selectedChampionships.length !== 0) setSelectedChampionships([]);
        return;
      }
      try {
        const url = `${API_BASE}/odds/championships?locale_id=${id}&sport=${encodeURIComponent(
          sport.apiValue || sport.label
        )}&with_counts=true&limit=100`;
        const arr = await fetchJson(url).catch(() => []);
        const items = [
          { value: "all", label: "All Championships", apiValue: "" },
          ...(arr || []).map((c) => ({
            value: slugify(c?.name || ""),
            label: c?.name || "",
            apiValue: c?.name || "",
            matches_count: c?.matches_count,
          })),
        ];
        if (isCancelled) return;
        setChampionships(items);
        if (selectedChampionships.length !== 0) setSelectedChampionships([]);
      } catch (e) {
        if (isCancelled) return;
        setChampionships([
          { value: "all", label: "All Championships", apiValue: "" },
        ]);
        if (selectedChampionships.length !== 0) setSelectedChampionships([]);
      }
    };
    run();
    return () => {
      isCancelled = true;
    };
  }, [selectedLocaleCode, selectedLocaleId, sport, fetchJson]);

  // pagination state
  const [pageSize, setPageSize] = useState(20);
  const [offset, setOffset] = useState(0);
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
    has_next: false,
    has_prev: false,
  });
  const [matchesCount, setMatchesCount] = useState(0);
  const draftMatchesCount = React.useMemo(() => {
    const items = championships.filter((c) => c.value !== "all");
    const source =
      draftChampionships && draftChampionships.length > 0
        ? items.filter((c) => draftChampionships.includes(c.apiValue))
        : items;
    return source.reduce((sum, c) => sum + (Number(c.matches_count) || 0), 0);
  }, [championships, draftChampionships]);

  // reset pagination when filters change
  useEffect(() => {
    setOffset(0);
  }, [selectedLocaleCode, selectedLocaleId, sport, selectedChampionships]);

  // close championships dropdown and reset drafts when sport changes to avoid stale lists
  useEffect(() => {
    setIsChampOpen(false);
    setDraftChampionships([]);
    // не сбрасываем selectedChampionships повторно, если он уже пуст
    setSelectedChampionships((prev) => (prev.length ? [] : prev));
  }, [sport]);

  // fetch ratings with debounce on any change
  useEffect(() => {
    let isCancelled = false;
    const current = locales.find((l) => l.code === selectedLocaleCode);
    const id = current?.id || selectedLocaleId || 1;

    const params = new URLSearchParams();
    params.set("locale_id", String(id));
    if (sport?.value === "average") params.set("sport", "average");
    else if (sport?.apiValue) params.set("sport", sport.apiValue);
    if (
      Array.isArray(selectedChampionships) &&
      selectedChampionships.length > 0
    ) {
      selectedChampionships.forEach((ch) => params.append("championships", ch));
    }
    // server-side sorting by rank asc
    params.set("sort_by", "rank");
    params.set("order", "asc");
    // pagination
    params.set("limit", String(pageSize));
    params.set("offset", String(offset));

    const url = `${API_BASE}/odds/ratings?${params.toString()}`;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchJson(url);
        if (isCancelled) return;
        setRatings(Array.isArray(data?.items) ? data.items : []);
        const lu = data?.last_updated ?? data?.summary?.last_updated ?? "";
        setLastUpdated(lu);
        setScope(data?.scope || "overall");
        const p = data?.pagination || {};
        setMatchesCount(Number(data?.summary?.total_matches) || 0);
        setPagination({
          limit: Number(p?.limit) || pageSize,
          offset: Number(p?.offset) || offset,
          total: Number(p?.total) || 0,
          has_next: Boolean(p?.has_next),
          has_prev: Boolean(p?.has_prev),
        });
      } catch (e) {
        if (isCancelled) return;
        setError("Failed to load ratings. Try again.");
        setRatings([]);
        setLastUpdated("");
        setPagination({
          limit: pageSize,
          offset,
          total: 0,
          has_next: false,
          has_prev: false,
        });
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [
    selectedLocaleCode,
    selectedLocaleId,
    sport,
    selectedChampionships,
    pageSize,
    offset,
    fetchJson,
  ]);

  const onRetry = () => {
    // trigger effects by toggling showOU quickly
    setShowOU((v) => !v);
    setShowOU((v) => !v);
  };

  const onDetails = (row) => {
    const locale = selectedLocaleCode || "UK";
    const base = `/bookmakers/odds/${encodeURIComponent(locale)}&${row.id}`;
    const url =
      Array.isArray(selectedChampionships) && selectedChampionships.length === 1
        ? `${base}?championship=${encodeURIComponent(selectedChampionships[0])}`
        : base;
    navigate(url);
  };

  return (
    <div className="w-[95%]">
      {isLogged ? (
        <>
          {" "}
          <div className="bg-white rounded-lg shadow-lg w-full">
            {/* Header */}
            <div className="border-b p-3 w-full flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                Odds: Rating, Sport and League Splits
              </h1>
              <div className="text-sm text-gray-600">
                {lastUpdated ? `Last Update: ${lastUpdated}` : ""}
              </div>
            </div>

            {/* Controls Container */}
            <div>
              {/* First row: like Bonus Top gray header */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 border rounded bg-gray-100 mx-4 my-4 p-4 items-center justify-between">
                {/* Left: Locale */}
                <div className="flex items-center gap-2 min-w-[180px]">
                  <label
                    className="text-sm font-medium"
                    htmlFor="locale-select"
                  >
                    Locale
                  </label>
                  <select
                    id="locale-select"
                    className="px-2 py-1 border rounded"
                    value={selectedLocaleCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setSelectedLocaleCode(code);
                      const found = locales.find((l) => l.code === code);
                      if (found) setSelectedLocaleId(found.id);
                      setSport({
                        value: "average",
                        label: "Average",
                        apiValue: "Average",
                      });
                      setSelectedChampionships([]);
                    }}
                  >
                    {locales.length > 0
                      ? locales.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.code}
                          </option>
                        ))
                      : ["UK", "ES", "BR", "CO", "RS", "MX", "RO"].map(
                          (code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          )
                        )}
                  </select>
                </div>

                {/* Center: Championship */}
                <div className="flex flex-col items-center flex-1">
                  <label className="text-sm font-medium" htmlFor="champ-select">
                    Championship
                  </label>
                  <div className="relative">
                    <button
                      id="champ-select"
                      type="button"
                      className={`px-2 py-1 border rounded min-w-[220px] text-left ${
                        !sport || sport.value === "average"
                          ? "text-gray-500 bg-gray-50"
                          : ""
                      }`}
                      disabled={!sport || sport.value === "average"}
                      onClick={() =>
                        setIsChampOpen((prev) => {
                          const next = !prev;
                          if (!prev && next)
                            setDraftChampionships(selectedChampionships);
                          return next;
                        })
                      }
                    >
                      {!sport || sport.value === "average"
                        ? "Select Sport to Filter Leagues"
                        : selectedChampionships.length === 0
                        ? "All Championships"
                        : selectedChampionships.length === 1
                        ? selectedChampionships[0]
                        : `${selectedChampionships.length} selected`}
                    </button>
                    {isChampOpen && (
                      <div className="absolute z-10 mt-1 bg-white border rounded shadow-md max-h-80 overflow-auto min-w-[260px]">
                        <div className="px-3 py-2 border-b flex items-center gap-2">
                          <button
                            className="px-2 py-1 text-sm border rounded bg-teal-50 text-teal-700"
                            onClick={() => {
                              setSelectedChampionships(draftChampionships);
                              setIsChampOpen(false);
                            }}
                          >
                            {`Count (${draftMatchesCount.toLocaleString()} matches)`}
                          </button>
                          <button
                            className="px-2 py-1 text-sm border rounded"
                            onClick={() => {
                              setDraftChampionships([]);
                              setSelectedChampionships([]);
                              setIsChampOpen(false);
                            }}
                          >
                            Clear
                          </button>
                        </div>
                        <ul className="py-1">
                          {championships
                            .filter((c) => c.value !== "all")
                            .map((c) => {
                              const checked = draftChampionships.includes(
                                c.apiValue
                              );
                              return (
                                <li
                                  key={c.value}
                                  className="px-3 py-1 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={checked}
                                    onChange={(e) => {
                                      setDraftChampionships((prev) => {
                                        if (e.target.checked)
                                          return [...prev, c.apiValue];
                                        return prev.filter(
                                          (v) => v !== c.apiValue
                                        );
                                      });
                                    }}
                                  />
                                  <span className="text-sm">
                                    {c.label}
                                    {c.matches_count != null
                                      ? ` (${c.matches_count.toLocaleString()})`
                                      : ""}
                                  </span>
                                </li>
                              );
                            })}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: toggles */}
                <div className="ml-auto flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={showWinner}
                      onChange={(e) => setShowWinner(e.target.checked)}
                    />
                    <div
                      className={`w-10 h-6 rounded-full ${
                        showWinner ? "bg-teal-400" : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full mt-1 ml-1 transition-transform ${
                          showWinner ? "translate-x-4" : ""
                        }`}
                      ></div>
                    </div>
                    <span className="text-sm">Winner Margin</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={showOU}
                      onChange={(e) => setShowOU(e.target.checked)}
                    />
                    <div
                      className={`w-10 h-6 rounded-full ${
                        showOU ? "bg-teal-400" : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full mt-1 ml-1 transition-transform ${
                          showOU ? "translate-x-4" : ""
                        }`}
                      ></div>
                    </div>
                    <span className="text-sm">O/U Margin</span>
                  </label>
                </div>
              </div>

              {/* Second row: Sports as blue chips */}
              <div className="px-5 pb-5">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Sports
                </label>
                <div className="flex flex-wrap gap-2">
                  {(sports || []).map((s) => (
                    <button
                      key={s.value}
                      onClick={() => {
                        setSport(s);
                        setSelectedChampionships([]);
                      }}
                      className={`${
                        sport?.value === s.value
                          ? "px-3 py-1 text-sm rounded-full border bg-blue-500 text-white border-blue-500"
                          : "px-3 py-1 text-sm rounded-full border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border rounded-md p-0 overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader className="w-8 h-8" />
                </div>
              ) : error ? (
                <div className="p-4 text-center">
                  <p className="mb-3">{error}</p>
                  <button
                    className="px-3 py-1 text-sm border rounded"
                    onClick={onRetry}
                  >
                    Retry
                  </button>
                </div>
              ) : ratings.length === 0 ? (
                <div className="p-4 text-center text-gray-600">
                  No ratings data available for the selected criteria.
                </div>
              ) : (
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2">Rank</th>
                      <th className="text-left px-3 py-2">Bookmaker</th>
                      <th className="text-left px-3 py-2">Rating</th>
                      <th className="text-left px-3 py-2">Avg Margin</th>
                      {showWinner && (
                        <th className="text-left px-3 py-2">Winner Margin</th>
                      )}
                      {showOU && (
                        <th className="text-left px-3 py-2">O/U Margin</th>
                      )}
                      <th className="text-left px-3 py-2">Matches</th>
                      <th className="text-left px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratings.map((row, idx) => {
                      const avg =
                        row.avg_margin ??
                        ((row.winner_margin ?? 0) + (row.ou_margin ?? 0)) / 2;
                      const badge = ratingBadgeColor(row.rating ?? 0);
                      return (
                        <tr
                          key={row.id}
                          className={idx % 2 ? "bg-gray-50" : ""}
                        >
                          <td className="px-3 py-2">{row.rank ?? idx + 1}</td>
                          <td className="px-3 py-2 font-medium">
                            {capitalize(row.name)}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${badge} flex items-center gap-1 w-fit`}
                            >
                              <SportIcon kind={sport?.value} />
                              {(row.rating ?? 0).toFixed(1)}
                            </span>
                          </td>
                          <td className="px-3 py-2">{toPercent(avg)}</td>
                          {showWinner && (
                            <td className="px-3 py-2">
                              {row.winner_margin != null
                                ? toPercent(row.winner_margin)
                                : "—"}
                            </td>
                          )}
                          {showOU && (
                            <td className="px-3 py-2">
                              {row.ou_margin != null
                                ? toPercent(row.ou_margin)
                                : "—"}
                            </td>
                          )}
                          <td className="px-3 py-2">
                            {(row.total_matches ?? 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              className="px-2 py-1 border rounded"
                              onClick={() => onDetails(row)}
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {/* Pagination controls */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">Rows per page:</span>
                <select
                  className="px-2 py-1 border rounded"
                  value={pageSize}
                  onChange={(e) => {
                    const next = Number(e.target.value) || 20;
                    setPageSize(next);
                    setOffset(0);
                  }}
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-600">
                {pagination.total > 0
                  ? `${Math.min(
                      pagination.offset + 1,
                      pagination.total
                    )}-${Math.min(
                      pagination.offset + pagination.limit,
                      pagination.total
                    )} of ${pagination.total}`
                  : ""}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                  disabled={!pagination.has_prev}
                  onClick={() => setOffset(Math.max(0, offset - pageSize))}
                >
                  Prev
                </button>
                <button
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                  disabled={!pagination.has_next}
                  onClick={() => setOffset(offset + pageSize)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-red-600 text-center m-10">Please log in</p>
      )}
    </div>
  );
}
