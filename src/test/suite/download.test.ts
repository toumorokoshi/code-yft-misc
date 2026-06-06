import * as assert from 'assert';
import * as vscode from 'vscode';
import { getLocalDefaultUri } from '../../download';

describe('Download Utility Tests', () => {
  it('should return vscode-local scheme when remoteName is defined', () => {
    const remoteUri = vscode.Uri.file('/tmp/file.txt');
    const resultUri = getLocalDefaultUri(remoteUri, 'ssh-remote');

    assert.strictEqual(resultUri.scheme, 'vscode-local');
    assert.strictEqual(resultUri.path, '/tmp/file.txt');
  });

  it('should return original file scheme when remoteName is undefined', () => {
    const remoteUri = vscode.Uri.file('/tmp/file.txt');
    const resultUri = getLocalDefaultUri(remoteUri, undefined);

    assert.strictEqual(resultUri.scheme, 'file');
    assert.strictEqual(resultUri.path, '/tmp/file.txt');
  });
});
