# Repository guidance

## Purpose and scope

This is Muhammad Shahid's product-design and AI-assisted design-engineering
portfolio. Optimize for hiring teams: semantic content, accessibility,
performance, and clarity come before visual spectacle.

The editorial homepage features AnyDay and Humi case-study cards, Experience,
the Feed of recent snippets, and a contact footer. AnyDay, Humi, and Montran
have case-study routes at the same level as the homepage, with immediate
navigation and brief grouped entrances; Montran is not currently featured on
the homepage.

Keep edits within the requested scope. Preserve supplied copy, artwork, and
unrelated layout or behavior unless the task calls for changing them.

## Implementation constraints

- Use Bun only; keep `bun.lock` as the package lockfile.
- Default to React Server Components. Put browser state, effects, and event
  handlers at the smallest Client Component boundary that needs them.
- Keep dependencies and state within their feature. Add shared infrastructure
  only when multiple concrete consumers need it, and packages only when the
  requested feature requires them.
- Keep Motion out of `src/app/layout.tsx`. For Motion interactions, use the
  shared `MotionBoundary` in `src/components/motion` and respect
  reduced-motion preferences.
- Reuse semantic tokens in `src/app/globals.css` and existing components.
  Preserve semantic HTML, keyboard access, visible focus, meaningful alt text,
  and a complete non-animated fallback.
- Project metadata and MDX entrypoints live in `src/content/projects`.
  Validate metadata with `defineProjectMetadata`, register projects explicitly,
  and keep drafts out of production. Interactive MDX imports must be
  deliberate and project-specific.

## Completion and verification

Carry the requested change through implementation and relevant verification;
fix failures caused by the change before reporting completion. Routine local
edits and checks within the agreed scope do not need repeated confirmation.

Use focused checks while iterating. Run `bun run check` for application changes
before completion; it covers formatting, lint, types, unit tests, and build.
For Markdown-only guidance edits, formatting and diff checks are sufficient.
Once checks pass, repeat them only for new changes or unresolved failures.

For visual or interaction changes, inspect the affected UI at desktop and
narrow widths in the browser preview, including relevant keyboard and
reduced-motion behavior. There is no automated end-to-end suite. Report what
was verified and any blocked checks without claiming unobserved results.

Use `README.md` for setup, commands, content entrypoints, and deployment details
when those topics are relevant. Use skills for a concrete workflow need;
repository guidance does not require a blanket set of skills.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
