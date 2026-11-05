<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/preview-dark.png">
  <img alt="The portfolio homepage: a soft, glassy character with large eyes above a short introduction." src=".github/assets/preview-light.png">
</picture>

# Portfolio

I'm Muhammad, a product designer from Toronto. This is my portfolio and the code
behind it, built with Next.js, React Server Components, and Bun.

The editorial homepage presents selected case studies, career experience, and a
feed of recent snippets.

| Route           | Page                                              |
| --------------- | ------------------------------------------------- |
| `/`             | Case studies, experience, the Feed, contact       |
| `/work/anyday`  | AnyDay case study                                 |
| `/work/humi`    | Humi case study                                   |
| `/work/montran` | Montran case study, by route only                 |
| `/lab/*`        | Studies for development, not served in production |

## How it's built

- Next.js App Router runs under Bun, with React Server Components as the default.
- Client Components stay at feature leaves and own their browser-only
  dependencies.
- Styles are plain CSS and CSS Modules over semantic custom properties in
  `src/app/globals.css`. Tailwind supplies the preflight and the dark variant.
- Motion is installed but is not imported by the root application bundle.
- Local MDX content is validated with Zod and registered explicitly.
- Vercel Web Analytics and Speed Insights are mounted in the root shell.
- Agentation is loaded only in development for visual feedback.

## Where things live

```text
src/
  app/                    Routes, metadata, and globals.css
  components/
    home/
      editorial-home.tsx  Homepage sections and the curated case-study cards
      case-study-tiles/   AnyDay and Humi cards
      character/          The homepage character: pose, mood, material, motion
      character-lab/      Development study of the character
      dock/               Profile and resume links
      experience/         Experience list
      footer/             Contact note and signature
      playground/         The Feed
      tooltip/            Tooltip and its positioning
    work/
      case-study.tsx      Shared case-study parts
      anyday/
      humi/
      montran/
    motion/               Entrances, theme reveal, and MotionBoundary
    ui/                   Shared interface parts
    favicon/              Live favicon
    lab/                  Development studies
    dev/                  Agentation
  content/
    experience.ts         Career details
    projects/             Project metadata and MDX entrypoints
  config/site.ts          Site details and canonical URL
public/media/             Case-study and Feed media
scripts/                  Generators for favicons, marks, stills, and card colors
tests/unit/               Content, configuration, and motion tests
```

## Run it locally

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

## Motion

Case-study routes are ordinary pages with immediate navigation. Home introduces
semantic groups with a short blur and rise. Case-study intros enter over 300ms
while opening media fades in. Returning pages do not replay their entrances.
Theme changes alone retain the button-origin snapshot reveal in
`src/components/motion/page-wipe.ts`.

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
curated separately in `editorial-home.tsx`, so registering a project does not
automatically add a card.

## Checking changes

Run `bun run dev`, then use the Agentation control in the lower corner to mark
elements and copy structured feedback. Agentation is a development dependency
and is excluded from production rendering.

There is no automated end-to-end suite. Check visual and interaction changes in
the browser preview at desktop and narrow widths. The full local check command
also runs in `.github/workflows/ci.yml`.

Repository-specific agent guidance lives in `AGENTS.md`. `CLAUDE.md` imports that
file to keep the instructions in one place.

## Deployment

`vercel.json` selects Bun 1.x. Set `NEXT_PUBLIC_SITE_URL` for a custom canonical
domain. Web Analytics and Speed Insights are included in the root layout. Their
service settings are managed in the connected Vercel project.

## License

The code is MIT licensed. My writing, media, and signature are not. See
[LICENSE](LICENSE) for what falls where.
