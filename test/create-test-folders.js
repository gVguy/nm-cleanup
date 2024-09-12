import { setupTestFS } from './setup-test-fs.js'

setupTestFS([
  {path: 'project-a/package.json', modifiedDaysAgo: 1},
  {path: 'project-a/node_modules'},
  {path: 'project-a/.git'},

  {path: 'project-b/package.json'},
  {path: 'project-b/node_modules'},
  {path: 'project-b/.git'},

  {path: 'monrepo-c/frontend/package.json'},
  {path: 'monrepo-c/frontend/node_modules'},
  {path: 'monrepo-c/backend/package.json', modifiedDaysAgo: 14},
  {path: 'monrepo-c/backend/node_modules'},
  {path: 'monrepo-c/.git'},

  {path: 'project-d/package.json'},
  {path: 'project-d/node_modules'},
])
