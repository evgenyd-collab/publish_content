import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import BonusItem from "./components/molecules/bonus-item";
import Pagination from "./components/molecules/pagination";
import TableHead from "./components/atoms/table-head";
import { locales } from "./helpers/constants.js";
import Loader from "./components/atoms/loader";
import { dataFetch } from "./helpers/data-fetch";

import useAuthStore from "./store/auth-store.js";

const API_ENDPOINT = import.meta.env.VITE_ENDPOINT;

const FILTER_TYPES = [
  { value: "", label: "Select Filter" },
  { value: "sport", label: "Sport" },
  { value: "reward_type", label: "Reward Type" },
  { value: "expiration_date", label: "Expiration Date" },
];

const SPORT_FILTERS = [
  { value: "all", label: "All", apiValue: "" },
  { value: "football", label: "Football", apiValue: "Football" },
  { value: "baseball", label: "Baseball", apiValue: "Baseball" },
  { value: "tennis", label: "Tennis", apiValue: "Tennis" },
  { value: "esports", label: "Esports", apiValue: "Esports" },
  {
    value: "greyhound_racing",
    label: "Greyhound Racing",
    apiValue: "Greyhound Racing",
  },
  { value: "horse_racing", label: "Horse Racing", apiValue: "Horse Racing" },
];

const REWARD_TYPE_FILTERS = [
  { value: "all", label: "All", apiValue: "" },
  { value: "mixed", label: "Mixed", apiValue: "mixed" },
  { value: "free_bet", label: "Free Bet", apiValue: "free bet" },
  { value: "cash", label: "Cash", apiValue: "cash" },
  { value: "percent", label: "%", apiValue: "%" },
  { value: "free_spins", label: "Free Spins", apiValue: "free spins" },
  { value: "other", label: "Other", apiValue: "other" },
  { value: "prize", label: "Prize", apiValue: "prize" },
  { value: "point", label: "Point", apiValue: "point" },
  { value: "boosted_odds", label: "Boosted Odds", apiValue: "boosted odds" },
  { value: "cashback", label: "Cashback", apiValue: "cashback" },
  { value: "bet_credits", label: "Bet Credits", apiValue: "bet credits" },
  { value: "cash_points", label: "Cash+Points", apiValue: "cash+points" },
  { value: "no_risk_bet", label: "No Risk Bet", apiValue: "no risk bet" },
];

