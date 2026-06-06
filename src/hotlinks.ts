import * as vscode from 'vscode';

/**
 * Slugifies a string for use as a markdown anchor.
 */
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w-]/g, '')   // Remove all non-word chars
        .replace(/--+/g, '-')     // Replace multiple - with single -
        .replace(/^-+/, '')       // Trim - from start of text
        .replace(/-+$/, '');      // Trim - from end of text
}

/**
 * Extracts headers from a markdown file to be used as anchors.
 */
async function extractHeaders(uri: vscode.Uri): Promise<{ label: string, anchor: string }[]> {
    try {
        const document = await vscode.workspace.openTextDocument(uri);
        const text = document.getText();
        const headerRegex = /^(#+)\s+(.+)$/gm;
        const headers: { label: string, anchor: string }[] = [];
        
        let match;
        while ((match = headerRegex.exec(text)) !== null) {
            const level = match[1].length;
            const title = match[2].trim();
            headers.push({
                label: `${'#'.repeat(level)} ${title}`,
                anchor: slugify(title)
            });
        }
        return headers;
    } catch {
        return [];
    }
}

/**
 * Inserts a wikilink [[filename#anchor]] into the active markdown document.
 * Provides a dropdown list of all markdown files in the workspace, and then
 * a second dropdown for headers within that file.
 */
export async function insertHotlink() {
    const files = await vscode.workspace.findFiles('**/*.md');
    
    if (files.length === 0) {
        vscode.window.showInformationMessage('No markdown files found in the workspace.');
        return;
    }

    const items = files.map(file => {
        const relativePath = vscode.workspace.asRelativePath(file);
        return {
            label: relativePath,
            description: file.fsPath,
            uri: file
        };
    });

    const selection = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a markdown file to link to',
        matchOnDescription: true
    });

    if (selection) {
        let anchor = '';
        const headers = await extractHeaders(selection.uri);
        
        if (headers.length > 0) {
            const anchorItems = [
                { label: '(no anchor)', anchor: '' },
                ...headers
            ];
            const anchorSelection = await vscode.window.showQuickPick(anchorItems, {
                placeHolder: 'Select an anchor (optional)'
            });
            
            // If user cancels the anchor selection, we still want to insert the file link
            // unless they explicitly escape or we decide otherwise. 
            // The prompt says "default choice of 'no anchor'", so if they pick that, anchor is ''.
            if (anchorSelection && anchorSelection.anchor) {
                anchor = `#${anchorSelection.anchor}`;
            } else if (!anchorSelection) {
                // User cancelled the anchor pick, let's just abort the whole thing 
                // to match typical VS Code UX for multi-step picks.
                return;
            }
        }

        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const label = selection.label;
            editor.edit(editBuilder => {
                editBuilder.insert(editor.selection.active, `[[${label}${anchor}]]`);
            });
        }
    }
}

/**
 * Command handler to open a hotlink and navigate to an anchor if specified.
 */
export async function openHotlink(uri: vscode.Uri, anchor?: string) {
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    if (anchor) {
        const text = document.getText();
        const headerRegex = /^(#+)\s+(.+)$/gm;
        let match;
        while ((match = headerRegex.exec(text)) !== null) {
            const title = match[2].trim();
            if (slugify(title) === anchor) {
                const line = document.lineAt(document.positionAt(match.index).line);
                editor.selection = new vscode.Selection(line.range.start, line.range.start);
                editor.revealRange(line.range, vscode.TextEditorRevealType.InCenter);
                return;
            }
        }
    }
}

/**
 * Provides clickable links for [[wikilink]] patterns in markdown files.
 * Uses the openHotlink command for reliable navigation to anchors.
 */
export class WikilinkProvider implements vscode.DocumentLinkProvider {
    async provideDocumentLinks(document: vscode.TextDocument): Promise<vscode.DocumentLink[]> {
        const links: vscode.DocumentLink[] = [];
        const text = document.getText();
        
        // Regex handles [[target]], [[target#anchor]], and [[target|label]]
        const wikilinkRegex = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
        
        let match;
        while ((match = wikilinkRegex.exec(text)) !== null) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);
            
            const target = match[1].trim();
            const anchor = match[2];
            
            // Search for the file in the workspace
            // We try both the exact path and appending .md if missing
            let files = await vscode.workspace.findFiles(target);
            if (files.length === 0 && !target.endsWith('.md')) {
                files = await vscode.workspace.findFiles(`**/${target}.md`);
            }
            if (files.length === 0) {
                // Try searching for the exact filename anywhere in workspace if it's not a path
                files = await vscode.workspace.findFiles(`**/${target}`);
            }

            if (files.length > 0) {
                const fileUri = files[0];
                // Instead of a direct file URI, we use a command URI to trigger openHotlink
                // The arguments must be JSON-stringified and URI-encoded
                const args = [fileUri, anchor];
                const commandUri = vscode.Uri.parse(
                    `command:yft-misc.openHotlink?${encodeURIComponent(JSON.stringify(args))}`
                );
                
                const link = new vscode.DocumentLink(range, commandUri);
                link.tooltip = `Open ${target}${anchor ? '#' + anchor : ''}`;
                links.push(link);
            }
        }
        
        return links;
    }
}
