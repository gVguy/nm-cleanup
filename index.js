#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { Command } from 'commander'
import figlet from 'figlet'
import readline from 'node:readline/promises'
import chalk from 'chalk'

// Default values for options
const DEFAULT_EXCLUDE = '^\\.'
const DEFAULT_IGNORE = []
const DEFAULT_NAME_REGEX = 'node_modules'
const DEFAULT_TIME_THRESHOLD_DAYS = '30'
const DEFAULT_PROJECT_INDICATOR_FILES = ['package.json']

// Initialize commander program
const program = new Command()

program
  .version('1.0.4')
  .description('A CLI tool to remove unnecessary directories from outdated projects')
  .argument('[rootDir]', 'Root directory for cleanup', '.')
  .option('-n, --name <regex>', 'Regex to match directory names', DEFAULT_NAME_REGEX)
  .option('-t, --time <days>', 'Days threshold for modification time', DEFAULT_TIME_THRESHOLD_DAYS)
  .option('-x, --exclude <regex>', 'Regex for directory names to exclude from recursive scan', DEFAULT_EXCLUDE)
  .option('-p, --project [filenames...]', 'Filenames of the project directory indicator files (space separated)', DEFAULT_PROJECT_INDICATOR_FILES)
  .option('-i, --ignore [paths...]', 'Paths to ignore (space separated)', DEFAULT_IGNORE)
  .option('-s, --separate-nested', 'Treat nested projects as separante projects', false)
  .option('-y, --yes', 'Auto Yes - no confirmation prompt', false)
  .option('--dry-run', 'Show what would be done without making any changes', false)

// Parse the command line arguments
program.parse(process.argv)

const options = program.opts()
const rootDir = program.args[0] || '.'
const nameRegex = new RegExp(options.name)
const timeThresholdDays = parseInt(options.time)
const ignorePaths = options.ignore
const excludeRegex = new RegExp(options.exclude)
const projectIndicatorFiles = options.project
const shouldSeparateNestedProjects = options.separateNested
const dryRun = options.dryRun
const autoYes = options.yes

const fullRootDir = path.resolve(process.cwd(), rootDir)


const getRelativePath = (path) => path.replace(fullRootDir, '')
const getIsIgnored = (path) => ignorePaths.some(ignorePath => path.includes(ignorePath))
const getIsProject = (dir) => projectIndicatorFiles.some(filename => fs.existsSync(path.join(dir, filename)))

/** dir : mtime 
 * @type {Map<string, number>}
*/
const projects = new Map()

const scanProjectsRecursive = (dir, parentProject, isProject) => {

  if (isProject === undefined) {
    isProject = getIsProject(dir)
  }

  if (
    isProject &&
    (!parentProject || shouldSeparateNestedProjects)
  ) {
    projects.set(dir, 0)
    parentProject = dir
    console.log('✍️', chalk.dim('Project found'), getRelativePath(dir))
  }

  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name)
  
    const isIgnored = getIsIgnored(fullPath)
  
    if (isIgnored) {
      console.log('⏭️', chalk.dim('Skip (ignored)'), getRelativePath(fullPath))
      return
    }

    const isDirectory = entry.isDirectory()
    const isNestedProject = getIsProject(fullPath)

    if (!isNestedProject && parentProject) {
      const mtime = fs.statSync(fullPath).mtime.getTime()

      if (projects.get(parentProject) < mtime) {
        projects.set(parentProject, mtime)
      }
    }

    const isExcluded = entry.name.match(excludeRegex) || entry.name.match(nameRegex)

    if (isDirectory && !isExcluded) {
      scanProjectsRecursive(fullPath, parentProject, isNestedProject)
    }
  })
}

