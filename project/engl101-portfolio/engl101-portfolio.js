var plate = document.getElementsByClassName("plate-title_button");

var plate_counter;
for (plate_counter = 0; plate_counter < plate.length; plate_counter++) {
	plate[plate_counter].addEventListener("click", function () {
		var plate_tiems = this.parentElement.parentElement.nextElementSibling;
		this.classList.toggle("plate-title_button-actived");
		if (plate_tiems.style.display === "grid") {
				plate_tiems.style.display = "none";
			} else {
				plate_tiems.style.display = "grid";
			}
	});
}

var modal_image = document.getElementsByClassName("plate-item_image-container");

var modal_image_counter;
for (
	modal_image_counter = 0;
	modal_image_counter < modal_image.length;
	modal_image_counter++
) {
	modal_image[modal_image_counter].addEventListener("click", function () {
		var modal = this.nextElementSibling;
		modal.style.display = "block";
	});
}

var modal_close = document.getElementsByClassName("plate-item_modal-close");

var modal_close_counter;
for (
	modal_close_counter = 0;
	modal_close_counter < modal_close.length;
	modal_close_counter++
) {
	modal_close[modal_close_counter].addEventListener("click", function () {
		this.parentElement.style.display = "none";
	});
}

var modal_container = document.getElementsByClassName("plate-item_modal");

var modal_container_counter;
for (
	modal_container_counter = 0;
	modal_container_counter < modal_container.length;
	modal_container_counter++
) {
	modal_container[modal_container_counter].addEventListener("click", function () {
		this.style.display = "none";
	});
}

var modal_self = document.getElementsByClassName("container plate-item_modal-container");

var modal_self_counter;
for (
	modal_self_counter = 0;
	modal_self_counter < modal_self.length;
	modal_self_counter++
) {
	modal_self[modal_self_counter].addEventListener("click", function (event) {
		event.stopPropagation();
	});
}

var plate = document.getElementsByClassName("plate");
var plate_image = document.getElementsByClassName("plate-image_container");
var plate_title = document.getElementsByClassName("plate-title");

var plate_counter;
for (
	plate_counter = 0;
	plate_counter < plate.length;
	plate_counter++
) {
	if (plate_counter % 2 == 0) {
		plate_image[plate_counter].id = "plate-left";
		plate_title[plate_counter].id = "plate-right";
	}
	else {
		plate_image[plate_counter].id = "plate-right";
		plate_title[plate_counter].id = "plate-left";
	}
}

// function inputMarkdown(filePath) {
// 	// Create a zero-md element
// 	const zeroMdElement = document.createElement("zero-md");
// 	zeroMdElement.setAttribute("src", filePath);
// 	zeroMdElement.setAttribute("no-shadow", "");

// 	// Create a template element
// 	const templateElement = document.createElement("template");

// 	// Create a link element for the stylesheet
// 	const linkElement = document.createElement("link");
// 	linkElement.setAttribute("rel", "stylesheet");
// 	linkElement.setAttribute("href", "/webpage_supplements/style.css");

// 	// Create a style element
// 	const styleElement = document.createElement("style");

// 	// Append the link and style elements to the template
// 	templateElement.appendChild(linkElement);
// 	templateElement.appendChild(styleElement);

// 	// Append the template to the zero-md element
// 	zeroMdElement.appendChild(templateElement);

// 	// Append the zero-md element to the desired location in your document
// 	// For example, if you want to append it to a div with an id "markdown-container"
// 	const markdownContainer = document.getElementById("markdown-container");
// 	markdownContainer.appendChild(zeroMdElement);
// }