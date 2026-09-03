// Exercise page.
//
// All network access lives in ./modules/exerciseApi.js, which talks to the free
// ExerciseDB API at https://oss.exercisedb.dev/api/v1. That module owns the
// caching, cursor pagination and rate limiting; this file is just UI.

import {
  muscleGroups,
  fetchExercisesForGroup,
  fetchEquipmentList
} from "./modules/exerciseApi.js";

import {
  equipmentList,
  formatEquipmentName
} from "./modules/equipmentFilter.js";

// This is my global stash for exercise data.
// `allExercises` = everything I've pulled, organized by the big muscle groups
// (Legs, Biceps, etc.). The per-muscle response cache lives in exerciseApi.js.
const exerciseData = {
  allExercises: {}
};

// Equipment filter state
let selectedEquipment = new Set();

// Equipment filter DOM elements
let filterBtn;
let filterModal;
let equipmentGrid;
let filterSelectedCount;
let applyFiltersBtn;
let clearFiltersBtn;
let closeFilterBtn;

// Buttons for each major muscle group and the main results area.
let buttons;
let results;

// Just keeping track of what sections are currently visible.
const loadedGroups = new Set();

// Bumped every time a group is toggled. A load that finishes after its group
// was switched off (or switched back on) checks this and bails out.
const loadTokens = {};

/**
 * Builds the HTML string for one exercise card.
 * I'm not touching the DOM here; this is just assembling markup.
 */
function createExerciseCard(exercise, muscleGroup, index) {
  const hasInstructions = exercise.instructions && exercise.instructions.length > 0;
  const uniqueId = `${muscleGroup}-${index}`.replace(/\s+/g, '-').toLowerCase();

  const targetMuscles = Array.isArray(exercise.targetMuscles)
    ? exercise.targetMuscles.join(", ")
    : exercise.targetMuscles || "N/A";

  const secondaryMuscles = Array.isArray(exercise.secondaryMuscles) && exercise.secondaryMuscles.length
    ? exercise.secondaryMuscles.join(", ")
    : "None";

  const equipment = Array.isArray(exercise.equipments)
    ? exercise.equipments.join(", ")
    : exercise.equipments || "N/A";

  const gifUrl = exercise.gifUrl || "";

  return `
    <div class="exercise" data-index="${index}">
      <h3>${exercise.name || "Unnamed Exercise"}</h3>
      ${gifUrl ? `<img src="${gifUrl}" alt="${exercise.name}" width="150" loading="lazy">` : ""}
      <p><strong>Muscle Group:</strong> ${muscleGroup}</p>
      <p><strong>Target Muscle:</strong> ${targetMuscles}</p>
      <p><strong>Secondary Muscles:</strong> ${secondaryMuscles}</p>
      <p><strong>Equipment:</strong> ${equipment}</p>
      ${hasInstructions ? `
        <button
          class="show-instructions"
          data-exercise-id="${uniqueId}"
          type="button"
        >
          Show Instructions
        </button>

        <button
          class="add-workout-btn"
          data-exercise-name="${exercise.name || ""}"
          data-muscle-group="${muscleGroup}"
          data-exercise-gif="${gifUrl}"
          type="button"
        >
          Add Workout
        </button>

        <div class="instructions" id="instructions-${uniqueId}" style="display:none;">
          <ol>${exercise.instructions.map(step => `<li>${step}</li>`).join("")}</ol>
        </div>
      ` : ""}
    </div>
  `;
}

/**
 * Paints one muscle group's section.
 *
 * Exercises stream in a page at a time, so this gets called repeatedly while a
 * group loads. Any instructions the user already opened are reopened after the
 * repaint so the list doesn't fight them.
 *
 * @param {string} group - Muscle group name
 * @param {Array} exercises - Exercises loaded for the group so far
 * @param {boolean} isLoading - Whether more exercises are still on the way
 */
function renderGroupSection(group, exercises, isLoading) {
  const groupSection = document.getElementById(`section-${group}`);
  if (!groupSection) return;

  // Remember which instruction panels are open before we blow away the markup.
  const openInstructions = new Set(
    Array.from(groupSection.querySelectorAll(".instructions"))
      .filter(el => el.style.display === "block")
      .map(el => el.id)
  );

  const filteredExercises = filterByEquipment(exercises);

  const spinner = isLoading
    ? `<div class="loading-indicator">
         <div class="loading-spinner"></div>
         <p>Loading ${group} exercises… (${filteredExercises.length} so far)</p>
       </div>`
    : "";

  if (filteredExercises.length === 0) {
    const emptyMessage = isLoading
      ? ""
      : `<p class="no-results-message">${
        exercises.length === 0
          ? "No exercises found."
          : "No exercises found with selected equipment."
      }</p>`;

    groupSection.innerHTML = `<h2>${group}</h2>${spinner}${emptyMessage}`;
    return;
  }

  groupSection.innerHTML = `
    <h2>${group}</h2>
    <div class="exercise-group">
      ${filteredExercises.map((ex, index) => createExerciseCard(ex, group, index)).join("")}
    </div>
    ${spinner}
  `;

  // Put the user's open instruction panels back.
  openInstructions.forEach(id => {
    const panel = groupSection.querySelector(`#${CSS.escape(id)}`);
    if (!panel) return;

    panel.style.display = "block";
    const btn = groupSection.querySelector(
      `.show-instructions[data-exercise-id="${id.replace(/^instructions-/, "")}"]`
    );
    if (btn) btn.textContent = "Hide Instructions";
  });
}

