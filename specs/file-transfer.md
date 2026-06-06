# Remote-Local File Transfer Utilities

This document outlines the design and implementation details of the remote-local file transfer utilities (download and upload).

## Overview

When connected to a remote workspace (e.g. via SSH, WSL, or Dev Containers), the extension host runs in the remote environment while the user interface runs locally on the client. 
We provide two utilities to seamlessly transfer files across this remote-local boundary:
1. **Download**: From remote SSH host to local client host.
2. **Upload**: From local client host to remote SSH host.

## Design

### 1. Download File (Remote to Local)

- **Source Selection**: Triggered via `vscode.window.showOpenDialog`. Since the extension runs remotely, it defaults to browsing the remote SSH filesystem.
- **Destination Selection**: Triggered via `vscode.window.showSaveDialog`. To target the local filesystem, the `defaultUri` is constructed with the `vscode-local` scheme:
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
- **Execution**: The bytes are read from the remote `file` URI and written to the local `vscode-local` URI via `vscode.workspace.fs`.

### 2. Upload File (Local to Remote)

- **Source Selection**: Triggered via `vscode.window.showOpenDialog`. To open the browser on the local filesystem, we pass a `defaultUri` with the `vscode-local` scheme.
- **Destination Selection**: Triggered via `vscode.window.showSaveDialog`. To target the remote filesystem, the `defaultUri` is constructed with the `file` scheme:
  ```typescript
  export function getRemoteDefaultUri(
    localUri: vscode.Uri,
    remoteName: string | undefined
  ): vscode.Uri {
    if (remoteName) {
      return vscode.Uri.from({
        scheme: 'file',
        path: localUri.path,
      });
    }
    return localUri;
  }
  ```
- **Execution**: The bytes are read from the local `vscode-local` URI and written to the remote `file` URI via `vscode.workspace.fs`.

## Testing Configuration

Due to virtualized/headless environments crashing with a `SIGSEGV` when running `@vscode/test-electron` on Linux, the test suite is configured with:
- The target VS Code version pinned to `1.85.0`.
- Launch arguments to disable GPU capabilities, sandbox environments, and crashpad reporting:
  - `--disable-gpu`
  - `--disable-gpu-sandbox`
  - `--no-sandbox`
  - `--disable-crash-reporter`
  - `--disable-crashpad`
