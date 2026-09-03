/**
 * Exercise API Module
 * Handles all API calls to the free/open-source ExerciseDB API.
 *
 * Base URL: https://oss.exercisedb.dev/api/v1
 *
 * Endpoints used here:
 *   GET /exercises                 - paginated list, filterable by targetMuscles / equipments / bodyParts
 *   GET /exercises/{exerciseId}    - a single exercise
 *   GET /exercises/search?search=  - fuzzy name search (returns id + name + gifUrl only)
 *   GET /muscles                   - muscle taxonomy
 *   GET /equipments                - equipment taxonomy
 *   GET /bodyparts                 - body part taxonomy
 *
 * Two things about this API drive the design below:
 *   1. `limit` is capped at 25 server-side and `offset` is ignored - paging is
 *      cursor based via `meta.nextCursor` fed back in as `?after=`.
 *   2. It rate limits at roughly 10 requests / 10 seconds and answers with
 *      429 + `Retry-After`. So every request goes through a token bucket and
 *      results are cached in localStorage (the catalogue is static data).
 */

export const API_BASE = "https://oss.exercisedb.dev/api/v1";

// The API refuses to return more than 25 items per page, whatever we ask for.
const PAGE_SIZE = 25;

// Safety net so a runaway cursor can never loop forever.
const MAX_PAGES = 40;

// Cache for API responses (in-memory, keyed by muscle name).
const exerciseCache = {};

// Persistent cache settings. The exercise catalogue doesn't change day to day,
// so caching across page loads is what keeps us clear of the rate limit.
const STORAGE_KEY = "webfit-exercisedb-cache-v1";
const STORAGE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// The whole catalogue is ~2MB of JSON and browsers hand out about 5MB total, so
// cap ourselves well short of that - the saved workout has to fit too.
const STORAGE_MAX_CHARS = 2_000_000;

// Rate limiting helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Muscle group mappings.
 *
 * The names on the right are the exact `targetMuscles` values the API indexes
 * on - anything else silently returns zero results, so keep this list in sync
 * with GET /muscles (see fetchMuscleList) rather than inventing synonyms.
 */
export const muscleGroups = {
  Legs: ["quads", "hamstrings", "glutes", "calves", "abductors", "adductors"],
  Biceps: ["biceps"],
  Triceps: ["triceps"],
  Core: ["abs", "serratus anterior"],
  Back: ["upper back", "lats", "spine"],
  Chest: ["pectorals"],
  Shoulders: ["delts"],
  Traps: ["traps", "levator scapulae"]
};

// ============================
// RATE LIMITED REQUEST PIPELINE
// ============================

// Token bucket: a small burst is fine, sustained traffic settles at ~1 req/1.2s,
// which is the fastest pace the API tolerated without handing back a 429.
const bucket = {
  capacity: 5,
  tokens: 5,
  refillMs: 1200,
  lastRefill: Date.now()
};

// Requests are queued so two muscle groups loading at once still share one budget.
let requestChain = Promise.resolve();

/**
 * Wait until the token bucket has room for another request.
 */
async function takeToken() {
  for (;;) {
    const now = Date.now();
    const refilled = Math.floor((now - bucket.lastRefill) / bucket.refillMs);

    if (refilled > 0) {
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + refilled);
      bucket.lastRefill += refilled * bucket.refillMs;
    }

    if (bucket.tokens > 0) {
      bucket.tokens -= 1;
      return;
    }

    await delay(bucket.refillMs - (now - bucket.lastRefill));
  }
}

/**
 * Build a full API URL with query parameters.
 * @param {string} path - Path below the API base, e.g. "/exercises"
 * @param {Object} [params] - Query parameters (null/undefined/"" are dropped)
 * @returns {string}
 */
