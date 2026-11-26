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
3. **Honest fallback.** A live engine call that fails on transport/RPC errors falls back to mock only when `VITE_ALLOW_MOCK_FALLBACK=true`, marks the engine `degraded`, and surfaces a "Mock data" badge. Never present mock as live.
4. **Typed domain.** Core entities (`Invoice`, `Supplier`, `Agent`, `Policy`, `PaymentRequest`, `Evaluation`, `Approval`) and enums live in the domain layer; the canonical copy is `packages/shared`.
5. **Minor units.** Monetary amounts are integer minor units (USDC = 6 decimals) as strings/`bigint`. Never floats in domain logic; format only at the display edge.
6. **Solana rules.** Solana addresses are base58 strings. Before writing any Solana/Anchor code, read the repo-root `SOLANA.md`; its rules are authoritative and override EVM habits.
7. **Test first.** Define golden vectors in `packages/golden` before writing the logic they test. Never delete, comment out, or skip tests — `scripts/test.sh` fails if the count drops.
8. **Honest result.** Correctness first, optimize only against measured benchmarks. Never "test toward passing".
