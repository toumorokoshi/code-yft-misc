import * as vscode from 'vscode';

export const DIALOG_OPTIONS = {
  openTitle: 'Select File to Download from SSH Host',
  openLabel: 'Select File',
  saveTitle: 'Select Save Location on Local Host',
  saveLabel: 'Download',
} as const;

export const LOCAL_SCHEME = 'vscode-local';

/**
 * Pure function: Translates a remote URI to a default local URI.
 * If remoteName is defined (running in a remote window), it uses the 'vscode-local' scheme.
 * Otherwise it preserves the original remote URI.
 */
export function getLocalDefaultUri(
  remoteUri: vscode.Uri,
  remoteName: string | undefined
): vscode.Uri {
  if (remoteName) {
    return vscode.Uri.from({
      scheme: LOCAL_SCHEME,
      path: remoteUri.path,
    });
  }
  return remoteUri;
}

/**
 * Main download file command handler (wrapper function managing UI and IO).
 */
export async function downloadFile(): Promise<void> {
  const selectedFiles = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: DIALOG_OPTIONS.openLabel,
    title: DIALOG_OPTIONS.openTitle,
  });

  if (!selectedFiles || selectedFiles.length === 0) {
    return;
  }

  const remoteUri = selectedFiles[0];
  const defaultLocalUri = getLocalDefaultUri(remoteUri, vscode.env.remoteName);

  const targetUri = await vscode.window.showSaveDialog({
    defaultUri: defaultLocalUri,
    saveLabel: DIALOG_OPTIONS.saveLabel,
    title: DIALOG_OPTIONS.saveTitle,
  });

  if (!targetUri) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Downloading file from remote host...',
      cancellable: false,
    },
    async () => {
      try {
        // IO operation: read file content from remote host
        const data = await vscode.workspace.fs.readFile(remoteUri);
        // IO operation: write file content to target destination (vscode-local or file scheme)
        await vscode.workspace.fs.writeFile(targetUri, data);
        vscode.window.showInformationMessage('Successfully downloaded file to local system.');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Failed to download file: ${errorMessage}`);
      }
    }
  );
}
