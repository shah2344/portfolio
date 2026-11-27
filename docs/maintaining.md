# Maintaining

## Setup

Requires Bun 1.3.14.

```bash
bun install
cp .env.example .env.local # optional until a custom domain exists
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

The canonical URL resolves in this order:

1. `NEXT_PUBLIC_SITE_URL`
2. `VERCEL_PROJECT_PRODUCTION_URL`
3. `VERCEL_URL`
4. `http://localhost:3000`

## Commands

| Command                | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `bun run dev`          | Start the Next.js development server      |
| `bun run format`       | Format supported files                    |
| `bun run format:check` | Verify formatting without modifying files |
| `bun run lint`         | Run ESLint and Next.js rules              |
| `bun run typecheck`    | Run strict TypeScript checks              |
| `bun run test:unit`    | Test content, configuration, and motion   |
| `bun run build`        | Create the production build               |
| `bun run check`        | Run every required local/CI check         |

## Architecture

- Next.js App Router runs under Bun, with React Server Components as the default.
- Client Components stay at feature leaves and own their browser-only
  dependencies.
- Styles are plain CSS and CSS Modules over semantic custom properties in
  `src/app/globals.css`. Tailwind supplies the preflight and the dark variant.
- Motion is installed but is not imported by the root application bundle.
- Local MDX content is validated with Zod and registered explicitly.
- Vercel Web Analytics, Speed Insights, and Umami are mounted in the root shell;
  see [Tracking](#tracking).
- Agentation is loaded only in development for visual feedback.

## Content and routes

- Homepage sections and the curated AnyDay and Humi cards live in
  `src/components/home/home-content.tsx`.
- Career details live in `src/content/experience.ts`.
- Project metadata and MDX entrypoints live in `src/content/projects`. Case-study
  components live in `src/components/work`.
- `/work/anyday` and `/work/humi` are ordinary pages.
- `/lab/*` pages are development studies and return 404 in production.

## Motion

Home introduces semantic groups with a short blur and rise. Case-study intros
enter over 300ms while opening media fades in. Returning pages do not replay
their entrances. Homepage cards open case studies as a Vaul sheet over the page
(`src/components/work/case-sheet`, fed by the intercepted route in
`src/app/@sheet`); a case study reached by its URL is a full page, and its close
button returns home with a one-snapshot CSS zoom. Reloading a case study on a
desktop reopens it as the sheet (`case-sheet/reopen-sheet-script.ts`). On phones (narrow and touch)
a card opens the full page instead, by a full navigation that a cross-document
view transition draws as a sheet. While it is open the page stays stacked over
a dimmed card that stands for the homepage; only a strip along the top is fixed.
Closing, Back and a pull down from the top step back to the homepage, which
the browser restores from its back-forward cache (`case-sheet/phone-sheet.ts`). Other routes navigate
immediately, and theme changes alone retain the button-origin reveal. The
snapshots live in `src/components/motion/page-wipe.ts`.

Keep each interaction in its own Client Component. Wrap the smallest animated
subtree in `MotionBoundary`, import `m` from `motion/react`, and use semantic
motion tokens. The boundary defaults to the visitor's reduced-motion setting. Do
not mount it in the root layout merely for convenience.

## Add a project

1. Copy `src/content/projects/_template.mdx` to a descriptive slug, such as
   `accessible-design-system.mdx`.
2. Replace every metadata value. Keep `status: "draft"` while writing.
3. Add its metadata import and lazy content import to `projectRegistry` in
   `src/content/projects/index.ts`.
4. Run `bun run check`. Change the status to `"published"` only when the case
   study is ready to appear.

Registry ordering is deterministic: ascending `order`, descending `year`, then
alphabetical `title`. Public case-study routes exclude drafts. Homepage cards are
curated separately in `home-content.tsx`, so registering a project does not
automatically add a card.

## Checking changes

Run `bun run dev`, then use the Agentation control in the lower corner to mark
elements and copy structured feedback. Agentation is a development dependency
and is excluded from production rendering.

There is no automated end-to-end suite. Check visual and interaction changes in
the browser preview at desktop and narrow widths. The full local check command
also runs in `.github/workflows/ci.yml`, followed by Lighthouse CI
(`.github/lighthouse/lighthouserc.json`).

Repository-specific agent guidance lives in `AGENTS.md`. `CLAUDE.md` imports that
file to keep the instructions in one place.

## Tracking

Every tool here is on a free plan. Each covers something the others don't.

| Tool                  | What it tracks                                                                                          | Where                      |
| --------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------- |
| Umami Cloud (Hobby)   | Visits, pages, referrers, UTM tags, countries, devices, visit length, custom events, errors, Web Vitals | umami.is dashboard         |
| Vercel Speed Insights | Real visitors' Core Web Vitals per route, with a score over time                                        | Vercel project → Speed     |
| Vercel Web Analytics  | Page views and referrers (Hobby has no custom events and keeps a month)                                 | Vercel project → Analytics |
| Lighthouse CI         | Lab scores for `/`, `/work/anyday`, `/work/humi` on a throttled phone, on every push and pull request   | GitHub Actions run summary |
| UptimeRobot           | Whether the site is up, checked every 5 minutes, plus certificate expiry                                | uptimerobot.com            |

### Umami

`src/components/analytics/umami-script.tsx` loads the tracker on the
production deployment once `UMAMI_WEBSITE_ID` is set. Custom events:

| Event                 | Data                                                                  | Sent when                                   |
| --------------------- | --------------------------------------------------------------------- | ------------------------------------------- |
| `contact`             | `channel` (email, linkedin, dribbble, github), `place` (dock, footer) | A profile or email link is clicked          |
| `case-study-finished` | none; the event's URL names the case study                            | The closing section scrolls into view, once |
| `asset-failed`        | `kind` (img, video, source), `src`                                    | An image or film fails to load              |

Uncaught errors appear under Errors and Web Vitals under Performance, both
tagged with the commit. To track another link or button, add
`data-track="event-name"` and any `data-track-<key>="value"` attributes; the
listener in `src/instrumentation-client.ts` sends them. Don't use Umami's own
`data-umami-event` on links: the tracker reloads the page to follow them.

**Tag the links you send.** Add UTM parameters to the URL in each application,
so the Umami UTM report shows which company opened it and what they read:
`https://<domain>/?utm_source=acme&utm_medium=application&utm_campaign=job-search`.

**Leave yourself out.** On each browser you use, run
`localStorage.setItem("umami.disabled", "1")` in the console on the live site.

### Setup

1. **Umami:** create a free account at umami.is, add the production domain as a
   website, and copy its website ID. In Vercel, set `UMAMI_WEBSITE_ID` for the
   Production environment and redeploy. If the dashboard's tracking code uses a
   script URL other than `https://cloud.umami.is/script.js`, also set
   `UMAMI_SCRIPT_URL`.
2. **Speed Insights and Web Analytics:** enable both in the Vercel project if
   they aren't already.
3. **UptimeRobot:** create a free account and add an HTTP(s) monitor for the
   production URL at a 5-minute interval, with email alerts. Turn on SSL and
   domain expiry reminders on the same monitor.
4. **Lighthouse CI** needs no account. Read the scores in each CI run's summary;
   the full reports are in its `lighthouse-reports` artifact for 30 days.

## Deployment

`vercel.json` selects Bun 1.x. Set `NEXT_PUBLIC_SITE_URL` for a custom canonical
domain and `UMAMI_WEBSITE_ID` for Umami. Web Analytics and Speed Insights are
included in the root layout. Their service settings are managed in the
connected Vercel project.
