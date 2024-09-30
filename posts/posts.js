// Populating the post with the data from the database
fetch('posts/posts.json').then(response => response.json())
  .then(posts => {
    const postsList = document.querySelector('#posts-list');
    function populatePostsList(posts) {
      for (const postId in posts) {
        const post = posts[postId];
        const postElement = document.createElement('div');
        postElement.classList.add('post');
        // Image
        const postImageContainer = document.createElement('a');
        postImageContainer.classList.add('post-image-container');
        postImageContainer.classList.add('link-clean');
        const postImage = document.createElement('img');
        postImage.classList.add('post-image');
        if (post.hasOwnProperty('IMAGE')) {
          postImage.src = post.IMAGE.SRC;
          if (post.IMAGE.hasOwnProperty('ALT')) {
            postImage.alt = post.IMAGE.ALT;
          }
        } else {
          postImage.src = 'webpage_supplements/favicon.png';
        }
        postImageContainer.href = post.LINK;
        postImageContainer.appendChild(postImage);
        // Text
        const postText = document.createElement('div');
        const postLink = document.createElement('a');
        postLink.classList.add('link-clean');
        postLink.href = post.LINK;
        if (post.hasOwnProperty('SUBTITLE')) {
          const postSubtitle = document.createElement('div');
          postSubtitle.classList.add('post-subtitle');
          postSubtitle.textContent = post.SUBTITLE;
          postText.appendChild(postSubtitle);
        }
        const postTitle = document.createElement('h3');
        postTitle.classList.add('post-title');
        postTitle.textContent = post.TITLE;
        postText.appendChild(postTitle);
        postLink.appendChild(postText);
        const postInfo = document.createElement('div');
        postInfo.classList.add('post-info');
        if (post.hasOwnProperty('DATE')) {
          const postDate = document.createElement('span');
          postDate.classList.add('post-date');
          const date = new Date(post.DATE);
          postDate.textContent = date.toDateString();
          postInfo.appendChild(postDate);
        }
        postText.appendChild(postInfo);
        if (post.hasOwnProperty('PREVIEW')) {
          const postPreview = document.createElement('div');
          postPreview.classList.add('post-preview');
          postPreview.textContent = post.PREVIEW;
          postText.appendChild(postPreview);
        }
        if (post.hasOwnProperty('TAGS')) {
          const postTags = document.createElement('div');
          postTags.classList.add('post-tags');
          for (const tag of post.TAGS) {
            const postTag = document.createElement('span');
            postTag.classList.add('post-tag');
            postTag.textContent = tag;
            postTags.appendChild(postTag);
          }
          postText.appendChild(postTags);
        }
        // 
        postElement.appendChild(postImageContainer);
        postElement.appendChild(postLink);
        postsList.appendChild(postElement);
      };
    }
    populatePostsList(posts);
  }).catch(error => {
    console.error('Error loading JSON:', error);
  });

// Figures in the post
var figures_container_side = document.getElementsByClassName(
  "figures-container-side"
);

var figures_container_side_counter;
for (
  figures_container_side_counter = 0;
  figures_container_side_counter < figures_container_side.length;
  figures_container_side_counter++
) {
  if (figures_container_side_counter % 2 == 0) {
    figures_container_side[figures_container_side_counter].classList.add(
      "figures-container-side-left"
    );
    figures_container_side[figures_container_side_counter].classList.remove(
      "figures-container-side-right"
    );
  } else {
    figures_container_side[figures_container_side_counter].classList.add(
      "figures-container-side-right"
    );
    figures_container_side[figures_container_side_counter].classList.remove(
      "figures-container-side-left"
    );
  }
}
