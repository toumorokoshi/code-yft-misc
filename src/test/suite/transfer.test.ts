import * as assert from 'assert';
import * as vscode from 'vscode';
import { getLocalDefaultUri, getRemoteDefaultUri } from '../../transfer';

describe('Transfer Utility Tests', () => {
  describe('getLocalDefaultUri', () => {
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

  describe('getRemoteDefaultUri', () => {
    it('should return file scheme when remoteName is defined', () => {
      const localUri = vscode.Uri.from({ scheme: 'vscode-local', path: '/tmp/local.txt' });
      const resultUri = getRemoteDefaultUri(localUri, 'ssh-remote');

      assert.strictEqual(resultUri.scheme, 'file');
      assert.strictEqual(resultUri.path, '/tmp/local.txt');
    });

    it('should return original local scheme when remoteName is undefined', () => {
      const localUri = vscode.Uri.file('/tmp/local.txt');
      const resultUri = getRemoteDefaultUri(localUri, undefined);

      assert.strictEqual(resultUri.scheme, 'file');
      assert.strictEqual(resultUri.path, '/tmp/local.txt');
    });
  });
});
