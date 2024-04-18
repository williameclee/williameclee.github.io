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
    figures_container_side[figures_container_side_counter].classList.add(
      "figures-container-side-left"
    );
    figures_container_side[figures_container_side_counter].classList.remove(
      "figures-container-side-right"
    );
  } else {
    figures_container_side[figures_container_side_counter].classList.add(
      "figures-container-side-right"
    );
    figures_container_side[figures_container_side_counter].classList.remove(
      "figures-container-side-left"
    );
  }
}