function buildUrl(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

/**
 * Perform a single rate limited, retrying GET against the API.
 * @param {string} path - Path below the API base
 * @param {Object} [params] - Query parameters
 * @returns {Promise<Object>} - The parsed JSON envelope
 */
function apiGet(path, params = {}) {
  const url = buildUrl(path, params);

  // Chain onto the previous request so the token bucket is honoured globally.
  const run = requestChain.then(async () => {
    let lastError = null;

    for (let attempt = 0; attempt < 4; attempt++) {
      await takeToken();

      let res;
      try {
        res = await fetch(url, { headers: { Accept: "application/json" } });
      } catch (err) {
        // Network hiccup - back off briefly and try again.
        lastError = err;
        await delay(1000 * (attempt + 1));
        continue;
      }

      // Rate limited or temporarily unavailable: respect Retry-After and retry.
      if (res.status === 429 || res.status === 503) {
        const retryAfter = parseInt(res.headers.get("Retry-After"), 10);
        const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 2000 * (attempt + 1);

        // Drain the bucket so the queued requests behind us also hold off.
        bucket.tokens = 0;
        bucket.lastRefill = Date.now() + waitMs;

        lastError = new Error(`Rate limited by ExerciseDB (HTTP ${res.status})`);
        await delay(waitMs);
        continue;
      }

      if (!res.ok) {
        throw new Error(`ExerciseDB request failed: ${res.status} ${res.statusText}`);
      }

      return res.json();
    }

    throw lastError || new Error("ExerciseDB request failed after retries");
  });

  // Keep the chain alive even when a request rejects.
  requestChain = run.then(() => undefined, () => undefined);

  return run;
}

/**
 * Unwrap the API's { success, data } envelope.
 * @param {Object} json - Parsed response body
 * @returns {*} - The payload, or null when the response wasn't successful
 */
function unwrap(json) {
  if (json && json.success && "data" in json) {
    return json.data;
  }
  return null;
}

/**
 * Walk the cursor paginated /exercises endpoint until it runs out of pages.
 * @param {Object} params - Filter parameters (e.g. { targetMuscles: "biceps" })
 * @param {Function} [onPage] - Called with each page of exercises as it arrives
 * @returns {Promise<Array>} - Every exercise matching the filter
 */
async function fetchAllPages(params, onPage) {
  const collected = [];
  let after = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const json = await apiGet("/exercises", { ...params, limit: PAGE_SIZE, after });
    const data = unwrap(json);

    if (!Array.isArray(data) || data.length === 0) {
      break;
    }

    collected.push(...data);
    if (typeof onPage === "function") {
      onPage(data, collected.length, json.meta ? json.meta.total : collected.length);
    }

    const meta = json.meta || {};
    if (!meta.hasNextPage || !meta.nextCursor || meta.nextCursor === after) {
      break;
    }

    after = meta.nextCursor;
  }

  return collected;
}

// ============================
// PERSISTENT CACHE
// ============================

/**
 * Read the whole persisted cache object.
 * @returns {Object}
 */
function readStoredCache() {
  if (typeof localStorage === "undefined") return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) || {} : {};
  } catch {
    return {};
  }
}

/**
 * Look up one muscle in the persisted cache, honouring the TTL.
 * @param {string} key - Cache key (a normalised muscle name)
 * @returns {Array|null}
 */
function readStored(key) {
  const entry = readStoredCache()[key];

  if (!entry || !Array.isArray(entry.exercises)) return null;
  if (Date.now() - (entry.savedAt || 0) > STORAGE_TTL) return null;

  return entry.exercises;
}

/**
 * Persist one muscle's exercises so the next page load doesn't refetch them.
 * @param {string} key - Cache key (a normalised muscle name)
 * @param {Array} exercises - Exercises to store
 */
function writeStored(key, exercises) {
  if (typeof localStorage === "undefined") return;

  try {
    const store = readStoredCache();
    store[key] = { savedAt: Date.now(), exercises };

    // Evict least recently saved entries until we're back under the budget.
    let serialized = JSON.stringify(store);
    while (serialized.length > STORAGE_MAX_CHARS) {
      const oldest = Object.keys(store)
        .filter(k => k !== key)
        .sort((a, b) => (store[a].savedAt || 0) - (store[b].savedAt || 0))[0];

      if (!oldest) return; // The new entry alone is too big - don't persist it.

      delete store[oldest];
      serialized = JSON.stringify(store);
    }

    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Storage full or unavailable - the in-memory cache still does its job.
  }
}

// ============================
// EXERCISES
// ============================

/**
 * Fetch exercises for a specific muscle from the API.
 * @param {string} muscleName - Name of the muscle (must be a `targetMuscles` value)
 * @param {Function} [onPage] - Called with each page as it arrives
 * @returns {Promise<Array>} - Array of exercises
 */
export async function fetchExercisesByMuscle(muscleName, onPage) {
  const key = muscleName.toLowerCase().trim();

  // Return cached response if available
  if (exerciseCache[key]) {
    return exerciseCache[key];
  }

  const stored = readStored(key);
  if (stored) {
    exerciseCache[key] = stored;
    return stored;
  }

  try {
    const exercises = await fetchAllPages({ targetMuscles: key }, onPage);

    exerciseCache[key] = exercises;
    writeStored(key, exercises);
    return exercises;
  } catch (err) {
    console.error(`Error fetching ${muscleName}:`, err);
    return [];
  }
}

/**
 * Remove duplicate exercises. The same movement can target several muscles in
 * the same group, so it comes back once per muscle we asked about.
 * @param {Array} exercises - Possibly duplicated exercises
 * @returns {Array} - Deduplicated exercises
 */
export function dedupeExercises(exercises) {
  const key = (ex) =>
    `${ex.exerciseId || ex.name}-${Array.isArray(ex.equipments) ? ex.equipments.join(",") : ex.equipments || "none"}`;

  return Array.from(new Map(exercises.map(ex => [key(ex), ex])).values());
}

