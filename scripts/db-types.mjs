// Regenerates packages/db/src/types.ts from the local Supabase database (cross-platform, no shell redirect).
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const types = execFileSync('supabase', ['gen', 'types', 'typescript', '--local'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
writeFileSync('packages/db/src/types.ts', types);
console.log('wrote packages/db/src/types.ts');
