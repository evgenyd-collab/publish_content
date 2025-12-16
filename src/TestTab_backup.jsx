import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import BonusItem from "./components/molecules/bonus-item";
import Pagination from "./components/molecules/pagination";
import TableHead from "./components/molecules/table-head";
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
  { value: "all", label: "All", apiValue: "" },
  { value: "football", label: "Football", apiValue: "Football" },
  { value: "baseball", label: "Baseball", apiValue: "Baseball" },
  { value: "tennis", label: "Tennis", apiValue: "Tennis" },
  { value: "esports", label: "Esports", apiValue: "Esports" },
  { value: "greyhound_racing", label: "Greyhound Racing", apiValue: "Greyhound Racing" },
  { value: "horse_racing", label: "Horse Racing", apiValue: "Horse Racing" }
];

const REWARD_TYPE_FILTERS = [
  { value: 'all', label: 'All', apiValue: '' },
  { value: 'free_bet', label: 'Free Bet', apiValue: 'free bet' },
  { value: 'deposit_bonus', label: 'Deposit Bonus', apiValue: 'deposit bonus' },
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

  // Update URL parameters when state changes
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
      // ----------------------
      // Формируем filter_by и filter_value как списки для множественной фильтрации
      // ----------------------
      const filterBy = ["locale_code"];
      const filterValue = [locale];

      if (filterType === "sport" && subFilter && subFilter !== "all") {
        const sportFilter = SPORT_FILTERS.find((f) => f.value === subFilter);
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

      const queryParams = new URLSearchParams({
        filter_by: filterBy.join(","),
        filter_value: filterValue.join(","),
        fields:
          "id,name,amount,bookmaker,expiration_date,bonus_type,terms,url,bookmaker_id,locale_code,updated_at",
        page: page.toString(),
        items_per_page: limit.toString(),
      });

      const fetchUrl = `${API_ENDPOINT}/bonuses/?${queryParams.toString()}`;

      const response = await fetch(fetchUrl, {
        method: "GET",
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown error" }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setBonuses(data);
    } catch (error) {
      console.error("Error fetching bonuses:", error);
      setBonuses({ data: [], error: error.message });
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
    setSelectedPage(1);
  };

  // Handle filter type change
  const handleFilterChange = (e) => {
    const newFilterValue = e.target.value;
    setSelectedFilter(newFilterValue);
    setSelectedSubFilter("all");
    setSelectedPage(1);
  };

  // Handle sub-filter change
  const handleSubFilterChange = (filterValue) => {
    setSelectedSubFilter(filterValue);
    setSelectedPage(1);
  };

  // Get current sub-filters based on selected filter type
  const getCurrentSubFilters = () => {
    if (selectedFilter === 'sport') return SPORT_FILTERS;
    if (selectedFilter === 'reward_type') return REWARD_TYPE_FILTERS;
    return [];
  };

  // Sorting functionality
  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedBonuses = React.useMemo(() => {
    if (!bonuses.data || bonuses.data.length === 0) return [];
    
    let sortableItems = [...bonuses.data];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle different data types
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

        if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [bonuses.data, sortConfig]);

  // Handle pagination
  const handlePageChange = (page) => {
    setSelectedPage(page);
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
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Bonus Top</h1>
          
          {/* Controls Row */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Locale Selector */}
            <div className="flex flex-col">
              <label htmlFor="locale-select" className="text-sm font-medium text-gray-700 mb-1">
                Locale
              </label>
              <div className="relative">
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
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Filter Type Selector */}
            <div className="flex flex-col">
              <label htmlFor="filter-select" className="text-sm font-medium text-gray-700 mb-1">
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
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-filter Toggle Buttons */}
          {selectedFilter && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {selectedFilter === 'sport' ? 'Sports' : 'Reward Types'}
              </label>
              <div className="flex flex-wrap gap-2">
                {getCurrentSubFilters().map((subFilter) => (
                  <button
                    key={subFilter.value}
                    onClick={() => handleSubFilterChange(subFilter.value)}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      selectedSubFilter === subFilter.value
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {subFilter.label}
                  </button>
                ))}
              </div>
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
              <p className="text-gray-500">Please select a locale and filter type to view bonuses.</p>
            </div>
          ) : sortedBonuses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No bonuses found for the selected criteria.</p>
            </div>
          ) : (
            <>
              {/* Bonuses Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <TableHead
                    sortConfig={sortConfig}
                    onSort={handleSort}
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
                  currentPage={selectedPage}
                  totalPages={bonuses.total_pages || 1}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function TestTab() {
  return <BonusTop />;
}