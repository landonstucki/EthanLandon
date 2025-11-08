// Store fetched exercise data in this variable
const exerciseData = {
  cache: {},
  allExercises: {}
};

// Get DOM elements
const buttons = document.querySelectorAll("#muscle-groups-selector button");
const results = document.getElementById("exercise-results");

// Safety check - make sure elements exist
if (!results) {
  console.error("exercise-results element not found");
}

// Helper delay to avoid rate-limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Official muscle identifiers grouped by muscle group
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

// Keep track of shown groups
const loadedGroups = new Set();

// Fetch exercises from API and store in exerciseData
async function fetchExercisesByMuscle(muscleName) {
  const formatted = muscleName.toLowerCase().trim().replace(/\s+/g, "%20");
  const url = `https://www.exercisedb.dev/api/v1/muscles/${formatted}/exercises`;

  if (exerciseData.cache[formatted]) {
    return exerciseData.cache[formatted];
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    const exercises = json.success && json.data ? json.data : (Array.isArray(json) ? json : []);
    
    exerciseData.cache[formatted] = exercises;
    return exercises;
  } catch (err) {
    console.error(`Error fetching ${muscleName}:`, err);
    return [];
  }
}

// Template function to create exercise card HTML
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

  return `
    <div class="exercise" data-index="${index}">
      <h3>${exercise.name || "Unnamed Exercise"}</h3>
      ${exercise.gifUrl ? `<img src="${exercise.gifUrl}" alt="${exercise.name}" width="150">` : ""}
      <p><strong>Muscle Group:</strong> ${muscleGroup}</p>
      <p><strong>Target Muscle:</strong> ${targetMuscles}</p>
      <p><strong>Secondary Muscles:</strong> ${secondaryMuscles}</p>
      <p><strong>Equipment:</strong> ${equipment}</p>
      ${hasInstructions ? `
        <button class="show-instructions" data-exercise-id="${uniqueId}">Show Instructions</button>
        <div class="instructions" id="instructions-${uniqueId}" style="display:none;">
          <ol>${exercise.instructions.map(step => `<li>${step}</li>`).join("")}</ol>
        </div>
      ` : ""}
    </div>
  `;
}

buttons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!results) return; // Safety check
    
    const group = button.dataset.group;
    const muscles = muscleGroups[group];
    if (!muscles) return;

    // toggle styling
    button.classList.toggle("clicked");

    // remove section if deselected
    if (!button.classList.contains("clicked")) {
      loadedGroups.delete(group);
      delete exerciseData.allExercises[group];
      const section = document.getElementById(`section-${group}`);
      if (section) section.remove();
      return;
    }

    loadedGroups.add(group);

    // create section for this group
    const groupSection = document.createElement("div");
    groupSection.id = `section-${group}`;
    groupSection.innerHTML = `<h2>${group}</h2><p>Loading ${group} exercises…</p>`;
    results.appendChild(groupSection);

    const allExercises = [];
    const failed = [];

    // fetch all sub-muscles
    for (const muscle of muscles) {
      const exercises = await fetchExercisesByMuscle(muscle);
      if (exercises && exercises.length > 0) {
        allExercises.push(...exercises);
      }
      await delay(300); // slow down requests slightly
    }

    // deduplicate by exerciseId + equipment + name
    const key = (ex) => `${ex.exerciseId || ex.name}-${Array.isArray(ex.equipments) ? ex.equipments.join(',') : ex.equipments || 'none'}`;
    const unique = Array.from(new Map(allExercises.map(ex => [key(ex), ex])).values());

    if (unique.length === 0) {
      groupSection.innerHTML = `<h2>${group}</h2><p>No exercises found.</p>`;
      return;
    }

    // Store in exerciseData
    exerciseData.allExercises[group] = unique;

    // build cards using template
    groupSection.innerHTML = `
      <h2>${group}</h2>
      <div class="exercise-group">
        ${unique.map((ex, index) => createExerciseCard(ex, group, index)).join("")}
      </div>
    `;

    // add show/hide toggle functionality
    groupSection.querySelectorAll(".show-instructions").forEach(btn => {
      btn.addEventListener("click", () => {
        const exerciseId = btn.dataset.exerciseId;
        const instructionsDiv = document.getElementById(`instructions-${exerciseId}`);
        if (!instructionsDiv) return;
        
        const showing = instructionsDiv.style.display === "block";
        instructionsDiv.style.display = showing ? "none" : "block";
        btn.textContent = showing ? "Show Instructions" : "Hide Instructions";
      });
    });
  });
});
