import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

export class PhpDefinitionProvider implements vscode.DefinitionProvider {
    // Default performance limits (can be overridden by user settings)
    private static readonly DEFAULT_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    private static readonly DEFAULT_EXCLUDE_PATTERN = '{**/vendor/**,**/node_modules/**,**/.git/**,**/cache/**,**/tmp/**}';

    /**
     * Get max file size from settings (in MB, converted to bytes)
     */
    private getMaxFileSize(): number {
        const config = vscode.workspace.getConfiguration('jumpToPhpDefinition');
        const sizeMB = config.get<number>('maxFileSize', 2);
        return sizeMB * 1024 * 1024;
    }

    /**
     * Get exclude pattern from settings
     */
    private getExcludePattern(): string {
        const config = vscode.workspace.getConfiguration('jumpToPhpDefinition');
        return config.get<string>('excludePattern', PhpDefinitionProvider.DEFAULT_EXCLUDE_PATTERN);
    }
    
    public async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | undefined> {
        // Early cancellation check
        if (token.isCancellationRequested) {
            return undefined;
        }

        const line = document.lineAt(position.line).text;

        // 1. Check if cursor is on a string path (get_template_part, include, require)
        const stringPathResult = await this.resolveStringPath(document, position, line, token);
        if (stringPathResult) {
            return stringPathResult;
        }

        // 2. Check for arrow method calls ($object->method)
        const arrowMethodResult = this.resolveArrowMethodCall(document, position, line);
        if (arrowMethodResult) {
            return this.findMethodDefinition(arrowMethodResult, document, token);
        }

        // 3. Handle regular definitions (functions, classes, variables)
        return this.resolveStandardDefinition(document, position, token);
    }

