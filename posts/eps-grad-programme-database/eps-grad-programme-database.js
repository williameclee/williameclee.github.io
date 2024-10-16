const GOOGLE_SHEETS_API_KEY = 'AIzaSyAjnpBczjYeDBgvT2IUyEqttFZnMU_Fakw';
const SHEET_ID = '1y2p4MsC5sJQUub6vhRMqRO-UoLRcco3IerRyQoqwVjM';
const SHEET_NAME = 'Programmes';
const SHEET_API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?key=${GOOGLE_SHEETS_API_KEY}&valueRenderOption=FORMULA`;
// const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${SHEET_NAME}`;

fetch(SHEET_API_URL)
  .then(response => response.json())
  .then(sheet => {
    // Construct the database
    const programmes = getProgrammes(sheet);
    console.log(programmes);

    // Create filters
    const filtersContainer = document.getElementById("filter-lists-container");
    const degreeTags = createFilter(filtersContainer, programmes, "degree", "filter", "Degree");
    const subjectTags = createFilter(filtersContainer, programmes, "subjects", "filter", "Subjects");
    const fundingTags = createFilter(filtersContainer, programmes, "funding", "filter", "Length of funding");
    const greTags = createFilter(filtersContainer, programmes, "gre", "filter", "GRE requirements");
    const locationTags = createFilter(filtersContainer, programmes, "location", "filter", "Location");

    // Display the database as table
    generateTable(programmes);
    refreshTable(programmes, [locationTags, subjectTags, degreeTags, fundingTags, greTags], ["location", "subjects", "degree", "funding", "gre"]);
  }).catch(error => {
    const container = document.getElementById("tableContainer");
    container.innerHTML = "<p>Failed to load the data. Please try again later.</p>";
    console.log(error);
  });

function createFilter(filtersContainer, programmes, field, cssclass = "filter", title = field) {
  let tags = new Set();
  for (const programme of programmes) {
    let tagsArray = programme[field];
    if (tagsArray || typeof tagsArray === "number") {
      if (!Array.isArray(tagsArray)) {
        tagsArray = [tagsArray];
      }
      tagsArray.forEach(tag => {
        if (tag.hasOwnProperty("content")) {
          tags.add(tag.content);
        } else {
          tags.add(tag)
        }
      });
    }
  }
  // Make sure the tags are sorted correctly even if they are numbers
  tags = Array.from(tags).sort((a, b) => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });
  const filterDiv = document.createElement("div");
  addCssClass(filterDiv, cssclass);
  filterDiv.innerHTML = `<h3>${title}</h3>`;

  const checkboxesDiv = document.createElement("div");
  addCssClass(checkboxesDiv, "checkboxes-container");
  tags.forEach(tag => {
    let displayTag = tag;
    if (field == "funding") {
      displayTag = formatFundingText(tag);
    } else if (field == "gre") {
      displayTag = formatGreText(tag);
    }
    const tagLabel = document.createElement("label");
    tagLabel.classList.add("filter-label");
    const tagLabelCheckbox = document.createElement("input");
    tagLabelCheckbox.type = "checkbox";
    tagLabelCheckbox.name = field;
    tagLabelCheckbox.value = tag;
    const tagLabelText = document.createElement("span");
    tagLabelText.classList.add("filter-label-text");
    tagLabelText.innerHTML = displayTag;
    tagLabel.appendChild(tagLabelCheckbox);
    tagLabel.appendChild(tagLabelText);
    checkboxesDiv.appendChild(tagLabel);
  });

  filterDiv.appendChild(checkboxesDiv);
  filtersContainer.appendChild(filterDiv);
  return tags;
}

function filterProgrammes(programmes, checkboxes, tags, fields) {
  const filteredProgrammes = programmes.filter(programme => {
    if (!Array.isArray(checkboxes)) {
      checkboxes = [checkboxes];
    }
    let filters = [];
    checkboxes.forEach((checkbox, index) => {
      filters[index] = Array.from(checkbox)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => {
          const value = checkbox.value;
          return isNaN(value) ? value : Number(value);
        });
      if (filters[index].length == 0) {
        filters[index] = tags[index];
      }
    });
    const matches = [];
    filters.forEach((filter, index) => {
      if (Array.isArray(programme[fields[index]])) {
        if (programme[fields[index]].hasOwnProperty("content")) {
          matches.push(filter.includes(programme[fields[index]].content));
        } else {
          matches.push(filter.some(tag => programme[fields[index]].includes(tag)));
        }
      } else {
        if (programme[fields[index]].hasOwnProperty("content")) {
          matches.push(filter.includes(programme[fields[index]].content));
        } else {
          matches.push(filter.includes(programme[fields[index]]));
        }
      }
    });
    return matches.every(match => match);
  });
  return filteredProgrammes;
}

