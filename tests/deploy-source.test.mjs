import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('deployment requires clean source at the published main revision', () => {
  const directory = mkdtempSync(join(tmpdir(), 'vanta-deploy-test-'));
  const repository = join(directory, 'source');
  const remote = join(directory, 'origin.git');
  const guard = new URL('../scripts/verify-deploy-source.mjs', import.meta.url);
  mkdirSync(repository);
  const git = (...args) => execFileSync('git', args, { cwd: repository, stdio: 'pipe' });
  const check = () => spawnSync(process.execPath, [guard.pathname], { cwd: repository, encoding: 'utf8' });
  try {
    git('init', '--bare', remote);
    git('init', '-b', 'main');
    git('config', 'user.name', 'Deployment test');
    git('config', 'user.email', 'deployment-test@example.invalid');
    git('remote', 'add', 'origin', remote);
    mkdirSync(join(repository, 'out'));
    writeFileSync(join(repository, 'page.js'), 'current design');
    writeFileSync(join(repository, 'out/index.html'), 'generated export');
    git('add', '.');
    git('commit', '-m', 'Current website source');
    git('push', 'origin', 'main');
    assert.equal(check().status, 0, 'Committed current source can deploy');

    writeFileSync(join(repository, 'out/index.html'), 'rebuilt export');
    assert.equal(check().status, 0, 'Generated output does not block a source release');

    writeFileSync(join(repository, 'page.js'), 'uncommitted design');
    assert.equal(check().status, 1, 'Modified source cannot deploy');
    git('restore', 'page.js');

    writeFileSync(join(repository, 'new-component.js'), 'unsaved source');
    assert.equal(check().status, 1, 'Untracked application files cannot deploy');
    rmSync(join(repository, 'new-component.js'));

    writeFileSync(join(repository, 'page.js'), 'next design');
    git('add', 'page.js');
    git('commit', '-m', 'Next design');
    assert.equal(check().status, 1, 'Source must be pushed before publication');
    git('push', 'origin', 'main');
    assert.equal(check().status, 0);
    git('reset', '--hard', 'HEAD~1');
    assert.equal(check().status, 1, 'An older checkout cannot overwrite the published design');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
