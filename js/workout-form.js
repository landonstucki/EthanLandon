// ====== "My Workout" bar + How-To modal logic ======

// Local storage key so I know where I'm saving this stuff.
const LOCAL_STORAGE_KEY = "webfit-workout-state";

// Hooks into the fixed workout bar at the top.
let workoutBar;
let workoutBarToggle;
let workoutBarBody;
let workoutNameInput;
let workoutBarCount;
let workoutBarChevron;
let workoutBarContent;
let copyShareBtn;
let shareConfirmMsg;

// This is the How-To modal that opens from inside the dropdown.
let howtoModal;
let howtoModalTitle;
let howtoModalGif;
let howtoModalClose;

// All of the exercise cards live here in the main content.
let resultsContainer;

// This is my "truth" for the custom workout.
// The top dropdown UI is just a visual view into this array.
let selectedWorkouts = [];
let barExpanded = false;

/**
 * Little helper to clean up exercise names so they look nicer.
 * Example: "barbell squat" → "Barbell Squat"
 */
function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Just a tiny helper so I don't keep repeating this.
 */
function getCurrentWorkoutTitle() {
  return (workoutNameInput?.value || "My Workout").trim();
}

/**
 * Build query params for the URL based on whatever is in `selectedWorkouts`.
 * This is what makes the link shareable.
 */
function buildWorkoutParams() {
  const params = new URLSearchParams();

  const workoutTitle = getCurrentWorkoutTitle();
  if (workoutTitle) {
    params.append("workoutTitle", workoutTitle);
  }

  selectedWorkouts.forEach((w, index) => {
    const key = `w${index + 1}`;
    params.append(`${key}Name`, w.name);
    params.append(`${key}Sets`, w.sets);
    params.append(`${key}Reps`, w.reps);
    params.append(`${key}Group`, w.muscleGroup);
    // I'm not putting gifUrl here on purpose so the URL doesn't get ridiculous.
  });

  return params;
}

/**
 * Push the workout state into the URL (no page reload).
 */
function syncUrlToState() {
  const params = buildWorkoutParams();
  const query = params.toString();
  const newUrl = window.location.pathname + (query ? `?${query}` : "");
  history.replaceState(null, "", newUrl);
}

/**
 * Save the current workout to localStorage so it survives:
 * - going to Home and back
 * - refreshing the page
 * - closing and reopening the browser
 */
function saveWorkoutToLocalStorage() {
  if (typeof localStorage === "undefined") return;

  const payload = {
    workoutTitle: getCurrentWorkoutTitle(),
    workouts: selectedWorkouts
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error("Failed to save workout to localStorage:", err);
  }
}

/**
 * Convenience function so I don't forget to keep BOTH
 * URL and localStorage in sync when the workout changes.
 */
function persistState() {
  syncUrlToState();
  saveWorkoutToLocalStorage();
}

/**
 * Shows/hides the entire bar depending on whether there's anything in it.
 */
function updateWorkoutBarVisibility() {
  if (selectedWorkouts.length === 0) {
    workoutBar.classList.add("hidden");
    barExpanded = false;
    workoutBarBody.classList.remove("open");
    workoutBarChevron.textContent = "▼";
    workoutBarCount.dataset.count = "0";
    workoutBarCount.textContent = "(0)";
  } else {
    workoutBar.classList.remove("hidden");
  }
}

/**
 * Rebuilds the dropdown content based on the `selectedWorkouts` array.
 * Anytime I edit/add/remove workouts, I call this.
 */
function renderWorkoutBar() {
  workoutBarCount.dataset.count = selectedWorkouts.length;
  workoutBarCount.textContent = `(${selectedWorkouts.length})`;

  workoutBarContent.innerHTML = "";

  selectedWorkouts.forEach((w) => {
    const row = document.createElement("div");
    row.classList.add("workout-row");
    row.dataset.id = w.id;

    row.innerHTML = `
      <span class="workout-name">${w.displayName}</span>
      <label>
        Sets:
        <input type="number" class="workout-sets" min="1" value="${w.sets}">
      </label>
      <label>
        Reps:
        <input type="number" class="workout-reps" min="1" value="${w.reps}">
      </label>
      <button type="button" class="howto-btn">How-To</button>
      <button type="button" class="remove-workout-btn">Remove</button>
    `;

    workoutBarContent.appendChild(row);
  });

  updateWorkoutBarVisibility();
  // Make sure the link + local storage stay up to date.
  persistState();
}

