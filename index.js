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
const DEFAULT_VERBOSE = ['targets']

// Initialize commander program
const program = new Command()

program
  .version('1.0.5')
  .description('A CLI tool to remove unnecessary directories from outdated projects')
  .argument('[rootDir]', 'Root directory for cleanup', '.')
  .option('-n, --name <regex>', 'Regex to match directory names', DEFAULT_NAME_REGEX)
  .option('-t, --time <days>', 'Days threshold for modification time', DEFAULT_TIME_THRESHOLD_DAYS)
  .option('-x, --exclude <regex>', 'Regex for directory names to exclude from recursive scan', DEFAULT_EXCLUDE)
  .option('-p, --project [filenames...]', 'Filenames of the project directory indicator files (space separated)', DEFAULT_PROJECT_INDICATOR_FILES)
  .option('-i, --ignore [paths...]', 'Paths to ignore (space separated)', DEFAULT_IGNORE)
  .option('-s, --separate-nested', 'Treat nested projects as separante projects', false)
  .option('-y, --yes', 'Auto Yes - no confirmation prompt', false)
  .option('-e, --empty-targets', 'Output projects even if they have zero targets', false)
  .option('--verbose [options...]', 'Enable detailed output by category. Options are "tagets", "ignored", "excluded" (space separated)', DEFAULT_VERBOSE)
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
const outputProjectsWithoutTargets = options.emptyTargets
const verboseOptions = options.verbose

const fullRootDir = path.resolve(process.cwd(), rootDir)

const now = Date.now()
const timeThresholdMs = timeThresholdDays * 24 * 60 * 60 * 1000
const oldThreshold = now - timeThresholdMs

/**
 * returns path relative to rootDir
 * @param {string} dir 
 * @returns {string}
 */
const getRelativePath = (dir) => {
  const lastParentDir = path.basename(fullRootDir)
  const relativePath = path.relative(fullRootDir, dir)
  return path.join(lastParentDir, relativePath)
};
/**
 * returns whether a path should be ignored based on --ignore argument(s)
 * @param {string} path 
 * @returns {boolean}
 */
const getIsIgnored = (path) => ignorePaths.some(ignorePath => path.includes(ignorePath))
/**
 * returns whether a path is a project based on --project indicator file presence
 * @param {string} dir 
 * @returns {boolean}
 */
const getIsProject = (dir) => projectIndicatorFiles.some(filename => fs.existsSync(path.join(dir, filename)))
/**
 * returns wherer project mtime is fresher than --time threshold
 * @param {Project} project 
 */
const getIsFresh = (project) =>  oldThreshold < project.mtime

/**
 * @typedef {object} Project
 * @property {string} path
 * @property {boolean} isIgnored
 * @property {number} mtime
 * @property {string[]} targets
 * @property {string[]} ignored
 * @property {string[]} excluded
 */
/** path : project info
 * @type {Project[]}
 */
const projects = []

/**
 * scans filesystem recursively to find projects and collect info
 * @param {string} dir 
 * @param {Project} [parentProject] 
 * @param {boolean} [isProject]
 */
const scanProjectsRecursive = (dir, parentProject, isProject) => {

  if (isProject === undefined) {
    isProject = getIsProject(dir)
  }

  if (
    isProject &&
    (!parentProject || shouldSeparateNestedProjects)
  ) {
    const project = {
      path: dir,
      isIgnored: false,
      mtime: 0,
      targets: [],
      ignored: [],
      excluded: []
    }
    projects.push(project)
    parentProject = project
  }

  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name)
  
    const isIgnored = getIsIgnored(fullPath)
  
    if (isIgnored) {
      parentProject.ignored.push(fullPath)
      // console.log('⏭️', chalk.dim('Skip (ignored)'), getRelativePath(fullPath))
      return
    }

    const isDirectory = entry.isDirectory()
    const isNestedProject = getIsProject(fullPath)

    if (!isNestedProject && parentProject) {
      const mtime = fs.statSync(fullPath).mtime.getTime()

      if (parentProject.mtime < mtime) {
        parentProject.mtime = mtime
      }
    }

    const isTarget = entry.name.match(nameRegex)
    const isExcluded = entry.name.match(excludeRegex)

    if (isTarget) {

      parentProject && parentProject.targets.push(fullPath)

    } else if (isExcluded) {

      parentProject && parentProject.excluded.push(fullPath)

    } else if (isDirectory) {

      scanProjectsRecursive(fullPath, parentProject, isNestedProject)

    }
  })
}

