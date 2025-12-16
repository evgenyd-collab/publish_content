import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import BonusItem from "./components/molecules/bonus-item";
import Pagination from "./components/molecules/pagination";
import TableHead from "./components/atoms/table-head";
import { locales } from "./helpers/constants.js";
import Loader from "./components/atoms/loader";

const API_ENDPOINT = import.meta.env.VITE_ENDPOINT;

// Constants for filters
const FILTER_TYPES = [
  { value: '', label: 'Select Filter' },
  { value: 'sport', label: 'Sport' },
  { value: 'reward_type', label: 'Reward Type' }
];

const SPORT_FILTERS = [
  { value: 'all', label: 'All', apiValue: null },
  { value: 'football', label: 'Football', apiValue: 'Football' },
  { value: 'greyhound', label: 'Greyhound Racing', apiValue: 'Greyhound Racing' },
  { value: 'horse', label: 'Horse Racing', apiValue: 'Horse Racing' }
];

const REWARD_TYPE_FILTERS = [
  { value: 'all', label: 'All', apiValue: null },
  { value: 'freebet', label: 'Free Bet', apiValue: 'free bet' },
  { value: 'deposit', label: 'Deposit Bonus', apiValue: 'deposit bonus' },
  { value: 'cashback', label: 'Cashback', apiValue: 'cashback' }
];

