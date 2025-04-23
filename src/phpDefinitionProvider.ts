import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class PhpDefinitionProvider implements vscode.DefinitionProvider {
    // Regular expressions for identifying PHP elements
    private functionRegex = /function\s+([a-zA-Z_\x80-\xff][a-zA-Z0-9_\x80-\xff]*)\s*\(/g;
    private classRegex = /class\s+([a-zA-Z_\x80-\xff][a-zA-Z0-9_\x80-\xff]*)/g;
    private methodRegex = /function\s+([a-zA-Z_\x80-\xff][a-zA-Z0-9_\x80-\xff]*)\s*\(/g;
    private variableRegex = /\$([a-zA-Z_\x80-\xff][a-zA-Z0-9_\x80-\xff]*)/g;
    private constantRegex = /const\s+([a-zA-Z_\x80-\xff][a-zA-Z0-9_\x80-\xff]*)/g;
    private propertyRegex = /(?:public|protected|private)\s+\$([a-zA-Z_\x80-\xff][a-zA-Z0-9_\x80-\xff]*)/g;
    private namespaceRegex = /namespace\s+([a-zA-Z_\x80-\xff\\][a-zA-Z0-9_\x80-\xff\\]*)/g;
    private useRegex = /use\s+([a-zA-Z_\x80-\xff\\][a-zA-Z0-9_\x80-\xff\\]*)/g;
    
    public async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | undefined> {
        // Get the word at the current position
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return undefined;
        }
        
        // Get the text of the word
        const wordText = document.getText(wordRange);
        
        // Check if it's a variable (starts with $)
        const isVariable = document.getText(new vscode.Range(
            new vscode.Position(wordRange.start.line, Math.max(0, wordRange.start.character - 1)),
            wordRange.start
        )) === '$';
        
        // The text we're looking for (with or without $ for variables)
        const searchText = isVariable ? `$${wordText}` : wordText;
        
        // Get the whole document text for local search
        const docText = document.getText();
        
        // Try to find the definition in the current file first
        const localDefinition = this.findDefinitionInText(searchText, docText, document.uri, isVariable);
        if (localDefinition) {
            return localDefinition;
        }
        
        // If not found in current file, search in workspace
        return this.findDefinitionInWorkspace(searchText, isVariable);
    }
    
    private findDefinitionInText(
        searchText: string,
        text: string,
        uri: vscode.Uri,
        isVariable: boolean
    ): vscode.Location | undefined {
        let match;
        let regex;
        
        // Choose the appropriate regex based on what we're looking for
        if (isVariable) {
            // For variables, look for declarations like $varName = ... or function params
            regex = new RegExp(`\\${searchText}\\s*=|function\\s+[^(]*\\(([^)]*(,\\s*)?\\${searchText}(\\s*,|\\s*\\)))`);
        } else if (searchText.includes('::')) {
            // For static method/property calls (Class::method)
            const parts = searchText.split('::');
            const className = parts[0];
            const memberName = parts[1];
            regex = new RegExp(`class\\s+${className}[^{]*{[^}]*(function\\s+${memberName}\\s*\\(|\\$${memberName}\\s*=)`);
        } else {
            // For functions, classes, constants
            regex = new RegExp(`function\\s+${searchText}\\s*\\(|class\\s+${searchText}\\b|const\\s+${searchText}\\b`);
        }
        
        // Find all matches
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (regex.test(line)) {
                // Found a potential definition
                const charIndex = line.indexOf(searchText.replace(/^\$/, ''));
                if (charIndex >= 0) {
                    return new vscode.Location(
                        uri,
                        new vscode.Position(i, charIndex)
                    );
                }
            }
        }
        
        return undefined;
    }
    
    private async findDefinitionInWorkspace(
        searchText: string,
        isVariable: boolean
    ): Promise<vscode.Location | undefined> {
        // Only search for non-variable items in workspace (variables are usually local)
        if (isVariable) {
            return undefined;
        }
        
        // Find all PHP files in the workspace
        const phpFiles = await vscode.workspace.findFiles('**/*.php', '**/vendor/**');
        
        for (const file of phpFiles) {
            try {
                // Read each file
                const content = fs.readFileSync(file.fsPath, 'utf8');
                
                // Try to find the definition in this file
                const definition = this.findDefinitionInText(searchText, content, file, isVariable);
                if (definition) {
                    return definition;
                }
            } catch (error) {
                console.error(`Error reading file ${file.fsPath}:`, error);
            }
        }
        
        return undefined;
    }
} 