// ============================
// EQUIPMENT FILTER FUNCTIONALITY
// ============================

// Seeded with the known equipment types so the modal renders instantly, then
// refreshed from GET /equipments once the API answers.
let availableEquipment = [...equipmentList];

/**
 * Filter exercises by selected equipment
 */
function filterByEquipment(exercises) {
  if (selectedEquipment.size === 0) {
    return exercises;
  }

  return exercises.filter(exercise => {
    const exerciseEquipment = Array.isArray(exercise.equipments)
      ? exercise.equipments
      : [exercise.equipments || 'body weight'];

    return exerciseEquipment.some(eq =>
      selectedEquipment.has((eq || '').toLowerCase().trim())
    );
  });
}

/**
 * Initialize equipment filter modal
 */
// Debounce timer for filter changes
let filterDebounceTimer = null;

function initEquipmentFilter() {
  const allEquipment = [...new Set(availableEquipment)].sort();
  equipmentGrid.innerHTML = '';

  allEquipment.forEach(equipment => {
    const item = document.createElement('div');
    item.className = 'equipment-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `eq-${equipment.replace(/\s+/g, '-')}`;
    checkbox.value = equipment;
    checkbox.checked = selectedEquipment.has(equipment);

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = formatEquipmentName(equipment);

    item.appendChild(checkbox);
    item.appendChild(label);

    // Click on entire item toggles checkbox
    item.addEventListener('click', (e) => {
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
        updateSelectedCount();
      }
    });

    // Debounced change handler for performance
    checkbox.addEventListener('change', () => {
      updateSelectedCount();

      // Clear existing timer
      if (filterDebounceTimer) {
        clearTimeout(filterDebounceTimer);
      }

      // Wait 300ms after last change before updating
      filterDebounceTimer = setTimeout(() => {
        updateSelectedCount();
      }, 300);
    });

    equipmentGrid.appendChild(item);
  });
}

/**
 * Pull the live equipment taxonomy and rebuild the modal if it differs from
 * the list we shipped with.
 */
async function refreshEquipmentFromApi() {
  const fetched = await fetchEquipmentList();
  if (!fetched.length) return;

  const next = fetched.map(eq => eq.toLowerCase().trim()).filter(Boolean);
  const changed =
    next.length !== availableEquipment.length ||
    next.some(eq => !availableEquipment.includes(eq));

  if (!changed) return;

  availableEquipment = next;
  initEquipmentFilter();
  updateSelectedCount();
}

/**
 * Update selected count display
 */
function updateSelectedCount() {
  const checkedCount = equipmentGrid.querySelectorAll('input[type="checkbox"]:checked').length;
  filterSelectedCount.textContent = `${checkedCount} selected`;
}

/**
 * Update filter button count
 */
function updateFilterButton() {
  if (!filterBtn) return;

  const count = selectedEquipment.size;
  const countEl = filterBtn.querySelector('.filter-count');

  if (countEl) {
    countEl.textContent = `(${count})`;
  }

  if (count > 0) {
    filterBtn.classList.add('active');
  } else {
    filterBtn.classList.remove('active');
  }

  // Also update the filter tags display
  renderFilterTags();
}

// Render the active filter tags
function renderFilterTags() {
  const tagsContainer = document.getElementById('filter-tags-container');
  if (!tagsContainer) return;

  // Clear existing tags
  tagsContainer.innerHTML = '';

  // Create a tag for each selected equipment
  selectedEquipment.forEach(equipment => {
    const tag = document.createElement('div');
    tag.className = 'filter-tag';

    const text = document.createElement('span');
    text.className = 'filter-tag-text';
    text.textContent = formatEquipmentName(equipment);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'filter-tag-remove';
    removeBtn.innerHTML = '×';
    removeBtn.setAttribute('aria-label', `Remove ${equipment} filter`);
    removeBtn.addEventListener('click', () => {
      // Remove from selected set
      selectedEquipment.delete(equipment);

      // Uncheck the checkbox in the modal
      const checkbox = equipmentGrid.querySelector(`input[value="${equipment}"]`);
      if (checkbox) checkbox.checked = false;

      // Update UI
      updateFilterButton();
      updateSelectedCount();
      reapplyFilters();
    });

    tag.appendChild(text);
    tag.appendChild(removeBtn);
    tagsContainer.appendChild(tag);
  });
}


