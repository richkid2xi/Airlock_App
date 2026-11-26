# Supabase CLI v3.4.0 — Key Flags & Patterns

## Installation & Version
- Installed via: `npx supabase` (global package, v3.4.0)
- Verify: `npx supabase --version`

## Critical Flags (always check --help before scripting)

| Command | Key Flag | Purpose |
|---|---|---|
| `supabase db push` | `--remote` | Push to HOSTED project (never use local stack by default) |
| `supabase db push` | `--remote=<ref>` | Push to a specific remote project by ref |
| `supabase test db` | `--remote` | Run pgTAP against HOSTED project (linked or by ref) |
| `supabase test db` | `--remote=<ref>` | Run pgTAP against a specific SCRATCH project by ref |
| `supabase test db` | `--yes` | Required when targeting remote (never skip) |

## Default Behavior
- `supabase <command>` defaults to **Local Docker stack** — do NOT use this pattern for hosted projects
- Always pass `--remote` explicitly for Supabase-hosted operations

## pgTAP Targeting (test db)
- **Local**: `supabase test db` (Docker required)
- **Linked project**: `supabase test db --remote`
- **Scratch project by ref**: `supabase test db --remote=<scratch-ref> --yes`
- **CRITICAL**: Never run pgTAP against the dev/app project (tjzavfhghbjxchohkimo)
- **SCRATCH ONLY**: Always use a separate scratch project ref via `SUPABASE_TEST_PROJECT_REF` env var

## Environment Variables (in .env.local, never committed)
- `VITE_SUPABASE_URL` — dev app project URL (derive ref from here)
- `SUPABASE_TEST_PROJECT_REF` — scratch project ref for pgTAP (separate project)
- `SUPABASE_APP_PROJECT_REF` — app project ref (alternative explicit form)

## Testing Harness
- `scripts/test.sh` — canonical bash harness (vitest + pgTAP via `supabase test db --remote=<scratch-ref>`)
- `scripts/test.ps1` — Windows PowerShell variant (vitest only, pgTAP skipped with notice)