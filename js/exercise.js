const buttons = document.querySelectorAll("#muscle-groups-selector button");
const results = document.getElementById("exercise-results");

// helper delay (to avoid rate-limiting)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// cache to store previous requests
const cache = {};

// official muscle identifiers grouped
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

// keep track of shown groups
const loadedGroups = new Set();

buttons.forEach((button) => {
  button.addEventListener("click", async () => {
    const group = button.dataset.group;
    const muscles = muscleGroups[group];
    if (!muscles) return;

    // toggle styling
    button.classList.toggle("clicked");

    // remove section if deselected
    if (!button.classList.contains("clicked")) {
      loadedGroups.delete(group);
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
      const formatted = muscle.toLowerCase().trim().replace(/\s+/g, "%20");
      const url = `https://www.exercisedb.dev/api/v1/muscles/${formatted}/exercises`;

      if (cache[formatted]) {
        allExercises.push(...cache[formatted]);
        continue;
      }

      try {
        const res = await fetch(url);
        if (!res.ok) {
          failed.push({ muscle, status: res.status });
          continue;
        }

        const json = await res.json();
        const exercises = Array.isArray(json) ? json : json.data || [];
        cache[formatted] = exercises;
        if (exercises.length) allExercises.push(...exercises);
      } catch (err) {
        failed.push({ muscle, error: err.message });
      }

      await delay(300); // slow down requests slightly
    }

    // deduplicate by ID + equipment + name
    const key = (ex) => `${ex.id || ex.name}-${ex.equipment}`;
    const unique = Array.from(new Map(allExercises.map(ex => [key(ex), ex])).values());

    if (unique.length === 0) {
      groupSection.innerHTML = `<h2>${group}</h2><p>No exercises found.</p>`;
      console.warn("No results for group:", group, failed);
      return;
    }

    // build cards
    groupSection.innerHTML = `
      <h2>${group}</h2>
      <div class="exercise-group">
        ${unique.map((ex, index) => `
          <div class="exercise" data-index="${index}">
            <h3>${ex.name}</h3>
            ${ex.gifUrl ? `<img src="${ex.gifUrl}" alt="${ex.name}" width="150">` : ""}
            <p><strong>Muscle Group:</strong> ${group}</p>
            <p><strong>Target Muscle:</strong> ${ex.targetMuscle || "N/A"}</p>
            <p><strong>Secondary Muscles:</strong> ${(ex.secondaryMuscles && ex.secondaryMuscles.join(", ")) || "None"}</p>
            <p><strong>Equipment:</strong> ${ex.equipment || "N/A"}</p>
            <p><strong>Category:</strong> ${ex.category || "N/A"}</p>

            ${ex.instructions && ex.instructions.length ? `
              <button class="show-instructions">Show Instructions</button>
              <div class="instructions" style="display:none;">
                <ol>${ex.instructions.map(step => `<li>${step}</li>`).join("")}</ol>
              </div>
            ` : ""}
          </div>
        `).join("")}
      </div>
    `;

    // add show/hide toggle functionality
    groupSection.querySelectorAll(".show-instructions").forEach(btn => {
      btn.addEventListener("click", () => {
        const div = btn.nextElementSibling;
        const showing = div.style.display === "block";
        div.style.display = showing ? "none" : "block";
        btn.textContent = showing ? "Show Instructions" : "Hide Instructions";
      });
    });

    if (failed.length) console.warn("Some identifiers failed:", failed);
  });
});
