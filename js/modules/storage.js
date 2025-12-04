/**
 * Storage Module
 * Handles all localStorage operations for the WebFit app
 */

const WORKOUT_STORAGE_KEY = "webfit-workout-state";
const CONTACT_STORAGE_KEY = "webfit-contact-submissions";

/**
 * Save workout state to localStorage
 * @param {Object} payload - { workoutTitle: string, workouts: Array }
 */
export function saveWorkout(payload) {
  if (typeof localStorage === "undefined") return false;

  try {
    localStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error("Failed to save workout to localStorage:", err);
    return false;
  }
}

/**
 * Load workout state from localStorage
 * @returns {Object|null} - The saved workout data or null
 */
export function loadWorkout() {
  if (typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(WORKOUT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load workout from localStorage:", err);
    return null;
  }
}

/**
 * Clear workout from localStorage
 */
export function clearWorkout() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(WORKOUT_STORAGE_KEY);
}

/**
 * Save contact form submission to localStorage (for demo purposes)
 * @param {Object} formData - The form submission data
 */
export function saveContactSubmission(formData) {
  if (typeof localStorage === "undefined") return false;

  try {
    const existing = getContactSubmissions();
    existing.push({
      ...formData,
      submittedAt: new Date().toISOString()
    });
    localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(existing));
    return true;
  } catch (err) {
    console.error("Failed to save contact submission:", err);
    return false;
  }
}

/**
 * Get all contact form submissions from localStorage
 * @returns {Array} - Array of submissions
 */
export function getContactSubmissions() {
  if (typeof localStorage === "undefined") return [];

  try {
    const raw = localStorage.getItem(CONTACT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load contact submissions:", err);
    return [];
  }
}

/**
 * Generic storage helper - save any data with a key
 * @param {string} key - Storage key
 * @param {*} data - Data to store
 */
export function saveData(key, data) {
  if (typeof localStorage === "undefined") return false;

  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error(`Failed to save data for key ${key}:`, err);
    return false;
  }
}

/**
 * Generic storage helper - load data by key
 * @param {string} key - Storage key
 * @returns {*} - The stored data or null
 */
export function loadData(key) {
  if (typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to load data for key ${key}:`, err);
    return null;
  }
}

/**
 * Remove data by key
 * @param {string} key - Storage key
 */
export function removeData(key) {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(key);
}
