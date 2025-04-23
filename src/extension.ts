import * as vscode from 'vscode';
import { PhpDefinitionProvider } from './phpDefinitionProvider';

export function activate(context: vscode.ExtensionContext) {
    // Register the PHP definition provider
    const phpSelector = { language: 'php', scheme: 'file' };
    const provider = new PhpDefinitionProvider();
    
    // Register the provider for Cmd+click/Ctrl+click go to definition
    const definitionDisposable = vscode.languages.registerDefinitionProvider(phpSelector, provider);
    
    // Add disposables to context for cleanup on deactivation
    context.subscriptions.push(definitionDisposable);
    
    console.log('PHP Definition Provider is now active');
}

export function deactivate() {
    console.log('PHP Definition Provider has been deactivated');
} 