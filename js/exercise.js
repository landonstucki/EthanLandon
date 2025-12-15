// This is my global stash for exercise data.
// - `cache` = responses I've already fetched by muscle so I don't spam the API.
// - `allExercises` = everything I've pulled, organized by the big muscle groups (Legs, Biceps, etc.).
const exerciseData = {
  cache: {},
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

// Tiny helper so I can slow down the API calls a bit.
// (This is me trying to be nice to the API.)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// These are the labels I'm using in the UI mapped to actual muscle names
// that the ExerciseDB API understands. If I ever add new buttons, update here.
const muscleGroups = {
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

// Just keeping track of what sections are currently visible.
const loadedGroups = new Set();

/**
 * Pulls exercises for a single muscle from the API.
 * Future me: this handles:
 *  - formatting the muscle name for the URL
 *  - basic error handling
 *  - caching so the same muscle isn't fetched over and over
 */
async function fetchExercisesByMuscle(muscleName) {
  const formatted = muscleName.toLowerCase().trim().replace(/\s+/g, "%20");
  const url = `https://www.exercisedb.dev/api/v1/muscles/${formatted}/exercises?offset=0&limit=100&includeSecondary=false`;

  // If I've already seen this muscle, just reuse the cached result.
  if (exerciseData.cache[formatted]) {
    return exerciseData.cache[formatted];
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      // If the API complains, just return an empty list and move on.
      return [];
    }

    const json = await res.json();

    // The API can respond in a couple of shapes.
    // This line tries to gracefully handle both.
    const exercises = json.success && json.data ? json.data : (Array.isArray(json) ? json : []);

    exerciseData.cache[formatted] = exercises;
    return exercises;
  } catch (err) {
    console.error(`Error fetching ${muscleName}:`, err);
    return [];
  }
}

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

  const secondaryMuscles = Array.isArray(exercise.secondaryMuscles)
    ? exercise.secondaryMuscles.join(", ")
    : "None";

  const equipment = Array.isArray(exercise.equipments)
    ? exercise.equipments.join(", ")
    : exercise.equipments || "N/A";

  const gifUrl = exercise.gifUrl || "";

  return `
    <div class="exercise" data-index="${index}">
      <h3>${exercise.name || "Unnamed Exercise"}</h3>
      ${gifUrl ? `<img src="${gifUrl}" alt="${exercise.name}" width="150">` : ""}
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

// ============================
// EQUIPMENT FILTER FUNCTIONALITY
// ============================

const equipmentList = [
  "stepmill machine", "elliptical machine", "trap bar", "tire", "stationary bike",
  "wheel roller", "smith machine", "hammer", "skierg machine", "roller",
  "resistance band", "bosu ball", "weighted", "olympic barbell", "kettlebell",
  "upper body ergometer", "sled machine", "ez barbell", "dumbbell", "rope",
  "barbell", "band", "stability ball", "medicine ball", "assisted",
  "leverage machine", "cable", "body weight"
];

// Equipment list is available immediately
const availableEquipment = [...equipmentList];

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
 * Format equipment name to Title Case
 */
function formatEquipmentName(equipment) {
  return equipment.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Initialize equipment filter modal
 */
// Debounce timer for filter changes
let filterDebounceTimer = null;

function initEquipmentFilter() {
  const allEquipment = [...new Set(equipmentList)].sort();
  equipmentGrid.innerHTML = '';

  allEquipment.forEach(equipment => {
    const item = document.createElement('div');
    item.className = 'equipment-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `eq-${equipment.replace(/\s+/g, '-')}`;
    checkbox.value = equipment;

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

    checkbox.addEventListener('change', updateSelectedCount);

    equipmentGrid.appendChild(item);
  });
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
    const groupSection = document.getElementById(`section-${group}`);
    if (!groupSection) return;

    const exercises = exerciseData.allExercises[group];
    if (!exercises) return;

    const filteredExercises = filterByEquipment(exercises);

    if (filteredExercises.length === 0) {
      groupSection.innerHTML = `<h2>${group}</h2><p class="no-results-message">No exercises found with selected equipment.</p>`;
      return;
    }

    groupSection.innerHTML = `
      <h2>${group}</h2>
      <div class="exercise-group">
        ${filteredExercises.map((ex, index) => createExerciseCard(ex, group, index)).join("")}
      </div>
    `;

    // Re-attach instruction toggle listeners
    groupSection.querySelectorAll(".show-instructions").forEach(btn => {
      btn.addEventListener("click", () => {
        const exerciseId = btn.dataset.exerciseId;
        if (!exerciseId) return;

        const instructionsDiv = document.getElementById(`instructions-${exerciseId}`);
        if (!instructionsDiv) return;

        const showing = instructionsDiv.style.display === "block";
        instructionsDiv.style.display = showing ? "none" : "block";
        btn.textContent = showing ? "Show Instructions" : "Hide Instructions";
      });
    });
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

  // Setup muscle group button listeners
  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (!results) return;

      const group = button.dataset.group;
      const muscles = muscleGroups[group];
      if (!muscles) return;

      // Visual toggle for the button itself so I can see what's active.
      button.classList.toggle("clicked");

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
          <p>Loading ${group} exercises...</p>
        </div>
      `;
      results.appendChild(groupSection);

      const allExercises = [];

      // For each muscle under this group, fetch its exercises.
      // This will probably pull duplicates; I de-dupe later.
      for (const muscle of muscles) {
        const exercises = await fetchExercisesByMuscle(muscle);
        if (exercises && exercises.length > 0) {
          allExercises.push(...exercises);
        }
        // Friendly pause so I don't hammer the API with 10 requests instantly.
        await delay(300);
      }

      // Here I'm deduping exercises. The same move might appear under multiple
      // muscles, so I use this combo key to treat those as the same.
      const key = (ex) =>
        `${ex.exerciseId || ex.name}-${Array.isArray(ex.equipments) ? ex.equipments.join(',') : ex.equipments || 'none'}`;

      const unique = Array.from(new Map(allExercises.map(ex => [key(ex), ex])).values());

      if (unique.length === 0) {
        groupSection.innerHTML = `<h2>${group}</h2><p class="no-results-message">No exercises found.</p>`;
        return;
      }

      // Keeping around the cleaned-up list in case I want it later.
      exerciseData.allExercises[group] = unique;

      // Apply equipment filter if active
      const filteredExercises = filterByEquipment(unique);

      if (filteredExercises.length === 0) {
        groupSection.innerHTML = `<h2>${group}</h2><p class="no-results-message">No exercises found with selected equipment.</p>`;
        return;
      }

      // Replace the "Loading..." message with the actual cards.
      groupSection.innerHTML = `
        <h2>${group}</h2>
        <div class="exercise-group">
          ${filteredExercises.map((ex, index) => createExerciseCard(ex, group, index)).join("")}
        </div>
      `;

      // Hook up the Show/Hide Instructions buttons inside this group.
      groupSection.querySelectorAll(".show-instructions").forEach(btn => {
        btn.addEventListener("click", () => {
          const exerciseId = btn.dataset.exerciseId;
          if (!exerciseId) return;

          const instructionsDiv = document.getElementById(`instructions-${exerciseId}`);
          if (!instructionsDiv) return;

          const showing = instructionsDiv.style.display === "block";
          instructionsDiv.style.display = showing ? "none" : "block";
          btn.textContent = showing ? "Show Instructions" : "Hide Instructions";
        });
      });
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
}
