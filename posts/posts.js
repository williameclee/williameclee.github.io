var figures_container_side = document.getElementsByClassName(
  "figures-container-side"
);

var figures_container_side_counter;
for (
  figures_container_side_counter = 0;
  figures_container_side_counter < figures_container_side.length;
  figures_container_side_counter++
) {
  if (figures_container_side_counter % 2 == 0) {
    figures_container_side[figures_container_side_counter].style.float = "left";
  } else {
    figures_container_side[figures_container_side_counter].style.float =
      "right";
  }
}
