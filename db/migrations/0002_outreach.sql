-- BRI-182 — D4 warm outreach log.
-- One row per warm send (DM / WhatsApp / phone / in-person) for the 10 hand-picked
-- restaurants. v0.0 captures reply intent manually via Hitesh tagging this table
-- in the Neon SQL editor. No automation, no sender domain, no tracking pixels.
--
-- Acceptance (BRI-182): replies window 48–72h after sent_at; intent enum is
-- {none, curious, paid}. v0.1 will add automated reply ingestion.

create table if not exists outreach (
  id              uuid primary key default gen_random_uuid(),
  business_slug   text not null,
  preview_url     text not null,
  channel         text not null check (channel in ('dm', 'whatsapp', 'phone', 'in_person', 'other')),
  geo             text not null check (geo in ('US', 'UK', 'CA', 'AU')),
  sent_at         timestamptz not null default now(),
  replied_at      timestamptz,
  intent          text not null default 'none'
                  check (intent in ('none', 'curious', 'paid')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One row per business — re-sends overwrite intent rather than duplicate.
create unique index if not exists outreach_business_slug_uniq
  on outreach (business_slug);

-- Hot path for the D5 reply window report.
create index if not exists outreach_sent_at_idx
  on outreach (sent_at desc);
