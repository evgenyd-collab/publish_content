import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { X, Loader, ChevronUp, ChevronDown } from 'lucide-react';

const API_BASE = 'https://bettingforge.com/api/v1';

const MarginDetailsModal = ({ isOpen, onClose, bookmakerId, championship, averageMargin, onlyOuMatches = false, onlyLast30Days = false }) => {
  const [marginData, setMarginData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalMatches, setTotalMatches] = useState(0);
  const [matchesShown, setMatchesShown] = useState(0);
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  const fetchMarginDetails = useCallback(async () => {
    if (!bookmakerId || !championship) return;
    
    setLoading(true);
    setError('');
    
    try {
      const controller = new AbortController();
      const params = new URLSearchParams({
        bookmaker_id: bookmakerId,
        championship,
        limit: '50',
      });
      if (onlyOuMatches) {
        params.append('require_ou_margin', 'true');
      }
      if (onlyLast30Days) {
        params.append('days', '30');
      }
      const url = `${API_BASE}/odds/margins-details?${params.toString()}`;
      
      const response = await fetch(url, { signal: controller.signal });
      
      if (!response.ok) {
        throw new Error('Failed to load margin details');
      }
      
      const apiResponse = await response.json();
      
      if (!apiResponse.success) {
        setError(apiResponse.message || apiResponse.error || 'Failed to load margin details');
        setMarginData([]);
        setTotalMatches(0);
        setMatchesShown(0);
        return;
      }
      
      const cutoffMs = onlyLast30Days ? Date.now() - (30 * 24 * 60 * 60 * 1000) : null;
      let matches = Array.isArray(apiResponse?.data?.matches) ? apiResponse.data.matches : [];
      if (onlyOuMatches) {
        matches = matches.filter((match) => typeof match?.ou_margin === 'number' && !Number.isNaN(match.ou_margin));
      }
      if (onlyLast30Days && cutoffMs != null) {
        matches = matches.filter((match) => {
          const time = new Date(match?.match_date).getTime();
          return Number.isFinite(time) && time >= cutoffMs;
        });
      }
      setMarginData(matches);
      setTotalMatches(matches.length);
      setMatchesShown(matches.length);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Failed to load margin details');
        console.error('Error fetching margin details:', err);
        setMarginData([]);
        setTotalMatches(0);
        setMatchesShown(0);
      }
    } finally {
      setLoading(false);
    }
  }, [bookmakerId, championship, onlyOuMatches, onlyLast30Days]);

  useEffect(() => {
    if (isOpen) {
      fetchMarginDetails();
    }
  }, [isOpen, fetchMarginDetails]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString();
  };

  const formatOdds = (odds) => {
    if (typeof odds !== 'number' || isNaN(odds)) return '—';
    return odds.toFixed(2);
  };

  const formatMargin = (margin) => {
    if (typeof margin !== 'number' || isNaN(margin)) return '—';
    return `${(margin * 100).toFixed(2)}%`;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortData = (data, field, direction) => {
    if (!field) return data;

    return [...data].sort((a, b) => {
      let aValue = a[field];
      let bValue = b[field];

      // Handle teams array
      if (field === 'teams') {
        aValue = Array.isArray(aValue) ? aValue.join(' vs ') : (aValue || '');
        bValue = Array.isArray(bValue) ? bValue.join(' vs ') : (bValue || '');
        const result = aValue.localeCompare(bValue);
        return direction === 'asc' ? result : -result;
      }

      // Handle date
      if (field === 'match_date') {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
        const result = aValue - bValue;
        return direction === 'asc' ? result : -result;
      }

      // Handle numeric values (odds and margins)
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const result = aValue - bValue;
        return direction === 'asc' ? result : -result;
      }

      // Handle mixed numeric/null values - treat null/undefined as -1 for sorting
      if (aValue == null) aValue = -1;
      if (bValue == null) bValue = -1;

      const result = aValue - bValue;
      return direction === 'asc' ? result : -result;
    });
  };

  const sortedMarginData = sortData(marginData, sortField, sortDirection);

  // highlight up to 3 matches closest to averageMargin by winner_margin
  const highlightedMatchIds = useMemo(() => {
    if (typeof averageMargin !== 'number' || averageMargin == null) return new Set();
    const list = (marginData || []).map((row, idx) => {
      const id = row?.id ?? idx;
      const wm = typeof row?.winner_margin === 'number' ? row.winner_margin : null;
      const diff = wm == null ? Infinity : Math.abs(wm - averageMargin);
      return { id, diff };
    }).filter((r) => isFinite(r.diff));
    list.sort((a, b) => a.diff - b.diff);
    return new Set(list.slice(0, 3).map((r) => r.id));
  }, [marginData, averageMargin]);

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <span className="inline ml-1 text-gray-300 text-xs">—</span>;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp size={14} className="inline ml-1" /> : 
      <ChevronDown size={14} className="inline ml-1" />;
  };

  const SortableHeader = ({ field, children, className = "" }) => (
    <th 
      className={`px-3 py-2 cursor-pointer hover:bg-gray-200 select-none ${className} ${sortField === field ? 'bg-blue-100 text-blue-800 font-semibold' : ''}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {children}
        {getSortIcon(field)}
      </div>
    </th>
  );

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-[95%] max-w-6xl max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">
            Margin Details: <span className="font-normal">{championship}</span>
            {typeof averageMargin === 'number' ? (
              <span className="ml-3 text-sm text-gray-600">(Avg: {formatMargin(averageMargin)})</span>
            ) : null}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-grow p-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin">
                <Loader size={32} />
              </div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center p-6">
              {error}
              <div className="mt-2">
                <button 
                  className="px-3 py-1 text-sm border rounded"
                  onClick={fetchMarginDetails}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : marginData.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              No margin data available for this championship.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-100">
                    <SortableHeader field="match_date" className="sticky left-0 bg-gray-100 hover:bg-gray-200">Date</SortableHeader>
                    <SortableHeader field="teams" className="min-w-[200px]">Teams</SortableHeader>
                    <SortableHeader field="win1_odds">Win1 Odds</SortableHeader>
                    <SortableHeader field="win2_odds">Win2 Odds</SortableHeader>
                    <SortableHeader field="draw_odds">Draw Odds</SortableHeader>
                    <SortableHeader field="under_odds" className="border-l border-gray-200">Under Odds</SortableHeader>
                    <SortableHeader field="ou_line">O/U Line</SortableHeader>
                    <SortableHeader field="over_odds">Over Odds</SortableHeader>
                    <SortableHeader field="winner_margin" className="border-l border-gray-200">Winner Margin</SortableHeader>
                    <SortableHeader field="ou_margin">O/U Margin</SortableHeader>
                  </tr>
                </thead>
                <tbody>
                  {sortedMarginData.map((row, i) => {
                    const rowId = row?.id ?? i;
                    const isHighlighted = highlightedMatchIds.has(rowId);
                    const rowBg = isHighlighted ? 'bg-green-50' : (i % 2 ? 'bg-white' : 'bg-gray-50');
                    return (
                      <tr key={rowId} className={rowBg}>
                        <td className="px-3 py-2 sticky left-0 bg-inherit">
                          {formatDate(row.match_date)}
                        </td>
                        <td className="px-3 py-2 min-w-[200px]">
                          {Array.isArray(row.teams) ? row.teams.join(' vs ') : (row.teams || '—')}
                        </td>
                        <td className="px-3 py-2">{formatOdds(row.win1_odds)}</td>
                        <td className="px-3 py-2">{formatOdds(row.win2_odds)}</td>
                        <td className="px-3 py-2">{formatOdds(row.draw_odds)}</td>
                        <td className="px-3 py-2 border-l border-gray-200">{formatOdds(row.under_odds)}</td>
                        <td className="px-3 py-2">{formatOdds(row.ou_line)}</td>
                        <td className="px-3 py-2">{formatOdds(row.over_odds)}</td>
                        <td className="px-3 py-2 border-l border-gray-200 font-semibold">{formatMargin(row.winner_margin)}</td>
                        <td className="px-3 py-2 font-semibold">{formatMargin(row.ou_margin)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {marginData.length > 0 && (
              <div className="space-y-1">
                <div>
                  Showing {matchesShown} of {totalMatches} matches with margin details
                  {totalMatches > matchesShown && ` (limited to ${matchesShown} most recent matches)`}
                </div>
                <div className="text-xs text-gray-500">
                  • Matches are filtered to exclude duplicates (isdouble=NULL)
                  • Maximum 50 matches retrieved from database
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MarginDetailsModal;