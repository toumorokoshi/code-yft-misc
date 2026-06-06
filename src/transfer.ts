import * as vscode from 'vscode';

export const DIALOG_OPTIONS = {
  download: {
    openTitle: 'Select File to Download from SSH Host',
    openLabel: 'Select File',
    saveTitle: 'Select Save Location on Local Host',
    saveLabel: 'Download',
  },
  upload: {
    openTitle: 'Select File to Upload from Local Host',
    openLabel: 'Select File',
    saveTitle: 'Select Save Location on SSH Host',
    saveLabel: 'Upload',
  },
} as const;

export const LOCAL_SCHEME = 'vscode-local';
export const REMOTE_SCHEME = 'file';

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
 * Pure function: Translates a local URI to a default remote URI.
 * If remoteName is defined (running in a remote window), it uses the 'file' scheme.
 * Otherwise it preserves the original local URI.
 */
export function getRemoteDefaultUri(
  localUri: vscode.Uri,
  remoteName: string | undefined
): vscode.Uri {
  if (remoteName) {
    return vscode.Uri.from({
      scheme: REMOTE_SCHEME,
      path: localUri.path,
    });
  }
  return localUri;
}

/**
 * Main download file command handler (wrapper function managing UI and IO).
 */
export async function downloadFile(): Promise<void> {
  const selectedFiles = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: DIALOG_OPTIONS.download.openLabel,
    title: DIALOG_OPTIONS.download.openTitle,
  });

  if (!selectedFiles || selectedFiles.length === 0) {
    return;
  }

  const remoteUri = selectedFiles[0];
  const defaultLocalUri = getLocalDefaultUri(remoteUri, vscode.env.remoteName);

  const targetUri = await vscode.window.showSaveDialog({
    defaultUri: defaultLocalUri,
    saveLabel: DIALOG_OPTIONS.download.saveLabel,
    title: DIALOG_OPTIONS.download.saveTitle,
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

/**
 * Main upload file command handler (wrapper function managing UI and IO).
 */
export async function uploadFile(): Promise<void> {
  const defaultLocalUri = vscode.Uri.from({
    scheme: vscode.env.remoteName ? LOCAL_SCHEME : REMOTE_SCHEME,
    path: '/',
  });

  const selectedFiles = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: DIALOG_OPTIONS.upload.openLabel,
    title: DIALOG_OPTIONS.upload.openTitle,
    defaultUri: defaultLocalUri,
  });

  if (!selectedFiles || selectedFiles.length === 0) {
    return;
  }

  const localUri = selectedFiles[0];
  const defaultRemoteUri = getRemoteDefaultUri(localUri, vscode.env.remoteName);

  const targetUri = await vscode.window.showSaveDialog({
    defaultUri: defaultRemoteUri,
    saveLabel: DIALOG_OPTIONS.upload.saveLabel,
    title: DIALOG_OPTIONS.upload.saveTitle,
  });

  if (!targetUri) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Uploading file to remote host...',
      cancellable: false,
    },
    async () => {
      try {
        // IO operation: read file content from local host
        const data = await vscode.workspace.fs.readFile(localUri);
        // IO operation: write file content to remote host
        await vscode.workspace.fs.writeFile(targetUri, data);
        vscode.window.showInformationMessage('Successfully uploaded file to remote host.');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Failed to upload file: ${errorMessage}`);
      }
    }
  );
}
