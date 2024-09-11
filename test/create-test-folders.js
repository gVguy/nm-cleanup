import { setupTestFS } from './setup-test-fs.js'

setupTestFS([
  {path: 'recent-project/package.json', modifiedDaysAgo: 1},
  {path: 'recent-project/node_modules'},
  {path: 'recent-project/.git'},

  {path: 'old-project/package.json'},
  {path: 'old-project/node_modules'},
  {path: 'old-project/.git'},

  {path: 'some-monorepo/frontend/package.json'},
  {path: 'some-monorepo/frontend/node_modules'},
  {path: 'some-monorepo/backend/package.json', modifiedDaysAgo: 14},
  {path: 'some-monorepo/backend/node_modules'},
  {path: 'old-project/.git'},
])
