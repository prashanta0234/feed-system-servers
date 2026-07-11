#!/bin/bash
# Runs once on first init of the master. Creates the replication role and
# allows the slave to connect for streaming replication.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE ROLE "$REPLICATION_USER" WITH REPLICATION LOGIN PASSWORD '$REPLICATION_PASSWORD';
EOSQL

# Allow the replication user to connect from anywhere on the compose network.
echo "host replication $REPLICATION_USER all md5" >> "$PGDATA/pg_hba.conf"
