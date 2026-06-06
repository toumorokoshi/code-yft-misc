# Remote to Local File Download Utility

This document outlines the design and implementation details of the remote-to-local file download utility.

## Overview

When running VS Code via Remote - SSH, the extension host runs on the remote server while the UI rendering (client) runs locally. A common need is downloading a file on the SSH host to the user's local system.

## Design

### 1. Selection on the Remote Host
We use the standard `vscode.window.showOpenDialog` to prompt the user to select the source file. Since the extension host runs on the remote host, the dialog naturally presents files on the remote SSH server.

### 2. Destination Selection on the Local Host
To prompt the user for the local destination, we use `vscode.window.showSaveDialog`.
By default, the dialog would present the remote filesystem. However, by constructing a `defaultUri` with the scheme `vscode-local`, VS Code's save dialog is instructed to target the local filesystem.

The path is preserved to satisfy the requirement that the default location is the same path as the remote location:

```typescript
export function getLocalDefaultUri(
  remoteUri: vscode.Uri,
  remoteName: string | undefined
): vscode.Uri {
  if (remoteName) {
    return vscode.Uri.from({
      scheme: 'vscode-local',
      path: remoteUri.path,
    });
  }
  return remoteUri;
}
```

### 3. File Transfer
To write the file content across the remote-local boundary, we read the bytes from the remote `file` URI and write them to the local `vscode-local` URI using `vscode.workspace.fs`.

```typescript
const data = await vscode.workspace.fs.readFile(remoteUri);
await vscode.workspace.fs.writeFile(targetUri, data);
```

The VS Code filesystem provider handles the transmission of the byte array transparently.

## Testing Configuration

Due to virtualized/headless environments crashing with a `SIGSEGV` when running `@vscode/test-electron` on Linux, the test suite is configured with:
- The target VS Code version pinned to `1.85.0` (matching the minimum engine version).
- Launch arguments to disable GPU capabilities, sandbox environments, and crashpad reporting:
  - `--disable-gpu`
  - `--disable-gpu-sandbox`
  - `--no-sandbox`
  - `--disable-crash-reporter`
  - `--disable-crashpad`
