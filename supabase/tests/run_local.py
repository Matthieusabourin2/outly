"""Run migrations + demo seed + RLS smoke tests on a throwaway Postgres (no Docker needed).
Requires: pip install pgserver.  Usage: python3 supabase/tests/run_local.py
pgcrypto/citext are stubbed here only because pgserver ships without contrib; Supabase has both."""
import sys
import pgserver, subprocess, os, tempfile, shutil
d = tempfile.mkdtemp()
srv = pgserver.get_server(d, cleanup_mode='stop')
uri = srv.get_uri()
base = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
files = ['tests/supabase_stub.sql','migrations/0001_init.sql','tests/stub_grants.sql','seed_demo.sql','tests/rls_smoke.sql']
psql = shutil.which('psql') or os.path.join(os.path.dirname(pgserver.__file__),'pginstall','bin','psql')
mig=open(base+'migrations/0001_init.sql').read()
mig=mig.replace('create extension if not exists pgcrypto;', "create or replace function gen_random_bytes(n int) returns bytea language sql volatile as $$ select decode(substr(md5(random()::text)||md5(random()::text),1,n*2),'hex') $$;")
mig=mig.replace('create extension if not exists citext;', 'create domain citext as text;')
open(os.path.join(d,'mig_test.sql'),'w').write(mig)
for f in files:
    path = os.path.join(d,'mig_test.sql') if f.startswith('migrations') else base+f
    r = subprocess.run([psql, uri, '-v','ON_ERROR_STOP=1','-q','-f', path], capture_output=True, text=True)
    print('==', f, 'rc', r.returncode)
    out = (r.stdout + r.stderr).strip()
    if out: print(out[-4000:])
    if 'FAILED' in out: sys.exit(1)
    if r.returncode: sys.exit(r.returncode)
