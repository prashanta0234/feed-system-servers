#!/bin/bash
# Bootstraps the standby. On first run (empty data dir) it clones the master
# with pg_basebackup and marks the instance as a hot standby. On subsequent
# runs it just starts Postgres against the existing replicated data.
set -e

PGDATA=/var/lib/postgresql/data

if [ -z "$(ls -A "$PGDATA" 2>/dev/null)" ]; then
  echo "Standby data dir empty — cloning from master $MASTER_HOST:$MASTER_PORT ..."

  # Wait for the master to accept replication connections.
  until PGPASSWORD="$REPLICATION_PASSWORD" pg_isready -h "$MASTER_HOST" -p "$MASTER_PORT" -U "$REPLICATION_USER"; do
    echo "Waiting for master to be ready..."
    sleep 2
  done

  export PGPASSWORD="$REPLICATION_PASSWORD"
  pg_basebackup -h "$MASTER_HOST" -p "$MASTER_PORT" -U "$REPLICATION_USER" \
    -D "$PGDATA" -Fp -Xs -P -R

  chmod 0700 "$PGDATA"
  echo "Base backup complete. Standby is configured for streaming replication."
fi

# Ensure correct ownership, then hand off to the standard Postgres entrypoint.
chown -R postgres:postgres "$PGDATA"
exec docker-entrypoint.sh postgres
