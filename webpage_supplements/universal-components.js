import 'https://kit.fontawesome.com/513d0fe828.js';

populateNavbar("navbar", "/webpage_supplements/navbar.json", "");
populateFooter("footer", "/webpage_supplements/footer.json", "/webpage_supplements/footer.css");

// Populate navigation bar with data from JSON file
async function populateNavbar(navbarId = "navbar", navbarDataPath = "/webpage_supplements/navbar.json", cssPath = "") {
	const navbar = document.getElementById(navbarId);
	if (!navbar) {
		console.log(`Failed to find navbar container with ID '${navbarId}'`);
		return;
	}

	if (cssPath && cssPath.trim() !== "") {
		try {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.type = 'text/css';
			link.media = 'all';
			link.href = cssPath;
			document.head.appendChild(link);
		} catch (error) {
			console.log(`Failed to load footer CSS from ${cssPath}:`, error);
		}
	}

	fetch(navbarDataPath)
		.then(response => response.json())
		.then(navItems => {

			const navbarContainer = document.createElement('div');
			navbarContainer.className = 'container';
			const navbarMenu = document.createElement('div');
			navbarMenu.className = 'navbar-menu';
			const navbarList = document.createElement('ul');
			navbarList.className = 'navbar-list';

			navItems.forEach(item => {
				const li = document.createElement('li');
				li.className = 'navbar-list-item';

				const a = document.createElement('a');
				a.href = item.link;
				a.textContent = item.name;

				li.appendChild(a);
				navbarList.appendChild(li);
			});

			navbarMenu.appendChild(navbarList);
			navbarContainer.appendChild(navbarMenu);
			navbar.appendChild(navbarContainer);
			console.log(`Navbar populated successfully with data from ${navbarDataPath}`);
		})
		.catch(error => console.error('Failed to load navigation:', error));
}


// Populate footer with data from JSON file
async function populateFooter(footerId = "footer", footerDataPath = "/webpage_supplements/footer.json", cssPath = "/webpage_supplements/footer.css") {
	// Check if the footer element exists
	const footer = document.getElementById(footerId);
	if (!footer) {
		console.log(`Failed to find footer container with ID '${footerId}'`);
		return;
	}

	if (cssPath && cssPath.trim() !== "") {
		try {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.type = 'text/css';
			link.media = 'all';
			link.href = cssPath;
			document.head.appendChild(link);
		} catch (error) {
			console.log(`Failed to load footer CSS from ${cssPath}:`, error);
		}
	}

	fetch(footerDataPath)
		.then(response => response.json())
		.then(footerInfo => {
			const footerContainer = document.createElement('div');
			footerContainer.classList.add('container', 'footer-container');

			// Add title
			const footerTitle = document.createElement('h2');
			footerTitle.className = 'footer-title';
			if (footerInfo.title.hasOwnProperty('text')) {
				if (footerInfo.title.hasOwnProperty('link')) {
					const titleLink = document.createElement('a');
					titleLink.className = 'link-clean';
					titleLink.target = '_parent';
					titleLink.href = footerInfo.title.link;
					titleLink.textContent = footerInfo.title.text;
					footerTitle.appendChild(titleLink);
				} else {
					footerTitle.textContent = footerInfo.title.text;
				}
			} else {
				footerTitle.textContent = footerInfo.title || "";
			}
			footerContainer.appendChild(footerTitle);

			// Add links
			const footerLinks = footerInfo.links || [];
			const linkList = document.createElement('ul');
			linkList.classList.add('list', 's_media-list');

			footerLinks.forEach(item => {
				const li = document.createElement('li');
				const a = document.createElement('a');
				a.href = item.link;
				a.classList.add('link-clean');

				const icon = document.createElement('i');
				icon.classList.add('fa-brands', item.icon);

				a.appendChild(icon);
				li.appendChild(a);
				linkList.appendChild(li);
			});

			footerContainer.appendChild(linkList);
			footer.appendChild(footerContainer);
			console.log(`Footer populated successfully with data from ${footerDataPath}`);
		})
		.catch(error => console.error('Failed to load navigation:', error));
}