function refreshTable(programmes, tags, names) {
  let checkboxesAll = [];
  names.forEach((name, index) => {
    checkboxesAll[index] = document.querySelectorAll(`input[name="${name}"]`);
  });
  checkboxesAll.forEach(checkboxes => {
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function () {
        let filteredProgrammes = filterProgrammes(programmes, checkboxesAll, tags, names);
        generateTable(filteredProgrammes);
      });
    });
  });
}

// Make the table
function generateTable(programmes) {
  // Display the database as table
  const container = document.getElementById("tableContainer");
  // Clear the container
  container.innerHTML = "";
  const table = document.createElement("table");
  table.classList.add("programmes-table");

  // Fill the table
  fillTableHeader(table);
  fillTableBody(table, programmes);
  container.appendChild(table);
}

function fillTableHeader(table) {
  function addHeaderCell(display, row, cssclass = "", rowspan = 1, colspan = 1, abbr = "", displayName = "", alignment = "L") {
    if (!Array.isArray(display)) {
      display = [display];
    }
    if (!Array.isArray(abbr)) {
      abbr = [abbr];
    }
    if (abbr[0] && display.length != abbr.length) {
      throw new Error("The display and rowspan values must have the same length.");
    }
    display.forEach((text, index) => {
      const headerCell = document.createElement("th");
      headerCell.rowSpan = rowspan;
      headerCell.colSpan = colspan;
      if (abbr[index]) {
        headerCell.innerHTML = `<abbr title="${abbr[index]}">${text}</abbr>`;
      } else if (displayName) {
        headerCell.innerHTML = displayName;
      } else {
        headerCell.innerHTML = text;
      }
      if (!cssclass[0]) {
        cssclass = display[index].toLowerCase() + "-cell";
        addCssClass(headerCell, cssclass);
        cssclass = "";
      } else {
        addCssClass(headerCell, cssclass);
      }
      if (alignment == "R") {
        headerCell.classList.add("cell-right");
      } else if (alignment == "C") {
        headerCell.classList.add("cell-centre");
      }
      row.appendChild(headerCell);
    });
  }
  const header = table.createTHead();
  header.classList.add("table-header");
  const headerMajorRow = header.insertRow();
  addHeaderCell("University", headerMajorRow, "", 2);
  addHeaderCell("Department", headerMajorRow, "", 2);
  addHeaderCell("Degree", headerMajorRow, "", 2);
  addHeaderCell("Programmes", headerMajorRow, "", 2, 1, "", "Programmes and concentrations");
  addHeaderCell("Funding", headerMajorRow, "", 2);
  addHeaderCell("GRE", headerMajorRow, "gre-cell", 1, 4);
  addHeaderCell("Fee", headerMajorRow, "fee-cell", 1, 2);
  addHeaderCell("Ref", headerMajorRow, "references-cell", 2, 1, "Letters of recommendation");
  addHeaderCell("Materials", headerMajorRow, "", 2);
  addHeaderCell("Resources", headerMajorRow, "", 2);
  addHeaderCell("Acceptance", headerMajorRow, "", 2);
  addHeaderCell("Notes", headerMajorRow, "", 2);
  const headerMinorRow = header.insertRow();
  addHeaderCell("G", headerMinorRow, "gre-cell", 1, 1, "General", "", "C");
  addHeaderCell("P", headerMinorRow, "gre-cell", 1, 1, "Physics", "", "C");
  addHeaderCell("M", headerMinorRow, "gre-cell", 1, 1, "Maths", "", "C");
  addHeaderCell("B", headerMinorRow, "gre-cell", 1, 1, "Biology", "", "C");
  addHeaderCell("Dom", headerMinorRow, "fee-cell", 1, 1, "Domestic");
  addHeaderCell("Intl", headerMinorRow, "fee-cell", 1, 1, "International");
  table.appendChild(header);
}

