// ====== "My Workout" bar + How-To modal logic ======

// Storing state locally so navigating away and back doesn't wipe the workout.
const LOCAL_STORAGE_KEY = "webfit-workout-state";

// Hooks into the fixed workout bar at the top.
const workoutBar = document.getElementById("workout-bar");
const workoutBarToggle = document.getElementById("workout-bar-toggle");
const workoutBarBody = document.getElementById("workout-bar-body");
const workoutNameInput = document.getElementById("workout-name-input");
const workoutBarCount = document.getElementById("workout-bar-count");
const workoutBarChevron = document.querySelector(".workout-bar-chevron");
const workoutBarContent = document.getElementById("workout-bar-content");
const copyShareBtn = document.getElementById("copy-share-btn");
const shareConfirmMsg = document.getElementById("share-confirm");

// This is the How-To modal that opens from inside the dropdown.
const howtoModal = document.getElementById("howto-modal");
const howtoModalTitle = document.getElementById("howto-modal-title");
const howtoModalGif = document.getElementById("howto-modal-gif");
const howtoModalClose = document.getElementById("howto-modal-close");

// All of the exercise cards live here in the main content.
const resultsContainer = document.getElementById("exercise-results");

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
 * Helper so I don't have to keep rewriting this.
 */
function getCurrentWorkoutTitle() {
  return (workoutNameInput?.value || "My Workout").trim();
}

/**
 * This builds the query string based on the current workout:
 * - workoutTitle
 * - w1Name, w1Sets, w1Reps, w1Group
 * - w2Name, ...
 * Future me: if I ever add more data, this is where I wire it into the URL.
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
    // I'm intentionally not putting gifUrl in the URL to keep it cleaner.
  });

  return params;
}

/**
 * Push whatever the current workout state is into the URL.
 * Important: this does NOT reload the page.
 */
function syncUrlToState() {
  const params = buildWorkoutParams();
  const query = params.toString();
  const newUrl = window.location.pathname + (query ? `?${query}` : "");
  history.replaceState(null, "", newUrl);
}

/**
 * Save the current workout to localStorage so that:
 * - going to Home and back
 * - closing/re-opening
 * still keeps everything.
 */
function saveWorkoutToLocalStorage() {
  // If for some reason localStorage isn't available, just skip.
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
 * Helper to keep both URL and localStorage up to date
 * whenever something changes.
 */
function persistState() {
  syncUrlToState();
  saveWorkoutToLocalStorage();
}

/**
 * Shows or hides the entire bar depending on whether I have anything selected.
 * Also resets the expanded/collapsed state when the list goes empty.
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
 * Renders the list of workout rows inside the dropdown.
 * Whenever I change selectedWorkouts (add/remove/edit), I call this.
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
  // Keep URL + localStorage in sync so back/refresh/share all work.
  persistState();
}

/**
 * Adds a new exercise into the custom workout (if it's not already there).
 * Default: 3 sets of 10 reps.
 * The gifUrl comes from the card so the How-To modal can show a demo.
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
 * Removes a workout row from the array and updates the UI.
 */
function removeWorkout(id) {
  selectedWorkouts = selectedWorkouts.filter(w => w.id !== id);
  renderWorkoutBar();
}

/**
 * Just flips between expanded/collapsed for the dropdown body.
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
 * Reads whatever is in the query string and tries to rebuild
 * the workout from that. This is what makes "back to this page"
 * and shared links work.
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
      gifUrl: "", // When coming straight from a URL, I don't have the gif yet.
      sets,
      reps
    });

    index++;
  }

  if (restored.length > 0) {
    selectedWorkouts = restored;
    renderWorkoutBar(); // This also updates localStorage.
  }
}

/**
 * Same idea as URL restore, but from localStorage.
 * This is for "I left and came back to the exercise page" without query params.
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
      // Just trust what I stored, but normalize a bit.
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
 * Decides how to initialize:
 * 1. If the URL already has workout params → use that.
 * 2. Otherwise, if localStorage has something → use that.
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
 * At this point, I expect workout.gifUrl to already be populated.
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
 * This is the "smart" How-To handler:
 * - If I already have a gifUrl, just show it.
 * - If I DON'T (for example, from a shared URL on a new device),
 *   then I use the muscle group + name to fetch exercises from the API
 *   and try to find the matching one to grab its gifUrl.
 *
 * NOTE: This uses `fetchExercisesByMuscle` from exercise.js
 * (which is loaded before this file).
 */
async function handleHowToClick(workout) {
  if (!workout) return;

  // If I already have a gif for this one, just open the modal.
  if (workout.gifUrl) {
    openHowToModal(workout);
    return;
  }

  // If I don't have a muscle group, there's no way to fetch the correct list.
  if (!workout.muscleGroup || typeof fetchExercisesByMuscle !== "function") {
    alert("I couldn't find a demo GIF for this exercise yet.");
    return;
  }

  try {
    // Grab all exercises for this muscle group.
    const exercises = await fetchExercisesByMuscle(workout.muscleGroup);
    const match = exercises.find(ex =>
      ex.name &&
      ex.name.toLowerCase() === workout.name.toLowerCase()
    );

    if (match && match.gifUrl) {
      // Update in-memory workout and persist so the next time it's instant.
      workout.gifUrl = match.gifUrl;

      // Also update the same object inside selectedWorkouts.
      const idx = selectedWorkouts.findIndex(w => w.id === workout.id);
      if (idx !== -1) {
        selectedWorkouts[idx].gifUrl = match.gifUrl;
      }

      saveWorkoutToLocalStorage(); // No need to rewrite URL just for the gif.
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
 * Closes the How-To modal and clears the image source so it stops loading.
 */
function closeHowToModal() {
  if (!howtoModal) return;
  howtoModal.classList.add("hidden");
  if (howtoModalGif) {
    howtoModalGif.src = "";
  }
}

// === Kick things off by checking URL/localStorage ===
initWorkoutState();

// === Event listeners ===

// If I click an "Add Workout" button on any exercise card,
// grab its data attributes and push that into the workout bar.
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

// Clicking the header toggles the dropdown, unless I'm actually editing the name.
if (workoutBarToggle) {
  workoutBarToggle.addEventListener("click", (e) => {
    if (!selectedWorkouts.length) return;
    if (e.target === workoutNameInput) return;
    toggleWorkoutBarExpansion();
  });
}

// Make sure clicks inside the name input don't accidentally toggle the dropdown.
if (workoutNameInput) {
  workoutNameInput.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Anytime I rename the workout, push that straight into URL + localStorage.
  workoutNameInput.addEventListener("input", () => {
    persistState();
  });
}

// Inside the dropdown: Remove buttons, How-To buttons, and sets/reps inputs.
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
        // Let the smart handler deal with gif fetching and modal.
        handleHowToClick(workout);
      }
      return;
    }
  });

  // When sets or reps change, update that in the object and resync state.
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

// Button that copies the fully-encoded URL so I (or friends) can reuse the workout.
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
