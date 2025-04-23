# Jump to PHP Definition

A lightweight VS Code extension that provides Go to Definition functionality for PHP files. This extension allows you to quickly navigate to definitions of PHP variables, functions, classes, and constants using Cmd+click (Mac) or Ctrl+click (Windows).

## Features

- Go to definition for PHP functions
- Go to definition for PHP classes
- Go to definition for PHP methods
- Go to definition for PHP variables

## Usage

Simply hold down Cmd (Mac) or Ctrl (Windows) and click on any PHP element to jump to its definition.

## Requirements

- VS Code 1.74.0 or higher

## Extension Settings

This extension does not contribute any settings.

## Known Issues

- Limited support for complex inheritance structures
- No support for trait resolution
- Limited namespace resolution

## Development

1. Clone the repository
2. Run `npm install`
3. Press F5 to start debugging the extension in a new VS Code window

## Building

1. Run `npm run package` to create a VSIX file
2. Install the VSIX file in VS Code