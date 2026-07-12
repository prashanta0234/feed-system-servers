#!/bin/bash
# Runs once on first init of the master. Creates a read-only role the app uses
# to query the replica(s). Because roles and table ACLs are copied by streaming
# replication, granting SELECT here on the master applies on every slave too.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE ROLE "$READER_USER" WITH LOGIN PASSWORD '$READER_PASSWORD';

    -- Let the role reach the database and the public schema.
    GRANT CONNECT ON DATABASE "$POSTGRES_DB" TO "$READER_USER";
    GRANT USAGE ON SCHEMA public TO "$READER_USER";

    -- SELECT on tables that already exist at init time (usually none yet).
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO "$READER_USER";

    -- Auto-grant SELECT on every table the app role creates later (migrations).
    ALTER DEFAULT PRIVILEGES FOR ROLE "$POSTGRES_USER" IN SCHEMA public
        GRANT SELECT ON TABLES TO "$READER_USER";
EOSQL
