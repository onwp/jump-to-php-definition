# Jump to PHP Definition

A lightweight VS Code extension that provides Go to Definition functionality for PHP files. Navigate to definitions of PHP variables, functions, classes, constants, and **WordPress template files** using Cmd+click (Mac) or Ctrl+click (Windows).

## Features

- **Go to definition** for PHP functions, classes, methods, variables, and constants
- **WordPress template support** - Cmd+click on `get_template_part()` paths to open template files
- **Include/require resolution** - Navigate to files in `include`, `require`, `include_once`, `require_once` statements
- **Arrow method calls** - Jump to method definitions from `$object->method()` calls
- **WordPress functions** - Support for `get_header()`, `get_footer()`, `get_sidebar()`, `locate_template()`

## Usage

Hold down **Cmd** (Mac) or **Ctrl** (Windows) and click on:

| Element | Example | Action |
|---------|---------|--------|
| Template path | `get_template_part('components/header/nav')` | Opens `components/header/nav.php` |
| Include path | `include('includes/functions.php')` | Opens `includes/functions.php` |
| Function | `my_function()` | Jumps to function definition |
| Class | `new MyClass()` | Jumps to class definition |
| Method | `$this->getData()` | Jumps to method definition |
| Variable | `$myVariable` | Jumps to variable assignment |

## Extension Settings

Configure via **Settings > Extensions > Jump to PHP Definition**:

| Setting | Default | Description |
|---------|---------|-------------|
| `jumpToPhpDefinition.maxFileSize` | `2` | Maximum file size to search (in MB). Larger files are skipped for performance. |
| `jumpToPhpDefinition.excludePattern` | `{**/vendor/**,...}` | Glob pattern for directories to exclude from search. |

### Default Exclusions

The following directories are excluded by default:
- `vendor/`
- `node_modules/`
- `.git/`
- `cache/`
- `tmp/`

## Requirements

- VS Code 1.74.0 or higher

## Changelog

### 0.2.0
- Added WordPress `get_template_part()` support
- Added `include`/`require` path resolution
- Added arrow method call (`->`) support
- Added `get_header()`, `get_footer()`, `get_sidebar()` support
- Added `locate_template()` support
- Added user-configurable settings for max file size and exclusions
- Fixed variable detection (now properly handles `$` prefix)
- Improved performance with async file reading
- Added cancellation support for long searches
- Removed unused code

### 0.1.0
- Initial release

## Development

1. Clone the repository
2. Run `npm install`
3. Press F5 to start debugging the extension in a new VS Code window

## Building

```bash
npm run package
```

This creates a `.vsix` file that can be installed in VS Code.
