-- Extensions required by the TradeSignal schema.
-- pgcrypto and uuid-ossp are already enabled on this project; gen_random_uuid()
-- is native to Postgres 13+ and does not require an extension.
create extension if not exists postgis;
create extension if not exists pg_cron;
create extension if not exists pg_net;
