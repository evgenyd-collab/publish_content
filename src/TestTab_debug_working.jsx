import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { locales } from "./helpers/constants.js";

const API_ENDPOINT = import.meta.env.VITE_ENDPOINT;

// Constants for filters
const FILTER_TYPES = [
  { value: '', label: 'Select Filter' },
  { value: 'sport', label: 'Sport' },
  { value: 'reward_type', label: 'Reward Type' }
];

const SPORT_FILTERS = [
  { value: 'all', label: 'All', apiValue: '' },
  { value: 'football', label: 'Football', apiValue: 'football' },
  { value: 'greyhound_racing', label: 'Greyhound Racing', apiValue: 'greyhound racing' },
  { value: 'horse_racing', label: 'Horse Racing', apiValue: 'horse racing' }
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
  const [error, setError] = useState(null);

  console.log("Current state:", { selectedLocale, selectedFilter, selectedSubFilter });

  // Update URL parameters when state changes
  useEffect(() => {
    console.log("URL effect triggered");
    const params = new URLSearchParams();
    if (selectedLocale) params.set('locale', selectedLocale);
    if (selectedFilter) params.set('filter', selectedFilter);
    if (selectedSubFilter && selectedSubFilter !== 'all') params.set('subfilter', selectedSubFilter);
    setSearchParams(params);
  }, [selectedLocale, selectedFilter, selectedSubFilter, setSearchParams]);

  // Fetch bonuses with filtering
  const fetchBonuses = async (locale, filterType, subFilter) => {
    console.log("fetchBonuses called with:", { locale, filterType, subFilter });
    
    if (!locale || !filterType) {
      console.log("Missing locale or filterType, setting empty data");
      setBonuses({ data: [] });
      setBonusesLoaded(true);
      return;
    }

    setBonusesLoaded(false);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        filter_by: "locale_code",
        filter_value: locale,
        fields: "id,name,amount,bookmaker,expiration_date,bonus_type,terms,url,bookmaker_id,locale_code,updated_at",
        page: "1",
        items_per_page: "20",
      });

      const fetchUrl = `${API_ENDPOINT}/bonuses/?${queryParams.toString()}`;
      console.log("Fetching from:", fetchUrl);

      const response = await fetch(fetchUrl, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Received data:", data);
      setBonuses(data);
    } catch (error) {
      console.error("Error fetching bonuses:", error);
      setError(error.message);
      setBonuses({ data: [] });
    } finally {
      setBonusesLoaded(true);
    }
  };

  // Fetch bonuses when dependencies change
  useEffect(() => {
    console.log("Fetch effect triggered");
    if (selectedLocale && selectedFilter) {
      fetchBonuses(selectedLocale, selectedFilter, selectedSubFilter);
    } else {
      setBonuses({ data: [] });
      setBonusesLoaded(true);
    }
  }, [selectedLocale, selectedFilter, selectedSubFilter]);

  // Handle locale change
  const handleLocaleChange = (e) => {
    console.log("Locale changed to:", e.target.value);
    const newLocaleValue = e.target.value;
    setSelectedLocale(newLocaleValue);
  };

  // Handle filter type change
  const handleFilterChange = (e) => {
    console.log("Filter changed to:", e.target.value);
    const newFilterValue = e.target.value;
    setSelectedFilter(newFilterValue);
    setSelectedSubFilter("all");
  };

  // Handle sub-filter change
  const handleSubFilterChange = (filterValue) => {
    console.log("Sub-filter changed to:", filterValue);
    setSelectedSubFilter(filterValue);
  };

  // Get current sub-filters based on selected filter type
  const getCurrentSubFilters = () => {
    if (selectedFilter === 'sport') return SPORT_FILTERS;
    if (selectedFilter === 'reward_type') return REWARD_TYPE_FILTERS;
    return [];
  };

  console.log("About to render, bonusesLoaded:", bonusesLoaded, "error:", error);

  return (
    <div className="p-6 w-full max-w-full">
      <div className="bg-white rounded-lg shadow-lg w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Bonus Top - Debug</h1>
          
          {/* Debug Info */}
          <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
            <p><strong>Debug Info:</strong></p>
            <p>Locale: {selectedLocale}</p>
            <p>Filter: {selectedFilter}</p>
            <p>Sub-filter: {selectedSubFilter}</p>
            <p>Bonuses Loaded: {bonusesLoaded.toString()}</p>
            <p>Bonuses Count: {bonuses.data?.length || 0}</p>
            <p>Error: {error || 'None'}</p>
          </div>
          
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
            <div className="text-center py-8">
              <p className="text-blue-600">Loading bonuses...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">Error: {error}</p>
            </div>
          ) : !selectedLocale || !selectedFilter ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Please select a locale and filter type to view bonuses.</p>
            </div>
          ) : bonuses.data?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No bonuses found for the selected criteria.</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-green-600">Found {bonuses.data?.length} bonuses!</p>
              <div className="mt-4 text-left">
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                  {JSON.stringify(bonuses.data?.slice(0, 2), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function TestTab() {
  return <BonusTop />;
}