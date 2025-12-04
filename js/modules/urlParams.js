/**
 * URL Parameters Module
 * Handles URL parameter encoding/decoding for sharing workouts
 */

/**
 * Build URL parameters from workout data
 * @param {string} workoutTitle - Title of the workout
 * @param {Array} workouts - Array of workout objects
 * @returns {URLSearchParams} - The encoded parameters
 */
export function buildWorkoutParams(workoutTitle, workouts) {
  const params = new URLSearchParams();

  if (workoutTitle) {
    params.append("workoutTitle", workoutTitle);
  }

  workouts.forEach((w, index) => {
    const key = `w${index + 1}`;
    params.append(`${key}Name`, w.name);
    params.append(`${key}Sets`, w.sets);
    params.append(`${key}Reps`, w.reps);
    params.append(`${key}Group`, w.muscleGroup);
  });

  return params;
}

/**
 * Parse workout data from URL parameters
 * @returns {Object} - { workoutTitle: string, workouts: Array }
 */
export function parseWorkoutParams() {
  const params = new URLSearchParams(window.location.search);
  const workoutTitle = params.get("workoutTitle") || "My Workout";

  const workouts = [];
  let index = 1;

  while (true) {
    const name = params.get(`w${index}Name`);
    if (!name) break;

    workouts.push({
      id: `${name}-${params.get(`w${index}Group`) || "Custom"}-${Date.now()}-${index}`,
      name,
      displayName: toTitleCase(name),
      muscleGroup: params.get(`w${index}Group`) || "Custom",
      gifUrl: "",
      sets: parseInt(params.get(`w${index}Sets`), 10) || 3,
      reps: parseInt(params.get(`w${index}Reps`), 10) || 10
    });

    index++;
  }

  return { workoutTitle, workouts };
}

/**
 * Check if URL has workout parameters
 * @returns {boolean}
 */
export function hasWorkoutParams() {
  const params = new URLSearchParams(window.location.search);
  return params.has("workoutTitle") || params.has("w1Name");
}

/**
 * Update URL with workout data (no page reload)
 * @param {string} workoutTitle - Title of the workout
 * @param {Array} workouts - Array of workout objects
 */
export function syncUrlToWorkout(workoutTitle, workouts) {
  const params = buildWorkoutParams(workoutTitle, workouts);
  const query = params.toString();
  const newUrl = window.location.pathname + (query ? `?${query}` : "");
  history.replaceState(null, "", newUrl);
}

/**
 * Get the current full URL (for sharing)
 * @returns {string}
 */
export function getShareUrl() {
  return window.location.href;
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    return false;
  }
}

/**
 * Helper to convert string to title case
 * @param {string} str - Input string
 * @returns {string} - Title cased string
 */
function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Export the helper too
export { toTitleCase };