const BonusTop = () => {
  console.log("BonusTop component rendering");
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State management
  const [bonuses, setBonuses] = useState({ data: [] });
  const [bonusesLoaded, setBonusesLoaded] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState(
    searchParams.get('locale') || locales[1]?.value || ""
  );
  const [selectedFilter, setSelectedFilter] = useState(
    searchParams.get('filter') || ""
  );
  const [selectedSubFilter, setSelectedSubFilter] = useState(
    searchParams.get('subfilter') || "all"
  );
  const [selectedPage, setSelectedPage] = useState(
    parseInt(searchParams.get('page')) || 1
  );
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedLocale) params.set('locale', selectedLocale);
    if (selectedFilter) params.set('filter', selectedFilter);
    if (selectedSubFilter && selectedSubFilter !== 'all') params.set('subfilter', selectedSubFilter);
    if (selectedPage > 1) params.set('page', selectedPage.toString());
    
    setSearchParams(params);
  }, [selectedLocale, selectedFilter, selectedSubFilter, selectedPage, setSearchParams]);



  // Fetch bonuses with filtering
  const fetchBonuses = async (locale, filterType, subFilter, page, limit) => {
    if (!locale || !filterType) {
      setBonuses({ data: [] });
      setBonusesLoaded(true);
      return;
    }

    setBonusesLoaded(false);

    try {
      let filterByParams = ["locale_code"];
      let filterValueParams = [locale];

      // Add filter based on type and subfilter
      if (filterType === 'sport' && subFilter !== 'all') {
        const sportFilter = SPORT_FILTERS.find(f => f.value === subFilter);
        if (sportFilter?.apiValue) {
          filterByParams.push("sport_type");
          filterValueParams.push(sportFilter.apiValue);
        }
      } else if (filterType === 'reward_type' && subFilter !== 'all') {
        const rewardFilter = REWARD_TYPE_FILTERS.find(f => f.value === subFilter);
        if (rewardFilter?.apiValue) {
          filterByParams.push("reward_type");
          filterValueParams.push(rewardFilter.apiValue);
        }
      }

      const queryParams = new URLSearchParams();
      queryParams.append("filter_by", filterByParams.join(","));
      queryParams.append("filter_value", filterValueParams.join(","));
      queryParams.append("fields", "id,name,amount,bookmaker,expiration_date,bonus_type,terms,url,bookmaker_id,locale_code,updated_at");
      queryParams.append("items_per_page", limit);
      queryParams.append("page", page);

      const fetchUrl = `${API_ENDPOINT}/bonuses/?${queryParams.toString()}`;

      const response = await fetch(fetchUrl, {
        method: "GET",
      });

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
  };

  // Fetch bonuses when dependencies change
  useEffect(() => {
    if (selectedLocale && selectedFilter) {
      fetchBonuses(
        selectedLocale,
        selectedFilter,
        selectedSubFilter,
        selectedPage,
        itemsPerPage
      );
    } else {
      setBonuses({ data: [] });
      setBonusesLoaded(true);
    }
  }, [selectedLocale, selectedFilter, selectedSubFilter, selectedPage, itemsPerPage]);

  // Handle locale change
  const handleLocaleChange = (e) => {
    const newLocaleValue = e.target.value;
    setSelectedLocale(newLocaleValue);
    setSelectedFilter("");
    setSelectedSubFilter("all");
    setBonuses({ data: [] });
    setBonusesLoaded(false);
    setSortConfig({ key: null, direction: "ascending" });
    setSelectedPage(1);
  };

  // Handle filter type change
  const handleFilterChange = (e) => {
    const newFilterValue = e.target.value;
    setSelectedFilter(newFilterValue);
    setSelectedSubFilter("all");
    setBonuses({ data: [] });
    setBonusesLoaded(false);
    setSortConfig({ key: null, direction: "ascending" });
    setSelectedPage(1);
  };

  // Handle sub-filter toggle
  const handleSubFilterToggle = (subFilterValue) => {
    setSelectedSubFilter(subFilterValue);
    setSelectedPage(1);
  };

  // Get current sub-filters based on selected filter type
  const getCurrentSubFilters = () => {
    if (selectedFilter === 'sport') return SPORT_FILTERS;
    if (selectedFilter === 'reward_type') return REWARD_TYPE_FILTERS;
    return [];
  };

  // Sort bonuses
  const sortedBonuses = useMemo(() => {
    let itemsToSort = [...(bonuses.data || [])];

    if (sortConfig.key !== null) {
      itemsToSort.sort((a, b) => {
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
    return itemsToSort;
  }, [bonuses.data, sortConfig]);

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
    setSelectedPage(1);
  };

  const onBonusSuccess = () => {
    // Refresh bonuses after successful update
    if (selectedLocale && selectedFilter) {
      fetchBonuses(
        selectedLocale,
        selectedFilter,
        selectedSubFilter,
        selectedPage,
        itemsPerPage
      );
    }
  };

  return (
    <div className="p-6 w-full max-w-full">
      <div className="bg-white rounded-lg shadow-lg w-full">
        <div className="border-b p-4 w-full">
          <h1 className="text-xl font-semibold text-gray-800">Bonus Top</h1>
          <p className="text-gray-600">Filter and view bonuses by categories</p>
        </div>

        {/* Filter Controls */}
        <div className="p-4 border rounded bg-gray-100 mx-4 my-4">
          <div className="flex flex-wrap items-end gap-4 mb-4">
            {/* Locale Selector */}
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
              </div>
            </div>

            {/* Filter Type Selector */}
            <div>
              <label
                htmlFor="filter-select"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Filter Type
              </label>
              <div className="relative w-48">
                <select
                  id="filter-select"
                  className="appearance-none w-full h-8 pl-2 pr-7 py-0.5 rounded bg-white text-sm font-normal leading-tight text-[#000000cc] border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  onChange={handleFilterChange}
                  value={selectedFilter}
                  disabled={!selectedLocale}
                >
                  {FILTER_TYPES.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sub-filter Toggles */}
          {selectedFilter && (
            <div className="flex flex-wrap gap-2">
              {getCurrentSubFilters().map((subFilter) => (
                <button
                  key={subFilter.value}
                  onClick={() => handleSubFilterToggle(subFilter.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedSubFilter === subFilter.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {subFilter.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bonuses Table */}
        {selectedLocale && selectedFilter ? (
          <div className="overflow-x-auto">
            {!bonusesLoaded ? (
              <div className="flex justify-center items-center py-8">
                <Loader />
              </div>
            ) : sortedBonuses.length > 0 ? (
              <>
                <table className="w-full">
                  <TableHead
                    sortConfig={sortConfig}
                    requestSort={requestSort}
                    showActions={true}
                  />
                  <tbody>
                    {sortedBonuses.map((bonus) => (
                      <BonusItem
                        key={bonus.id}
                        bonus={bonus}
                        token=""
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
                />
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No bonuses found for the selected criteria</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {!selectedLocale 
                ? "Please select a locale to continue" 
                : "Please select a filter type to view bonuses"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BonusTop;