const lockOnTargetsRecursively = (dir, separateNestedProjects) => {

  if (separateNestedProjects.includes(dir)) {
    return
  }

  const lockedOnTargets = []

  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name)
  
    const isIgnored = getIsIgnored(fullPath)
  
    if (isIgnored) {
      console.log('⏭️', chalk.dim('Skip (ignored)'), getRelativePath(fullPath))
      return
    }

    const isDirectory = entry.isDirectory()
    const isExcluded = entry.name.match(excludeRegex)

    if (entry.name.match(nameRegex)) {

      lockedOnTargets.push(fullPath)
    } else if (isDirectory && !isExcluded) {

      const recursiveTargets = lockOnTargetsRecursively(fullPath, separateNestedProjects)
      if (recursiveTargets) {
        lockedOnTargets.push(...recursiveTargets)
      }

    }
  })

  return lockedOnTargets
}

const lockOnTargets = () => {

  const now = Date.now()
  const oldThreshold = now - timeThresholdDays * 24 * 60 * 60 * 1000

  const projectsKeys = [...projects.keys()]

  const lockedOnTargets = []
  const skippedProjects = []

  for (const [dir, mtime] of projects.entries()) {

    const separateNestedProjects = projectsKeys.filter(projectDir => (
      projectDir.startsWith(dir) && projectDir != dir
    ))

    if (mtime < oldThreshold) {
      const projectTargets = lockOnTargetsRecursively(dir, separateNestedProjects)
      if (projectTargets) {
        lockedOnTargets.push(...projectTargets)
      }
    } else {
      skippedProjects.push(dir)
    }
  }

  return {lockedOnTargets, skippedProjects}
}

const confirm = async (prompt) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  let answer = await rl.question(prompt + ' (y)')
  answer ||= 'y'
  const isYes = answer.toLowerCase() == 'y'
  rl.close()
  return isYes
}

const eliminate = (targets) => {
  for (const target of targets) {
    fs.rmSync(target, { recursive: true, force: true })
    console.log('🩸', chalk.dim('Deleted'), getRelativePath(target))
  }
}



const line = () => console.log(chalk.dim('-'.repeat(terminalWidth)))

const terminalWidth = process.stdout.columns

const header = figlet.textSync('NM CLEANUP', {
  font: 'shadow',
  width: terminalWidth
})

console.log(chalk.cyan(header))

console.log(chalk.bold.cyan('Starting the cleanup process...'))
console.log('⚙️ Dry run:', dryRun)
console.log('⚙️ Auto confirm:', autoYes)
console.log('⚙️ Root dir:', fullRootDir)
console.log('⚙️ Target name:', nameRegex)
console.log('⚙️ Ignore paths:', ignorePaths)
console.log('⚙️ Exclude dirs:', excludeRegex)
console.log('⚙️ Time threshold (days):', timeThresholdDays)
console.log('⚙️ Project indicator files:', projectIndicatorFiles)
console.log('⚙️ Separate nested projects:', shouldSeparateNestedProjects)

line()
console.log(chalk.bold.cyan('Scanning projects...'))

scanProjectsRecursive(fullRootDir)

line()
console.log(chalk.bold.cyan('Locking on targets in old projects...'))

const { lockedOnTargets, skippedProjects } = lockOnTargets()

skippedProjects.forEach(dir => {
  console.log('🥒', chalk.dim('Skip (fresh project)'), getRelativePath(dir))
})

line()

if (lockedOnTargets.length) {

  console.log(chalk.bold.cyan('Locked on targets'))
  lockedOnTargets.forEach(target => {
    console.log('🎯', chalk.red(getRelativePath(target)))
  })

  if (dryRun) {
    console.log('🤷‍♂️ Dry run.')
  } else {

    const confirmed = autoYes || await confirm('Eliminate targets?')
    if (confirmed) {
      line()
      console.log(chalk.bold.cyan('🗡️ Eliminating targets...'))
      eliminate(lockedOnTargets)
    } else {
      console.log('🙅‍♂️ Elimination cancelled by user.')
    }

  }
} else {
  console.log('🤷‍♂️ Nothing to clear - no targets found in old projects.')
}

console.log('✅ Done.')
