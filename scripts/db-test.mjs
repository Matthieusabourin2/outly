// Runs migrations + demo seed + RLS smoke tests on a throwaway Postgres (no Docker).
// Finds Python whatever it is called on this OS (python3 on macOS/Linux, python or py on Windows).
import { spawnSync } from 'node:child_process';

const candidates = [['python3'], ['python'], ['py', '-3']];
for (const [cmd, ...pre] of candidates) {
  const probe = spawnSync(cmd, [...pre, '-c', 'import pgserver'], { stdio: 'ignore' });
  if (probe.status === 0) {
    const run = spawnSync(cmd, [...pre, 'supabase/tests/run_local.py'], { stdio: 'inherit' });
    process.exit(run.status ?? 1);
  }
}
console.error('Python 3 with pgserver not found. Install it with: pip install pgserver');
process.exit(1);
