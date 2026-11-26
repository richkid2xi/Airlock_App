# Parked: landing page

This is the previously-ported marketing landing page. It is **parked**, not deleted.

The landing page is out of scope for the app repo: it lives in another repo and
will be extracted later. Phase 1c removed it from the route table and made `/`
redirect to `/connect`.

## Status
- Excluded from the build (`vite.config.ts` only builds `src/`).
- Excluded from typecheck (`tsconfig.json` includes `src`, `packages/*`; not `parked/`).
- Its relative imports (`../router/useRoute`, `../ui/Logo`, `./Landing.css`) were
  written for `src/pages/`. They will need re-pointing if this is ever restored to
  the app under `src/`.

## Restoring (if ever needed)
Move `Landing.tsx` / `Landing.css` back under `src/pages/`, restore the relative
imports, and re-add a `<Route path="/" element={<Landing />} />` entry in `src/App.tsx`.