function fillTableBody(table, programmes) {
  function insertBodyCell(row, field, cssclass = "", alignment = "L", additionalList = false) {
    const cell = row.insertCell();
    if (!field) {
      return cell;
    }
    if (Array.isArray(field)) {
      field.forEach((tag) => {
        const fieldElement = document.createElement("span");
        fieldElement.classList.add("cell-subelement");
        if (typeof tag === 'object') {
          fieldElement.innerHTML = `<a href="${tag.url}" target="_blank" class="link-classic">${tag.content}</a>`;
        } else {
          fieldElement.innerHTML = tag;
        }
        cell.appendChild(fieldElement);
      });
    } else {
      if (typeof field === 'object') {
        cell.innerHTML = `<a href="${field.url}" target="_blank" class="link-classic">${field.content}</a>`;
        if (typeof field.content === 'number' || alignment == "R") {
          cell.classList.add("cell-right");
        }
      }
      else {
        cell.innerHTML = field;
        if (typeof field === 'number' || alignment == "R") {
          cell.classList.add("cell-right");
        }
      }
    }
    if (additionalList && additionalList.length > 0) {
      if (!Array.isArray(additionalList)) {
        additionalList = [additionalList];
      }
      let list = document.createElement("ul");
      list.classList.add("cell-list");
      additionalList.forEach((listObject) => {
        let listItem = document.createElement("li");
        if (listObject.hasOwnProperty("content")) {
          listItem.innerHTML = `<a href="${listObject.url}" target="_blank" class="link-classic">${listObject.content}</a>`;
        } else {
          listItem.innerHTML = listObject;
        }
        list.appendChild(listItem);
      });
      cell.appendChild(list);
    }
    if (alignment == "R") {
      cell.classList.add("cell-right");
    }
    if (alignment == "C") {
      cell.classList.add("cell-centre");
    }
    addCssClass(cell, cssclass);
    return cell;
  }
  const body = table.createTBody();
  programmes.forEach(programme => {
    const row = body.insertRow();
    insertBodyCell(row, programme.university, "university-cell");
    insertBodyCell(row, programme.department, "department-cell");
    insertBodyCell(row, programme.degree, "degree-cell");
    insertBodyCell(row, programme.programme, "programme-cell", "L", programme.concentration);
    // insertBodyCell(row, programme.concentration, "concentrations-cell");
    let fundingLength = 0;
    if (programme.funding && programme.funding.hasOwnProperty("content")) {
      fundingLength = programme.funding.content;
    } else {
      fundingLength = programme.funding;
    }
    let fundingText = formatFundingText(fundingLength, true);
    if (programme.funding && programme.funding.hasOwnProperty("content")) {
      insertBodyCell(row, { content: fundingText, url: programme.funding.url }, "funding-cell", "R");
    } else {
      insertBodyCell(row, fundingText, "funding-cell", "R");
    }

    function insertGreCell(row, greField, cssclass = "gre-cell", alignment = "C") {
      let greStatus = -1;
      if (greField && greField.hasOwnProperty("content")) {
        greStatus = greField.content;
      } else {
        greStatus = greField;
      }
      const greText = formatGreText(greStatus, true);
      if (greField && greField.hasOwnProperty("content")) {
        insertBodyCell(row, { content: greText, url: greField.url }, cssclass, alignment);
      } else {
        insertBodyCell(row, greText, cssclass, alignment);
      }
    }
    insertGreCell(row, programme.gre_general);
    insertGreCell(row, programme.gre_physics);
    insertGreCell(row, programme.gre_maths);
    insertGreCell(row, programme.gre_biology);
    insertBodyCell(row, programme.fee_domestic, "fee-cell");
    insertBodyCell(row, programme.fee_international, "fee-cell");
    insertBodyCell(row, programme.references, "ref-cell");
    insertBodyCell(row, programme.material, "materials-cell");
    insertBodyCell(row, programme.resource, "resources-cell");
    insertBodyCell(row, programme.acceptance, "acceptance-cell", "R");
    insertBodyCell(row, programme.notes, "notes-cell");
    table.appendChild(body);
  });
}

function addCssClass(element, cssclass) {
  if (cssclass) {
    if (Array.isArray(cssclass)) {
      cssclass.forEach((classname) => {
        element.classList.add(classname);
      });
    } else {
      element.classList.add(cssclass);
    }
  }
}

function formatFundingText(fundingLength, hideEmpty = false) {
  let fundingText = "";
  if (fundingLength == 9) {
    fundingText = "Full";
  } else if (fundingLength == 0 && typeof fundingLength === "number") {
    if (!hideEmpty) {
      fundingText = "Yes (length unknown)";
    } else {
      fundingText = "Yes";
    }
  } else if (fundingLength == -1) {
    fundingText = "No";
  } else if (fundingLength == -2) {
    if (!hideEmpty) {
      fundingText = "Unknown";
    } else {
      fundingText = "";
    }
  } else if (typeof fundingLength === "number") {
    fundingText = fundingLength + " years";
  }
  return fundingText;
}

function formatGreText(greStatus, hideEmpty = false) {
  let greText = "";
  if (typeof greStatus === "number" && greStatus == 0) {
    if (!hideEmpty) {
      greText = "Not accepted";
    } else {
      greText = "<abbr title='not accepted'>N</abbr>";
    }
  } else if (greStatus == 1) {
    if (!hideEmpty) {
      greText = "Optional/not required";
    } else {
      greText = "<abbr title='optional/not required'>O</abbr>";
    }
  } else if (greStatus == 2) {
    if (!hideEmpty) {
      greText = "Recommended";
    } else {
      greText = "<abbr title='recommended'>R</abbr>";
    }
  } else if (greStatus == 3) {
    if (!hideEmpty) {
      greText = "Required";
    } else {
      greText = "<abbr title='required'>Y</abbr>";
    }
  } else if (greStatus == -1) {
    if (!hideEmpty) {
      greText = "Unknown";
    } else {
      greText = "";
    }
  }
  return greText;
}

