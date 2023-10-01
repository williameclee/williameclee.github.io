// Accordion
// Modified after w3schools.com: https://www.w3schools.com/howto/howto_js_accordion.asp
var acc = document.getElementsByClassName("accordion");
var i;

for (i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
        // Toggle between adding and removing the "active" class, to highlight the button that controls the panel
        this.classList.toggle("accordion-active");

        // Toggle between hiding and showing the active panel
        var panel = this.nextElementSibling;
        if (panel.style.display === "block") {
        panel.style.display = "none";
        } else {
        panel.style.display = "block";
        }
    });
}

// if (window.innerWidth < 480) {
//   // Get the table element
//   var table = document.getElementById("cv-table");

//   // Loop through the rows
//   for (var i = 0; i < table.rows.length; i++) {
//       // Swap the cells of the current row
//       var temp = table.rows[i].cells[0].innerHTML;
//       table.rows[i].cells[0].innerHTML = table.rows[i].cells[1].innerHTML;
//       table.rows[i].cells[1].innerHTML = temp;
//   }
// }