/**
 * Adds a new exercise from a card into the custom workout bar.
 * Ignores duplicates (same name + same muscle group).
 */
function addWorkoutFromCard(exerciseName, muscleGroup, gifUrl) {
  if (!exerciseName) return;

  // Don't double-add the same exercise for the same group.
  const existing = selectedWorkouts.find(
    w => w.name === exerciseName && w.muscleGroup === muscleGroup
  );
  if (existing) {
    return;
  }

  const id = `${exerciseName}-${muscleGroup}-${Date.now()}`;
  const displayName = toTitleCase(exerciseName);

  selectedWorkouts.push({
    id,
    name: exerciseName,
    displayName,
    muscleGroup,
    gifUrl: gifUrl || "",
    sets: 3,
    reps: 10
  });

  renderWorkoutBar();
}

/**
 * Remove one workout row by id.
 */
function removeWorkout(id) {
  selectedWorkouts = selectedWorkouts.filter(w => w.id !== id);
  renderWorkoutBar();
}

/**
 * Flip the bar between expanded and collapsed mode.
 */
function toggleWorkoutBarExpansion() {
  barExpanded = !barExpanded;
  if (barExpanded) {
    workoutBarBody.classList.add("open");
    workoutBarChevron.textContent = "▲";
  } else {
    workoutBarBody.classList.remove("open");
    workoutBarChevron.textContent = "▼";
  }
}

/**
 * Read the query string and see if a workout was encoded in it.
 * This is what makes the "shared link" regenerate the workout list.
 */
function loadWorkoutFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const titleFromUrl = params.get("workoutTitle");

  if (titleFromUrl && workoutNameInput) {
    workoutNameInput.value = titleFromUrl;
  }

  const restored = [];
  let index = 1;

  while (true) {
    const name = params.get(`w${index}Name`);
    if (!name) break;

    const sets = parseInt(params.get(`w${index}Sets`), 10) || 3;
    const reps = parseInt(params.get(`w${index}Reps`), 10) || 10;
    const group = params.get(`w${index}Group`) || "Custom";

    restored.push({
      id: `${name}-${group}-${Date.now()}-${index}`,
      name,
      displayName: toTitleCase(name),
      muscleGroup: group,
      gifUrl: "", // For shared links, I'll fetch the gif later if needed.
      sets,
      reps
    });

    index++;
  }

  if (restored.length > 0) {
    selectedWorkouts = restored;
    renderWorkoutBar(); // this also updates localStorage
  }
}

/**
 * Load from localStorage when there's no URL data.
 * This is mainly for "I left and came back to the Exercise page".
 */
function loadWorkoutFromLocalStorage() {
  if (typeof localStorage === "undefined") return;

  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    const { workoutTitle, workouts } = data || {};

    if (workoutTitle && workoutNameInput) {
      workoutNameInput.value = workoutTitle;
    }

    if (Array.isArray(workouts) && workouts.length > 0) {
      selectedWorkouts = workouts.map((w, idx) => ({
        id: w.id || `${w.name || "exercise"}-${w.muscleGroup || "Custom"}-${Date.now()}-${idx}`,
        name: w.name || "Exercise",
        displayName: w.displayName || toTitleCase(w.name || "Exercise"),
        muscleGroup: w.muscleGroup || "Custom",
        gifUrl: w.gifUrl || "",
        sets: Number.isFinite(w.sets) ? w.sets : 3,
        reps: Number.isFinite(w.reps) ? w.reps : 10
      }));

      renderWorkoutBar();
    }
  } catch (err) {
    console.error("Failed to load workout from localStorage:", err);
  }
}

/**
 * Decide how to initialize the workout state:
 * 1. If URL already has workout params → use those (shared link scenario).
 * 2. Otherwise, fall back to localStorage.
 */
function initWorkoutState() {
  const params = new URLSearchParams(window.location.search);
  const hasWorkoutParams =
    params.has("workoutTitle") ||
    params.has("w1Name");

  if (hasWorkoutParams) {
    loadWorkoutFromUrl();
  } else {
    loadWorkoutFromLocalStorage();
  }
}

/**
 * Opens the How-To modal for a given workout.
 * At this point, I expect workout.gifUrl to be set.
 */
