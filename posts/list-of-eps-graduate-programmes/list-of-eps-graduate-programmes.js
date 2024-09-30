// Fetch JSON data from an external file
fetch('list-of-eps-graduate-programmes/list-of-eps-graduate-programmes.json')
	.then(response => response.json())
	.then(programmes => {
		const tableBody = document.querySelector('#jsonTable tbody');
		const tagChecklist = document.getElementById('tagChecklist');
		let allTags = new Set();  // To hold unique tags

		// Function to populate the table
		function populateTable(filteredProgrammes) {
			function addContentToCell(cell, content, textField = 'NAME') {
				if (content.hasOwnProperty('LINK')) {
					const cellLink = document.createElement('a');
					cellLink.href = content.LINK;
					cellLink.textContent = content[textField];
					cell.appendChild(cellLink);
				} else if (content.hasOwnProperty(textField)) {
					cell.textContent = content[textField];
				} else {
					cell.textContent = content;
				}
			}
			function addArrayToList(cell, contentArray, textField = 'NAME', className = null) {
				const list = document.createElement('ul');
				if (className) {
					list.classList.add(className);
				}
				contentArray.forEach(arrayItem => {
					const listItem = document.createElement('li');
					addContentToCell(listItem, arrayItem, textField);
					list.appendChild(listItem);
				});
				cell.appendChild(list);
			}
			tableBody.innerHTML = ''; // Clear previous rows

			for (const institution in filteredProgrammes) {
				const row = document.createElement('tr');

				// Create University cell
				const universityCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('UNIVERSITY')) {
					if (Array.isArray(filteredProgrammes[institution].UNIVERSITY)) {
						addArrayToList(universityCell, filteredProgrammes[institution].UNIVERSITY, 'NAME', 'universities-list');
					} else {
						addContentToCell(universityCell, filteredProgrammes[institution].UNIVERSITY);
					}
				}
				row.appendChild(universityCell);

				// Create Department cell with link
				const departmentCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('DEPARTMENT')) {
					if (Array.isArray(filteredProgrammes[institution].DEPARTMENT)) {
						addArrayToList(departmentCell, filteredProgrammes[institution].DEPARTMENT, 'NAME', 'departments-list');
					} else {
						addContentToCell(departmentCell, filteredProgrammes[institution].DEPARTMENT);
					}
				}
				row.appendChild(departmentCell);

				// Create degree type cell
				const degreeTypeCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('TYPE')) {
					degreeTypeCell.textContent = filteredProgrammes[institution].TYPE;
				}
				row.appendChild(degreeTypeCell);

				// Create Programme cell with link
				const programmeCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('PROGRAMME')) {
					addContentToCell(programmeCell, filteredProgrammes[institution].PROGRAMME);
				}
				row.appendChild(programmeCell);

				// Create concentration cell with link
				const concentrationCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('CONCENTRATION')) {
					if (Array.isArray(filteredProgrammes[institution].CONCENTRATION)) {
						addArrayToList(concentrationCell, filteredProgrammes[institution].CONCENTRATION, 'NAME', 'concentrations-list');
					} else {
						addContentToCell(concentrationCell, filteredProgrammes[institution].CONCENTRATION);
					}
				}
				row.appendChild(concentrationCell);

				// Create funding cell with link
				const fundingCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('FUNDING')) {
					addContentToCell(fundingCell, filteredProgrammes[institution].FUNDING, 'LENGTH');
				}
				row.appendChild(fundingCell);

				// Create GRE cell with link
				const greCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('REQUIREMENTS') &&
					filteredProgrammes[institution].REQUIREMENTS.hasOwnProperty('GRE')) {
					addContentToCell(greCell, filteredProgrammes[institution].REQUIREMENTS.GRE, 'STATUS');
					if (filteredProgrammes[institution].REQUIREMENTS.GRE.hasOwnProperty('SUBJECTS')) {
						const greSubjects = document.createElement('div');
						greSubjects.classList.add('gre-subjects');
						greSubjects.textContent = filteredProgrammes[institution].REQUIREMENTS.GRE.SUBJECTS.join(', ');
						greCell.appendChild(greSubjects);
					}
				}
				row.appendChild(greCell);

				// Create letter of recommendation cell with link
				const lorCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('REQUIREMENTS') &&
					filteredProgrammes[institution].REQUIREMENTS.hasOwnProperty('LETTERS_OF_RECOMMENDATION')) {
					addContentToCell(lorCell, filteredProgrammes[institution].REQUIREMENTS.LETTERS_OF_RECOMMENDATION, 'NUMBER');
				}
				row.appendChild(lorCell);

				// Create Materials Required cell
				const materialsCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('REQUIREMENTS') &&
					filteredProgrammes[institution].REQUIREMENTS.hasOwnProperty('MATERIALS')) {
					addArrayToList(materialsCell, filteredProgrammes[institution].REQUIREMENTS.MATERIALS, 'DOCUMENT', 'materials-list');
				}
				row.appendChild(materialsCell);

				// Create resources cell
				const resourcessCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('APPLICATION_RESOURCES')) {
					addArrayToList(resourcessCell, filteredProgrammes[institution].APPLICATION_RESOURCES, 'NAME', 'resources-list');
				}
				row.appendChild(resourcessCell);

				// Create acceptance rate type cell
				const acceptanceRateCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('ACCEPTANCE_RATE')) {
					addContentToCell(acceptanceRateCell, filteredProgrammes[institution].ACCEPTANCE_RATE, 'VALUE');
				}
				row.appendChild(acceptanceRateCell);

				// Create notes type cell
				const notesCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('NOTES')) {
					addContentToCell(notesCell, filteredProgrammes[institution].NOTES);
				}
				row.appendChild(notesCell);

				// Append the row to the table body
				tableBody.appendChild(row);
			}
		}

		// Initial population of the table with all data
		populateTable(programmes);

		// Collect all unique tags from the JSON data
		for (const institution in programmes) {
			if (programmes[institution].hasOwnProperty('TAGS')) {
				programmes[institution].TAGS.forEach(tag => allTags.add(tag));
			}
		}

		// Convert the Set of tags to an array and sort it alphabetically
		const sortedTags = Array.from(allTags).sort();

		// Create containers for subject tags and other tags
		const subjectTagsContainer = document.createElement('div');
		subjectTagsContainer.classList.add('tag-container');
		subjectTagsContainer.innerHTML = '<h3>Subjects</h3>';
		const greTagsContainer = document.createElement('div');
		greTagsContainer.classList.add('tag-container');
		greTagsContainer.innerHTML = '<h3>GRE</h3>';
		const locationTagsContainer = document.createElement('div');
		locationTagsContainer.classList.add('tag-container');
		locationTagsContainer.innerHTML = '<h3>Location</h3>';
		const degreeTypeTagsContainer = document.createElement('div');
		degreeTypeTagsContainer.classList.add('tag-container');
		degreeTypeTagsContainer.innerHTML = '<h3>Degree</h3>';
		const fundingTagsContainer = document.createElement('div');
		fundingTagsContainer.classList.add('tag-container');
		fundingTagsContainer.innerHTML = '<h3>Funding</h3>';
		const otherTagsContainer = document.createElement('div');
		otherTagsContainer.classList.add('tag-container');
		otherTagsContainer.innerHTML = '<h3>Other Tags</h3>';

		// Populate the tag checklist with sorted tags and split into two groups
		sortedTags.forEach(tag => {
			const checkboxLabel = document.createElement('label');
			checkboxLabel.classList.add('tag-checkbox');

			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.value = tag;
			// checkbox.checked = true;

			checkbox.addEventListener('change', filterTableByTags);

			// Check if the tag starts with 'subject/' and modify the displayed text accordingly
			let displayText;
			if (tag.startsWith('subject:')) {
				displayText = tag.replace('subject:', '');
				displayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);
				subjectTagsContainer.appendChild(checkboxLabel);
			} else if (tag.startsWith('GRE:')) {
				displayText = tag.replace(/GRE:\d+-/, '');  // Remove 'GRE:' and number
				displayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);
				greTagsContainer.appendChild(checkboxLabel);
			} else if (tag.startsWith('location:')) {
				displayText = tag.replace('location:', '');
				locationTagsContainer.appendChild(checkboxLabel);
			} else if (tag.startsWith('degree:')) {
				displayText = tag.replace('degree:', '');
				degreeTypeTagsContainer.appendChild(checkboxLabel);
			} else if (tag.startsWith('funding:')) {
				displayText = tag.replace('funding:', '');
				displayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);
				if (typeof displayText === 'number') {
					displayText = displayText + ' years';
				}
				fundingTagsContainer.appendChild(checkboxLabel);
			} else {
				displayText = tag;
				otherTagsContainer.appendChild(checkboxLabel);
			}

			// Create a checkmark span element
			const checkmark = document.createElement('span');
			checkmark.classList.add('checkmark');

			// Set the display text in the label
			checkboxLabel.appendChild(checkbox);
			checkboxLabel.appendChild(checkmark);
			checkboxLabel.appendChild(document.createTextNode(displayText));
		});

		// Append both containers to the tag checklist area
		tagChecklist.appendChild(subjectTagsContainer);
		tagChecklist.appendChild(greTagsContainer);
		tagChecklist.appendChild(locationTagsContainer);
		tagChecklist.appendChild(degreeTypeTagsContainer);
		tagChecklist.appendChild(fundingTagsContainer);
		if (otherTagsContainer.childElementCount > 1) { // Only append if there are child elements except the header
			tagChecklist.appendChild(otherTagsContainer);
		}

		// Function to filter the table based on selected tags from both subject and other tags
		function filterTableByTags() {
			// Get selected subject tags and other tags
			const nSubjectTags = subjectTagsContainer.querySelectorAll('input[type=checkbox]').length;
			const selectedSubjectTags = [
				...subjectTagsContainer.querySelectorAll('input[type=checkbox]:checked')
			].map(cb => cb.value);

			const nGreTags = greTagsContainer.querySelectorAll('input[type=checkbox]').length;
			const selectedGreTags = [
				...greTagsContainer.querySelectorAll('input[type=checkbox]:checked')
			].map(cb => cb.value);

			const nLocationTags = locationTagsContainer.querySelectorAll('input[type=checkbox]').length;
			const selectedLocationTags = [
				...locationTagsContainer.querySelectorAll('input[type=checkbox]:checked')
			].map(cb => cb.value);

			const nDegreeTypeTags = degreeTypeTagsContainer.querySelectorAll('input[type=checkbox]').length;
			const selectedDegreeTypeTags = [
				...degreeTypeTagsContainer.querySelectorAll('input[type=checkbox]:checked')
			].map(cb => cb.value);

			const nFundingTags = fundingTagsContainer.querySelectorAll('input[type=checkbox]').length;
			const selectedFundingTags = [
				...fundingTagsContainer.querySelectorAll('input[type=checkbox]:checked')
			].map(cb => cb.value);

			const nOtherTags = otherTagsContainer.querySelectorAll('input[type=checkbox]').length;
			const selectedOtherTags = [
				...otherTagsContainer.querySelectorAll('input[type=checkbox]:checked')
			].map(cb => cb.value);

			// Filter the data
			const filteredData = {};
			for (const institution in programmes) {
				const institutionTags = programmes[institution].TAGS;

				// Check if the institution has any of the selected subject tags
				const hasSubjectTag =
					selectedSubjectTags.length === 0 || selectedSubjectTags.length === nSubjectTags ||
					selectedSubjectTags.some(tag => institutionTags.includes(tag));

				// Check if the institution has any of the selected GRE tags
				const hasGreTag =
					selectedGreTags.length === 0 || selectedGreTags.length === nGreTags ||
					selectedGreTags.some(tag => institutionTags.includes(tag));

				// Check if the institution has any of the selected location tags
				const hasLocationTag =
					selectedLocationTags.length === 0 || selectedLocationTags.length === nLocationTags ||
					selectedLocationTags.some(tag => institutionTags.includes(tag));

				// Check if the institution has any of the selected degree type tags
				const hasDegreeTypeTag =
					selectedDegreeTypeTags.length === 0 || selectedDegreeTypeTags.length === nDegreeTypeTags ||
					selectedDegreeTypeTags.some(tag => institutionTags.includes(tag));

				// Check if the institution has any of the selected other tags
				const hasOtherTag =
					selectedOtherTags.length === 0 || selectedOtherTags.length === nOtherTags ||
					selectedOtherTags.some(tag => institutionTags.includes(tag));

				// Check if the institution has any of the selected funding tags
				const hasFundingTag =
					selectedFundingTags.length === 0 || selectedFundingTags.length === nFundingTags ||
					selectedFundingTags.some(tag => institutionTags.includes(tag));

				// Add the institution to the filtered data if it matches any subject tags AND any other tags
				if (hasSubjectTag && hasGreTag && hasLocationTag && hasDegreeTypeTag && hasFundingTag && hasOtherTag) {
					filteredData[institution] = programmes[institution];
				}
			}
			populateTable(filteredData);
			// Reapply the sorting after populating the table
			if (currentSortColumn !== -1) {
				sortTable(currentSortColumn, false);
			}
		}
	})
	.catch(error => {
		console.error('Error loading JSON:', error);
	});


// Sorting function
// Store the current sort column and direction
let currentSortColumn = -1;

function sortTable(columnIndex, doSwitch = true) {
	const table = document.getElementById("jsonTable");
	let rows = Array.from(table.rows).slice(2);  // Get all rows except header
	let isAsc = table.getAttribute("data-sort-asc") == "true";
	if (!doSwitch) {
		isAsc = !isAsc;
	}

	// Sort rows
	rows.sort((rowA, rowB) => {
		let cellA = rowA.cells[columnIndex].innerText.toLowerCase();
		let cellB = rowB.cells[columnIndex].innerText.toLowerCase();
		if (cellA < cellB) {
			return isAsc ? -1 : 1;
		}
		if (cellA > cellB) {
			return isAsc ? 1 : -1;
		}
		return 0;
	});

	// Append the sorted rows back to the table
	rows.forEach(row => table.querySelector('tbody').appendChild(row));

	// Toggle sort order for next click
	if (doSwitch) {
		table.setAttribute("data-sort-asc", !isAsc);
	}
	currentSortColumn = columnIndex;
}