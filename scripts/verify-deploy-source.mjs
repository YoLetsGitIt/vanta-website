import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

try {
  // Generated exports are rebuilt below; application source must be committed.
  const changes = git('status', '--porcelain', '--untracked-files=all', '--', '.', ':!out');
  if (changes) throw new Error('Commit and push the website source before deploying. Uncommitted source could be lost in the next release.');

  const head = git('rev-parse', 'HEAD');
  const remote = git('ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0];
  if (!remote || head !== remote) throw new Error('Deploy from the latest committed origin/main. This checkout differs from the production source.');

  console.log(`Deployment source verified: ${head.slice(0, 12)}`);
} catch (error) {
  console.error(`Deployment stopped: ${error.message}`);
  process.exitCode = 1;
}