/**
 * Rerender all loaded muscle groups with current filters
 */
function reapplyFilters() {
  loadedGroups.forEach(group => {
    const exercises = exerciseData.allExercises[group];
    if (!exercises) return;

    renderGroupSection(group, exercises, false);
  });
}


// ============================
// MAIN PAGE INITIALIZATION
// ============================

export function initExercisePage() {
  // Initialize DOM elements
  buttons = document.querySelectorAll("#muscle-groups-selector button");
  results = document.getElementById("exercise-results");

  // Initialize equipment filter DOM elements
  filterBtn = document.getElementById("equipment-filter-btn");
  filterModal = document.getElementById("equipment-filter-modal");
  closeFilterBtn = document.getElementById("equipment-filter-close");
  equipmentGrid = document.getElementById("equipment-grid");
  applyFiltersBtn = document.getElementById("apply-filters-btn");
  clearFiltersBtn = document.getElementById("clear-filters-btn");
  filterSelectedCount = document.getElementById("filter-selected-count");

  // If this ever logs, something is wrong with the HTML ID.
  if (!results) {
    console.error("exercise-results element not found");
  }

  // One delegated listener for every Show/Hide Instructions button, so the
  // repaints that happen while a group streams in can't lose their handlers.
  if (results) {
    results.addEventListener("click", (e) => {
      const btn = e.target.closest(".show-instructions");
      if (!btn) return;

      const exerciseId = btn.dataset.exerciseId;
      if (!exerciseId) return;

      const instructionsDiv = document.getElementById(`instructions-${exerciseId}`);
      if (!instructionsDiv) return;

      const showing = instructionsDiv.style.display === "block";
      instructionsDiv.style.display = showing ? "none" : "block";
      btn.textContent = showing ? "Show Instructions" : "Hide Instructions";
    });
  }

  // Setup muscle group button listeners
  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (!results) return;

      const group = button.dataset.group;
      if (!muscleGroups[group]) return;

      // Visual toggle for the button itself so I can see what's active.
      button.classList.toggle("clicked");

      // Every toggle invalidates whatever load was in flight for this group.
      const token = (loadTokens[group] || 0) + 1;
      loadTokens[group] = token;

      // If I'm turning a group off, kill its entire section and clean up state.
      if (!button.classList.contains("clicked")) {
        loadedGroups.delete(group);
        delete exerciseData.allExercises[group];
        const section = document.getElementById(`section-${group}`);
        if (section) section.remove();
        return;
      }

      loadedGroups.add(group);

      // Create a temporary "loading" section for this group.
      const groupSection = document.createElement("div");
      groupSection.id = `section-${group}`;
      groupSection.innerHTML = `
        <h2>${group}</h2>
        <div class="loading-indicator">
          <div class="loading-spinner"></div>
          <p>Loading ${group} exercises…</p>
        </div>
      `;
      results.appendChild(groupSection);

      // The API hands back 25 exercises per request, so render each page as it
      // lands instead of making the user stare at a spinner for the whole set.
      const unique = await fetchExercisesForGroup(group, (partial) => {
        if (loadTokens[group] !== token) return;

        exerciseData.allExercises[group] = partial;
        renderGroupSection(group, partial, true);
      });

      // The group was toggled again while we were loading - drop this result.
      if (loadTokens[group] !== token) return;

      // Keeping around the cleaned-up list in case I want it later.
      exerciseData.allExercises[group] = unique;

      renderGroupSection(group, unique, false);
    });
  });

  // Equipment Filter Event Listeners
  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      filterModal.classList.remove('hidden');
      document.body.classList.add('filter-modal-open');
      // Sync checkboxes with current selection
      equipmentGrid.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = selectedEquipment.has(checkbox.value);
      });
      updateSelectedCount();
    });
  }

  if (closeFilterBtn) {
    closeFilterBtn.addEventListener('click', () => {
      filterModal.classList.add('hidden');
      document.body.classList.remove('filter-modal-open');
    });
  }

  if (filterModal) {
    filterModal.addEventListener('click', (e) => {
      if (e.target === filterModal) {
        filterModal.classList.add('hidden');
        document.body.classList.remove('filter-modal-open');
      }
    });
  }

  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', () => {
      // Get all checked equipment
      selectedEquipment.clear();
      equipmentGrid.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
        selectedEquipment.add(checkbox.value);
      });

      updateFilterButton();
      reapplyFilters();
      filterModal.classList.add('hidden');
      document.body.classList.remove('filter-modal-open');
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      equipmentGrid.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
      });
      updateSelectedCount();
    });
  }

  // Initialize equipment filter AFTER DOM elements are queried
  initEquipmentFilter();
  updateFilterButton();

  // Keep the equipment list honest against whatever the API currently reports.
  refreshEquipmentFromApi();
}
