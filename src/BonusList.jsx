import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAuthStore from "./store/auth-store.js";
import BonusItem from "./components/molecules/bonus-item";
import NewBonusModal from "./components/modals/new-bonus-modal.jsx";
import AddBonusButton from "./components/atoms/add-bonus-button";
import CollectNewBonusesButton from "./components/atoms/collect-new-bonuses-button";
import Pagination from "./components/molecules/pagination";
import TableHead from "./components/atoms/table-head";
import { locales, fields, notionLinks } from "./helpers/constants.js";
import { bonusAgeFormat } from "./utils/formatters.js";
import Loader from "./components/atoms/loader";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { dataFetch } from "./helpers/data-fetch.js";
import AddBookmakerModal from "./components/modals/add-bookmaker-modal.jsx";

const API_ENDPOINT = import.meta.env.VITE_ENDPOINT;

export default function BonusList() {
  const isLogged = useAuthStore((state) => state.isLogged);

  const { params } = useParams();
  const [paramsLocale, paramsId] = params?.split("&") || [null, null];
  const navigate = useNavigate();
  const [bonusesLoaded, setBonusesLoaded] = useState(false);
  const [fetchedBookmakers, setFetchedBookmakers] = useState([]);
  const [selectedBookmakerId, setSelectedBookmakerId] = useState("");
  const [selectedBookmakerName, setSelectedBookmakerName] = useState("");
  const [bookmakerSearch, setBookmakerSearch] = useState("");
  const [bonuses, setBonuses] = useState({ data: [] });
  const [selectedLocale, setSelectedLocale] = useState(locales[0]?.value || "");
  const [loadExpired, setLoadExpired] = useState(false);
  const [selectedPage, setSelectedPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isAddBonusModalOpen, setIsAddBonusModalOpen] = useState(false);
  const [isBookmakerDropdownOpen, setIsBookmakerDropdownOpen] = useState(false);
  const [isAddBookmakerModalOpen, setIsAddBookmakerModalOpen] = useState(false);
  const [isExpiredReportLoading, setIsExpiredReportLoading] = useState(false);

  const [filters, setFilters] = useState({
    statuses: {
      new: false,
      active: false,
      need_manual_check: false,
    },
    manual_flags: {
      manual_url: false,
      manual_type: false,
      manual_terms: false,
      manual_expiration: false,
    },
  });

  // New state for domain filters (added Poker and Bingo with backward-compatible restore)
  const [domainFilters, setDomainFilters] = useState(() => {
    const saved = sessionStorage.getItem("domainFilters");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) || {};
        return {
          sport: parsed.sport !== undefined ? parsed.sport : true,
          casino: parsed.casino !== undefined ? parsed.casino : true,
          poker: parsed.poker !== undefined ? parsed.poker : true,
          bingo: parsed.bingo !== undefined ? parsed.bingo : true,
        };
      } catch (_) {
        // ignore parse errors
      }
    }
    return { sport: true, casino: true, poker: true, bingo: true };
  });

  // Toggles for Welcome / Common bonus types
  const [showWelcome, setShowWelcome] = useState(true);
  const [showCommon, setShowCommon] = useState(true);

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });

  useEffect(() => {
    setBookmakerSearch("");
  }, [selectedLocale]);

  const filteredBookmakers = useMemo(() => {
    const lower = bookmakerSearch.toLowerCase();
    const filtered = lower
      ? fetchedBookmakers.filter((bm) =>
          bm.brand_name.toLowerCase().startsWith(lower)
        )
      : fetchedBookmakers;
    return filtered;
  }, [bookmakerSearch, fetchedBookmakers, selectedBookmakerId]);

  // const handleToggleStatusFilter = (statusKey) => {
  //   setFilters((prev) => {
  //     const newStatuses = Object.keys(prev.statuses).reduce((acc, key) => {
  //       acc[key] = key === statusKey ? !prev.statuses[statusKey] : false;
  //       return acc;
  //     }, {});
  //     return {
  //       ...prev,
  //       statuses: newStatuses,
  //     };
  //   });
  //   setSelectedPage(1);
  // };

  // const handleToggleFlagFilter = (flagKey) => {
  //   setFilters((prev) => ({
  //     ...prev,
  //     manual_flags: {
  //       ...prev.manual_flags,
  //       [flagKey]: !prev.manual_flags[flagKey],
  //     },
  //   }));
  //   setSelectedPage(1);
  // };

  // Handler for domain filter toggles
  const handleToggleDomainFilter = (domainKey) => {
    setDomainFilters((prev) => {
      const newFilters = { ...prev, [domainKey]: !prev[domainKey] };
      sessionStorage.setItem("domainFilters", JSON.stringify(newFilters));
      return newFilters;
    });
    setSelectedPage(1);
  };

  // Handlers for Welcome / Common toggles
  const handleToggleWelcome = () => {
    setShowWelcome((prev) => !prev);
    setSelectedPage(1);
  };

  const handleToggleCommon = () => {
    setShowCommon((prev) => !prev);
    setSelectedPage(1);
  };

  const handleLocaleChange = (e) => {
    const newLocaleValue = e.target.value;
    setSelectedLocale(newLocaleValue);
    setSelectedBookmakerId("");
    setSelectedBookmakerName("");
    setBonuses({ data: [] });
    setBonusesLoaded(false);
    setSortConfig({ key: null, direction: "ascending" });
    setSelectedPage(1);
  };

  const handleBookmakerChange = (e) => {
    const selectedId = +e.target.value;
    setSelectedBookmakerId(selectedId);

    const selectedBookmaker = fetchedBookmakers.find(
      (bm) => bm.id === selectedId
    );
    setSelectedBookmakerName(
      selectedBookmaker ? selectedBookmaker.brand_name : ""
    );

    setSortConfig({ key: null, direction: "ascending" });
    setSelectedPage(1);

    if (!selectedId) {
      setBonuses({ data: [] });
      setBonusesLoaded(false);
    }
  };

  const handlePreviousBookmaker = () => {
    const sortedBookmakers = [...fetchedBookmakers].sort((a, b) =>
      a.brand_name.localeCompare(b.brand_name)
    );
    const currentIndex = sortedBookmakers.findIndex(
      (bm) => bm.id === selectedBookmakerId
    );
    if (currentIndex > 0) {
      const prevBookmaker = sortedBookmakers[currentIndex - 1];
      setSelectedBookmakerId(prevBookmaker.id);
      setSelectedBookmakerName(prevBookmaker.brand_name);
      setSortConfig({ key: null, direction: "ascending" });
      setSelectedPage(1);
    }
  };

  const handleNextBookmaker = () => {
    const sortedBookmakers = [...fetchedBookmakers].sort((a, b) =>
      a.brand_name.localeCompare(b.brand_name)
    );
    const currentIndex = sortedBookmakers.findIndex(
      (bm) => bm.id === selectedBookmakerId
    );
    if (currentIndex < sortedBookmakers.length - 1) {
      const nextBookmaker = sortedBookmakers[currentIndex + 1];
      setSelectedBookmakerId(nextBookmaker.id);
      setSelectedBookmakerName(nextBookmaker.brand_name);
      setSortConfig({ key: null, direction: "ascending" });
      setSelectedPage(1);
    }
  };

  const openAddBonusModal = () => {
    if (selectedBookmakerId !== "") {
      setIsAddBonusModalOpen(true);
    }
  };

  const closeAddBonusModal = () => {
    setIsAddBonusModalOpen(false);
  };

  const createExpiredReport = async () => {
    if (!selectedLocale || !isLogged) return;

    setIsExpiredReportLoading(true);

    const payload = {
      profile_id: 45,
      locale: selectedLocale, // Двухбуквенный код локали (UK, ES, BR и т.д.)
    };

    try {
      const response = await dataFetch(
        payload,
        "POST",
        `${API_ENDPOINT}/tasks/`
      );

      if (response.status === 201) {
        // Задача успешно создана, показываем состояние в UI
        console.log(`Задача для создания ${selectedLocale} Expired Report создана успешно!`);
      } else if (response.status === 401) {
        console.error("Сессия истекла. Пожалуйста, войдите снова.");
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}`;
        console.error(`Не удалось создать задачу: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error creating expired report task:", error);
    } finally {
      setIsExpiredReportLoading(false);
    }
  };

  const fetchBonuses = async (locale, bookmakerId, expired, page, limit) => {
    if (locale !== "" && bookmakerId !== "" && isLogged) {
      setBonusesLoaded(false);

      // If both Welcome and Common are unchecked — nothing to load
      if (!showWelcome && !showCommon) {
        setBonuses({ data: [] });
        setBonusesLoaded(true);
        return;
      }

      let filterByParams = ["locale_code", "bookmaker_id"];
      let filterValueParams = [locale, bookmakerId];

      if (!expired) {
        filterByParams.push("is_expired");
        filterValueParams.push("false");
      }

      const ageFormat = bonusAgeFormat(
        filters.statuses.active,
        filters.statuses.need_manual_check,
        filters.statuses.new
      );
      if (ageFormat !== "000") {
        filterByParams.push("bonus_age");
        filterValueParams.push(ageFormat);
      }

      if (filters.manual_flags.manual_terms) {
        filterByParams.push("override_manual_terms");
        filterValueParams.push("true");
      }
      if (filters.manual_flags.manual_url) {
        filterByParams.push("override_manual_url");
        filterValueParams.push("true");
      }
      if (filters.manual_flags.manual_expiration) {
        filterByParams.push("override_manual_expiration");
        filterValueParams.push("true");
      }
      if (filters.manual_flags.manual_type) {
        filterByParams.push("override_manual_type");
        filterValueParams.push("true");
      }

      // Apply Welcome / Common filters
      if (showWelcome && !showCommon) {
        filterByParams.push("bonus_type");
        filterValueParams.push("Welcome");
      } else if (!showWelcome && showCommon) {
        filterByParams.push("bonus_type");
        filterValueParams.push("Common");
      }

      // const activeDomainFilters = [];
      // if (domainFilters.sport) activeDomainFilters.push("Sport");
      // if (domainFilters.casino) activeDomainFilters.push("Casino");

      // if (activeDomainFilters.length > 0 && activeDomainFilters.length < 2) {
      //   filterByParams.push("domain");
      //   filterValueParams.push(activeDomainFilters[0]);
      // }

      const queryParams = new URLSearchParams();
      queryParams.append("filter_by", filterByParams.join(","));
      queryParams.append("filter_value", filterValueParams.join(","));
      queryParams.append("fields", `${fields},amount`);

      if (limit !== "all") {
        queryParams.append("items_per_page", limit);
        queryParams.append("page", page);
      } else {
        queryParams.append("page", "all");
      }

      const fetchUrl = `${API_ENDPOINT}/bonuses/?${queryParams.toString()}`;

      try {
        const response = await dataFetch(null, "GET", fetchUrl);

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: `HTTP error ${response.status}` }));
          console.error("Error fetching bonuses:", errorData.message);
          setBonuses({ data: [] });
        } else {
          const bonusesData = await response.json();
          setBonuses(bonusesData);
        }
      } catch (error) {
        console.error("Error fetching bonuses:", error);
        setBonuses({ data: [] });
      } finally {
        setBonusesLoaded(true);
      }
    } else {
      setBonuses({ data: [] });
      setBonusesLoaded(true);
    }
  };

  // useEffect(() => {
  //   async function fetchAuthToken() {
  //     const url = `${API_AUTH_ENDPOINT}`;
  //     const headers = new Headers({
  //       accept: "application/json",
  //       "Content-Type": "application/x-www-form-urlencoded",
  //       Authorization: `Basic ${AUTH_KEY}`,
  //     });
  //     const body = new URLSearchParams({
  //       username: "admin345543",
  //       password: "R6o5sVhzHPzBcZg",
  //     });

  //     try {
  //       const response = await fetch(url, {
  //         method: "POST",
  //         headers: headers,
  //         body: body,
  //       });
  //       if (!response.ok)
  //         throw new Error(`HTTP error! Status: ${response.status}`);
  //       const data = await response.json();
  //       setSessionToken(data.access_token);
  //     } catch (error) {
  //       console.error("Error fetching auth token:", error);
  //       setSessionToken("");
  //     }
  //   }
  //   fetchAuthToken();
  // }, [AUTH_KEY]);

  useEffect(() => {
    const fetchBookmakers = async (locale) => {
      try {
        const response = await dataFetch(
          null,
          "GET",
          `${API_ENDPOINT}/bookmakers/?locale_codes=${locale}`
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: `HTTP error ${response.status}` }));
          console.error("Error fetching bookmakers:", errorData.message);
          setFetchedBookmakers([]);
          return;
        }
        const bookmakersData = await response.json();
        const sortedData = (bookmakersData.data || []).sort((a, b) =>
          a.brand_name.localeCompare(b.brand_name)
        );
        setFetchedBookmakers(sortedData);
        // Set bookmaker name if id is present
        if (selectedBookmakerId) {
          const found = sortedData.find(
            (bm) => bm.id === Number(selectedBookmakerId)
          );
          setSelectedBookmakerName(found ? found.brand_name : "");
        }
      } catch (error) {
        console.error("Error fetching bookmakers:", error);
        setFetchedBookmakers([]);
      }
    };

    if (selectedLocale && typeof selectedLocale === "string" && isLogged) {
      fetchBookmakers(selectedLocale);
    } else {
      setFetchedBookmakers([]);
    }
  }, [selectedLocale, selectedBookmakerId]);

  useEffect(() => {
    if (selectedBookmakerId && selectedLocale && isLogged) {
      fetchBonuses(
        selectedLocale,
        selectedBookmakerId,
        loadExpired,
        selectedPage,
        itemsPerPage
      );
    } else {
      setBonuses({ data: [] });
      if (!selectedBookmakerId || !selectedLocale || !isLogged) {
        setBonusesLoaded(true);
      }
    }
  }, [
    selectedLocale,
    selectedBookmakerId,
    loadExpired,
    selectedPage,
    itemsPerPage,
    filters,
    domainFilters,
    showWelcome,
    showCommon,
    isLogged,
    API_ENDPOINT,
  ]);

  useEffect(() => {
    if (paramsLocale && paramsId && isLogged) {
      setSelectedLocale(paramsLocale);
      setSelectedBookmakerId(Number(paramsId));
    }
  }, [paramsLocale, paramsId, isLogged]);

  useEffect(() => {
    if (selectedLocale && selectedBookmakerId) {
      navigate(`/bookmakers/${selectedLocale}&${selectedBookmakerId}`);
    }
  }, [selectedLocale, selectedBookmakerId, navigate]);

  const sortedBonuses = useMemo(() => {
    let itemsToFilter = [...(bonuses.data || [])];

    const sportSelected = domainFilters.sport;
    const casinoSelected = domainFilters.casino;
    const pokerSelected = domainFilters.poker;
    const bingoSelected = domainFilters.bingo;

    // Apply new domain filtering logic based on bonus.terms.domain
    itemsToFilter = itemsToFilter.filter((bonus) => {
      let parsedTerms = {};
      try {
        if (bonus.terms && typeof bonus.terms === "string") {
          parsedTerms = JSON.parse(bonus.terms);
        } else if (bonus.terms && typeof bonus.terms === "object") {
          // Already an object?
          parsedTerms = bonus.terms;
        }
      } catch (e) {
        console.error(
          "Failed to parse bonus.terms for bonus ID:",
          bonus.id,
          bonus.terms,
          e
        );
        // Default behavior if parsing fails: treat as non-casino for sport-only, and non-sport for casino-only
      }
      const domainFromTerms = (parsedTerms.domain || "sport").toLowerCase();

      // If nothing selected, show nothing
      if (!sportSelected && !casinoSelected && !pokerSelected && !bingoSelected) return false;

      if (domainFromTerms === "casino") return casinoSelected;
      if (domainFromTerms === "poker") return pokerSelected;
      if (domainFromTerms === "bingo") return bingoSelected;
      // Treat everything else as sport
      return sportSelected;
    });

    if (sortConfig.key !== null) {
      itemsToFilter.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "expiration_date") {
          const dateA = aValue ? new Date(aValue) : null;
          const dateB = bValue ? new Date(bValue) : null;
          const isValidA = dateA && !isNaN(dateA);
          const isValidB = dateB && !isNaN(dateB);

          if (!isValidA && !isValidB) return 0;
          if (!isValidA) return sortConfig.direction === "ascending" ? 1 : -1;
          if (!isValidB) return sortConfig.direction === "ascending" ? -1 : 1;

          aValue = dateA;
          bValue = dateB;
        } else if (sortConfig.key === "name") {
          return (
            (aValue || "").localeCompare(bValue || "") *
            (sortConfig.direction === "ascending" ? 1 : -1)
          );
        }

        if (aValue < bValue) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return itemsToFilter;
  }, [bonuses.data, sortConfig, domainFilters]);

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
    setSelectedPage(1);
  };

  return (
    <div className="overflow-x-visible overflow-y-visible w-full">
      {isLogged ? (
        <>
          {" "}
          <div className="bg-white rounded-lg shadow-lg w-full overflow-y-visible ">
            <div className="border-b p-3 w-full">
              <p className="text-gray-900 text-2xl font-bold">
                Bonus List: View, filter, inline-edit
              </p>
            </div>

            <div className="p-4 border rounded bg-gray-100 mx-4 my-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Left Column – Locale */}
                <div className="flex items-center gap-2 min-w-[180px]">
                  <div>
                    <label
                      htmlFor="locale-select"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Locale
                    </label>
                    <div className="relative w-40">
                      <select
                        id="locale-select"
                        className="appearance-none w-full h-8 pl-2 pr-7 py-0.5 rounded bg-greybackground text-sm font-normal leading-tight text-[#000000cc] border-none focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                        onChange={handleLocaleChange}
                        value={selectedLocale}
                        disabled={!isLogged}
                        style={{
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 0.5rem center",
                        }}
                      >
                        {locales.map((locale) => (
                          <option
                            key={locale.value}
                            value={locale.value}
                            className="bg-white text-black"
                          >
                            {locale.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Expired Report Button Column */}
                <div className="flex items-end min-w-[150px]">
                  {selectedLocale && (
                    <div className="flex flex-col">
                      <div className="h-6 mb-1"></div>{" "}
                      {/* Spacer to align with locale label */}
                      <button
                        onClick={createExpiredReport}
                        disabled={
                          !selectedLocale || !isLogged || isExpiredReportLoading
                        }
                        className={`px-3 py-1 rounded font-semibold text-sm text-white whitespace-nowrap flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition ${
                          !selectedLocale || !isLogged || isExpiredReportLoading
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {isExpiredReportLoading ? (
                          <span className="w-4 h-4 mr-2 inline-block align-middle">
                            <svg className="animate-spin" viewBox="0 0 24 24">
                              <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                            </svg>
                          </span>
                        ) : null}
                        {selectedLocale} Expired Report
                      </button>
                    </div>
                  )}
                </div>

                {/* Center Column – Bookmaker */}
                <div className="flex flex-col items-center min-w-[200px] w-60">
                  <label
                    htmlFor="bookmaker-select"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Bookmaker
                  </label>
                  <div className="flex items-center gap-2 w-full">
                    <button
                      onClick={handlePreviousBookmaker}
                      className={`w-[25px] h-[25px] flex items-center justify-center p-0 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:outline-none active:ring-0 active:border-none ${
                        !selectedBookmakerId ||
                        fetchedBookmakers.length <= 1 ||
                        !isLogged ||
                        fetchedBookmakers.findIndex(
                          (bm) => bm.id === selectedBookmakerId
                        ) === 0
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      disabled={
                        !selectedBookmakerId ||
                        fetchedBookmakers.length <= 1 ||
                        !isLogged ||
                        fetchedBookmakers.findIndex(
                          (bm) => bm.id === selectedBookmakerId
                        ) === 0
                      }
                      aria-label="Previous Bookmaker"
                      type="button"
                    >
                      <ChevronLeft size={20} color="#3591FD" />
                    </button>
                    <div className="relative w-full">
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            !isLogged ||
                            !selectedLocale ||
                            filteredBookmakers.length === 0
                          )
                            return;
                          setIsBookmakerDropdownOpen((prev) => !prev);
                        }}
                        disabled={
                          !selectedLocale ||
                          filteredBookmakers.length === 0 ||
                          !isLogged
                        }
                        className="appearance-none w-full h-8 pl-2 pr-7 py-0.5 rounded bg-greybackground text-sm font-normal leading-tight text-[#000000cc] border-none focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-left"
                        aria-haspopup="listbox"
                        aria-expanded={isBookmakerDropdownOpen}
                        id="bookmaker-select"
                      >
                        {selectedBookmakerName || "Select Bookmaker"}
                      </button>
                      {isBookmakerDropdownOpen && (
                        <div
                          className="absolute z-20 mt-1 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                          tabIndex={0}
                          onBlur={(e) => {
                            // Close when focus leaves the dropdown container
                            if (!e.currentTarget.contains(e.relatedTarget)) {
                              setIsBookmakerDropdownOpen(false);
                            }
                          }}
                        >
                          <div className="p-2 border-b bg-white relative flex items-center gap-2">
                            <input
                              type="text"
                              value={bookmakerSearch}
                              onChange={(e) =>
                                setBookmakerSearch(e.target.value)
                              }
                              placeholder="Search..."
                              aria-label="Search Bookmaker"
                              className="w-full h-8 pl-2 pr-2 rounded bg-greybackground text-sm text-[#000000cc] border-none focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                              autoFocus
                            />
                            <button
                              type="button"
                              className="w-[25px] h-[25px] flex items-center justify-center p-0 bg-transparent border-none outline-none"
                              title="Добавить букмекера"
                              onClick={() => {
                                setIsBookmakerDropdownOpen(false);
                                if (isLogged && selectedLocale) {
                                  setIsAddBookmakerModalOpen(true);
                                }
                              }}
                              disabled={!isLogged || !selectedLocale}
                            >
                              <Plus size={18} color="#3591FD" />
                            </button>
                          </div>
                          <ul
                            role="listbox"
                            className="max-h-64 overflow-auto py-1"
                          >
                            {filteredBookmakers.length === 0 && (
                              <li className="px-3 py-2 text-sm text-gray-500">
                                No results
                              </li>
                            )}
                            {filteredBookmakers.map((bm) => (
                              <li key={bm.id} className="">
                                <button
                                  type="button"
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                                    bm.id === selectedBookmakerId
                                      ? "bg-gray-50"
                                      : ""
                                  }`}
                                  onClick={() => {
                                    handleBookmakerChange({
                                      target: { value: String(bm.id) },
                                    });
                                    setIsBookmakerDropdownOpen(false);
                                  }}
                                >
                                  {bm.brand_name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleNextBookmaker}
                      className={`w-[25px] h-[25px] flex items-center justify-center p-0 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:outline-none active:ring-0 active:border-none ${
                        fetchedBookmakers.length <= 1 ||
                        !isLogged ||
                        fetchedBookmakers.findIndex(
                          (bm) => bm.id === selectedBookmakerId
                        ) ===
                          fetchedBookmakers.length - 1
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      disabled={
                        fetchedBookmakers.length <= 1 ||
                        !isLogged ||
                        fetchedBookmakers.findIndex(
                          (bm) => bm.id === selectedBookmakerId
                        ) ===
                          fetchedBookmakers.length - 1
                      }
                      aria-label="Next Bookmaker"
                      type="button"
                    >
                      <ChevronRight size={20} color="#3591FD" />
                    </button>
                  </div>
                </div>

                {/* Right Column – Toggles */}
                <div className="flex flex-col gap-2 items-end">
                  {/* First Row: Domain Toggles */}
                  <div className="flex gap-4">
                    {/* Sport Toggle */}
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <div className="relative inline-block w-10 h-6 mr-2 select-none">
                        <input
                          type="checkbox"
                          id="toggle-domain-sport"
                          checked={domainFilters.sport}
                          className="sr-only"
                          onChange={() => {}}
                        />
                        <div
                          onClick={() => handleToggleDomainFilter("sport")}
                          className={`w-10 h-6 rounded-full transition-colors duration-200 ${
                            domainFilters.sport ? "bg-teal-400" : "bg-gray-300"
                          }`}
                        ></div>
                        <div
                          onClick={() => handleToggleDomainFilter("sport")}
                          className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                            domainFilters.sport ? "translate-x-4" : ""
                          }`}
                        ></div>
                      </div>
                      <span className="text-sm">Sport</span>
                    </label>

                    {/* Casino Toggle */}
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <div className="relative inline-block w-10 h-6 mr-2 select-none">
                        <input
                          type="checkbox"
                          id="toggle-domain-casino"
                          checked={domainFilters.casino}
                          className="sr-only"
                          onChange={() => {}}
                        />
                        <div
                          onClick={() => handleToggleDomainFilter("casino")}
                          className={`w-10 h-6 rounded-full transition-colors duration-200 ${
                            domainFilters.casino ? "bg-teal-400" : "bg-gray-300"
                          }`}
                        ></div>
                        <div
                          onClick={() => handleToggleDomainFilter("casino")}
                          className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                            domainFilters.casino ? "translate-x-4" : ""
                          }`}
                        ></div>
                      </div>
                      <span className="text-sm">Casino</span>
                    </label>

                    {/* Poker Toggle */}
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <div className="relative inline-block w-10 h-6 mr-2 select-none">
                        <input
                          type="checkbox"
                          id="toggle-domain-poker"
                          checked={domainFilters.poker}
                          className="sr-only"
                          onChange={() => {}}
                        />
                        <div
                          onClick={() => handleToggleDomainFilter("poker")}
                          className={`w-10 h-6 rounded-full transition-colors duration-200 ${
                            domainFilters.poker ? "bg-teal-400" : "bg-gray-300"
                          }`}
                        ></div>
                        <div
                          onClick={() => handleToggleDomainFilter("poker")}
                          className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                            domainFilters.poker ? "translate-x-4" : ""
                          }`}
                        ></div>
                      </div>
                      <span className="text-sm">Poker</span>
                    </label>

                    {/* Bingo Toggle */}
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <div className="relative inline-block w-10 h-6 mr-2 select-none">
                        <input
                          type="checkbox"
                          id="toggle-domain-bingo"
                          checked={domainFilters.bingo}
                          className="sr-only"
                          onChange={() => {}}
                        />
                        <div
                          onClick={() => handleToggleDomainFilter("bingo")}
                          className={`w-10 h-6 rounded-full transition-colors duration-200 ${
                            domainFilters.bingo ? "bg-teal-400" : "bg-gray-300"
                          }`}
                        ></div>
                        <div
                          onClick={() => handleToggleDomainFilter("bingo")}
                          className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                            domainFilters.bingo ? "translate-x-4" : ""
                          }`}
                        ></div>
                      </div>
                      <span className="text-sm">Bingo</span>
                    </label>
                  </div>

                  {/* Second Row: Type Toggles */}
                  <div className="flex gap-4">
                    {/* Welcome Toggle */}
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <div className="relative inline-block w-10 h-6 mr-2 select-none">
                        <input
                          type="checkbox"
                          id="toggle-bonus-welcome"
                          checked={showWelcome}
                          className="sr-only"
                          onChange={() => {}}
                        />
                        <div
                          onClick={handleToggleWelcome}
                          className={`w-10 h-6 rounded-full transition-colors duration-200 ${
                            showWelcome ? "bg-teal-400" : "bg-gray-300"
                          }`}
                        ></div>
                        <div
                          onClick={handleToggleWelcome}
                          className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                            showWelcome ? "translate-x-4" : ""
                          }`}
                        ></div>
                      </div>
                      <span className="text-sm">Welcome</span>
                    </label>

                    {/* Common Toggle */}
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <div className="relative inline-block w-10 h-6 mr-2 select-none">
                        <input
                          type="checkbox"
                          id="toggle-bonus-common"
                          checked={showCommon}
                          className="sr-only"
                          onChange={() => {}}
                        />
                        <div
                          onClick={handleToggleCommon}
                          className={`w-10 h-6 rounded-full transition-colors duration-200 ${
                            showCommon ? "bg-teal-400" : "bg-gray-300"
                          }`}
                        ></div>
                        <div
                          onClick={handleToggleCommon}
                          className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                            showCommon ? "translate-x-4" : ""
                          }`}
                        ></div>
                      </div>
                      <span className="text-sm">Common</span>
                    </label>

                    {/* Expired Toggle */}
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <div className="relative inline-block w-10 h-6 mr-2 select-none">
                        <input
                          type="checkbox"
                          id="toggle-load-expired"
                          checked={loadExpired}
                          className="sr-only"
                          onChange={() => {}}
                        />
                        <div
                          onClick={() => {
                            if (selectedBookmakerId && isLogged)
                              setLoadExpired((prev) => !prev);
                          }}
                          className={`w-10 h-6 rounded-full transition-colors duration-200 ${
                            loadExpired ? "bg-teal-400" : "bg-gray-300"
                          }`}
                        ></div>
                        <div
                          onClick={() => {
                            if (selectedBookmakerId && isLogged)
                              setLoadExpired((prev) => !prev);
                          }}
                          className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                            loadExpired ? "translate-x-4" : ""
                          }`}
                        ></div>
                      </div>
                      <span className="text-sm">Expired</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters section removed as per request */}

            {bonusesLoaded && sortedBonuses.length > 0 ? (
              <div className="w-full min-w-[100%]">
                <table className="w-full min-w-[1000px]">
                  <TableHead
                    sortConfig={sortConfig}
                    requestSort={requestSort}
                  />
                  <tbody className="divide-y">
                    {sortedBonuses.map((bonus) => (
                      <BonusItem
                        key={bonus.id}
                        bonus={bonus}
                        selectedLocale={selectedLocale}
                        onSuccess={() => {
                          fetchBonuses(
                            selectedLocale,
                            selectedBookmakerId,
                            loadExpired,
                            selectedPage,
                            itemsPerPage
                          );
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                {!bonusesLoaded &&
                selectedLocale &&
                selectedBookmakerId &&
                isLogged ? (
                  <div className="mt-4 flex justify-center">
                    <Loader />
                  </div>
                ) : !selectedLocale || !selectedBookmakerId ? (
                  `Select locale and bookmaker to load data`
                ) : !isLogged ? (
                  `Authenticating...`
                ) : (
                  `No bonuses found for the selected criteria.`
                )}
              </div>
            )}

            <div className="p-4 border-t">
              <div className="flex gap-4">
                <CollectNewBonusesButton
                  bookmakerId={selectedBookmakerId}
                  disabled={
                    !selectedBookmakerId || !selectedLocale || !isLogged
                  }
                />
                <AddBonusButton
                  openAddBonusModal={openAddBonusModal}
                  disabled={
                    !selectedBookmakerId || !selectedLocale || !isLogged
                  }
                />
              </div>
            </div>
            <Pagination
              bonuses={{ ...bonuses, data: sortedBonuses }}
              selectedPage={selectedPage}
              setSelectedPage={setSelectedPage}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              disabled={!bonusesLoaded || sortedBonuses.length === 0}
            />
          </div>
          {isAddBonusModalOpen && (
            <NewBonusModal
              bookmakerId={selectedBookmakerId}
              bookmakerName={selectedBookmakerName}
              selectedLocale={selectedLocale}
              closeAddBonusModal={closeAddBonusModal}
              onSuccess={() => {
                fetchBonuses(
                  selectedLocale,
                  selectedBookmakerId,
                  loadExpired,
                  1,
                  itemsPerPage
                );
                setSelectedPage(1);
                setSortConfig({ key: null, direction: "ascending" });
              }}
            />
          )}
          {isAddBookmakerModalOpen && (
            <AddBookmakerModal
              selectedLocale={selectedLocale}
              onClose={() => setIsAddBookmakerModalOpen(false)}
              onCreated={(bookmaker) => {
                try {
                  const created = bookmaker || {};
                  const newItem = {
                    id: created.id,
                    brand_name: created.brand_name || created.seo_name || "",
                  };
                  const next = [...fetchedBookmakers, newItem].filter(
                    (b) => b?.id
                  );
                  const sorted = next.sort((a, b) =>
                    a.brand_name.localeCompare(b.brand_name)
                  );
                  setFetchedBookmakers(sorted);
                  if (newItem.id) {
                    setSelectedBookmakerId(newItem.id);
                    setSelectedBookmakerName(newItem.brand_name);
                  }
                } catch (e) {
                  console.error(
                    "Failed to apply created bookmaker to state",
                    e
                  );
                }
              }}
            />
          )}
        </>
      ) : (
        <p className="text-red-600 text-center m-10">Please log in</p>
      )}
    </div>
  );
}