function openHowToModal(workout) {
  if (!howtoModal || !howtoModalTitle || !howtoModalGif) return;

  if (!workout.gifUrl) {
    alert("I couldn't find a demo GIF for this exercise yet.");
    return;
  }

  howtoModalTitle.textContent = workout.displayName || "Exercise How-To";
  howtoModalGif.src = workout.gifUrl;
  howtoModalGif.alt = workout.displayName || "Exercise how-to";
  howtoModal.classList.remove("hidden");
}

/**
 * Helper that tries to find the matching exercise for a workout
 * by using the group ("Legs") → sub-muscles → API, and then
 * comparing the names. This is for the "shared link on a fresh device" case.
 *
 * It uses:
 * - muscleGroups (from exercise.js)
 * - fetchExercisesByMuscle (from exercise.js)
 * - delay if available, otherwise a manual sleep
 */
async function findExerciseForWorkout(workout) {
  if (!workout.muscleGroup || typeof muscleGroups === "undefined") {
    return null;
  }

  const groupName = workout.muscleGroup;
  const subMuscles = muscleGroups[groupName];

  if (!Array.isArray(subMuscles) || subMuscles.length === 0) {
    return null;
  }

  let allExercises = [];

  // If delay exists from exercise.js, use it. If not, roll my own.
  const sleep =
    typeof delay === "function"
      ? delay
      : (ms) => new Promise((res) => setTimeout(res, ms));

  // Fetch all exercises for all sub-muscles in this group.
  for (const muscle of subMuscles) {
    try {
      const list = await fetchExercisesByMuscle(muscle);
      if (Array.isArray(list) && list.length > 0) {
        allExercises.push(...list);
      }
    } catch (err) {
      console.error("Error fetching exercises for muscle:", muscle, err);
    }
    await sleep(150);
  }

  if (!allExercises.length) {
    return null;
  }

  // Optional dedupe like in exercise.js
  const key = (ex) =>
    `${ex.exerciseId || ex.name}-${
      Array.isArray(ex.equipments) ? ex.equipments.join(",") : ex.equipments || "none"
    }`;

  const unique = Array.from(new Map(allExercises.map((ex) => [key(ex), ex])).values());

  // Try to match by name (case-insensitive).
  const match = unique.find(
    (ex) =>
      ex.name &&
      ex.name.toLowerCase() === (workout.name || "").toLowerCase()
  );

  return match || null;
}

/**
 * Smart How-To handler:
 * - If I already have a gifUrl, just open the modal.
 * - If not, I try to fetch the relevant exercises from the API using:
 *   group → sub-muscles → exercise list → match by name.
 */
async function handleHowToClick(workout) {
  if (!workout) return;

  // Easy case: already have a gif.
  if (workout.gifUrl) {
    openHowToModal(workout);
    return;
  }

  try {
    const match = await findExerciseForWorkout(workout);

    if (match && match.gifUrl) {
      // Save it into this workout object.
      workout.gifUrl = match.gifUrl;

      // Also save into the main state array so it's instant next time.
      const idx = selectedWorkouts.findIndex((w) => w.id === workout.id);
      if (idx !== -1) {
        selectedWorkouts[idx].gifUrl = match.gifUrl;
      }

      // No need to change the URL here; just remember it locally.
      saveWorkoutToLocalStorage();
      openHowToModal(workout);
    } else {
      alert("I couldn't find a demo GIF for this exercise yet.");
    }
  } catch (err) {
    console.error("Error trying to fetch gif for How-To:", err);
    alert("Something went wrong while loading the demo for this exercise.");
  }
}

/**
 * Close the How-To modal and clear out the gif source.
 */
function closeHowToModal() {
  if (!howtoModal) return;
  howtoModal.classList.add("hidden");
  if (howtoModalGif) {
    howtoModalGif.src = "";
  }
}

// === Bootstrapping: first see if URL has data, else use localStorage ===
initWorkoutState();

// === Event listeners ===

// Add Workout from exercise cards
if (resultsContainer) {
  resultsContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-workout-btn");
    if (!btn) return;

    const exerciseName = btn.dataset.exerciseName || "";
    const muscleGroup = btn.dataset.muscleGroup || "";
    const gifUrl = btn.dataset.exerciseGif || "";

    addWorkoutFromCard(exerciseName, muscleGroup, gifUrl);
  });
}

