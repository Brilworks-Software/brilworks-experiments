# brilworks-experiments

Monorepo for Brilworks v0.X experiments. Spun up under [BRI-179](/BRI/issues/BRI-179) as Day 1 of the [BRI-116](/BRI/issues/BRI-116) v0.0 wedge.

Stack rationale: ADR-0001 lives on the [BRI-179 ADR document](/BRI/issues/BRI-179#document-adr).

## Structure

```
apps/
  preview-engine/      # Next.js 15 (App Router) — first sub-app
packages/              # shared modules (added when needed)
.github/workflows/     # CI
```

## Local dev

```bash
pnpm install
pnpm dev                # runs preview-engine on :3000
```

Health check: `curl http://localhost:3000/api/healthz` → `{ "ok": true, ... }`.

## Generating a restaurant preview (BRI-181)

```bash
pnpm gen:preview \
  --slug larkspur-cafe-brooklyn \
  --fixture apps/preview-engine/lib/fixtures/restaurants/larkspur-cafe-brooklyn.json
```

Writes `apps/preview-engine/content/previews/<slug>.json`, which the static
route at `/r/<slug>` reads at build time. The CLI scaffolds placeholder copy
clearly marked `DRAFT —`; the agent (Claude Code, in a Paperclip heartbeat)
rewrites the `tagline` / `neighborhood` / `aboutP1` / `aboutP2` /
`signatureDishes` fields in-place following the spec in
`apps/preview-engine/lib/generator/restaurant.ts`. No Anthropic SDK call.

## Quality gates

```bash
pnpm typecheck
pnpm test
pnpm build
```

CI runs all three on PRs to `main` and on push to `main`.

## Environments

- Production: `experiments.brilworks.com` (auto-deploy on `main` push, Vercel) — *pending Vercel setup, see issue tracker*.
- Previews: per-PR Vercel preview URL.

## Environment variables

None required for v0.0. `.env.example` lists future placeholders only.

Supabase + outbound integrations land in D2/D3 child issues under [BRI-116](/BRI/issues/BRI-116).

## Contributing

- Branch from `main`; PR back to `main`.
- CI must be green to merge.
