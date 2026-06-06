import * as vscode from "vscode";
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
    wikilinkProvider,
  );
}

export function deactivate() {}
