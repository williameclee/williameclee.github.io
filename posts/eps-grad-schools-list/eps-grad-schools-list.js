// Fetch JSON data from an external file
fetch('eps-grad-schools-list/eps-grad-schools-list.json')
	.then(response => response.json())
	.then(programmes => {
		const tableBody = document.querySelector('#jsonTable tbody');
		const tagChecklist = document.getElementById('tagChecklist');
		let allTags = new Set();  // To hold unique tags

		// Function to populate the table
		function populateTable(filteredProgrammes) {
			tableBody.innerHTML = ''; // Clear previous rows

			for (const institution in filteredProgrammes) {
				const row = document.createElement('tr');

				// Create University cell
				const universityCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('UNIVERSITY')) {
					if (Array.isArray(filteredProgrammes[institution].UNIVERSITY)) {
						const universitiesList = document.createElement('ul');
						universitiesList.classList.add('universities-list');
						filteredProgrammes[institution].UNIVERSITY.forEach(item => {
							const listItem = document.createElement('li');
							const listItemLink = document.createElement('a');
							listItemLink.textContent = item.NAME;
							if (item.hasOwnProperty('LINK')) {
								listItemLink.href = item.LINK;
							}
							listItem.appendChild(listItemLink);
							universitiesList.appendChild(listItem);
						});
						universityCell.appendChild(universitiesList);
					} else {
						universityCell.textContent = filteredProgrammes[institution].UNIVERSITY;
					}
				}
				row.appendChild(universityCell);

				// Create Department cell with link
				const departmentCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('DEPARTMENT')) {
					if (Array.isArray(filteredProgrammes[institution].DEPARTMENT)) {
						const departmentsList = document.createElement('ul');
						departmentsList.classList.add('universities-list');
						filteredProgrammes[institution].DEPARTMENT.forEach(item => {
							const listItem = document.createElement('li');
							const listItemLink = document.createElement('a');
							listItemLink.textContent = item.NAME;
							if (item.hasOwnProperty('LINK')) {
								listItemLink.href = item.LINK;
							}
							listItem.appendChild(listItemLink);
							departmentsList.appendChild(listItem);
						});
						departmentCell.appendChild(departmentsList);
					} else {
						if (filteredProgrammes[institution].DEPARTMENT.hasOwnProperty('LINK')) {
							const departmentLink = document.createElement('a');
							departmentLink.href = filteredProgrammes[institution].DEPARTMENT.LINK;
							departmentLink.textContent = filteredProgrammes[institution].DEPARTMENT.NAME;
							departmentCell.appendChild(departmentLink);
						} else {
							const departmentLink = document.createElement('div');
							departmentLink.textContent = filteredProgrammes[institution].DEPARTMENT.NAME;
							departmentCell.appendChild(departmentLink);
						}
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
				const programmeLink = document.createElement('a');
				if (filteredProgrammes[institution].hasOwnProperty('PROGRAMME')) {
					programmeLink.textContent = filteredProgrammes[institution].PROGRAMME.NAME;
					if (filteredProgrammes[institution].PROGRAMME.hasOwnProperty('LINK')) {
						programmeLink.href = filteredProgrammes[institution].PROGRAMME.LINK;
					}
					programmeCell.appendChild(programmeLink);
				}
				programmeCell.appendChild(programmeLink);
				row.appendChild(programmeCell);

				// Create concentration cell with link
				const concentrationCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('CONCENTRATION')) {
					if (Array.isArray(filteredProgrammes[institution].CONCENTRATION)) {
						const concentrationsList = document.createElement('ul');
						concentrationsList.classList.add('concentrations-list');
						filteredProgrammes[institution].CONCENTRATION.forEach(concentration => {
							const listItem = document.createElement('li');
							if (concentration.hasOwnProperty('LINK')) {
								const listItemLink = document.createElement('a');
								listItemLink.textContent = concentration.NAME;
								listItemLink.href = concentration.LINK;
								listItem.appendChild(listItemLink);
							} else {
								const listItemLink = document.createElement('div');
								listItemLink.textContent = concentration.NAME;
								listItem.appendChild(listItemLink);
							}
							concentrationsList.appendChild(listItem);
						});
						concentrationCell.appendChild(concentrationsList);
					} else {
						if (filteredProgrammes[institution].CONCENTRATION.hasOwnProperty('LINK')) {
							const concentrationLink = document.createElement('a');
							concentrationLink.href = filteredProgrammes[institution].CONCENTRATION.LINK;
							concentrationLink.textContent = filteredProgrammes[institution].CONCENTRATION.NAME;
							concentrationCell.appendChild(concentrationLink);
						} else {
							const concentrationLink = document.createElement('div');
							concentrationLink.textContent = filteredProgrammes[institution].CONCENTRATION.NAME;
							concentrationCell.appendChild(concentrationLink);
						}
					}
				}
				row.appendChild(concentrationCell);

				// Create Programme cell with link
				const fundingCell = document.createElement('td');
				const fundingLink = document.createElement('a');
				if (filteredProgrammes[institution].hasOwnProperty('FUNDING')) {
					fundingLink.textContent = filteredProgrammes[institution].FUNDING.LENGTH;
					if (filteredProgrammes[institution].FUNDING.hasOwnProperty('LINK')) {
						fundingLink.href = filteredProgrammes[institution].FUNDING.LINK;
					}
					fundingCell.appendChild(fundingLink);
				}
				row.appendChild(fundingCell);

				// Create GRE cell with link
				const greCell = document.createElement('td');
				const greLink = document.createElement('a');
				if (filteredProgrammes[institution].hasOwnProperty('REQUIREMENTS') &&
					filteredProgrammes[institution].REQUIREMENTS.hasOwnProperty('GRE')) {
					greLink.textContent = filteredProgrammes[institution].REQUIREMENTS.GRE.STATUS;
					if (filteredProgrammes[institution].REQUIREMENTS.GRE.hasOwnProperty('LINK')) {
						greLink.href = filteredProgrammes[institution].REQUIREMENTS.GRE.LINK;
					}
					greCell.appendChild(greLink);
				}
				row.appendChild(greCell);

				// Create letter of recommendation cell with link
				const lorCell = document.createElement('td');
				const lorLink = document.createElement('a');
				if (filteredProgrammes[institution].hasOwnProperty('REQUIREMENTS') &&
					filteredProgrammes[institution].REQUIREMENTS.hasOwnProperty('LETTERS_OF_RECOMMENDATION')) {
					lorLink.textContent = filteredProgrammes[institution].REQUIREMENTS.LETTERS_OF_RECOMMENDATION.NUMBER;
					if (filteredProgrammes[institution].REQUIREMENTS.LETTERS_OF_RECOMMENDATION.hasOwnProperty('LINK')) {
						lorLink.href = filteredProgrammes[institution].REQUIREMENTS.LETTERS_OF_RECOMMENDATION.LINK;
					}
					lorCell.appendChild(lorLink);
				}
				row.appendChild(lorCell);

				// Create Materials Required cell
				const materialsCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('REQUIREMENTS') &&
					filteredProgrammes[institution].REQUIREMENTS.hasOwnProperty('MATERIALS')) {
					const materialsList = document.createElement('ul');
					materialsList.classList.add('materials-list');

					// Extract materials from the "REQUIREMENTS"
					filteredProgrammes[institution].REQUIREMENTS.MATERIALS.forEach(material => {
						const listItem = document.createElement('li');
						if (material.LINK) {
							const materialLink = document.createElement('a');
							materialLink.href = material.LINK;
							materialLink.textContent = material.DOCUMENT;
							listItem.appendChild(materialLink);
						} else {
							listItem.textContent = material.DOCUMENT;
						}
						materialsList.appendChild(listItem);
					});
					materialsCell.appendChild(materialsList);
				}
				row.appendChild(materialsCell);

				// Create resources cell
				const resourcessCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('APPLICATION_RESOURCES')) {
					const resourcessList = document.createElement('ul');
					resourcessList.classList.add('resources-list');

					// Extract materials from the "REQUIREMENTS"
					filteredProgrammes[institution].APPLICATION_RESOURCES.forEach(material => {
						const listItem = document.createElement('li');
						if (material.LINK) {
							const materialLink = document.createElement('a');
							materialLink.href = material.LINK;
							materialLink.textContent = material.NAME;
							listItem.appendChild(materialLink);
						} else {
							listItem.textContent = material.NAME;
						}
						resourcessList.appendChild(listItem);
					});
					resourcessCell.appendChild(resourcessList);
				}
				row.appendChild(resourcessCell);

				// Create degree type cell
				const acceptanceRateCell = document.createElement('td');
				if (filteredProgrammes[institution].hasOwnProperty('ACCEPTANCE_RATE')) {
					if (filteredProgrammes[institution].ACCEPTANCE_RATE.hasOwnProperty('LINK')) {
						const acceptanceRateLink = document.createElement('a');
						acceptanceRateLink.href = filteredProgrammes[institution].ACCEPTANCE_RATE.LINK;
						acceptanceRateLink.textContent = filteredProgrammes[institution].ACCEPTANCE_RATE.VALUE;
						acceptanceRateCell.appendChild(acceptanceRateLink);
					} else {
						acceptanceRateCell.textContent = filteredProgrammes[institution].ACCEPTANCE_RATE;
					}
				}
				row.appendChild(acceptanceRateCell);

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
		const greTagsContainer = document.createElement('div');
		const locationTagsContainer = document.createElement('div');
		const otherTagsContainer = document.createElement('div');
		subjectTagsContainer.classList.add('tag-container');
		subjectTagsContainer.id = 'subject-tags-container';
		greTagsContainer.classList.add('tag-container');
		locationTagsContainer.classList.add('tag-container');
		otherTagsContainer.classList.add('tag-container');
		subjectTagsContainer.innerHTML = '<h3>Subjects</h3>';
		greTagsContainer.innerHTML = '<h3>GRE</h3>';
		locationTagsContainer.innerHTML = '<h3>Location</h3>';
		otherTagsContainer.innerHTML = '<h3>Other Tags</h3>';

		// Populate the tag checklist with sorted tags and split into two groups
		sortedTags.forEach(tag => {
			const checkboxLabel = document.createElement('label');
			checkboxLabel.classList.add('tag-checkbox');

			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.value = tag;
			checkbox.checked = true;

			checkbox.addEventListener('change', filterTableByTags);

			// Check if the tag starts with 'subject/' and modify the displayed text accordingly
			let displayText;
			if (tag.startsWith('subject/')) {
				displayText = tag.replace('subject/', '');  // Remove 'subject/'
				displayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);  // Capitalize the first letter
				subjectTagsContainer.appendChild(checkboxLabel);
			} else if (tag.startsWith('GRE/')) {
				displayText = tag.replace(/^GRE\/\d+-/, '');  // Remove 'GRE/' and number
				displayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);  // Capitalize the first letter
				greTagsContainer.appendChild(checkboxLabel);
			} else if (tag.startsWith('location/')) {
				displayText = tag.replace('location/', '');  // Remove 'location/'
				displayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);  // Capitalize the first letter
				locationTagsContainer.appendChild(checkboxLabel);
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
		tagChecklist.appendChild(otherTagsContainer);

		// Function to filter the table based on selected tags from both subject and other tags
		function filterTableByTags() {
			// Get selected subject tags and other tags
			const selectedSubjectTags = [
				...subjectTagsContainer.querySelectorAll('input[type=checkbox]:checked')
			].map(cb => cb.value);

			const selectedGreTags = [
				...greTagsContainer.querySelectorAll('input[type=checkbox]:checked')
			].map(cb => cb.value);

			const selectedLocationTags = [
				...locationTagsContainer.querySelectorAll('input[type=checkbox]:checked')
			].map(cb => cb.value);

			const selectedOtherTags = [
				...otherTagsContainer.querySelectorAll('input[type=checkbox]:checked')
			].map(cb => cb.value);

			if (selectedSubjectTags.length === 0 &&
				selectedGreTags.length === 0 &&
				selectedLocationTags.length === 0 &&
				selectedOtherTags.length === 0) {
				// If no tag is selected in either category, display all rows
				populateTable(programmes);
			} else {
				// Filter the data
				const filteredData = {};
				for (const institution in programmes) {
					const institutionTags = programmes[institution].TAGS;

					// Check if the institution has any of the selected subject tags
					const hasSubjectTag =
						selectedSubjectTags.length === 0 ||
						selectedSubjectTags.some(tag => institutionTags.includes(tag));

					// Check if the institution has any of the selected GRE tags
					const hasGreTag =
						selectedGreTags.length === 0 ||
						selectedGreTags.some(tag => institutionTags.includes(tag));

					// Check if the institution has any of the selected location tags
					const hasLocationTag =
						selectedLocationTags.length === 0 ||
						selectedLocationTags.some(tag => institutionTags.includes(tag));

					// Check if the institution has any of the selected other tags
					const hasOtherTag =
						selectedOtherTags.length === 0 ||
						selectedOtherTags.some(tag => institutionTags.includes(tag));

					// Add the institution to the filtered data if it matches any subject tags AND any other tags
					if (hasSubjectTag && hasGreTag && hasLocationTag && hasOtherTag) {
						filteredData[institution] = programmes[institution];
					}
				}
				populateTable(filteredData);
			}
		}
	})
	.catch(error => {
		console.error('Error loading JSON:', error);
	});