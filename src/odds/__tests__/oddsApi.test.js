/*
  Contract tests for odds API endpoints.
  These tests perform real HTTP requests to validate response shapes used in the app.
  If network is unavailable or fetch is missing, tests will be skipped.
*/

const API_BASE = "https://bettingforge.com/api/v1";

const hasFetch = typeof fetch === "function";

const fetchJson = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Network error ${r.status}`);
  return r.json();
};

// Increase timeout for real network calls
jest.setTimeout(30000);

const skipIfNoFetch = hasFetch ? test : test.skip;
const skipIfNoFetchDescribe = hasFetch ? describe : describe.skip;

skipIfNoFetchDescribe("odds API contracts", () => {
  let localeId;
  let sports = [];
  let realSport; // sport other than 'average'

  skipIfNoFetch("GET /odds/locales returns array of { id, locale_code }", async () => {
    const data = await fetchJson(`${API_BASE}/odds/locales`);
    expect(Array.isArray(data)).toBe(true);
    // at least one locale expected in production
    if (data.length > 0) {
      const item = data[0];
      expect(typeof item.id).toBe("number");
      expect(typeof item.locale_code).toBe("string");
      localeId = item.id;
    }
  });

  skipIfNoFetch("GET /odds/sports?locale_id returns array of strings with 'average' first", async () => {
    // if no locale id yet, try default 1
    const id = localeId || 1;
    const data = await fetchJson(`${API_BASE}/odds/sports?locale_id=${id}`);
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(typeof data[0]).toBe("string");
      expect(String(data[0]).toLowerCase()).toBe("average");
    }
    sports = data;
    realSport = (sports || []).find((s) => String(s).toLowerCase() !== "average");
  });

  skipIfNoFetch("GET /odds/championships with with_counts=true returns { name, matches_count }[]", async () => {
    // Only run if there is a real sport available
    if (!localeId) return;
    if (!realSport) return;
    const data = await fetchJson(
      `${API_BASE}/odds/championships?locale_id=${localeId}&sport=${encodeURIComponent(realSport)}&with_counts=true&limit=10`
    );
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      const item = data[0];
      expect(typeof item.name).toBe("string");
      // matches_count could be 0 but must be a number
      expect(typeof item.matches_count).toBe("number");
    }
  });

  skipIfNoFetch("GET /odds/ratings (overall) returns expected envelope and items", async () => {
    const id = localeId || 1;
    const url = `${API_BASE}/odds/ratings?locale_id=${id}&sport=average&sort_by=rank&order=asc&limit=20&offset=0`;
    const data = await fetchJson(url);
    // envelope
    expect(["overall", "sport", "championship"].includes(String(data.scope))).toBe(true);
    expect(typeof data.total).toBe("number");
    expect(typeof data.summary).toBe("object");
    expect(typeof data.summary.bookmakers_count).toBe("number");
    expect(typeof data.summary.best_avg_margin).toBe("number");
    expect(typeof data.summary.total_matches).toBe("number");
    // last_updated can be at top-level or inside summary
    if (data.last_updated != null) {
      expect(typeof data.last_updated).toBe("string");
    }
    if (data.summary.last_updated != null) {
      expect(typeof data.summary.last_updated).toBe("string");
    }
    expect(typeof data.pagination).toBe("object");
    expect(typeof data.pagination.limit).toBe("number");
    expect(typeof data.pagination.offset).toBe("number");
    expect(typeof data.pagination.total).toBe("number");
    expect(typeof data.pagination.has_next).toBe("boolean");
    expect(typeof data.pagination.has_prev).toBe("boolean");
    // items
    expect(Array.isArray(data.items)).toBe(true);
    if (data.items.length > 0) {
      const item = data.items[0];
      expect(typeof item.id).toBe("number");
      expect(typeof item.name).toBe("string");
      expect(typeof item.rating).toBe("number");
      expect(typeof item.rating_raw).toBe("number");
      expect(typeof item.avg_margin).toBe("number");
      // winner/OU may be null; if not null then number
      if (item.winner_margin != null) expect(typeof item.winner_margin).toBe("number");
      if (item.ou_margin != null) expect(typeof item.ou_margin).toBe("number");
      expect(typeof item.total_matches).toBe("number");
      expect(typeof item.rank).toBe("number");
    }
    // order by rank asc if at least two with numeric ranks
    const withRanks = (data.items || []).filter((it) => typeof it.rank === "number");
    if (withRanks.length >= 2) {
      for (let i = 1; i < withRanks.length; i++) {
        expect(withRanks[i].rank).toBeGreaterThanOrEqual(withRanks[i - 1].rank);
      }
    }
  });
});