/**
 * returns whether the action is confirmed by user input
 * @returns {Promise<boolean>}
 */
const confirm = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  let answer = await rl.question('(Y/n)')
  answer ||= 'y'
  const isYes = answer.toLowerCase() == 'y'
  rl.close()
  return isYes
}

/**
 * delete targets from fs
 * @param {string[]} targets 
 */
const eliminate = (targets) => {
  for (const target of targets) {
    fs.rmSync(target, { recursive: true, force: true })
    console.log('🗡️', chalk.dim('Deleted'), getRelativePath(target))
  }
}


const line = () => console.log(chalk.dim('-'.repeat(terminalWidth)))

const terminalWidth = process.stdout.columns

const header = figlet.textSync('NM CLEANUP', {
  font: 'shadow',
  width: terminalWidth
})

console.log("\x1b[2J") // clear
console.log(chalk.cyan(header))

console.log('⚙️ Dry run:', dryRun)
console.log('⚙️ Auto confirm:', autoYes)
console.log('⚙️ Root dir:', fullRootDir)
console.log('⚙️ Target name:', nameRegex)
console.log('⚙️ Ignore paths:', ignorePaths)
console.log('⚙️ Exclude dirs:', excludeRegex)
console.log('⚙️ Time threshold (days):', timeThresholdDays)
console.log('⚙️ Project indicator files:', projectIndicatorFiles)
console.log('⚙️ Separate nested projects:', shouldSeparateNestedProjects)
console.log('⚙️ Output projects with 0 targets:', outputProjectsWithoutTargets)
console.log('⚙️ Verbosity:', verboseOptions)

line()
console.log(chalk.bold.cyan('Scanning projects...'))

scanProjectsRecursive(fullRootDir)

projects.sort((a, b) => b.mtime - a.mtime)

for (const project of projects) {
  if (!outputProjectsWithoutTargets && !project.targets.length) {
    continue
  }
  const isFresh = getIsFresh(project)
  let c = chalk
  if (isFresh || !project.targets.length) {
    c = c.dim
  }
  if (isFresh) {
    console.log('🥒', c('Fresh project'), c.bold.underline(getRelativePath(project.path)))
  } else {
    let oc = c
    if (project.targets.length) {
      oc = c.red
    }
    console.log('💀', c('Old project'), oc.bold.underline(getRelativePath(project.path)))
  }
  if (project.ignored.length) {
    console.log('  ⏭️', c.bold(`Ignored (${project.ignored.length})`))
    if (verboseOptions.includes('ignored')) {
      for (const ignored of project.ignored) {
        console.log(' ', c.dim(getRelativePath(ignored)))
      }
    }
  }
  if (project.excluded.length) {
    console.log('  ⏭️', c.bold(`Excluded (${project.excluded.length})`))
    if (verboseOptions.includes('excluded')) {
      for (const excluded of project.excluded) {
        console.log('   ', c.dim(getRelativePath(excluded)))
      }
    }
  }
  console.log('  🎯', c.bold(`Targets (${project.targets.length})`))
  // if (isFresh) {
  //   console.log('  ', c.italic('(Won\'t delete targets in this project as it\'s fresh)'))
  // }
  if (verboseOptions.includes('targets')) {
    for (const target of project.targets) {
      console.log('  ', c.red(getRelativePath(target)))
    }
  }
}

const confirmAndEliminate = async () => {

  const targetsToEliminate = projects.flatMap(project => {
    if (getIsFresh(project)) {
      return []
    } else {
      return project.targets
    }
  })

  if (!targetsToEliminate.length) {
    console.log('🤷‍♂️ Nothing to clear - no targets found in old projects.')
    return
  }

  let confirmed = autoYes
  if (!confirmed) {
    console.log('Clear 🎯', chalk.bold('Targets'), 'in 💀', chalk.bold('Old'), 'projects?')
    confirmed = await confirm()
  }
  if (confirmed) {
    console.log(chalk.bold.cyan('Clearing targets...'))
    eliminate(targetsToEliminate)
    console.log('✅ All targets successfully cleared.')
  } else {
    console.log('🙅‍♂️ Cancelled by user.')
  }

}

line()

if (dryRun) {
  console.log('🤷‍♂️ Dry run.')
} else {
  confirmAndEliminate()
}

