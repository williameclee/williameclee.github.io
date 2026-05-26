// Populate photo album
const albumContainerId = 'albums-photography';
const photoDataPath = '/media/photography/photography.json';

function populatePhotoAlbumfromJSON(filePath, photoAlbumId) {
	const albumContainer = document.querySelector(`#${photoAlbumId}`);
	if (!albumContainer) {
		console.error(`Failed to find photo album container with ID ${photoAlbumId}`);
		return;
	}
	fetch(filePath).then(response => response.json())
		.then(albums => {
			for (const albumData of albums) {
				const albumItem = document.createElement('div');
				albumItem.classList.add('media-album');
				albumItem.id = `album-${albumData["htmlid"]}`;
				for (const photoData of albumData.photos) {
					const photoItem = makePhotoHtmlItem(photoData);
					if (photoItem) {
						albumItem.appendChild(photoItem);
					}
				}
				albumContainer.appendChild(albumItem);
			};
		}).catch(error => {
			console.error('Error loading JSON:', error);
		});
};

function makePhotoHtmlItem(photoData) {
	const photoTemplate = document.getElementById('photo-template');
	if (!photoTemplate) {
		console.error('Failed to find photo template with ID photo-template');
		return null;
	}
	const photoItem = photoTemplate.content.cloneNode(true);
	const photoImg = photoItem.querySelector('.photo-img');
	photoImg.src = photoData.link;
	photoImg.alt = photoData.description || '';
	const photoDesc = photoItem.querySelector('.photo-desc');
	photoDesc.textContent = photoData.description || '';
	const photoLocation = photoItem.querySelector('.photo-loc');
	photoLocation.textContent = photoData.location || '';
	const photoDate = photoItem.querySelector('.photo-date');
	photoDate.textContent = photoData.date || '';
	return photoItem;
}

console.log('Populating photo album from JSON');
populatePhotoAlbumfromJSON(photoDataPath, albumContainerId);