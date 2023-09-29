// Include HTML
// Modified after w3schools.com: https://www.w3schools.com/howto/howto_html_include.asp
function includeHTML() {
    var z, i, elmnt, file, xhttp;
    // loop through a collection of all HTML elements:
    z = document.getElementsByTagName("*");
    for (i = 0; i < z.length; i++) {
      elmnt = z[i];
    // search for elements with a certain attribute:
      file = elmnt.getAttribute("include-html");
      if (file) {
        // make an HTTP request using the attribute value as the file name:
        xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
          if (this.readyState == 4) {
            if (this.status == 200) {elmnt.innerHTML = this.responseText;}
            if (this.status == 404) {elmnt.innerHTML = "Page not found.";}
            // remove the attribute, and call this function once more:
            elmnt.removeAttribute("include-html");
            includeHTML();
          }
        }      
        xhttp.open("GET", file, true);
        xhttp.send();
        // exit the function:
        return;
      }
    }
};

// Accordion
// Modified after w3schools.com: https://www.w3schools.com/howto/howto_js_accordion.asp
var acc = document.getElementsByClassName("accordion");
var i;

for (i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
        // Toggle between adding and removing the "active" class, to highlight the button that controls the panel
        this.classList.toggle("accordion-disactive");

        // Toggle between hiding and showing the active panel
        var panel = this.nextElementSibling;
        if (panel.style.display === "none") {
        panel.style.display = "block";
        } else {
        panel.style.display = "none";
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