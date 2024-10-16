// Populating the post with the data from the database
const postsList = document.querySelector('#posts-list');
if (postsList) {
  fetch('posts/posts.json').then(response => response.json())
    .then(posts => {

      async function populateInfo(posts) {
        function assignField(input, output, field) {
          if (input.hasOwnProperty(field)) {
            output[field] = input[field];
          }
        }
        const fetchPromises = [];

        for (const postId in posts) {
          const fetchPromise = fetch(posts[postId].INFO)
            .then(response => response.json())
            .then(info => {
              assignField(info, posts[postId], 'DATE');
              assignField(info, posts[postId], 'AUTHOR');
              assignField(info, posts[postId], 'TITLE');
              assignField(info, posts[postId], 'SUBTITLE');
              assignField(info, posts[postId], 'TAGS');
              assignField(info, posts[postId], 'IMAGE');
              assignField(info, posts[postId], 'PREVIEW');
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
            const postAuthor = document.createElement('span');
            postAuthor.classList.add('post-author');
            postAuthor.textContent = post.AUTHOR;
            postInfo.appendChild(postAuthor);
            if (post.hasOwnProperty('AUTHOR') & post.hasOwnProperty('DATE')) {
              const postAuthorDateSeparator = document.createElement('span');
              postAuthorDateSeparator.classList.add('post-author-date-separator');
              postAuthorDateSeparator.textContent = ' ‧ ';
              postInfo.appendChild(postAuthorDateSeparator);
            }
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

          // Add image and link to the post element
          postElement.appendChild(postImageContainer);
          postElement.appendChild(postLink);

          // Add the post element to the posts list
          postsList.appendChild(postElement);
        };
      }

      // Populate posts info and wait for all the fetches to complete
      populateInfo(posts).then(populatedPosts => {
        populatePostsList(populatedPosts);
      });
    }).catch(error => {
      console.error('Error loading JSON:', error);
    });
}

// Make title
const titleConatiner = document.querySelector("#title-container");
titleConatiner.classList.add("container");
titleConatiner.addEventListener("load",
  makeTitle(titleConatiner.attributes["data-info"].value)
);
function makeTitle(infoPath) {
  fetch(infoPath)
    .then(response => response.json())
    .then(info => {
      if (info.hasOwnProperty("SUBTITLE")) {
        const subtitle = document.createElement("h2");
        subtitle.classList.add("subtitle");
        subtitle.textContent = info.SUBTITLE;
        titleConatiner.appendChild(subtitle);
      }
      const title = document.createElement("h1");
      title.classList.add("title");
      title.textContent = info.TITLE;
      titleConatiner.appendChild(title);
      const postInfo = document.createElement("div");
      postInfo.classList.add("post-information");
      if (info.hasOwnProperty("AUTHOR")) {
        const author = document.createElement("span");
        author.textContent = info.AUTHOR;
        postInfo.appendChild(author);
        if (info.hasOwnProperty("DATE")) {
          const authorDateSeparator = document.createElement("span");
          authorDateSeparator.classList.add("author-date-separator");
          authorDateSeparator.textContent = " ‧ ";
          postInfo.appendChild(authorDateSeparator);
        }
        const date = new Date(info.DATE);
        const dateElement = document.createElement("span");
        dateElement.textContent = date.toDateString();
        postInfo.appendChild(dateElement);
        titleConatiner.appendChild(postInfo);
        const divider = document.createElement("div");
        divider.classList.add("divider");
        titleConatiner.appendChild(divider);
      }
    }).catch
    (error => {
      console.error('Error loading JSON:', error);
    });
}

// Figures in the post
var figures_container_side = document.getElementsByClassName(
  "figures-container-side"
);

var iSide;
for (iSide = 0; iSide < figures_container_side.length; iSide++) {
  if (iSide % 2 == 0) {
    figures_container_side[iSide].classList.add(
      "figures-container-side-left"
    );
    figures_container_side[iSide].classList.remove(
      "figures-container-side-right"
    );
  } else {
    figures_container_side[iSide].classList.add(
      "figures-container-side-right"
    );
    figures_container_side[iSide].classList.remove(
      "figures-container-side-left"
    );
  }
}