const EXPIRATION_DATE_FILTERS = [
  { value: "all", label: "All", apiValue: "" },
  { value: "today", label: "Today", apiValue: "today" },
  { value: "tomorrow", label: "Tomorrow", apiValue: "tomorrow" },
  { value: "this_week", label: "This Week", apiValue: "this_week" },
  { value: "next_week", label: "Next Week", apiValue: "next_week" },
  { value: "this_month", label: "This Month", apiValue: "this_month" },
  { value: "next_month", label: "Next Month", apiValue: "next_month" },
];

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label className="flex items-center cursor-pointer select-none">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div
          className={`w-10 h-6 rounded-full transition-colors duration-200 ${
            checked ? "bg-teal-400" : "bg-gray-300"
          }`}
        ></div>
        <div
          className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${
            checked ? "translate-x-4" : ""
          }`}
        ></div>
      </div>
      <span className="ml-2 text-base text-gray-800">{label}</span>
    </label>
  );
}

const BonusTop = () => {
  const isLogged = useAuthStore((state) => state.isLogged);
  const [searchParams, setSearchParams] = useSearchParams();
  const [bonuses, setBonuses] = useState({ data: [] });
  const [bonusesLoaded, setBonusesLoaded] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState(
    searchParams.get("locale") || locales[1]?.value || ""
  );
  const [selectedFilter, setSelectedFilter] = useState(
    searchParams.get("filter") || ""
  );
  const [selectedSubFilter, setSelectedSubFilter] = useState(
    searchParams.get("subfilter") || "all"
  );
  const [selectedPage, setSelectedPage] = useState(
    parseInt(searchParams.get("page")) || 1
  );
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });

  const [showWelcome, setShowWelcome] = useState(true);
  const [showCommon, setShowCommon] = useState(true);
  const [showSport, setShowSport] = useState(
    searchParams.get("sport") !== "false"
  );
  const [showCasino, setShowCasino] = useState(
    searchParams.get("casino") !== "false"
  );
  const [showPoker, setShowPoker] = useState(
    searchParams.get("poker") !== "false"
  );
  const [showBingo, setShowBingo] = useState(
    searchParams.get("bingo") !== "false"
  );

  const [availableSports, setAvailableSports] = useState([]);
  const [sportsLoaded, setSportsLoaded] = useState(false);
  const [sportsError, setSportsError] = useState(null);
  const [sportsCache, setSportsCache] = useState({});

  useEffect(() => {
    if (
      (sortConfig.key === "amount_number" ||
        sortConfig.key === "expiration_date") &&
      selectedLocale &&
      selectedFilter
    ) {
      fetchBonuses(
        selectedLocale,
        selectedFilter,
        selectedSubFilter,
        selectedPage,
        itemsPerPage,
        showWelcome,
        showCommon,
        showSport,
        showCasino,
        showPoker,
        showBingo
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig]);

  const fetchAvailableSports = async (locale) => {
    if (!locale) {
      setAvailableSports([]);
      setSportsLoaded(true);
      setSportsError(null);
      return;
    }

    if (!API_ENDPOINT) {
      setSportsError("API endpoint not configured");
      setAvailableSports(SPORT_FILTERS);
      setSportsLoaded(true);
      return;
    }

    // Check cache first
    if (sportsCache[locale]) {
      setAvailableSports(sportsCache[locale]);
      setSportsLoaded(true);
      setSportsError(null);
      return;
    }

    setSportsLoaded(false);
    setSportsError(null);

    try {
      const filterBy = ["locale_code", "is_expired"];
      const filterValue = [locale, "false"];

      const queryParams = new URLSearchParams({
        filter_by: filterBy.join(","),
        filter_value: filterValue.join(","),
        fields: "terms",
        items_per_page: "100",
        page: "1",
      });

      const fetchUrl = `${API_ENDPOINT}/bonuses/?${queryParams.toString()}`;

      const response = await dataFetch(null, "GET", fetchUrl);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      const uniqueSports = new Set();
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((bonus) => {
          // Берем sport_type из правильного места: terms.bet_details.sport_type
          const sportType = bonus?.terms?.bet_details?.sport_type;

          // Если это массив - добавляем каждый элемент отдельно
          if (Array.isArray(sportType)) {
            sportType.forEach((sport) => {
              const trimmed = (sport || "").trim();
              if (
                trimmed &&
                trimmed.toLowerCase() !== "all" &&
                trimmed.toLowerCase() !== "null"
              ) {
                uniqueSports.add(trimmed);
              }
            });
          }
          // Если это строка - добавляем как раньше
          else if (typeof sportType === "string") {
            const trimmed = sportType.trim();
            if (
              trimmed &&
              trimmed.toLowerCase() !== "all" &&
              trimmed.toLowerCase() !== "null"
            ) {
              uniqueSports.add(trimmed);
            }
          }
        });
      }

      const sportsArray = Array.from(uniqueSports).sort();

      const formattedSports = [
        { value: "all", label: "All", apiValue: "" },
        ...sportsArray.map((sport) => ({
          value: sport.toLowerCase().replace(/\s+/g, "_"),
          label: sport,
          apiValue: sport,
        })),
      ];

      setAvailableSports(formattedSports);

      setSportsCache((prev) => ({
        ...prev,
        [locale]: formattedSports,
      }));
    } catch (error) {
      console.error("fetchAvailableSports error:", error);
      setSportsError(error.message);

      setAvailableSports(SPORT_FILTERS);
    } finally {
      setSportsLoaded(true);
    }
  };

  useEffect(() => {
    // Нормализуем старые URL, где мог быть subfilter=expired
    if (
      selectedFilter === "expiration_date" &&
      selectedSubFilter === "expired"
    ) {
      setSelectedSubFilter("all");
    }
    const params = new URLSearchParams();
    if (selectedLocale) params.set("locale", selectedLocale);
    if (selectedFilter) params.set("filter", selectedFilter);
    if (selectedSubFilter && selectedSubFilter !== "all")
      params.set("subfilter", selectedSubFilter);
    if (selectedPage > 1) params.set("page", selectedPage.toString());
    // Добавляем параметры для welcome/common
    if (!showWelcome) params.set("welcome", "false");
    if (!showCommon) params.set("common", "false");
    if (!showSport) params.set("sport", "false");
    if (!showCasino) params.set("casino", "false");
    if (!showPoker) params.set("poker", "false");
    if (!showBingo) params.set("bingo", "false");
    setSearchParams(params, { replace: true });
  }, [
    selectedLocale,
    selectedFilter,
    selectedSubFilter,
    selectedPage,
    showWelcome,
    showCommon,
    showSport,
    showCasino,
    showPoker,
    showBingo,
    setSearchParams,
  ]);

  useEffect(() => {
    if (selectedLocale && selectedFilter === "sport") {
      fetchAvailableSports(selectedLocale);
    }
  }, [selectedLocale, selectedFilter]);

  const fetchBonuses = async (
    locale,
    filterType,
    subFilter,
    page,
    limit,
    welcome,
    common,
    sport,
    casino,
    poker,
    bingo
  ) => {
    if (!locale || !filterType) {
      setBonuses({ data: [] });
      setBonusesLoaded(true);
      return;
    }
    if (!welcome && !common) {
      setBonuses({ data: [] });
      setBonusesLoaded(true);
      return;
    }
    if (!sport && !casino && !poker && !bingo) {
      setBonuses({ data: [] });
      setBonusesLoaded(true);
      return;
    }

    setBonusesLoaded(false);

    try {
      const filterBy = ["locale_code"];
      const filterValue = [locale];

      if (filterType === "sport" && subFilter && subFilter !== "all") {
        const sportsToUse =
          availableSports.length > 0 ? availableSports : SPORT_FILTERS;
        const sportFilter = sportsToUse.find((f) => f.value === subFilter);
        if (sportFilter?.apiValue) {
          filterBy.push("sport_type");
          filterValue.push(sportFilter.apiValue);
        }
      } else if (
        filterType === "reward_type" &&
        subFilter &&
        subFilter !== "all"
      ) {
        const rewardFilter = REWARD_TYPE_FILTERS.find(
          (f) => f.value === subFilter
        );
        if (rewardFilter?.apiValue) {
          filterBy.push("reward_type");
          filterValue.push(rewardFilter.apiValue);
        }
      }

      if (welcome && !common) {
        filterBy.push("bonus_type");
        filterValue.push("Welcome");
      } else if (!welcome && common) {
        filterBy.push("bonus_type");
        filterValue.push("Common");
      }

      // Domain filtering: only filter at API level when exactly 1 domain is selected
      // For 2+ domains selected, we'll filter on the client side
      const activeDomains = [];
      if (sport) activeDomains.push("Sport");
      if (casino) activeDomains.push("Casino");
      if (poker) activeDomains.push("Poker");
      if (bingo) activeDomains.push("Bingo");

      if (activeDomains.length === 1) {
        filterBy.push("domain");
        filterValue.push(activeDomains[0]);
      }
      // If 2+ domains are selected, don't add domain filter to API
      // Client-side filtering in useMemo will handle it

      filterBy.push("is_expired");
      filterValue.push("false");

      const queryParams = new URLSearchParams({
        filter_by: filterBy.join(","),
        filter_value: filterValue.join(","),
        fields:
          "id,name,amount,amount_number,bookmaker,expiration_date,expiration_status,bonus_type,terms,url,bookmaker_id,locale_code,updated_at,legalbet_url,legalcasino_payload",
      });

      if (limit === "all") {
        queryParams.set("page", "all");
      } else if (limit !== undefined) {
        queryParams.set("items_per_page", limit.toString());
        queryParams.set("page", page.toString());
      } else {
        queryParams.set("items_per_page", "1000");
        queryParams.set("page", "1");
      }

      let fetchUrl = `${API_ENDPOINT}/bonuses/?${queryParams.toString()}`;
      if (sortConfig.key === "amount_number") {
        fetchUrl += `&order_by=amount_number&order_direction=${
          sortConfig.direction === "ascending" ? "asc" : "desc"
        }`;
      } else if (sortConfig.key === "expiration_date") {
        fetchUrl += `&order_by=expiration_date&order_direction=${
          sortConfig.direction === "ascending" ? "asc" : "desc"
        }`;
      }

      // единый флоу
      const response = await dataFetch(null, "GET", fetchUrl);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown error" }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      let data = await response.json();
      if (sortConfig.key === "amount_number" && Array.isArray(data.data)) {
        const numeric = data.data.filter(
          (b) => typeof b.amount_number === "number" && !isNaN(b.amount_number)
        );
        const nonNumeric = data.data.filter(
          (b) =>
            !(typeof b.amount_number === "number" && !isNaN(b.amount_number))
        );
        data.data = [...numeric, ...nonNumeric];
      }
      setBonuses(data);
    } catch (error) {
      console.error("Error fetching bonuses:", error);
      setBonuses({ data: [], error: error.message });
    } finally {
      setBonusesLoaded(true);
    }
  };

  useEffect(() => {
    if (selectedLocale && selectedFilter) {
      fetchBonuses(
        selectedLocale,
        selectedFilter,
        selectedSubFilter,
        selectedPage,
        itemsPerPage,
        showWelcome,
        showCommon,
        showSport,
        showCasino,
        showPoker,
        showBingo
      );
    } else {
      setBonuses({ data: [] });
      setBonusesLoaded(true);
    }
  }, [
    selectedLocale,
    selectedFilter,
    selectedSubFilter,
    selectedPage,
    itemsPerPage,
    showWelcome,
    showCommon,
    showSport,
    showCasino,
    showPoker,
    showBingo,
  ]);

  const handleLocaleChange = (e) => {
    const newLocaleValue = e.target.value;
    setSelectedLocale(newLocaleValue);
    setSelectedPage(1);

    if (selectedFilter === "sport") {
      setSelectedSubFilter("all");
    }
  };

  const handleFilterChange = (e) => {
    const newFilterValue = e.target.value;
    setSelectedFilter(newFilterValue);
    setSelectedSubFilter("all");
    setSelectedPage(1);

    if (newFilterValue === "expiration_date") {
      setSortConfig({ key: "expiration_date", direction: "ascending" });
    } else {
      setSortConfig({ key: null, direction: "ascending" });
    }
  };

  const handleSubFilterChange = (filterValue) => {
    setSelectedSubFilter(filterValue);
    setSelectedPage(1);

    if (selectedFilter === "expiration_date") {
      setSortConfig({ key: "expiration_date", direction: "ascending" });
    }
  };

  const handlePageChange = (page) => {
    setSelectedPage(page);
  };

  const getCurrentSubFilters = () => {
    if (selectedFilter === "sport") {
      return availableSports.length > 0 ? availableSports : SPORT_FILTERS;
    }
    if (selectedFilter === "reward_type") return REWARD_TYPE_FILTERS;
    if (selectedFilter === "expiration_date") return EXPIRATION_DATE_FILTERS;
    return [];
  };

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
    setSelectedPage(1);
  };

  const sortedBonuses = useMemo(() => {
    if (!bonuses.data || bonuses.data.length === 0) return [];

    let filtered = bonuses.data.filter(
      (b) => !String(b.expiration_status).toLowerCase().includes("expired")
    );

    if (selectedFilter === "expiration_date" && selectedSubFilter === "all") {
      const withDate = filtered.filter(
        (b) => !!b.expiration_date && !isNaN(new Date(b.expiration_date))
      );
      const withoutDate = filtered.filter(
        (b) => !b.expiration_date || isNaN(new Date(b.expiration_date))
      );

      withDate.sort((a, b) => {
        const dateA = new Date(a.expiration_date);
        const dateB = new Date(b.expiration_date);
        return dateA - dateB;
      });

      return [...withDate, ...withoutDate];
    }

    if (selectedFilter === "expiration_date" && selectedSubFilter !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((bonus) => {
        if (!bonus.expiration_date) return false;
        const expirationDate = new Date(bonus.expiration_date);
        if (isNaN(expirationDate.getTime())) return false;
        expirationDate.setHours(0, 0, 0, 0);
        const diffTime = expirationDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        switch (selectedSubFilter) {
          case "today":
            return daysDiff === 0;
          case "tomorrow":
            return daysDiff === 1;
          case "this_week":
            return daysDiff >= 0 && daysDiff <= 7;
          case "next_week":
            return daysDiff >= 8 && daysDiff <= 14;
          case "this_month":
            return daysDiff >= 0 && daysDiff <= 30;
          case "next_month":
            return daysDiff >= 31 && daysDiff <= 60;
          default:
            return false;
        }
      });

      filtered.sort((a, b) => {
        const dateA = new Date(a.expiration_date);
        const dateB = new Date(b.expiration_date);
        return dateA - dateB;
      });
      return filtered;
    }

    if (
      selectedFilter === "expiration_date" &&
      selectedSubFilter === "expired"
    ) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expired = bonuses.data.filter((bonus) => {
        if (!bonus.expiration_date) return false;
        const expirationDate = new Date(bonus.expiration_date);
        if (isNaN(expirationDate.getTime())) return false;
        expirationDate.setHours(0, 0, 0, 0);
        const diffTime = expirationDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return (
          daysDiff < 0 &&
          !(
            bonus.expiration_status &&
            String(bonus.expiration_status).toLowerCase().includes("expired")
          )
        );
      });
      expired.sort((a, b) => {
        const dateA = new Date(a.expiration_date);
        const dateB = new Date(b.expiration_date);
        return dateB - dateA;
      });
      return expired;
    }

    let sortableItems = [...filtered];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "amount") {
          aValue = parseFloat(aValue?.replace(/[£$€,]/g, "") || "0");
          bValue = parseFloat(bValue?.replace(/[£$€,]/g, "") || "0");
        } else if (sortConfig.key === "updated_at") {
          aValue = new Date(aValue || 0);
          bValue = new Date(bValue || 0);
        } else {
          aValue = aValue?.toString().toLowerCase() || "";
          bValue = bValue?.toString().toLowerCase() || "";
        }

        if (aValue < bValue)
          return sortConfig.direction === "ascending" ? -1 : 1;
        if (aValue > bValue)
          return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }

    const sportSelected = showSport;
    const casinoSelected = showCasino;
    const pokerSelected = showPoker;
    const bingoSelected = showBingo;

    sortableItems = sortableItems.filter((bonus) => {
      let parsedTerms = {};
      try {
        if (bonus.terms && typeof bonus.terms === "string") {
          parsedTerms = JSON.parse(bonus.terms);
        } else if (bonus.terms && typeof bonus.terms === "object") {
          parsedTerms = bonus.terms;
        }
      } catch {}
      const domainFromTerms = (parsedTerms.domain || "sport").toLowerCase();

      // If nothing selected, show nothing
      if (!sportSelected && !casinoSelected && !pokerSelected && !bingoSelected)
        return false;

      if (domainFromTerms === "casino") return casinoSelected;
      if (domainFromTerms === "poker") return pokerSelected;
      if (domainFromTerms === "bingo") return bingoSelected;
      // Treat everything else as sport
      return sportSelected;
    });

    return sortableItems;
  }, [
    bonuses.data,
    sortConfig,
    showWelcome,
    showCommon,
    showSport,
    showCasino,
    showPoker,
    showBingo,
    selectedFilter,
    selectedSubFilter,
  ]);

  const onBonusSuccess = () => {
    if (selectedLocale && selectedFilter) {
      fetchBonuses(
        selectedLocale,
        selectedFilter,
        selectedSubFilter,
        selectedPage,
        itemsPerPage,
        showWelcome,
        showCommon,
        showSport,
        showCasino,
        showPoker,
        showBingo
      );
    }
  };

  const updateBonusInList = (updatedBonus) => {
    setBonuses((prev) => ({
      ...prev,
      data: prev.data.map((b) => (b.id === updatedBonus.id ? updatedBonus : b)),
    }));
  };

  console.log(isLogged);

  return (
    <div className="w-full max-w-full">
      <div className="bg-white rounded-lg shadow-lg w-full">
        {/* Header */}

        {isLogged ? (
          <>
            {" "}
            <div className="border-b p-3 w-full">
              <h1 className="text-2xl font-bold text-gray-900">Bonus Top</h1>
            </div>
            {/* Controls Container */}
            <div>
              {/* First row of controls: static */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 border rounded bg-gray-100 mx-4 my-4 p-4 items-center justify-between">
                {/* Locale Selector */}
                <div className="flex flex-col min-w-[180px]">
                  <label
                    htmlFor="locale-select"
                    className="text-sm font-medium text-gray-700 mb-1"
                  >
                    Locale
                  </label>
                  <div className="relative w-40">
                    <select
                      id="locale-select"
                      className="appearance-none w-full h-8 pl-2 pr-7 py-0.5 rounded bg-white text-sm font-normal leading-tight text-[#000000cc] border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                      onChange={handleLocaleChange}
                      value={selectedLocale}
                    >
                      {locales.map((locale) => (
                        <option key={locale.value} value={locale.value}>
                          {locale.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg
                        className="fill-current h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Filter Type Selector */}
                <div className="flex flex-col items-center">
                  <label
                    htmlFor="filter-select"
                    className="text-sm font-medium text-gray-700 mb-1"
                  >
                    Filter Type
                  </label>
                  <div className="relative">
                    <select
                      id="filter-select"
                      className="appearance-none w-full h-8 pl-2 pr-7 py-0.5 rounded bg-white text-sm font-normal leading-tight text-[#000000cc] border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                      onChange={handleFilterChange}
                      value={selectedFilter}
                    >
                      {FILTER_TYPES.map((filter) => (
                        <option key={filter.value} value={filter.value}>
                          {filter.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg
                        className="fill-current h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Toggles in two rows */}
                <div className="flex flex-col gap-2 ml-2">
                  {/* First Row: Domain Toggles */}
                  <div className="flex gap-4">
                    <ToggleSwitch
                      checked={showSport}
                      onChange={() => setShowSport((v) => !v)}
                      label="Sport"
                    />
                    <ToggleSwitch
                      checked={showCasino}
                      onChange={() => setShowCasino((v) => !v)}
                      label="Casino"
                    />
                    <ToggleSwitch
                      checked={showPoker}
                      onChange={() => setShowPoker((v) => !v)}
                      label="Poker"
                    />
                    <ToggleSwitch
                      checked={showBingo}
                      onChange={() => setShowBingo((v) => !v)}
                      label="Bingo"
                    />
                  </div>
                  {/* Second Row: Type Toggles */}
                  <div className="flex gap-4">
                    <ToggleSwitch
                      checked={showWelcome}
                      onChange={() => setShowWelcome((v) => !v)}
                      label="Welcome"
                    />
                    <ToggleSwitch
                      checked={showCommon}
                      onChange={() => setShowCommon((v) => !v)}
                      label="Common"
                    />
                  </div>
                </div>
              </div>

              {/* Second row of controls: dynamic sub-filters */}
              {selectedFilter && (
                <div className="px-5 py-5">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    {selectedFilter === "sport"
                      ? "Sports"
                      : selectedFilter === "expiration_date"
                      ? "Expiration Date"
                      : "Reward Types"}
                    {selectedFilter === "sport" && !sportsLoaded && (
                      <span className="ml-2 text-xs text-gray-500">
                        (Loading...)
                      </span>
                    )}
                    {selectedFilter === "sport" && sportsError && (
                      <span className="ml-2 text-xs text-red-500">
                        (Error: using fallback)
                      </span>
                    )}
                  </label>
                  {selectedFilter === "sport" && !sportsLoaded ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      <span className="ml-2 text-sm text-gray-500">
                        Loading sports...
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getCurrentSubFilters().map((subFilter) => (
                        <button
                          key={subFilter.value}
                          onClick={() => handleSubFilterChange(subFilter.value)}
                          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                            selectedSubFilter === subFilter.value
                              ? "bg-blue-500 text-white border-blue-500"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {subFilter.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Content */}
            <div className="p-6">
              {!bonusesLoaded ? (
                <div className="flex justify-center items-center h-64">
                  <Loader />
                </div>
              ) : bonuses.error ? (
                <div className="text-center py-8">
                  <p className="text-red-600">Error: {bonuses.error}</p>
                </div>
              ) : !selectedLocale || !selectedFilter ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    Please select a locale and filter type to view bonuses.
                  </p>
                </div>
              ) : sortedBonuses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No bonuses found for the selected criteria.
                  </p>
                </div>
              ) : (
                <>
                  {/* Bonuses Table */}
                  <div>
                    <table className="w-full bg-white">
                      <TableHead
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                      />
                      <tbody>
                        {sortedBonuses.map((bonus) => (
                          <BonusItem
                            key={bonus.id}
                            bonus={bonus}
                            selectedLocale={selectedLocale}
                            onSuccess={onBonusSuccess}
                          />
                        ))}
                      </tbody>
                    </table>
                    <Pagination
                      bonuses={bonuses}
                      selectedPage={selectedPage}
                      setSelectedPage={setSelectedPage}
                      itemsPerPage={itemsPerPage}
                      setItemsPerPage={setItemsPerPage}
                      disabled={!bonusesLoaded || bonuses.data?.length === 0}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <p className="text-red-600 text-center m-10">Please log in</p>
        )}
      </div>
    </div>
  );
};

export default function TestTab() {
  return <BonusTop />;
}
