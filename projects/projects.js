// Populating the post with the data from the database
const postsList = document.querySelector('#projects-list');
if (postsList) {
	fetch('projects/projects.json').then(response => response.json())
		.then(projects => {

			async function populateInfo(projects) {
				return projects;
			}

			function populatePostsList(projects) {
				for (const projectId in projects) {
					const project = projects[projectId];
					const postElement = document.createElement('div');
					postElement.classList.add('post');
					console.log(project)

					// Image
					const postImageContainer = document.createElement('a');
					postImageContainer.classList.add('post-image-container');
					postImageContainer.classList.add('link-clean');
					const postImage = document.createElement('img');
					postImage.classList.add('post-image');
					if (project.hasOwnProperty('image')) {
						if (project.image.hasOwnProperty('src')) {
							postImage.src = project.image.src;
							if (project.image.hasOwnProperty('alt')) {
								postImage.alt = project.image.alt;
							}
						} else {
							postImage.src = project.image;
						}
					} else {
						postImage.src = 'webpage_supplements/favicon.png';
					}
					postImageContainer.href = project.link;
					postImageContainer.appendChild(postImage);

					// Text
					const postText = document.createElement('div');
					const postLink = document.createElement('a');
					postLink.classList.add('link-clean');
					postLink.href = project.link;
					if (project.hasOwnProperty('subtitle')) {
						const postSubtitle = document.createElement('div');
						postSubtitle.classList.add('post-subtitle');
						postSubtitle.textContent = project.subtitle;
						postText.appendChild(postSubtitle);
					}
					const postTitle = document.createElement('h3');
					postTitle.classList.add('post-title');
					postTitle.textContent = project.name;
					postText.appendChild(postTitle);
					postLink.appendChild(postText);
					const postInfo = document.createElement('div');
					postInfo.classList.add('post-info');
					if (project.hasOwnProperty('date') || project.hasOwnProperty('author')) {
						const postAuthor = document.createElement('span');
						postAuthor.classList.add('post-author');
						// check if author is an array
						if (Array.isArray(project.author)) {
							postAuthor.textContent = project.author.join(', ');
						} else {
							postAuthor.textContent = project.author;
						}
						postInfo.appendChild(postAuthor);
						if (project.hasOwnProperty('author') & project.hasOwnProperty('date')) {
							const postAuthorDateSeparator = document.createElement('span');
							postAuthorDateSeparator.classList.add('post-author-date-separator');
							postAuthorDateSeparator.textContent = ' ‧ ';
							postInfo.appendChild(postAuthorDateSeparator);
						}
						if (project.hasOwnProperty('date')) {
							const postDate = document.createElement('span');
							postDate.classList.add('post-date');
							const date = new Date(project.date);
							postDate.textContent = date.toDateString();
							postInfo.appendChild(postDate);
						}
					}
					postText.appendChild(postInfo);
					if (project.hasOwnProperty('preview')) {
						const postPreview = document.createElement('div');
						postPreview.classList.add('post-preview');
						postPreview.textContent = project.preview;
						postText.appendChild(postPreview);
					}
					if (project.hasOwnProperty('tags')) {
						const postTags = document.createElement('div');
						postTags.classList.add('post-tags');
						for (const tag of project.tags) {
							const postTag = document.createElement('span');
							postTag.classList.add('post-tag');
							postTag.textContent = tag;
							postTags.appendChild(postTag);
						}
						postText.appendChild(postTags);
					}

					// Add image and link to the post element
					postElement.appendChild(postImageContainer);
					postElement.appendChild(postLink);

					// Add the post element to the posts list
					postsList.appendChild(postElement);
				};
			}

			// Populate posts info and wait for all the fetches to complete
			populateInfo(projects).then(populatedPosts => {
				populatePostsList(populatedPosts);
			});
		}).catch(error => {
			console.error('Error loading JSON:', error);
		});
}