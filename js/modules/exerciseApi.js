/**
 * Exercise API Module
 * Handles all API calls to the ExerciseDB API
 */

// Cache for API responses
const exerciseCache = {};

// Rate limiting helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Muscle group mappings
export const muscleGroups = {
  Legs: [
    "quadriceps", "quads", "hamstrings", "glutes", "calves", "soleus", "shins",
    "inner thighs", "groin", "hip flexors", "abductors", "adductors"
  ],
  Biceps: ["biceps", "brachialis"],
  Triceps: ["triceps"],
  Core: ["abs", "abdominals", "lower abs", "obliques", "core", "serratus anterior", "hip flexors"],
  Back: ["back", "upper back", "lower back", "latissimus dorsi", "lats", "rhomboids", "spine"],
  Chest: ["chest", "upper chest", "pectorals"],
  Shoulders: ["shoulders", "deltoids", "delts", "rear deltoids", "rotator cuff"],
  Traps: ["traps", "trapezius", "levator scapulae", "sternocleidomastoid"]
};

/**
 * Fetch exercises for a specific muscle from the API
 * @param {string} muscleName - Name of the muscle
 * @returns {Promise<Array>} - Array of exercises
 */
export async function fetchExercisesByMuscle(muscleName) {
  const formatted = muscleName.toLowerCase().trim().replace(/\s+/g, "%20");
  const url = `https://www.exercisedb.dev/api/v1/muscles/${formatted}/exercises?offset=0&limit=100&includeSecondary=false`;

  // Return cached response if available
  if (exerciseCache[formatted]) {
    return exerciseCache[formatted];
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    const exercises = json.success && json.data ? json.data : (Array.isArray(json) ? json : []);
    
    exerciseCache[formatted] = exercises;
    return exercises;
  } catch (err) {
    console.error(`Error fetching ${muscleName}:`, err);
    return [];
  }
}

/**
 * Fetch all exercises for a muscle group
 * @param {string} groupName - Name of the muscle group (e.g., "Legs")
 * @returns {Promise<Array>} - Deduplicated array of exercises
 */
export async function fetchExercisesForGroup(groupName) {
  const muscles = muscleGroups[groupName];
  if (!muscles) return [];

  const allExercises = [];

  for (const muscle of muscles) {
    const exercises = await fetchExercisesByMuscle(muscle);
    if (exercises && exercises.length > 0) {
      allExercises.push(...exercises);
    }
    await delay(300); // Rate limiting
  }

  // Deduplicate exercises
  const key = (ex) =>
    `${ex.exerciseId || ex.name}-${Array.isArray(ex.equipments) ? ex.equipments.join(',') : ex.equipments || 'none'}`;

  return Array.from(new Map(allExercises.map(ex => [key(ex), ex])).values());
}

/**
 * Find a specific exercise by name within a muscle group
 * @param {string} exerciseName - Name of the exercise
 * @param {string} muscleGroup - Muscle group to search in
 * @returns {Promise<Object|null>} - The exercise or null
 */
export async function findExerciseByName(exerciseName, muscleGroup) {
  const exercises = await fetchExercisesForGroup(muscleGroup);
  
  return exercises.find(
    ex => ex.name && ex.name.toLowerCase() === exerciseName.toLowerCase()
  ) || null;
}

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
}

// Export delay for external use
export { delay };
