// This is my global stash for exercise data.
// - `cache` = responses I've already fetched by muscle so I don't spam the API.
// - `allExercises` = everything I've pulled, organized by the big muscle groups (Legs, Biceps, etc.).
const exerciseData = {
  cache: {},
  allExercises: {}
};

// Buttons for each major muscle group and the main results area.
const buttons = document.querySelectorAll("#muscle-groups-selector button");
const results = document.getElementById("exercise-results");

// If this ever logs, something is wrong with the HTML ID.
if (!results) {
  console.error("exercise-results element not found");
}

// Tiny helper so I can slow down the API calls a bit.
// (This is me trying to be nice to the API.)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// These are the labels I'm using in the UI mapped to actual muscle names
// that the ExerciseDB API understands. If I ever add new buttons, update here.
const muscleGroups = {
  Legs: [
    "quadriceps","quads","hamstrings","glutes","calves","soleus","shins",
    "inner thighs","groin","hip flexors","abductors","adductors"
  ],
  Biceps: ["biceps","brachialis"],
  Triceps: ["triceps"],
  Core: ["abs","abdominals","lower abs","obliques","core","serratus anterior","hip flexors"],
  Back: ["back","upper back","lower back","latissimus dorsi","lats","rhomboids","spine"],
  Chest: ["chest","upper chest","pectorals"],
  Shoulders: ["shoulders","deltoids","delts","rear deltoids","rotator cuff"],
  Traps: ["traps","trapezius","levator scapulae","sternocleidomastoid"]
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
  const url = `https://www.exercisedb.dev/api/v1/muscles/${formatted}/exercises`;

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

// Wiring up all of the top muscle group buttons.
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
    groupSection.innerHTML = `<h2>${group}</h2><p>Loading ${group} exercises…</p>`;
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
      groupSection.innerHTML = `<h2>${group}</h2><p>No exercises found.</p>`;
      return;
    }

    // Keeping around the cleaned-up list in case I want it later.
    exerciseData.allExercises[group] = unique;

    // Replace the "Loading..." message with the actual cards.
    groupSection.innerHTML = `
      <h2>${group}</h2>
      <div class="exercise-group">
        ${unique.map((ex, index) => createExerciseCard(ex, group, index)).join("")}
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
