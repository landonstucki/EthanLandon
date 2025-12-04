/**
 * Equipment Filter Module
 * Handles filtering exercises by equipment type
 */

export const equipmentList = [
  "stepmill machine",
  "elliptical machine",
  "trap bar",
  "tire",
  "stationary bike",
  "wheel roller",
  "smith machine",
  "hammer",
  "skierg machine",
  "roller",
  "resistance band",
  "bosu ball",
  "weighted",
  "olympic barbell",
  "kettlebell",
  "upper body ergometer",
  "sled machine",
  "ez barbell",
  "dumbbell",
  "rope",
  "barbell",
  "band",
  "stability ball",
  "medicine ball",
  "assisted",
  "leverage machine",
  "cable",
  "body weight"
];

// Selected equipment filters
let selectedEquipment = new Set();

/**
 * Get selected equipment filters
 * @returns {Set} Set of selected equipment
 */
export function getSelectedEquipment() {
  return new Set(selectedEquipment);
}

/**
 * Set equipment filters
 * @param {Array|Set} equipment - Equipment to select
 */
export function setSelectedEquipment(equipment) {
  selectedEquipment = new Set(equipment);
}

/**
 * Toggle equipment filter
 * @param {string} equipment - Equipment name
 */
export function toggleEquipment(equipment) {
  if (selectedEquipment.has(equipment)) {
    selectedEquipment.delete(equipment);
  } else {
    selectedEquipment.add(equipment);
  }
}

/**
 * Clear all equipment filters
 */
export function clearEquipmentFilters() {
  selectedEquipment.clear();
}

/**
 * Check if any filters are active
 * @returns {boolean}
 */
export function hasActiveFilters() {
  return selectedEquipment.size > 0;
}

/**
 * Filter exercises by selected equipment
 * @param {Array} exercises - Array of exercise objects
 * @returns {Array} Filtered exercises
 */
export function filterExercisesByEquipment(exercises) {
  // If no filters selected, return all exercises
  if (selectedEquipment.size === 0) {
    return exercises;
  }

  return exercises.filter(exercise => {
    // Get exercise equipment (handle both array and string)
    const exerciseEquipment = Array.isArray(exercise.equipments) 
      ? exercise.equipments 
      : [exercise.equipments || 'body weight'];
    
    // Check if any of the exercise's equipment matches selected filters
    return exerciseEquipment.some(eq => 
      selectedEquipment.has((eq || '').toLowerCase().trim())
    );
  });
}

/**
 * Convert equipment name to display format (Title Case)
 * @param {string} equipment - Equipment name
 * @returns {string} Title cased equipment name
 */
export function formatEquipmentName(equipment) {
  return equipment
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
