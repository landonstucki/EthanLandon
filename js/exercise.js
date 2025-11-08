const buttons = document.querySelectorAll("#muscle-groups-selector button");

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("clicked");
    console.log("JS Loaded!");
  });
});
