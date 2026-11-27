# figma-make-app

React + Vite + Tailwind CSS project running inside Figma Make.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

Tailwind emits utility classes in `@layer utilities`, and CSS outside any cascade layer overrides every layer regardless of specificity. Put global element styles, such as resets and defaults for `body`, headings, `button`, or `input`, inside `@layer base { ... }` so utility classes on those elements still apply. Tailwind's Preflight already applies `box-sizing: border-box`, removes default margins, and sets `font: inherit` on form controls, so do not repeat those rules.

## Airlock engineering rules (apply to every change)

1. **Type safety first.** Model business entities as named TypeScript types, not positional `string[]` rows.
2. **Stable IDs.** Reference entities by stable IDs (UUIDs or business keys), never by display names.
3. **Honest result.** A live engine call that succeeds or fails returns a typed error with a clear message and a Retry where it makes sense. Never present mock data as live.
4. **Typed domain.** Core entities (`Invoice`, `Supplier`, `Agent`, `Policy`, `PaymentRequest`, `Evaluation`, `Approval`) and enums live in the domain layer; the canonical copy is `packages/shared`.
5. **Minor units.** Monetary amounts are integer minor units (USDC = 6 decimals) as strings/`bigint`. Never floats in domain logic; format only at the display edge.

6. **Solana rules.** Before ANY Solana/Anchor/Rust code, or off-chain logic mirroring on-chain limits, read the repo-root `SOLANA.md` in full. It overrides EVM instincts: no re-entrancy guards, no SafeMath wrappers, no partial-state handling, no re-zeroing accounts. Validate owners, signers, writable flags, PDAs, mints, delegates, sizes, discriminators explicitly in every instruction. Defaults: devnet (env-driven, shown in UI), @solana/wallet-adapter-react, @solana/web3.js v1, Anchor, USDC SPL (verify the devnet mint against Circle docs, not memory).

7. **Test first.** Define golden vectors in `packages/golden` before writing the logic they test. Never delete, comment out, or skip tests — `scripts/test.sh` fails if the count drops below `.test-baseline`. Implement intended behaviour; tests verify it. Never write code just to make tests pass.

8. **Two layers.** Hard caps (per-tx, daily) and destination/program allowlists are enforced ONCE in the on-chain program. The off-chain evaluator is a second layer for UX and early rejection, never the only layer. A compromised engine must never be able to exceed on-chain limits. Never implement in client/server code a limit only the program can truly enforce.

9. **CU.** Every instruction/call path gets a LiteSVM benchmark recorded in `docs/cu-budget.md`. Correctness first, optimize only against benchmarks.

10. **Review claims.** When any AI review claims a vulnerability, verify it is exploitable on Solana (SOLANA.md runtime model) before changing code. Report the verification.

11. **Supabase.** Structure `supabase/migrations`, `supabase/functions` (Deno Edge Functions), `supabase/tests` (pgTAP), `supabase/seed.sql`. Client uses supabase-js with the anon key ONLY. Service-role key exists only inside Edge Functions' built-in env, never in client code, `.env.example` values or logs. Every table has RLS enabled from its first migration with policies tying rows to the signed-in user's organization.

12. **Shared logic.** zod schemas, minor-unit helpers and (later) the evaluator live in `packages/shared` and are imported by web, Edge Functions (import map) and tests. Never copy-paste logic between client and functions.

13. **Small steps.** Small steps, no red builds, stop and ask instead of inventing values.

## Keep these existing rules

- **UI frozen.** Teammate polishes visuals in parallel. Only wire data and add loading/error/empty states, reusing existing classes.

- **Engine pattern.** `src/engines/<name>/{types.ts, live.ts, index.ts}` + registry + `withFallback` + Settings "Engine status" list. **No** `mock.ts`, no seed arrays, no fallback layer, no `VITE_ENGINE_*` flags, no `VITE_ALLOW_MOCK_FALLBACK`, no Mock badge.

- **Honest result.** Correctness first, optimize only against measured benchmarks. Never "test toward passing".

- **Honest error handling.** Engine errors are shown with their typed error code (e.g. `not_found`, `conflict`, `validation`, `forbidden`, `unauthorized`, `network`) and a user-friendly message. A `Retry` action is shown where appropriate (e.g. network transient, wallet not installed, provider rejected). A live engine call that fails on transport/RPC errors is marked `degraded` only when the engine's own fallback logic determines it is safe; the "Mock data" badge is **never** shown. 401/403 and RLS denials NEVER fall back to mock.

## Test Doubles & Mock Data

- **Test doubles** (mocks, fakes, stubs) may exist **only** in test files (`*.test.*`) or in dedicated `__fakes__` folders under `src/`. **Non-test code under `src/` must never import from `__fakes__` paths or contain the strings `"mock-seed"` or `"mockData"`.** The test harness (`scripts/test.sh`) includes a check that fails the build if any non-test source file contains these patterns.

- **Demo data** means real database rows created by a function the user triggers on purpose. **Never** hard-coded arrays in the client, never simulated wallet connections, never fixed identities that pretend to be live.

- Tests whose only subject is deleted mock or fallback code may be deleted: this is pre-approved. List every deleted test file with its test count and reason, and lower `.test-baseline` by exactly the deleted count. Any other test deletion requires asking.

- The `.test-baseline` tracks real, live-engine test passes only. If mock-engine test counts disappear from the baseline, the baseline drops by exactly that count.

## Unfinished Modules

- Unfinished modules are **gated** by `src/config/features.ts` (Step 2). A module that is not yet `live` shows an `InProgress` panel (see Step 2) rather than presenting simulated data as if it were real.
- The `Features` state map lives in `src/config/features.ts`. Each entry is `'live'` or `'in_progress'`. No engine may present mock data behind a feature gate.

## Supabase

- Backend is Supabase (Postgres + RLS + Auth + Edge Functions + Realtime). No custom Express server. `/server` is retired.
- Hosted Supabase decision made for this repo. Use placeholder env values in `.env.example`; real values go in `.env.local` (never committed, never paste service-role key into chat).

## Supabase CLI (v3.4.0) — critical flags

- CLI is installed via `npx supabase` (v3.4.0). Verify with `npx supabase --version`.
- **Default behavior**: `supabase <command>` runs against the **Local Docker stack**. For any hosted project you MUST pass `--remote`.
- `supabase db push --remote=<ref>` — push to a specific hosted project by ref (e.g. `--remote=tjzavfhghbjxchohkimo`).
- `supabase test db --remote=<ref>` — run pgTAP against a hosted project; `--remote` (no value) = linked project, `--remote=<ref|branch|url>` = specific target.
- **Always** pass `--yes` when targeting a remote with `test db` / `db push` (prompts disabled).
- Local Docker stack is NOT run in this environment; always use `--remote` for hosted projects.
- Full CLI flag reference: `npx supabase <command> --help`.
- Details and rationale: `docs/supabase-cli.md`.

## Secrets handling

- Client uses supabase-js with the anon key ONLY.
- Service-role key exists only inside Edge Functions' built-in env, never in client code, `.env.example` values or logs.

## Small steps

- Small steps, no red builds, stop and ask instead of inventing values.

(End of file - total 78 lines)