const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const scriptPath = path.resolve(__dirname, 'index.js')
const tempDir = path.resolve(__dirname, 'temp_test_dir')


// TESTS

describe('nm-cleanup', () => {

  afterEach(() => {
    cleanupTestEnvironment()
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
    ], /project-a\/node_modules/)

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
      ], /project-a\/node_modules/)
  
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
      ], /custom-folder|dist/)
  
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
const setupTestFS = (config, targetRegex = /node_modules/, projectIndicatorFile = 'package.json') => {
  
  const applyModificationTime = (filePath, daysAgo) => {
    const modifiedTime = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    fs.utimesSync(filePath, modifiedTime, modifiedTime)
    // Recursively update parent directory mtime
    const parentDir = path.dirname(filePath)
    if (parentDir !== tempDir) { // Avoid updating root dir
      applyModificationTime(parentDir, daysAgo) // Use the same modification time
    }
  }

  const targets = []
  const nonTargets = []

  // sort newest to the end, so that modification times get set correctly
  config.forEach(record => record.modifiedDaysAgo ??= 1000)
  config.sort((a,b) => b.modifiedDaysAgo - a.modifiedDaysAgo)

  config.forEach(({ path: filePath, modifiedDaysAgo, shouldDelete }) => {
    const fullPath = path.join(tempDir, filePath)
    const dirPath = path.dirname(fullPath)

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }

    if (filePath.endsWith('/')) {
      fs.mkdirSync(fullPath, { recursive: true })
    } else {
      fs.writeFileSync(fullPath, '')
    }

    applyModificationTime(fullPath, modifiedDaysAgo)

    if (shouldDelete) {
      targets.push(fullPath)
    } else {
      nonTargets.push(fullPath)
    }
  })

  const expectFS = () => {
    const deletedTargets = []
    const preservedTargets = []
    const deletedNonTargets = []
    const preservedNonTargets = []
    targets.forEach((target) => {
      const isExists = fs.existsSync(target)
      if (isExists) {
        preservedTargets.push(target)
      } else {
        deletedTargets.push(target)
      }
    })
    nonTargets.forEach((nonTarget) => {
      const isExists = fs.existsSync(nonTarget)
      if (isExists) {
        preservedNonTargets.push(nonTarget)
      } else {
        deletedNonTargets.push(nonTarget)
      }
    })
    expect(deletedTargets).toEqual(targets)
    expect(preservedNonTargets).toEqual(nonTargets)
    expect(preservedTargets).toHaveLength(0)
    expect(deletedNonTargets).toHaveLength(0)
  }

  return expectFS
}


// Cleans up test environment
const cleanupTestEnvironment = () => {
  fs.rmSync(tempDir, { recursive: true, force: true })
}
