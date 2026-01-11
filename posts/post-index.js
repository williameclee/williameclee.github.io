// Populating the post with the data from the JSON file
export function populatePostsListfromJSON(filePath, postsListId) {
  const postListContainer = document.querySelector(`#${postsListId}`);
  if (!postListContainer) {
    console.log(`Failed to find posts list with ID ${postsListId}`);
    return;
  }
  fetch(filePath).then(response => response.json())
    .then(posts => {
      // Populate posts info and wait for all the fetches to complete
      populateInfo(posts).then(populatedPosts => {
        populatePostsList(postListContainer, populatedPosts);
      });
    }).catch(error => {
      console.error('Error loading JSON:', error);
    });
};

async function populateInfo(posts) {
  function assignField(input, output, field) {
    if (input.hasOwnProperty(field)) {
      output[field] = input[field];
    }
  }
  const fetchPromises = [];

  for (const postId in posts) {
    const fetchPromise = fetch(posts[postId].info)
      .then(response => response.json())
      .then(info => {
        assignField(info, posts[postId], 'date');
        assignField(info, posts[postId], 'author');
        assignField(info, posts[postId], 'title');
        assignField(info, posts[postId], 'subtitle');
        assignField(info, posts[postId], 'tags');
        assignField(info, posts[postId], 'image');
        assignField(info, posts[postId], 'preview');
      })
      .catch(error => {
        console.error(`Error fetching post info for postId ${postId}:`, error);
      });
    fetchPromises.push(fetchPromise);
  }

  // Return a promise that resolves when all fetches are complete
  await Promise.all(fetchPromises);
  return posts;
}

function populatePostsList(postsList, posts) {
  const postTemplate = document.getElementById('post-template');
  if (!postTemplate) {
    console.log('Failed to find publication template with ID post-template');
    return;
  }
  const postTagTemplate = document.getElementById('post-tag-template');
  if (!postTagTemplate) {
    console.log('Failed to find publication template with ID post-tag-template');
    return;
  }

  for (const postId in posts) {
    const post = posts[postId];
    const postContainer = postTemplate.content.cloneNode(true);

    // Image
    const postImageContainer = postContainer.querySelector('.post-image-container');
    const postImage = postImageContainer.querySelector('.post-image');
    if (post.hasOwnProperty('image')) {
      postImage.src = post.image.src;
      if (post.image.hasOwnProperty('alt')) {
        postImage.alt = post.image.alt;
      }
    } else {
      postImage.src = 'webpage_supplements/favicon.png';
    }
    postImageContainer.href = post.link;

    // Text
    const postTextContainer = postContainer.querySelector('.post-text-container');
    postTextContainer.href = post.link;
    // Subtitle
    const postSubtitle = postTextContainer.querySelector('.post-subtitle');
    if (post.hasOwnProperty('subtitle')) {
      postSubtitle.textContent = post.subtitle;
    } else {
      postSubtitle.style.display = 'none';
    }
    // Title
    const postTitle = postTextContainer.querySelector('.post-title');
    postTitle.textContent = post.title;

    const postInfo = postTextContainer.querySelector('.post-info');
    // Author and date
    const postAuthor = postInfo.querySelector('.post-author');
    if (Array.isArray(post.author)) {
      postAuthor.textContent = post.author.join(', ');
    } else {
      postAuthor.textContent = post.author;
    }
    const postDate = postInfo.querySelector('.post-date');
    if (post.hasOwnProperty('date')) {
      postDate.textContent = (new Date(post.date)).toDateString();
    } else {
      postDate.style.display = 'none';
      const postAuthorDateSeparator = postInfo.querySelector('.post-author-date-separator');
      postAuthorDateSeparator.style.display = 'none';
    }
    // Preview
    const postPreview = postTextContainer.querySelector('.post-preview');
    if (post.hasOwnProperty('preview')) {
      postPreview.textContent = post.preview;
    } else {
      postPreview.style.display = 'none';
    }
    // Tags
    const postTagsContainer = postTextContainer.querySelector('.post-tags');
    if (post.hasOwnProperty('tags')) {
      for (const tag of post.tags) {
        const postTag = postTagTemplate.content.cloneNode(true).querySelector('.post-tag');
        postTag.textContent = tag;
        postTagsContainer.appendChild(postTag);
      }
    } else {
      postTagsContainer.style.display = 'none';
    }
    // Add the post element to the posts list
    postsList.appendChild(postContainer);
  };
}