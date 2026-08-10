# AGENTS.md

## Structure

- Keep the Express server, API access and cache logic in `index.js`.
- Keep browser code and source CSS in `public/`; treat `public/output.css` as
  generated output.
- Keep EJS templates in `views/` and reusable fragments in `views/partials/`.
- Keep tests in `test/` using Node.js's built-in test runner.

## Style

- Prefer direct, readable JavaScript over project-specific abstractions.
- Use `camelCase` for JavaScript identifiers and `kebab-case` for CSS classes.
- Keep comments minimal and specific to non-obvious security or business logic.
- Sort unordered peer entries by value shape, then alphabetically within each
  shape. Preserve semantic, narrative and procedural order.
- Update `README.md` and `ARCHITECTURE.md` when behaviour changes.
- Use `.yaml` for GitHub Actions workflows.
- Preserve `LICENSE` and its legal text; never relicense without explicit approval.
- Use Australian English in project-owned prose and identifiers. Preserve external
  names and terminology.

## Behaviour

- Bound outbound API concurrency, traversal depth, response size and timeouts.
- Handle upstream failures gracefully and preserve usable stale cache data.
- Treat Hacker News content as untrusted and preserve the strict Content Security
  Policy.

## Verification

- Run `mise run check` before handoff.
