import * as vscode from "vscode";
import { insertHotlink, WikilinkProvider } from "./hotlinks";

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

  const wikilinkProvider = vscode.languages.registerDocumentLinkProvider(
    { language: "markdown", scheme: "file" },
    new WikilinkProvider(),
  );

  context.subscriptions.push(helloWorld, insertHotlinkCmd, wikilinkProvider);
}

export function deactivate() {}
