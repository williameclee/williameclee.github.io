// Populating the post with the data from the database
import { populatePostsListfromJSON } from '../posts/post-index.js';

// Populate projects list
const postsListId = 'projects-list';
const projectsDataPath = '/projects/projects.json';
populatePostsListfromJSON(projectsDataPath, postsListId);