# Contributing to Mindora

Thanks for your interest in making Mindora better. This guide covers how to file issues, propose changes, and submit pull requests.

## Quick rules

1. **Search before you open.** Someone may have already reported it or proposed a fix.
2. **One topic per issue / PR.** It keeps review focused.
3. **Keep it small.** A 50-line PR lands in days; a 500-line PR sits for months.
4. **Match the style.** Run `npm run lint` and `tsc --noEmit` before opening a PR.

## Filing an issue

### Bug report

A good bug report has:

- **What you did** — exact steps, even if they feel obvious.
- **What you expected.**
- **What actually happened** — screenshots, terminal output, browser console errors all help.
- **Environment** — Mindora version (`mindora --version` if available, otherwise the commit), OS, Node version, the model provider you're using.
- **The smallest reproduction** you can make. A 5-line config beats a 500-line repo.

### Feature request

Tell us:

- The problem you want to solve, not the solution you have in mind.
- How you'd know the feature worked.
- Anything you've already tried.

## Proposing a change

For non-trivial changes (anything beyond a typo or a one-file fix), open an **issue first** to discuss the approach. Once a maintainer signals OK, open the PR against `main`.

When opening a PR:

- **One logical change per PR.** If you have three unrelated fixes, open three PRs.
- **Describe the why**, not just the what. The diff shows the what.
- **Update the changelog** under the **Unreleased** section if your change is user-facing.
- **Add tests** for any non-trivial logic. We have `*.test.mjs` runners under `lib/`.

## Development setup

```bash
git clone https://github.com/Reamory/Mindora.git
cd Mindora
npm install
npm run dev           # http://localhost:30141, uses ~/.pi/agent
# or
npm run dev:workspace # uses ./.pi/agent (sandboxed IDE friendly)
```

Sandbox note: if you're running inside a sandboxed IDE (TRAE etc.), the dev server cannot write to `~/.pi/agent/`. Use `npm run dev:workspace` instead. See `AGENTS.md` for the full sandbox story.

### Checks

```bash
node_modules/.bin/tsc --noEmit
npm run lint
```

Both must pass before review. Do **not** run `next build` during development — it writes to `.next/` and can interfere with the dev server.

## Project layout

- `app/` — Next.js app router (pages + API routes).
- `components/` — React components. `*.tsx`.
- `lib/` — Pure logic, framework-agnostic where possible. `*.ts` for code, `*.test.mjs` for tests.
- `hooks/` — React hooks.
- `bin/` — CLI entry (`mindora.js`).
- `docs/` — Long-form docs and brand assets.

## Commit messages

We don't enforce a convention, but **imperative mood** ("Add X", not "Added X") keeps `git log` readable.

## i18n

UI strings live in `lib/i18n/dictionary.ts`. Keys are namespaced (`chat.*`, `topbar.*`, `branches.*`, `controls.*`, `general.*`, `settings.*`). To add a new language:

1. Add the `Locale` literal in `hooks/useLocale.tsx`.
2. Add the new `Dictionary` object in `lib/i18n/dictionary.ts` and wire it into the `dictionaries` map.

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.
