const cvDataPath = '/cv/cv.json';
const cvSection = 'education';


(async () => {
	const cvData = await fetchCVData(cvDataPath);
	const sectionIds = Object.keys(cvData);
	for (const sectionId of sectionIds) {
		populateCVSection(cvData[sectionId], sectionId);
	}
})();

async function fetchCVData(cvDataPath) {
	try {
		const response = await fetch(cvDataPath);
		const cvData = await response.json();
		console.log(`Successfully fetched CV data from ${cvDataPath}`);
		return cvData;
	} catch (error) {
		console.error(`Failed to fetch CV data from ${cvDataPath}:`, error);
		return null;
	}
}

async function populateCVSection(cvSectionItems, sectionId) {
	// Check if the section is marked as not displayed
	if (cvSectionItems.hasOwnProperty('display') && cvSectionItems.display === false) {
		console.log(`Skipping section ${sectionId} as it is marked as not displayed.`);
		return;
	}

	// Make sure the section has 'items' and 'title' properties
	if (!cvSectionItems.items) {
		console.log(`No items found for section ${sectionId}.`);
		return;
	}
	if (!cvSectionItems.title) {	
		console.log(`No title found for section ${sectionId}.`);
		return;
	}

	// Ensure items are an array and filter out those marked as not displayed
	cvSectionItems.items = cvSectionItems.items.filter(item => item.display !== false);
	if (cvSectionItems.items.length === 0) {
		console.log(`No items to display for section ${sectionId}.`);
		return;
	}

	const cvSectionContainer = document.getElementById(`cv-${sectionId}`);

	if (!cvSectionContainer) {
		console.log(`Failed to find CV section container with ID 'cv-${sectionId}'`);
		return;
	}

	// Title
	const cvSectionTitleContainer = document.createElement('td');
	cvSectionTitleContainer.className = 'cv-subsection';
	const cvSectionTitle = document.createElement('h3');
	cvSectionTitle.textContent = cvSectionItems.title;
	cvSectionTitleContainer.appendChild(cvSectionTitle);
	cvSectionContainer.appendChild(cvSectionTitleContainer);

	// Content
	const cvSectionContentContainer = document.createElement('td');
	cvSectionContentContainer.className = 'cv-items';
	for (const item of cvSectionItems.items) {
		if (item.display === false) {
			continue;
		}

		const cvItemContainer = document.createElement('div');
		cvItemContainer.className = 'cv-item';
		// Date
		const timeName = cvSectionItems.timeName || 'date';
		if (item.hasOwnProperty(timeName)) {
			const cvItemDate = document.createElement('div');
			cvItemDate.className = 'cv-time';
			if (Array.isArray(item[timeName])) {
				cvItemDate.innerHTML = item[timeName].join(' - ');
			} else {
				cvItemDate.innerHTML = item[timeName];
			}
			cvItemContainer.appendChild(cvItemDate);
		}
		// Role/organisation/institution
		const cvItemOrganisation = document.createElement('div');
		cvItemOrganisation.className = 'cv-org';

		const roleKey = cvSectionItems.identifiers.roleName || 'role';
		const roleTypeKey = cvSectionItems.identifiers.roleTypeName || 'roleType';
		const orgKey = cvSectionItems.identifiers.organisationName || 'organisation';
		const suborgKey = cvSectionItems.identifiers.subOrganisationName || 'suborganisation';
		const locationKey = cvSectionItems.identifiers.locationName || 'location';

		var roleType = item[roleTypeKey] || '';
		roleType = roleType ? `(<i>${roleType}</i>)` : '';

		var role = item[roleKey] || '';
		role = Array.isArray(role) ? role.join(',<br>') : role;
		role = role ? `<i>${role}</i>` : '';
		role = [role, roleType].filter(item => item && item.trim() !== '').join(' ');

		const suborg = item[suborgKey] || '';
		const org = item[orgKey] || '';
		const orgContent = [role, suborg].filter(item => item && item.trim() !== '').join(',<br>');
		const locationContent = item[locationKey] || '';
		const locationFullContent = [org, locationContent].filter(Boolean).join(', ');

		const cvItemOrganisationName = document.createElement('div');
		cvItemOrganisationName.className = 'cv-org_name';
		cvItemOrganisationName.innerHTML = orgContent;
		cvItemOrganisation.appendChild(cvItemOrganisationName);

		const cvItemOrganisationLocation = document.createElement('div');
		cvItemOrganisationLocation.className = 'cv-org_location';
		cvItemOrganisationLocation.innerHTML = locationFullContent;
		cvItemOrganisation.appendChild(cvItemOrganisationLocation);

		cvItemContainer.appendChild(cvItemOrganisation);

		// Event/title
		const eventName = cvSectionItems.identifiers.eventName || 'event';
		if (item.hasOwnProperty(eventName)) {
			const cvItemEvent = document.createElement('div');
			cvItemEvent.className = 'cv-event';
			if (Array.isArray(item[eventName])) {
				cvItemEvent.innerHTML = item[eventName].join('<br>');
			} else {
				cvItemEvent.innerHTML = item[eventName];
			}
			cvItemContainer.appendChild(cvItemEvent);
		}
		// Description/notes
		const descriptionName = cvSectionItems.identifiers.descriptionName || 'description';
		if (item.hasOwnProperty(descriptionName)) {
			const cvItemDescription = document.createElement('div');
			cvItemDescription.className = 'cv-description';
			if (Array.isArray(item[descriptionName])) {
				cvItemDescription.innerHTML = item[descriptionName].join('<br>');
			} else {
				cvItemDescription.innerHTML = item[descriptionName];
			}
			cvItemContainer.appendChild(cvItemDescription);
		}
		cvSectionContentContainer.appendChild(cvItemContainer);
	}

	cvSectionContainer.appendChild(cvSectionContentContainer);
	console.log(`    Successfully fetched CV data from ${cvDataPath} for section ${sectionId}`);
}