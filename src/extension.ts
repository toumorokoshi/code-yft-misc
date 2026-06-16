import * as vscode from "vscode";
import * as os from "os";
import { insertHotlink, WikilinkProvider, openHotlink } from "./hotlinks";
import { downloadFile, uploadFile } from "./transfer";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "yft-misc" is now active!');

  const helloWorld = vscode.commands.registerCommand(
    "yft-misc.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello World from YFT Misc!");
    },
  );

  const insertHotlinkCmd = vscode.commands.registerCommand(
    "yft-misc.insertHotlink",
    insertHotlink,
  );

  const openHotlinkCmd = vscode.commands.registerCommand(
    "yft-misc.openHotlink",
    openHotlink,
  );

  const downloadFileCmd = vscode.commands.registerCommand(
    "yft-misc.downloadFile",
    downloadFile,
  );

  const uploadFileCmd = vscode.commands.registerCommand(
    "yft-misc.uploadFile",
    uploadFile,
  );

  const installVsixFromOpenvsxCmd = vscode.commands.registerCommand(
    "yft-misc.installVsixFromOpenvsx",
    installVsixFromOpenvsx,
  );

  const wikilinkProvider = vscode.languages.registerDocumentLinkProvider(
    { language: "markdown", scheme: "file" },
    new WikilinkProvider(),
  );

  context.subscriptions.push(
    helloWorld,
    insertHotlinkCmd,
    openHotlinkCmd,
    downloadFileCmd,
    uploadFileCmd,
    installVsixFromOpenvsxCmd,
    wikilinkProvider,
  );
}

export function deactivate() {}

async function installVsixFromOpenvsx() {
  // First, try to get extension name from user
  const input = await vscode.window.showInputBox({
    prompt: "Enter extension name (e.g., yft.code-hivemind) or search term",
    placeHolder: "publisher.extension",
  });

  if (!input) {
    return;
  }

  let extensions: OpenvsxExtension[] = [];

  // If input looks like a full extension name (contains dot), try to fetch directly first
  if (input.includes(".")) {
    const parts = input.split(".");
    if (parts.length >= 2) {
      const namespace = parts[0];
      const name = parts.slice(1).join(".");
      try {
        const apiEndpoint = `https://open-vsx.org/api/${namespace}/${name}`;
        const response = await fetch(apiEndpoint);

        if (response.ok) {
          const data = (await response.json()) as { namespace: string; name: string; version: string };
          extensions = [
            {
              name: `${data.namespace}.${data.name}`,
              publisher: { name: data.namespace },
              version: data.version,
              namespace: data.namespace,
              extName: data.name,
            },
          ];
        }
      } catch {
        // Ignore errors, will fall back to search
      }
    }
  }

  // If no direct fetch or need to search for similar extensions
  if (extensions.length === 0) {
    extensions = await queryOpenvsxExtensions(input);
  }

  if (!extensions || extensions.length === 0) {
    vscode.window.showInformationMessage("No extensions found on openvsx.");
    return;
  }

  // If only one extension was found (direct fetch), use it directly
  let selectedExtension: OpenvsxExtension;
  if (extensions.length === 1) {
    selectedExtension = extensions[0];
  } else {
    // Show quick pick with similar extensions
    const selected = await vscode.window.showQuickPick(
      extensions.map((ext) => ({
        label: ext.name,
        description: ext.publisher?.name || "",
        detail: `Version: ${ext.version} | Downloads: ${ext.downloadCount ?? "N/A"}`,
        extension: ext,
      })),
      {
        placeHolder: "Select an extension to install",
      },
    );

    if (!selected) {
      return;
    }

    selectedExtension = selected.extension;
  }

  const extensionName = selectedExtension.name;
  const namespace = selectedExtension.namespace || "";
  const extName = selectedExtension.extName || "";

  // Show progress
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Installing ${extensionName} from openvsx`,
      cancellable: false,
    },
    async (progress) => {
      try {
        // Fetch extension info from openvsx API
        progress.report({ message: "Fetching extension info..." });
        const apiEndpoint = `https://open-vsx.org/api/${namespace}/${extName}`;
        const response = await fetch(apiEndpoint);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Extension "${extensionName}" not found on openvsx`);
          }
          throw new Error(`Failed to fetch extension info: ${response.statusText}`);
        }

        const data = (await response.json()) as { version: string };
        const latestVersion = data.version;

        // Download the .vsix file
        progress.report({ message: `Downloading version ${latestVersion}...` });
        const downloadUrl = `https://open-vsx.org/api/${namespace}/${extName}/${latestVersion}/file/${extensionName}-${latestVersion}.vsix`;
        const vsixResponse = await fetch(downloadUrl);

        if (!vsixResponse.ok) {
          throw new Error(`Failed to download .vsix file: ${vsixResponse.statusText}`);
        }

        const vsixBuffer = await vsixResponse.arrayBuffer();

        // Create a temporary file for the .vsix
        const tempFile = vscode.Uri.joinPath(
          vscode.Uri.file(os.tmpdir()),
          `${extensionName}-${latestVersion}.vsix`,
        );

        // Write the .vsix file to disk
        await vscode.workspace.fs.writeFile(tempFile, new Uint8Array(vsixBuffer));

        // Install the extension from the temporary file
        progress.report({ message: "Installing extension..." });
        await vscode.commands.executeCommand(
          "workbench.extensions.installExtension",
          tempFile,
        );

        vscode.window.showInformationMessage(
          `Successfully installed ${extensionName}`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(
          `Failed to install ${extensionName}: ${errorMessage}`,
        );
        throw error;
      }
    },
  );
}

interface OpenvsxExtension {
  name: string;
  publisher?: { name: string };
  version: string;
  downloadCount?: number;
  namespace?: string;
  extName?: string;
}

async function queryOpenvsxExtensions(query?: string): Promise<OpenvsxExtension[]> {
  // Get extension name prefix from user if not provided
  const searchQuery = query ?? await vscode.window.showInputBox({
    prompt: "Enter extension name or prefix to search (min 3 characters)",
    placeHolder: "extension name prefix",
  });

  if (!searchQuery || searchQuery.length < 3) {
    if (searchQuery && searchQuery.length > 0) {
      vscode.window.showInformationMessage(
        "Please enter at least 3 characters to search for extensions.",
      );
    }
    return [];
  }

  try {
    // Query openvsx API for extensions matching the query
    const searchUrl = `https://open-vsx.org/api/-/search?query=${encodeURIComponent(searchQuery)}&limit=50`;
    const response = await fetch(searchUrl);

    if (!response.ok) {
      throw new Error(`Failed to search extensions: ${response.statusText}`);
    }

    const data = (await response.json()) as { offset: number; totalSize: number; extensions: Array<{ name: string; namespace: string; version: string; downloadCount?: number }> };
    const results = data.extensions;

    return results.map((result) => ({
      name: `${result.namespace}.${result.name}`,
      publisher: { name: result.namespace },
      version: result.version,
      downloadCount: result.downloadCount,
      namespace: result.namespace,
      extName: result.name,
    }));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(
      `Failed to search extensions: ${errorMessage}`,
    );
    return [];
  }
}