// Click header to expand/collapse (but don't toggle when editing the name).
if (workoutBarToggle) {
  workoutBarToggle.addEventListener("click", (e) => {
    if (!selectedWorkouts.length) return;
    if (e.target === workoutNameInput) return;
    toggleWorkoutBarExpansion();
  });
}

// Let me click into the name input without collapsing/expanding the bar.
if (workoutNameInput) {
  workoutNameInput.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // If I rename the workout, sync everything.
  workoutNameInput.addEventListener("input", () => {
    persistState();
  });
}

// Stuff that happens inside the dropdown rows: remove, How-To, sets, reps.
if (workoutBarContent) {
  workoutBarContent.addEventListener("click", (e) => {
    const row = e.target.closest(".workout-row");
    if (!row) return;
    const id = row.dataset.id;
    const workout = selectedWorkouts.find(w => w.id === id);

    if (e.target.classList.contains("remove-workout-btn")) {
      removeWorkout(id);
      return;
    }

    if (e.target.classList.contains("howto-btn")) {
      if (workout) {
        handleHowToClick(workout);
      }
      return;
    }
  });

  workoutBarContent.addEventListener("input", (e) => {
    const row = e.target.closest(".workout-row");
    if (!row) return;
    const id = row.dataset.id;
    const workout = selectedWorkouts.find(w => w.id === id);
    if (!workout) return;

    if (e.target.classList.contains("workout-sets")) {
      const val = parseInt(e.target.value, 10);
      workout.sets = isNaN(val) || val < 1 ? 1 : val;
      e.target.value = workout.sets;
      persistState();
    }

    if (e.target.classList.contains("workout-reps")) {
      const val = parseInt(e.target.value, 10);
      workout.reps = isNaN(val) || val < 1 ? 1 : val;
      e.target.value = workout.reps;
      persistState();
    }
  });
}

// Button at bottom that copies the full URL (with encoded workout) to clipboard.
if (copyShareBtn) {
  copyShareBtn.addEventListener("click", async () => {
    if (!selectedWorkouts.length) {
      alert("No workouts selected to share.");
      return;
    }

    const shareUrl = window.location.href;

    try {
      await navigator.clipboard.writeText(shareUrl);
      if (shareConfirmMsg) {
        shareConfirmMsg.classList.remove("hidden");
        setTimeout(() => {
          shareConfirmMsg.classList.add("hidden");
        }, 1600);
      }
    } catch (err) {
      console.error("Failed to copy workout link:", err);
      alert("Could not copy the link. Please copy it manually from the address bar.");
    }
  });
}

// How-To modal close behavior.
if (howtoModalClose) {
  howtoModalClose.addEventListener("click", closeHowToModal);
}
if (howtoModal) {
  howtoModal.addEventListener("click", (e) => {
    // Clicking the dark backdrop closes it.
    if (e.target === howtoModal) {
      closeHowToModal();
    }
  });
}

// Initialize workout form
export function initWorkoutForm() {
  // Initialize DOM elements
  workoutBar = document.getElementById("workout-bar");
  workoutBarToggle = document.getElementById("workout-bar-toggle");
  workoutBarBody = document.getElementById("workout-bar-body");
  workoutNameInput = document.getElementById("workout-name-input");
  workoutBarCount = document.getElementById("workout-bar-count");
  workoutBarChevron = document.querySelector(".workout-bar-chevron");
  workoutBarContent = document.getElementById("workout-bar-content");
  copyShareBtn = document.getElementById("copy-share-btn");
  shareConfirmMsg = document.getElementById("share-confirm");
  howtoModal = document.getElementById("howto-modal");
  howtoModalTitle = document.getElementById("howto-modal-title");
  howtoModalGif = document.getElementById("howto-modal-gif");
  howtoModalClose = document.getElementById("howto-modal-close");
  resultsContainer = document.getElementById("exercise-results");
  
  // Setup event listeners
  setupWorkoutBarListeners();
}

function setupWorkoutBarListeners() {
  // How-To modal close behavior
  if (howtoModalClose) {
    howtoModalClose.addEventListener("click", closeHowToModal);
  }
  if (howtoModal) {
    howtoModal.addEventListener("click", (e) => {
      if (e.target === howtoModal) {
        closeHowToModal();
      }
    });
  }
}

// Auto-initialize if not loaded as module
if (typeof document !== 'undefined' && !document.querySelector('script[type="module"]')) {
  document.addEventListener('DOMContentLoaded', initWorkoutForm);
}
