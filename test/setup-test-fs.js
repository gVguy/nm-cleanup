import fs from 'fs'
import path from 'path'
import { tempDir } from './test-config.js'

/**
 * @typedef {object} ConfigRecord
 * @property {string} path path to file or folder. folders end with "/"
 * @property {boolean} [shouldDelete] whether the file should be expected to be deleted
 * @property {number} [modifiedDaysAgo] how many days ago mtime should be
 */
/**
 * creates mock folder structure for testing. returns "expect" function
 * @param {ConfigRecord[]} config
 * @returns {() => void}
 */
export const setupTestFS = (config) => {
  
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
export const cleanupTestFS = () => {
  fs.rmSync(tempDir, { recursive: true, force: true })
}
