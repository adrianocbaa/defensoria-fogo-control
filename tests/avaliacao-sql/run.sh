#!/usr/bin/env bash
# Testes de integração SQL do módulo Avaliações em um PostgreSQL local descartável.
# Uso: bash tests/avaliacao-sql/run.sh [migration_extra.sql ...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIR="$(mktemp -d /tmp/avalpg.XXXX)"; chmod 777 "$DIR"
PORT="${AVAL_PG_PORT:-54329}"
as_pg() { runuser -u nobody -- "$@"; }
as_pg initdb -D "$DIR/data" -A trust -U postgres >/dev/null
as_pg pg_ctl -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" start >/dev/null
trap 'as_pg pg_ctl -D "$DIR/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h "$DIR" -p "$PORT" -U postgres -d postgres)
"${PSQL[@]}" -f "$ROOT/tests/avaliacao-sql/stub.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/2026111200*.sql "$ROOT"/supabase/migrations/2026111201*.sql "$ROOT"/supabase/migrations/2026111202*.sql "$@"; do
  [ -f "$f" ] || continue
  "${PSQL[@]}" -f "$f" >/dev/null 2>"$DIR/err" || { echo "FALHOU ao aplicar $(basename "$f")"; cat "$DIR/err"; exit 1; }
done
fail=0
for t in "$ROOT"/tests/avaliacao-sql/test_*.sql; do
  if "${PSQL[@]}" -f "$t" > "$DIR/out" 2>&1; then echo "ok - $(basename "$t")"; grep -h "NOTICE:  OK" "$DIR/out" | sed 's/^.*NOTICE:  /    /' || true
  else echo "not ok - $(basename "$t")"; cat "$DIR/out"; fail=1; fi
done
exit $fail
