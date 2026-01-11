import { populatePostsListfromJSON } from './post-index.js';

// Populate posts list
const postsListId = 'posts-list';
const postsDataPath = '/posts/posts.json';
populatePostsListfromJSON(postsDataPath, postsListId);

// Make title
const titleConatiner = document.querySelector("#title-container");
if (titleConatiner) {
  titleConatiner.classList.add("container");
  titleConatiner.addEventListener("load",
    makeTitle(titleConatiner.attributes["data-info"].value)
  );
}
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
