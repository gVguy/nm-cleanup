import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { cleanupTestFS, setupTestFS } from './setup-test-fs.js'
import {scriptPath, tempDir} from './test-config.js'

// TESTS

describe('nm-cleanup', () => {

  afterEach(() => {
    cleanupTestFS()
  })

  beforeAll(() => {
    cleanupTestFS()
  })


  test('should delete targets in outdated projects & keeping other files in place', () => {

    const expectFS = setupTestFS([
      { path: 'project-a/package.json' },
      { path: 'project-a/node_modules/', shouldDelete: true },
      { path: 'project-a/nested/node_modules/', shouldDelete: true },
      { path: 'project-b/package.json' },
      { path: 'project-b/some-other-file', modifiedDaysAgo: 31 },
      { path: 'project-b/node_modules/', shouldDelete: true },
      { path: 'project-c/frontend/package.json' },
      { path: 'project-c/frontend/node_modules/', shouldDelete: true },
      { path: 'project-c/backend/package.json' },
      { path: 'project-c/backend/some-other/nested/file' },
      { path: 'project-c/backend/node_modules/', shouldDelete: true },
    ])

    run()

    expectFS()
  })


  test('should not touch projects with recently modified files', () => {

    const expectFS = setupTestFS([
      { path: 'project-a/package.json' },
      { path: 'project-a/node_modules/', shouldDelete: true },
      { path: 'project-b/package.json', modifiedDaysAgo: 1 },
      { path: 'project-b/node_modules/' },
      { path: 'project-c/package.json' },
      { path: 'project-c/nested/test.txt', modifiedDaysAgo: 1 },
      { path: 'project-c/node_modules/' },
    ])

    run()

    expectFS()
  })


  // --ignore

  ;['-i', '--ignore'].forEach(iFlag => {
    test(`should not touch ignored directories with ${iFlag}`, () => {
  
      const expectFS = setupTestFS([
        { path: 'project-a/package.json' },
        { path: 'project-a/node_modules/', shouldDelete: true },
        { path: 'project-a/nested/node_modules/' },
        { path: 'project-b/package.json' },
        { path: 'project-b/node_modules/' },
      ])
  
      const ignore = 'project-b/ project-a/nested'
      run(`${iFlag} ${ignore}`)
      expectFS()
    })
  })


  // --name

  ;['-n', '--name'].forEach(nFlag => {
    test(`should delete targets by name with ${nFlag}`, () => {
  
      const expectFS = setupTestFS([
        { path: 'project-a/package.json' },
        { path: 'project-a/custom-folder/', shouldDelete: true },
        { path: 'project-a/node_modules/' },
        { path: 'project-a/nested/dist/', shouldDelete: true },
        { path: 'project-b/package.json' },
        { path: 'project-b/dist/', shouldDelete: true },
        { path: 'project-b/custom-folder/', shouldDelete: true },
      ])
  
      const name = '"custom-folder|dist"'
      run(`${nFlag} ${name}`)
      expectFS()
    })
  })


  // --separate

  ;['-s', '--separate-nested'].forEach(sFlag => {
    test(`should handle nested projects separately with ${sFlag}`, () => {

      const expectFS = setupTestFS([
        { path: 'project-a/package.json' },
        { path: 'project-a/node_modules/', shouldDelete: true },

        { path: 'project-a/frontend/package.json' },
        { path: 'project-a/frontend/node_modules/' },
        { path: 'project-a/frontend/recent-file', modifiedDaysAgo: 1 },

        { path: 'project-a/backend/package.json' },
        { path: 'project-a/backend/node_modules/', shouldDelete: true },
        { path: 'project-a/backend/nested/node_modules/', shouldDelete: true },

        { path: 'project-a/backend/old/package.json' },
        { path: 'project-a/backend/old/node_modules/', shouldDelete: true },
        
        { path: 'project-a/backend/recent/node_modules/' },
        { path: 'project-a/backend/recent/package.json', modifiedDaysAgo: 1 },

        { path: 'project-b/package.json', modifiedDaysAgo: 1 },
        { path: 'project-b/node_modules/' },

        { path: 'project-b/nested/project/package.json' },
        { path: 'project-b/nested/project/node_modules/', shouldDelete: true },
        { path: 'project-b/nested/project/nested/folder/node_modules/', shouldDelete: true },
      ])

      run(sFlag)
      expectFS()
    })
  })


  // --time

  ;['-t', '--time'].forEach(tFlag => {
    test(`should use custom time threshold with ${tFlag}`, () => {

      const expectFS = setupTestFS([
        { path: 'project-a/package.json' },
        { path: 'project-a/node_modules/', shouldDelete: true, modifiedDaysAgo: 11 },
        { path: 'project-b/package.json' },
        { path: 'project-b/node_modules/', modifiedDaysAgo: 1 },
      ])

      run(`${tFlag} 10`)
      expectFS()
    })
  })


  // --exclude

  ;['-x', '--exclude'].forEach(xFlag => {
    test(`should exclude directories with ${xFlag}`, () => {

      const expectFS = setupTestFS([
        { path: 'project-x/package.json' },
        { path: 'project-x/node_modules/', shouldDelete: true },
        { path: 'project-x/no-enter/node_modules/' },
        { path: 'project-x/.hidden/node_modules/' },
      ])

      run(`${xFlag} "no-enter|^\\."`)
      expectFS()
    })
  })


  // --project

  ;['-p', '--project'].forEach(pFlag => {
    test(`should use provided filenames as project indicator files with ${pFlag}`, () => {

      const expectFS = setupTestFS([
        { path: 'project-a/requirements.txt' },
        { path: 'project-a/node_modules/', shouldDelete: true },
        { path: 'project-b/Dockerfile' },
        { path: 'project-b/node_modules/', shouldDelete: true },
        { path: 'project-c/package.json' },
        { path: 'project-c/node_modules/' },
      ])

      run(`${pFlag} Dockerfile requirements.txt`)
      expectFS()
    })
  })
})



// UTILS


const run = (args = '', stdio = false) => {

  const baseCommand = `node ${scriptPath} ${tempDir} -y`

  execSync(baseCommand + (args ? ` ${args}` : ''), {
    stdio: stdio ? 'inherit' : 'ignore'
  })

}

// Defines the test environment configuration