/**
 * Fetch all exercises for a muscle group.
 * @param {string} groupName - Name of the muscle group (e.g., "Legs")
 * @param {Function} [onProgress] - Called with the deduplicated list so far
 * @returns {Promise<Array>} - Deduplicated array of exercises
 */
export async function fetchExercisesForGroup(groupName, onProgress) {
  const muscles = muscleGroups[groupName];
  if (!muscles) return [];

  const allExercises = [];

  // `partial` holds the pages of the muscle currently in flight so progress can
  // include them; once that muscle resolves its items move into allExercises.
  let partial = [];
  const report = () => {
    if (typeof onProgress === "function") {
      onProgress(dedupeExercises(allExercises.concat(partial)));
    }
  };

  for (const muscle of muscles) {
    const exercises = await fetchExercisesByMuscle(muscle, (page) => {
      partial.push(...page);
      report();
    });

    partial = [];

    if (exercises && exercises.length > 0) {
      allExercises.push(...exercises);
      report();
    }
  }

  return dedupeExercises(allExercises);
}

/**
 * Fetch a single exercise by its ExerciseDB id.
 * @param {string} exerciseId - The exercise id (e.g. "01qpYSe")
 * @returns {Promise<Object|null>}
 */
export async function fetchExerciseById(exerciseId) {
  if (!exerciseId) return null;

  try {
    const json = await apiGet(`/exercises/${encodeURIComponent(exerciseId)}`);
    return unwrap(json) || null;
  } catch (err) {
    console.error(`Error fetching exercise ${exerciseId}:`, err);
    return null;
  }
}

/**
 * Fuzzy-search exercises by name.
 * Note: this endpoint returns trimmed records (exerciseId, name, gifUrl only).
 * @param {string} query - Search text
 * @returns {Promise<Array>} - Matching exercises
 */
export async function searchExercises(query) {
  const term = (query || "").trim();
  if (!term) return [];

  try {
    const json = await apiGet("/exercises/search", { search: term });
    const data = unwrap(json);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`Error searching for "${term}":`, err);
    return [];
  }
}

/**
 * Find a specific exercise by name.
 *
 * Uses the search endpoint first because that costs one request; the muscle
 * group scan is only a fallback for names search can't resolve.
 * @param {string} exerciseName - Name of the exercise
 * @param {string} [muscleGroup] - Muscle group to fall back to
 * @returns {Promise<Object|null>} - The exercise or null
 */
export async function findExerciseByName(exerciseName, muscleGroup) {
  const wanted = (exerciseName || "").trim().toLowerCase();
  if (!wanted) return null;

  const matches = await searchExercises(exerciseName);
  const hit = matches.find(ex => ex.name && ex.name.toLowerCase() === wanted);

  if (hit) {
    // Search results are trimmed, so pull the full record when we need details.
    return (await fetchExerciseById(hit.exerciseId)) || hit;
  }

  if (!muscleGroup || !muscleGroups[muscleGroup]) {
    return null;
  }

  const exercises = await fetchExercisesForGroup(muscleGroup);

  return exercises.find(
    ex => ex.name && ex.name.toLowerCase() === wanted
  ) || null;
}

// ============================
// TAXONOMIES
// ============================

/**
 * Read a taxonomy endpoint that returns [{ name }, ...].
 * @param {string} path - "/muscles", "/equipments" or "/bodyparts"
 * @returns {Promise<Array<string>>}
 */
async function fetchNameList(path) {
  try {
    const json = await apiGet(path);
    const data = unwrap(json);

    if (!Array.isArray(data)) return [];
    return data.map(item => (typeof item === "string" ? item : item && item.name)).filter(Boolean);
  } catch (err) {
    console.error(`Error fetching ${path}:`, err);
    return [];
  }
}

/**
 * Fetch every muscle the API can filter on.
 * @returns {Promise<Array<string>>}
 */
export function fetchMuscleList() {
  return fetchNameList("/muscles");
}

/**
 * Fetch every equipment type the API knows about.
 * @returns {Promise<Array<string>>}
 */
export function fetchEquipmentList() {
  return fetchNameList("/equipments");
}

/**
 * Fetch every body part the API knows about.
 * @returns {Promise<Array<string>>}
 */
export function fetchBodyPartList() {
  return fetchNameList("/bodyparts");
}

// ============================
// CACHE HELPERS
// ============================

/**
 * Get the cache (for external access)
 * @returns {Object}
 */
export function getCache() {
  return { ...exerciseCache };
}

/**
 * Clear the cache
 */
export function clearCache() {
  Object.keys(exerciseCache).forEach(key => delete exerciseCache[key]);

  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Export delay for external use
export { delay };
