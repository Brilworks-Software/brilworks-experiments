-- BRI-180 — Places API spend log.
-- One row per outbound Places API call attempt (success or fail).
-- Used by the circuit breaker in apps/preview-engine/lib/maps/places.ts
-- to enforce the $20 hard cap from ADR-0002.

create table if not exists places_spend_log (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  query        text not null,
  locality     text not null,
  call_kind    text not null check (call_kind in ('search_text', 'place_details')),
  cost_usd     numeric(10, 6) not null check (cost_usd >= 0),
  succeeded    boolean not null,
  place_id     text,
  error_code   text,
  error_message text
);

create index if not exists places_spend_log_created_at_idx
  on places_spend_log (created_at desc);

-- Cumulative spend lookup is the hot path for the circuit breaker.
-- Postgres reads the index for sum() with no row visit.
create index if not exists places_spend_log_cost_idx
  on places_spend_log (created_at, cost_usd);