// Get the programmes from the Google Sheet
function getProgrammes(sheet) {
  sheet = sheet.values;

  const headerRow = sheet[0];
  const tableRows = sheet.slice(2);

  const programmes = {};
  tableRows.forEach(row => {
    const programme = {};
    // Compound fields
    programme["university"] = [];
    programme["department"] = [];
    programme["programme"] = [];
    programme["concentration"] = [];
    programme["material"] = [];
    programme["resource"] = [];

    row.forEach((element, index) => {
      // Format link if cell has HYPERLINK formula
      if (element && typeof element === 'string' && element.startsWith('=HYPERLINK')) {
        const hasLink = element.match(/HYPERLINK\("([^"]+)",\s*([^]+)\)/);
        if (hasLink) {
          const url = hasLink[1];
          let content = hasLink[2];
          // delete quote marks if text is a string
          if (typeof content === 'string' && content.startsWith('"') && content.endsWith('"')) {
            content = content.slice(1, -1);
          } else {
            content = parseFloat(content);
          }
          programme[headerRow[index]] = {};
          programme[headerRow[index]].content = content;
          programme[headerRow[index]].url = url;
        }
      } else {
        programme[headerRow[index]] = element;
      }
      element = programme[headerRow[index]];
      // Convert dates
      if (headerRow[index] == "verification_date" && element) {
        programme["verification_date"] = convertSerialToDate(element).toDateString();
      } else {
        programme["verification_date"] = "";
      }
      // // Shorten university names
      // if (headerRow[index].startsWith("university")) {
      //   if (programme[headerRow[index]].endsWith("University")) {
      //     programme[headerRow[index]] = programme[headerRow[index]].slice(0, -10);
      //   }
      //   if (programme[headerRow[index]].startsWith("University of California,")) {
      //     programme[headerRow[index]] = "UC " + programme[headerRow[index]].slice(26);
      //   }
      //   if (programme[headerRow[index]] == "California Institute of Technology") {
      //     programme[headerRow[index]] = "Caltech";
      //   }
      // }
      // Line break university names at comma
      if (headerRow[index].startsWith("university")) {
        programme[headerRow[index]] = element.split(", ").join(",<br>");
      }
      // Split subject tags
      if (headerRow[index] == "subjects") {
        programme["subjects"] = element.split("\n");
      }
      if (headerRow[index] == "location") {
        programme["location"] = element.split("\n");
      }
      // Join compound fields
      joinStructFields(programme, headerRow, programme[headerRow[index]], index, "university");
      joinStructFields(programme, headerRow, element, index, "department");
      joinStructFields(programme, headerRow, element, index, "programme");
      joinStructFields(programme, headerRow, element, index, "concentration");
      joinStructFields(programme, headerRow, element, index, "material");
      joinStructFields(programme, headerRow, element, index, "resource");
      // Max GRE requirements
      const greGeneral = getGreValue(programme.gre_general);
      const grePhysics = getGreValue(programme.gre_physics);
      const greMaths = getGreValue(programme.gre_maths);
      const greBiology = getGreValue(programme.gre_biology);
      const greScores = [greGeneral, grePhysics, greMaths, greBiology].filter(score => !isNaN(score));
      programme.gre = Math.max(Math.max(...greScores), -1);
    });
    programmes[programme["id"]] = programme;
  });
  return Object.values(programmes);
}

function getGreValue(field) {
  let gre = NaN;
  if (field || typeof field === "number") {
    if (field.hasOwnProperty("content")) {
      gre = field.content;
    } else {
      gre = field;
    }
  }
  return gre;
}

function joinStructFields(struct, headerRow, element, index, field) {
  if (headerRow[index].substring(0, field.length) == field) {
    if (element) {
      struct[field].push(element);
    }
    delete struct[headerRow[index]];
  }
}

function convertSerialToDate(serial) {
  // Google Sheets date system starts on December 30, 1899
  const baseDate = new Date(Date.UTC(1899, 11, 30));
  // Calculate the date by adding the serial number to the base date
  const daysInMillis = serial * 24 * 60 * 60 * 1000; // Convert days to milliseconds
  const date = new Date(baseDate.getTime() + daysInMillis);

  return date;
}

// Scrolling the table
const stickyContainer = document.getElementById("tableContainer");

window.addEventListener('scroll', () => {
  const containerTop = stickyContainer.getBoundingClientRect().top;

  if (containerTop <= 0) {
    stickyContainer.style.overflowY = 'scroll';
  } else {
    stickyContainer.style.overflowY = 'hidden';
  }
});