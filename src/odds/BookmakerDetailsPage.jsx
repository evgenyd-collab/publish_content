import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Loader from '../components/atoms/loader/index.jsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { sportColor } from './colors';
import MarginDetailsModal from '../components/modals/margin-details-modal.jsx';

const API_BASE = 'https://bettingforge.com/api/v1';
const DAYS_1M = 30;
const DAYS_3M = 90;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const toPercent = (v) => (v ?? 0).toLocaleString(undefined, {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const capitalize = (s) => {
  const str = String(s || '');
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border rounded shadow-sm px-3 py-2 text-sm">
      <div className="font-medium mb-1">{new Date(label).toLocaleDateString()}</div>
      <ul className="space-y-0.5">
        {payload.map((entry) => {
          const key = String(entry.dataKey || '').toLowerCase();
          const isAverage = key === 'average';
          return (
            <li key={key} className={isAverage ? 'font-semibold' : ''} style={{ color: entry.color }}>
              {key} : {toPercent(entry.value)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
      <span className="text-gray-600 whitespace-nowrap">{label}</span>
      <span className="relative inline-flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <span
          className={`w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-blue-500' : 'bg-gray-300'}`}
        ></span>
        <span
          className={`absolute left-1 top-1 w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`}
        ></span>
      </span>
    </label>
  );
}

export default function BookmakerDetailsPage() {
  const { localeAndId } = useParams();
  const navigate = useNavigate();
  const [locale, bookmakerId] = String(localeAndId || '').split('&');

  const [localeId, setLocaleId] = useState();
  const [summary, setSummary] = useState(null);
  const [availableSports, setAvailableSports] = useState([]); // {value,label,apiValue}
  const [enabledSports, setEnabledSports] = useState([]); // array of values (lowercased)

  const [historyData, setHistoryData] = useState({}); // { [apiSeriesName]: Array<{stat_date, winner_avg_margin}> }
  const [lastUpdate, setLastUpdate] = useState('');

  const [daysRange, setDaysRange] = useState(DAYS_1M);

  const [evaluationRowsRaw, setEvaluationRowsRaw] = useState([]);
  const [rangeRowsRaw, setRangeRowsRaw] = useState([]);
  const [onlyOuMatches, setOnlyOuMatches] = useState(false);
  const [onlyLast30Days, setOnlyLast30Days] = useState(false);
  const [ouStats, setOuStats] = useState({}); // key -> { hasOu, count, avgWinnerMargin }
  const [ouStatsLoading, setOuStatsLoading] = useState(false);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [errorSummary, setErrorSummary] = useState('');

  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorHistory, setErrorHistory] = useState('');
  const [retryHistorySeq, setRetryHistorySeq] = useState(0);

  const [loadingTables, setLoadingTables] = useState(true);
  const [errorTables, setErrorTables] = useState('');
  const [retryTablesSeq, setRetryTablesSeq] = useState(0);

  const [marginModalOpen, setMarginModalOpen] = useState(false);
  const [selectedChampionship, setSelectedChampionship] = useState('');
  const [selectedChampionshipAvgMargin, setSelectedChampionshipAvgMargin] = useState(null);

  const fetchJson = useCallback(async (url, signal) => {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error('Network error');
    return res.json();
  }, []);

  // 1) Resolve locale_id, load summary and sports
  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();
    setLoadingSummary(true);
    setErrorSummary('');

    (async () => {
      try {
        const rawLocales = await fetchJson(`${API_BASE}/odds/locales`, controller.signal).catch(() => []);
        const locales = Array.isArray(rawLocales) ? rawLocales : (rawLocales?.data || []);
        const code = String(locale || '').toUpperCase();
        const found = locales.find((l) => String(l.locale_code).toUpperCase() === code);
        const lid = Number(found?.id || 1);
        if (isCancelled) return;
        setLocaleId(lid);

        const [sumRes, sportsRes] = await Promise.all([
          fetchJson(`${API_BASE}/odds/${encodeURIComponent(bookmakerId)}/summary?locale_id=${lid}`, controller.signal),
          fetchJson(`${API_BASE}/odds/sports?locale_id=${lid}`, controller.signal),
        ]);
        if (isCancelled) return;
        setSummary(sumRes || {});
        const sportsList = Array.isArray(sportsRes) ? sportsRes : (sportsRes?.data || []);
        const items = (sportsList || []).filter(Boolean).map((name) => ({
          apiValue: String(name),
          value: String(name).toLowerCase(),
          label: String(name),
        }));
        setAvailableSports(items);
        // init toggles: все спорты включены по умолчанию (SEO-путь :sport не влияет на тогглы)
        setEnabledSports(items.map((it) => it.value));
      } catch (e) {
        if (!isCancelled) setErrorSummary('Failed to load summary/sports');
      } finally {
        if (!isCancelled) setLoadingSummary(false);
      }
    })();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [locale, bookmakerId, fetchJson]);

  // 2) Load tables (daily + margins-range) once per bookmaker/locale; client-filter later
  useEffect(() => {
    if (!localeId || !bookmakerId) return;
    let isCancelled = false;
    const controller = new AbortController();
    setLoadingTables(true);
    setErrorTables('');

    (async () => {
      try {
        const [dailyRes, rangeRes] = await Promise.all([
          fetchJson(`${API_BASE}/odds/tournaments/daily?bookmaker_id=${encodeURIComponent(bookmakerId)}&locale_id=${localeId}&sort_by=winner_avg_margin&order=desc`, controller.signal),
          fetchJson(`${API_BASE}/odds/tournaments/margins-range?bookmaker_id=${encodeURIComponent(bookmakerId)}&locale_id=${localeId}&limit=50`, controller.signal),
        ]);
        if (isCancelled) return;
        setEvaluationRowsRaw(Array.isArray(dailyRes?.items) ? dailyRes.items : []);
        setRangeRowsRaw(Array.isArray(rangeRes?.items) ? rangeRes.items : []);
      } catch (e) {
        if (!isCancelled) setErrorTables('Failed to load tables');
      } finally {
        if (!isCancelled) setLoadingTables(false);
      }
    })();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [localeId, bookmakerId, retryTablesSeq, fetchJson]);

  // 3) Load margin history whenever enabledSports changes (debounced)
  useEffect(() => {
    if (!localeId || !bookmakerId || availableSports.length === 0) return;
    const enabled = availableSports.filter((s) => enabledSports.includes(s.value));
    // if nothing enabled, do not fetch
    if (enabled.length === 0) {
      setHistoryData({});
      setLastUpdate('');
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();
    setLoadingHistory(true);
    setErrorHistory('');

    const timer = setTimeout(async () => {
      try {
        const sportsParams = enabled.map((it) => `sports=${encodeURIComponent(it.apiValue)}`).join('&');
        const url = `${API_BASE}/odds/${encodeURIComponent(bookmakerId)}/margin-history?locale_id=${localeId}&days=${daysRange}&${sportsParams}`;
        const histRes = await fetchJson(url, controller.signal);
        if (isCancelled) return;
        const data = histRes?.data || {};
        setHistoryData(data);
        // compute Last Update
        let maxDate = '';
        Object.values(data).forEach((arr) => {
          (arr || []).forEach((p) => {
            if (p.stat_date > maxDate) maxDate = p.stat_date;
          });
        });
        setLastUpdate(maxDate);
      } catch (e) {
        if (!isCancelled) {
          setErrorHistory('Failed to load margin history');
          setHistoryData({});
          setLastUpdate('');
        }
      } finally {
        if (!isCancelled) setLoadingHistory(false);
      }
    }, 200);

    return () => {
      isCancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [localeId, bookmakerId, availableSports, enabledSports, retryHistorySeq, daysRange, fetchJson]);

  const toggleSport = (val) => {
    setEnabledSports((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));
  };

  const handleOpenMarginModal = (row) => {
    const championship = row?.championship || '';
    setSelectedChampionship(championship);
    // avg_margin_percent comes as percentage (e.g. 5.72) in evaluation rows — convert to fraction (0.0572)
    const avg = Number(row?.avg_margin_percent);
    setSelectedChampionshipAvgMargin(Number.isFinite(avg) ? (avg / 100) : null);
    setMarginModalOpen(true);
  };

  const handleCloseMarginModal = () => {
    setMarginModalOpen(false);
    setSelectedChampionship('');
  };

  const getChampKey = (row) => `${String(row?.sport || '').toLowerCase()}__${String(row?.championship || '')}`;

  useEffect(() => {
    if (!onlyOuMatches) {
      setOuStatsLoading(false);
      return;
    }
    if (!bookmakerId) {
      setOuStatsLoading(false);
      return;
    }
    const rows = evaluationRowsRaw || [];
    const missing = rows.filter((row) => ouStats[getChampKey(row)] === undefined);
    if (missing.length === 0) {
      setOuStatsLoading(false);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();
    setOuStatsLoading(true);

    (async () => {
      const updates = {};
      for (const row of missing) {
        if (isCancelled) break;
        const key = getChampKey(row);
        const url = `${API_BASE}/odds/margins-details?bookmaker_id=${encodeURIComponent(bookmakerId)}&championship=${encodeURIComponent(row.championship)}&limit=50&require_ou_margin=true`;
        try {
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) throw new Error('Failed to check OU stats');
          const data = await res.json();
          const apiMatches = data?.success ? data?.data?.matches : [];
          let matches = Array.isArray(apiMatches) ? apiMatches : [];
          matches = matches.filter((match) => typeof match?.ou_margin === 'number' && !Number.isNaN(match.ou_margin));
          const count = matches.length;
          const avgWinnerMargin = count > 0
            ? matches.reduce((acc, item) => acc + (typeof item?.winner_margin === 'number' ? item.winner_margin : 0), 0) / count
            : null;
          updates[key] = { hasOu: count > 0, count, avgWinnerMargin };
        } catch (err) {
          if (!isCancelled) {
            console.warn('Failed to resolve OU stats for', row.championship, err);
            updates[key] = { hasOu: false, count: 0, avgWinnerMargin: null };
          }
        }
      }
      if (!isCancelled && Object.keys(updates).length > 0) {
        setOuStats((prev) => ({ ...prev, ...updates }));
      }
      if (!isCancelled) {
        setOuStatsLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [onlyOuMatches, evaluationRowsRaw, bookmakerId, ouStats]);

  // transform history data to chart data rows
  const chartData = useMemo(() => {
    if (!historyData || Object.keys(historyData).length === 0) return [];
    const dates = new Set();
    Object.values(historyData).forEach((list) => (list || []).forEach((p) => dates.add(p.stat_date)));
    const allDates = Array.from(dates).sort();
    const seriesNames = Object.keys(historyData || {});
    return allDates.map((d) => {
      const row = { stat_date: d };
      // заполняем только по реально пришедшим сериям из ответа
      seriesNames.forEach((seriesName) => {
        const key = String(seriesName).toLowerCase();
        const series = historyData[seriesName] || [];
        const found = series.find((p) => p.stat_date === d);
        row[key] = typeof found?.winner_avg_margin === 'number' ? found.winner_avg_margin : null;
      });
      return row;
    });
  }, [historyData]);

  // dynamic Y-axis minimum: 3% or (minValue - 1%) if min < 4%
  const yMin = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0.03;
    const seriesKeysLower = new Set(Object.keys(historyData || {}).map((k) => String(k).toLowerCase()));
    const keys = availableSports
      .filter((it) => enabledSports.includes(it.value) && seriesKeysLower.has(it.value))
      .map((it) => it.value);
    let min = Infinity;
    for (const row of chartData) {
      for (const key of keys) {
        const v = row[key];
        if (typeof v === 'number' && !Number.isNaN(v)) {
          if (v < min) min = v;
        }
      }
    }
    if (!isFinite(min)) return 0.03;
    if (min < 0.04) return Math.max(0, min - 0.01);
    return 0.03;
  }, [chartData, availableSports, enabledSports, historyData]);

  const filteredEval = useMemo(() => {
    const rows = (evaluationRowsRaw || []).filter((r) => enabledSports.includes(String(r?.sport || '').toLowerCase()));
    const cutoffMs = onlyLast30Days ? Date.now() - THIRTY_DAYS_MS : null;
    return rows.reduce((acc, row) => {
      if (onlyLast30Days) {
        const time = new Date(row.stat_date).getTime();
        if (!Number.isFinite(time) || time < cutoffMs) return acc;
      }

      let matchesCount = row.matches_count;
      let avgMarginPercent = row.avg_margin_percent;

      if (onlyOuMatches) {
        const key = getChampKey(row);
        const stats = ouStats[key];
        if (!stats || !stats.hasOu) return acc;
        matchesCount = stats.count;
        if (typeof stats.avgWinnerMargin === 'number') {
          avgMarginPercent = stats.avgWinnerMargin * 100;
        }
      }

      acc.push({ ...row, matches_count: matchesCount, avg_margin_percent: avgMarginPercent });
      return acc;
    }, []);
  }, [evaluationRowsRaw, enabledSports, onlyLast30Days, onlyOuMatches, ouStats]);

  const filteredRange = useMemo(() => {
    const rows = (rangeRowsRaw || []).filter((r) => enabledSports.includes(String(r?.sport || '').toLowerCase()));
    if (!onlyLast30Days) return rows;
    const cutoffMs = Date.now() - THIRTY_DAYS_MS;
    return rows.filter((row) => {
      const time = new Date(row.stat_date).getTime();
      return Number.isFinite(time) && time >= cutoffMs;
    });
  }, [rangeRowsRaw, enabledSports, onlyLast30Days]);

  if (loadingSummary) {
    return (
      <div className="flex justify-center py-10">
        <Loader />
      </div>
    );
  }
  if (errorSummary) {
    return (
      <div className="text-red-500 text-center p-6">
        Failed to load summary or sports. <button className="underline" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }

  return (
    <div className="bookmaker-details-page px-4 py-6 w-[95%]">
      {/* Sticky Header */}
      <div id="sticky-header" className="sticky top-0 bg-white shadow p-4 z-10 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{capitalize(summary?.name)}</h1>
            {summary?.rank != null && <span className="text-gray-500">#{summary.rank}</span>}
            {summary?.rating != null && (
              <span className="font-medium">{Number(summary.rating).toFixed(1)}/10</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Close"
              title="Close"
              onClick={() => navigate('/odds')}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
            >
              <span className="text-lg font-semibold">×</span>
            </button>
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          Last Update: {lastUpdate ? new Date(lastUpdate).toLocaleDateString() : '—'}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {availableSports.map((s) => (
            <button
              key={s.value}
              className={`px-3 py-1 rounded-full text-sm border ${enabledSports.includes(s.value) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
              onClick={() => toggleSport(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Margin History Section */}
      <section id="margin-history" className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Margin History</h2>
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1 rounded-full text-sm border ${daysRange === DAYS_1M ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
              onClick={() => setDaysRange(DAYS_1M)}
            >
              30 Days
            </button>
            <button
              className={`px-3 py-1 rounded-full text-sm border ${daysRange === DAYS_3M ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
              onClick={() => setDaysRange(DAYS_3M)}
            >
              90 Days
            </button>
          </div>
        </div>
        {loadingHistory ? (
          <div className="flex justify-center py-10"><Loader /></div>
        ) : errorHistory ? (
          <div className="text-red-500 text-center">
            {errorHistory}
            <div className="mt-2">
              <button className="px-3 py-1 text-sm border rounded" onClick={() => setRetryHistorySeq((x) => x + 1)}>Retry</button>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center text-gray-500">No margin history data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <XAxis dataKey="stat_date" tickFormatter={(d) => new Date(d).toLocaleDateString()} />
              <YAxis domain={[yMin, 'auto']} allowDataOverflow tickFormatter={toPercent} />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {(() => {
                const seriesKeysLower = new Set(Object.keys(historyData || {}).map((k) => String(k).toLowerCase()));
                return availableSports
                  .filter((it) => enabledSports.includes(it.value) && seriesKeysLower.has(it.value))
                  .map((it) => (
                    <Line key={it.value} type="monotone" dataKey={it.value} stroke={sportColor(it.value)} strokeWidth={it.value === 'average' ? 3.5 : 1.5} dot={false} />
                  ));
              })()}
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Daily Reports Section */}
      <section id="daily-reports" className="mt-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-xl font-semibold">Evaluation Breakdown</h2>
          <div className="flex flex-wrap items-center gap-4">
            <ToggleSwitch
              checked={onlyOuMatches}
              onChange={(e) => setOnlyOuMatches(e.target.checked)}
              label="Only matches with OU Margins"
            />
            <ToggleSwitch
              checked={onlyLast30Days}
              onChange={(e) => setOnlyLast30Days(e.target.checked)}
              label="Only Last 30 Days Matches"
            />
            {onlyOuMatches && ouStatsLoading && (
              <span className="text-xs text-gray-500">Updating filter...</span>
            )}
          </div>
        </div>
        {loadingTables || (onlyOuMatches && ouStatsLoading) ? (
          <div className="flex justify-center py-6"><Loader /></div>
        ) : errorTables ? (
          <div className="text-red-500 text-center">
            {errorTables}
            <div className="mt-2"><button className="px-3 py-1 text-sm border rounded" onClick={() => setRetryTablesSeq((x) => x + 1)}>Retry</button></div>
          </div>
        ) : (
          <>
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2">Championship</th>
                  <th className="px-3 py-2">Sport</th>
                  <th className="px-3 py-2">Avg Margin %</th>
                  <th className="px-3 py-2">Matches</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEval.map((r, i) => (
                  <tr key={i} className={i % 2 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2">{r.championship}</td>
                    <td className="px-3 py-2">{r.sport}</td>
                    <td className="px-3 py-2">{toPercent((Number(r.avg_margin_percent) || 0) / 100)}</td>
                    <td className="px-3 py-2">{r.matches_count}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleOpenMarginModal(r)}
                        className="px-2 py-1 border rounded"
                      >
                        Margin Details
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredEval.length === 0 && (
                  <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={5}>No data for selected sports.</td></tr>
                )}
              </tbody>
            </table>

            <h2 className="text-xl font-semibold mt-8 mb-4">Margins Range</h2>
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2">Sport</th>
                  <th className="px-3 py-2">Championship</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Teams</th>
                  <th className="px-3 py-2">Winner Margin</th>
                </tr>
              </thead>
              <tbody>
                {filteredRange.map((r, i) => {
                  return (
                    <tr key={i} className={i % 2 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2">{r.sport}</td>
                      <td className="px-3 py-2">{r.championship}</td>
                      <td className="px-3 py-2">{r.stat_date ? new Date(r.stat_date).toLocaleDateString() : ''}</td>
                      <td className="px-3 py-2">{Array.isArray(r.teams) ? r.teams.join(' vs ') : (r.teams || '')}</td>
                      <td className="px-3 py-2">
                        {r.extreme_type === 'max' ? <span className="text-red-500 mr-1">▲</span> : r.extreme_type === 'min' ? <span className="text-green-500 mr-1">▼</span> : null}
                        {toPercent(r.winner_margin)}
                      </td>
                    </tr>
                  );
                })}
                {filteredRange.length === 0 && (
                  <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={5}>No data for selected sports.</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </section>
      
      <MarginDetailsModal
        isOpen={marginModalOpen}
        onClose={handleCloseMarginModal}
        bookmakerId={bookmakerId}
        championship={selectedChampionship}
        averageMargin={selectedChampionshipAvgMargin}
        onlyOuMatches={onlyOuMatches}
        onlyLast30Days={onlyLast30Days}
      />
    </div>
  );
}
