# Node Modules Cleanup

`nm-cleanup` is a customizable Node.js CLI tool designed to remove unnecessary directories from *outdated* projects.

![Screen recording of the example program run](https://s1.gifyu.com/images/S1YI4.gif)

## Why

Over time, projects accumulate unnecessary files and folders, especially large directories like `node_modules` that can take up significant disk space. When projects are no longer actively maintained or used, these directories become redundant, but you don't want to waste time on manually identifying and removing them.

`nm-cleanup` helps automate this process, saving you time and effort. It scans your directories, identifies unused or outdated project folders, and cleans up unnecessary files (like `node_modules`), freeing up valuable disk space.

The tool provides various options allowing to define what to clean up, which makes it suitable for a wide range of cleanup tasks beyond just `node_modules`.

💡 It's built with **flexibility** and **automation** in mind, so it's a great fit for both running manually and scheduled background execution, for example with cron.

![An accurate representation of node_modules directory size](https://i.imgur.com/yi0Ccv8.png")

## How It Works
- **Recursively scan** the specified root directory for project folders, as defined by the presence of project indicator files (e.g., `package.json`), defined with `--project`(`-p`) flag.
- **Check modification times** for each project based on its contents and skipping directories matching `--exclude`(`-x`) pattern.
- **Identify potential targets** within found projects. Target is any file or directory matching the `--name`(`-n`) pattern (e.g., `node_modules`).
- **Print scan results** categorizing projects into "fresh" and "old" with feedback on what was ignored, excluded, and most importantly, what targets were identified in each project. 
- **Prompt for confirmation** before deleting the targets *in the old projects*. This step can be skipped with `--yes`(`-y`) flag for automated usage.
- **Delete target directories** only in those projects that haven't been modified for a certain threshold of time that can be adjusted with `--time`(`-t`) (e.g., `30` days).

## Installation

Make sure you have Node.js installed on your machine. Then, install the tool globally:

```bash
npm install -g nm-cleanup
```

## Usage

```bash
nm-cleanup [rootDir] [options]
```
or with alias:
```bash
nmc [rootDir] [options]
```

`[rootDir]`: The root directory containing all your projects. Defaults to the current directory (`.`).

**Example**
```bash
nm-cleanup
```
or
```bash
nm-cleanup ~/projects
```

## Options

`nm-cleanup` provides a range of configurable options to allow flexible project cleanup. Below are detailed descriptions of each option and their usage.

### `-n, --name <regex>`

**Default**  
`node_modules`

Specifies a regex pattern to match directory names that should be removed.

Use this option when you want to clean up other types of folders besides `node_modules`.

**Example**
```bash
nm-cleanup --name 'dist|node_modules|\.cache'
```

### `-t, --time <days>`

**Default**  
`30`

Sets the threshold for how old a project should be (based on last modification time) before its directories are targeted for cleanup.

Use this option when you want to clean up projects that haven’t been modified for a specific period.

**Example**
```bash
nm-cleanup --time 60
```

### `-x, --exclude <regex>`

**Default**  
`^\.`

Excludes directories from the filesystem scan, preventing `nm-cleanup` from even entering those directories. By default all hidden directories are excluded.

Use this option to improve performance when you have large or unnecessary directories that don’t need to be scanned, like backups, archives, or directories you know won't contain target folders.

**Example**
```bash
nm-cleanup --exclude '^logs|backups'
```

### `-p, --project [filenames...]`

**Default**  
`package.json`

Defines the indicator files that mark a directory as a project. This allows `nm-cleanup` to treat any directory with these files as a project root.

Use this when working with projects that use different indicator files, such as `Cargo.toml` for Rust projects or `composer.json` for PHP projects.

**Example**
```bash
nm-cleanup --project composer.json gitlab-ci.yaml
```

### `-i, --ignore [paths...]`

**No default**

A list of paths to ignore during the cleanup process. This can include specific projects or nested directories.

Use this when you want to ensure that certain paths are never cleaned up.

**Example**
```bash
nm-cleanup --ignore projects/my-precious projects/special-project
```

### `-s, --separate-nested`

**Default**  
`false`

When this option is enabled, `nm-cleanup` treats nested projects as independent entities for the purpose of modification time measurement. This means that the modification time of nested projects is considered separately from their parent projects. If a parent project is deemed outdated based on the modification time, its target folders will be cleaned up, while the nested projects, if still fresh, will be preserved. 

Without this flag, the entire recursive structure of a project is managed as a single unit, meaning that all nested projects are taken into account when assessing whether the project as a whole should be cleaned up.

Use this option when you have a monorepo or a project structure with nested projects that you want to manage independently. This *allows the cleanup of parent and sibling projects if only some of the nested siblings is not outdated*.

**Example**
```bash
nm-cleanup --separate-nested
```

### `-y, --yes`

**Default**  
`false`

Skips the confirmation prompt and automatically proceeds with the cleanup.

Use this option when you want to run nm-cleanup in non-interactive environments, or life is to short to waste it on confirmation prompts.

**Example**
```bash
nm-cleanup --yes
```

### `-v, --verbose`

**Default**  
`targets`

Enables verbose output by category. When a category is enabled, all matched files and folders are printed. Otherwise, only the number of files in each category will be printed. Categories are: `targets`, `ignored`, `excluded` or `none`. By default only "targets" are enabled.

If no category options are provided (e.g., `nmc -v`), *vervosity is enabled for all categories*. If you don't want verbosity in any categories, set to `none`.

**Example**
```bash
nm-cleanup --verbose ignored targets
nm-cleanup --verbose
```

### `-e, --empty-targets`

**Default**  
`false`

Outputs all found projects, even if they don't have any targets to clean up.

**Example**
```bash
nm-cleanup --empty-targets
```

### `--dry-run`

**Default**  
`false`

Performs a dry run of the cleanup process, showing what would be deleted without actually making any changes.

Use this to safely check what the tool does or test custom options configurations.

```bash
nm-cleanup --dry-run
```

### `-h, --help`

Displays help information about the available commands and options.

### `-V, --version`

Displays version.

**Example**
```bash
nm-cleanup --help
```
