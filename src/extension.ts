import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "yft-misc" is now active!');

	const disposable = vscode.commands.registerCommand('yft-misc.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from YFT Misc!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
