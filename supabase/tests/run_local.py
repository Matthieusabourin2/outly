"""Run migrations + demo seed + RLS smoke tests on a throwaway Postgres (no Docker needed).
Requires: pip install pgserver (and tzdata on Windows).  Usage: python3 supabase/tests/run_local.py
pgcrypto/citext are stubbed here only because pgserver ships without contrib; Supabase has both."""
import glob, os, shutil, subprocess, sys, tempfile
import pgserver

base = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
bindir = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')
psql = shutil.which('psql') or os.path.join(bindir, 'psql')


def ensure_timezones():
    """The Windows pgserver build ships without share/timezone, so 'Australia/Sydney' is unknown.
    Fill it from the tzdata package: same compiled IANA files Postgres reads. No-op elsewhere."""
    sharedir = subprocess.run([os.path.join(bindir, 'pg_config'), '--sharedir'], capture_output=True, text=True, check=True).stdout.strip()
    target = os.path.join(sharedir, 'timezone')
    if os.path.isdir(target):
        return
    try:
        import tzdata
    except ImportError:
        sys.exit('pgserver has no time zone data on this machine. Run: pip install tzdata  (then re-run pnpm db:test)')
    src = os.path.join(os.path.dirname(tzdata.__file__), 'zoneinfo')
    shutil.copytree(src, target, ignore=shutil.ignore_patterns('*.py', '__pycache__', '*.zi', '*.tab'))
    print('== installed time zone data into', target)


ensure_timezones()
d = tempfile.mkdtemp()
srv = pgserver.get_server(d, cleanup_mode='stop')
uri = srv.get_uri()

migrations = sorted(glob.glob(os.path.join(base, 'migrations', '*.sql')))
files = [os.path.join(base, 'tests', 'supabase_stub.sql'), *migrations,
         os.path.join(base, 'tests', 'stub_grants.sql'), os.path.join(base, 'seed_demo.sql'),
         os.path.join(base, 'tests', 'rls_smoke.sql')]

oks = 0
for path in files:
    name = os.path.relpath(path, base).replace(os.sep, '/')
    if name.startswith('migrations/'):
        sql = open(path, encoding='utf-8').read()
        sql = sql.replace('create extension if not exists pgcrypto;', "create or replace function gen_random_bytes(n int) returns bytea language sql volatile as $$ select decode(substr(md5(random()::text)||md5(random()::text),1,n*2),'hex') $$;")
        sql = sql.replace('create extension if not exists citext;', 'create domain citext as text;')
        path = os.path.join(d, os.path.basename(path))
        open(path, 'w', encoding='utf-8').write(sql)
    # Options before the connection string: psql on Windows ignores everything after the first non-option argument.
    r = subprocess.run([psql, '-X', '-v', 'ON_ERROR_STOP=1', '-q', '-f', path, '-d', uri], capture_output=True, text=True)
    print('==', name, 'rc', r.returncode)
    out = (r.stdout + r.stderr).strip()
    if out: print(out[-4000:])
    if 'FAILED' in out or 'warning: extra command-line argument' in out: sys.exit(1)
    if r.returncode: sys.exit(r.returncode)
    oks += out.count(' ok')

# Guard against a silent no-op run: the smoke tests must actually report passing checks.
if oks == 0:
    sys.exit('No test reported "ok": the SQL files were probably not executed.')
print(f'== {oks} checks ok')