    /**
     * Resolve string paths in get_template_part(), include, require, etc.
     */
    private async resolveStringPath(
        document: vscode.TextDocument,
        position: vscode.Position,
        line: string,
        token: vscode.CancellationToken
    ): Promise<vscode.Location | undefined> {
        // Check if cursor is inside a string
        const stringInfo = this.getStringAtPosition(line, position.character);
        if (!stringInfo) {
            return undefined;
        }

        const { content: stringContent, start: stringStart } = stringInfo;
        const beforeString = line.substring(0, stringStart);

        // WordPress get_template_part()
        if (/get_template_part\s*\(\s*$/.test(beforeString)) {
            return this.resolveTemplatePart(stringContent, token);
        }

        // WordPress get_header(), get_footer(), get_sidebar()
        const wpTemplateMatch = beforeString.match(/get_(header|footer|sidebar)\s*\(\s*$/);
        if (wpTemplateMatch) {
            const templateType = wpTemplateMatch[1];
            const fileName = stringContent ? `${templateType}-${stringContent}.php` : `${templateType}.php`;
            return this.findFileInWorkspace(fileName, token);
        }

        // include, require, include_once, require_once
        if (/(include|require)(_once)?\s*\(?\s*$/.test(beforeString)) {
            return this.resolveIncludePath(stringContent, document, token);
        }

        // locate_template()
        if (/locate_template\s*\(\s*(array\s*\()?\s*$/.test(beforeString)) {
            return this.resolveTemplatePart(stringContent, token);
        }

        // Generic: if string looks like a file path
        if (stringContent.endsWith('.php') || (stringContent.includes('/') && !stringContent.includes(' '))) {
            const resolved = await this.resolveIncludePath(stringContent, document, token);
            if (resolved) {
                return resolved;
            }
            return this.resolveTemplatePart(stringContent, token);
        }

        return undefined;
    }

    /**
     * Get string content if cursor is inside a quoted string
     */
    private getStringAtPosition(line: string, charPos: number): { content: string; start: number } | undefined {
        const stringPattern = /(['"])((?:\\.|(?!\1)[^\\])*)\1/g;
        let match;

        while ((match = stringPattern.exec(line)) !== null) {
            const start = match.index + 1;
            const end = match.index + match[0].length - 1;

            if (charPos >= start && charPos <= end) {
                return { content: match[2], start: match.index };
            }
        }
        return undefined;
    }

    /**
     * Resolve WordPress get_template_part() paths
     */
    private async resolveTemplatePart(
        templatePath: string,
        token: vscode.CancellationToken
    ): Promise<vscode.Location | undefined> {
        if (token.isCancellationRequested || !templatePath) {
            return undefined;
        }

        const normalizedPath = templatePath.replace(/\\/g, '/');
        const phpFile = normalizedPath.endsWith('.php') ? normalizedPath : `${normalizedPath}.php`;
        return this.findFileInWorkspace(phpFile, token);
    }

    /**
     * Resolve include/require paths
     */
    private async resolveIncludePath(
        includePath: string,
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.Location | undefined> {
        if (token.isCancellationRequested || !includePath) {
            return undefined;
        }

        // Clean path from PHP constants
        const cleanPath = includePath
            .replace(/__DIR__\s*\.\s*['"]?/g, '')
            .replace(/^['"]|['"]$/g, '')
            .trim();

        // Resolve relative paths
        if (cleanPath.startsWith('./') || cleanPath.startsWith('../')) {
            const currentDir = path.dirname(document.uri.fsPath);
            const absolutePath = path.resolve(currentDir, cleanPath);

            try {
                await fs.access(absolutePath);
                return new vscode.Location(vscode.Uri.file(absolutePath), new vscode.Position(0, 0));
            } catch {
                // File not found at relative path
            }
        }

        return this.findFileInWorkspace(cleanPath, token);
    }

    /**
     * Find a file in workspace with limits
     */
    private async findFileInWorkspace(
        fileName: string,
        token: vscode.CancellationToken
    ): Promise<vscode.Location | undefined> {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const files = await vscode.workspace.findFiles(
            `**/${fileName}`,
            this.getExcludePattern(),
            1 // Limit to first match for performance
        );

        if (files.length > 0) {
            return new vscode.Location(files[0], new vscode.Position(0, 0));
        }
        return undefined;
    }

    /**
     * Extract method name from arrow call if cursor is on it
     */
    private resolveArrowMethodCall(
        document: vscode.TextDocument,
        position: vscode.Position,
        line: string
    ): string | undefined {
        const arrowPattern = /\$[a-zA-Z_]\w*->([a-zA-Z_]\w*)/g;
        let match;

        while ((match = arrowPattern.exec(line)) !== null) {
            const methodStart = match.index + match[0].length - match[1].length;
            const methodEnd = methodStart + match[1].length;

            if (position.character >= methodStart && position.character <= methodEnd) {
                return match[1];
            }
        }
        return undefined;
    }

    /**
     * Find method definition in workspace
     */
    private async findMethodDefinition(
        methodName: string,
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.Location | undefined> {
        const escapedName = this.escapeRegex(methodName);
        const pattern = new RegExp(`function\\s+${escapedName}\\s*\\(`);

        // Search current file first
        const localResult = this.findPatternInText(pattern, document.getText(), document.uri);
        if (localResult) {
            return localResult;
        }

        return this.findPatternInWorkspace(pattern, token);
    }

    /**
     * Standard definition resolution
     */
    private async resolveStandardDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | undefined> {
        // Word pattern that includes $
        const wordRange = document.getWordRangeAtPosition(
            position,
            /\$?[a-zA-Z_\x80-\xff][a-zA-Z0-9_\x80-\xff]*/
        );

        if (!wordRange) {
            return undefined;
        }

        const wordText = document.getText(wordRange);
        const isVariable = wordText.startsWith('$');

        if (token.isCancellationRequested) {
            return undefined;
        }

        const escapedWord = this.escapeRegex(wordText);
        let searchPattern: RegExp;

        if (isVariable) {
            searchPattern = new RegExp(
                `${escapedWord}\\s*=(?!=)|function\\s+\\w+\\s*\\([^)]*${escapedWord}`
            );
        } else {
            searchPattern = new RegExp(
                `function\\s+${escapedWord}\\s*\\(|class\\s+${escapedWord}\\b|interface\\s+${escapedWord}\\b|trait\\s+${escapedWord}\\b|const\\s+${escapedWord}\\b`
            );
        }

        // Search current file
        const localResult = this.findPatternInText(searchPattern, document.getText(), document.uri);
        if (localResult) {
            return localResult;
        }

        // Don't search workspace for variables
        if (isVariable) {
            return undefined;
        }

        return this.findPatternInWorkspace(searchPattern, token);
    }

    /**
     * Find pattern in text
     */
    private findPatternInText(pattern: RegExp, text: string, uri: vscode.Uri): vscode.Location | undefined {
        const lines = text.split('\n');
        const lineCount = Math.min(lines.length, 10000); // Limit lines to prevent hanging

        for (let i = 0; i < lineCount; i++) {
            const match = pattern.exec(lines[i]);
            if (match) {
                return new vscode.Location(uri, new vscode.Position(i, match.index));
            }
            pattern.lastIndex = 0;
        }
        return undefined;
    }

    /**
     * Find pattern in workspace with limits
     */
    private async findPatternInWorkspace(
        pattern: RegExp,
        token: vscode.CancellationToken
    ): Promise<vscode.Location | undefined> {
        const phpFiles = await vscode.workspace.findFiles(
            '**/*.php',
            this.getExcludePattern()
        );

        for (const file of phpFiles) {
            if (token.isCancellationRequested) {
                return undefined;
            }

            try {
                const stat = await fs.stat(file.fsPath);
                // Skip large files (configurable via settings)
                if (stat.size > this.getMaxFileSize()) {
                    continue;
                }

                const content = await fs.readFile(file.fsPath, 'utf8');
                const result = this.findPatternInText(pattern, content, file);
                if (result) {
                    return result;
                }
            } catch {
                // Skip files that can't be read
            }
        }

        return undefined;
    }

    /**
     * Escape special regex characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
} 