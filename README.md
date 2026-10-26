# Chris Delgado Portfolio

A static Astro portfolio for Chris Delgado, presenting projects across data analysis, application development, and practical automation. The AI Cost Efficiency case also includes downloadable exercises fellow learners can turn into their own portfolio work.

## Live site

[View the live portfolio](https://portfolio.chrisdelgado.workers.dev/)

## Pages

- `/` - portfolio homepage
- `/projects/ai-cost-efficiency/` - follow-along portfolio project, two learner downloads, and my completed analysis
- `/ai-cost-efficiency/` - retained local copy of the earlier dashboard
- `/projects/distributor-case-study/` - revenue quality and customer profitability analysis
- `/projects/dnd-and-beyond/` - full-stack Python campaign application
- `/projects/darts-league/` - constraint-based league scheduling tool

## Local setup

```powershell
npm install
npm run dev
```

Astro will print the local preview address. Open that address in a browser to review the site.

## Validate the production build

```powershell
npm run build
```

The build validates the project catalog and deployment configuration, runs Astro checks, writes the static site to `dist/`, and checks the built internal links and assets. The same checks run inside Cloudflare. GitHub Actions also runs the build and deployment dry run on pushes and pull requests.

## Cloudflare Workers deployment

The existing `portfolio` Worker is connected to this repository's production branch. `wrangler.jsonc` explicitly publishes the static Astro output:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Assets directory: `dist` (configured in `wrangler.jsonc`)
- Production branch: `main`
- Node.js version: read automatically from `.nvmrc` (`22`)

No environment variables, database, CMS, or server runtime are required.

Commit `wrangler.jsonc`, `package.json`, and `package-lock.json` together when changing deployment settings. The explicit static-assets configuration prevents Wrangler from trying to install an Astro server adapter during deployment. The pinned Wrangler version is installed by `npm ci` before Cloudflare runs the build.

Use `npm run deploy:check` after a production build to validate the static deployment configuration without publishing. The [Cloudflare static-assets documentation](https://developers.cloudflare.com/workers/static-assets/binding/) describes this setup.

The current AI dashboard is hosted independently on [Google Cloud Run](https://ai-cost-efficiency-860922042669.us-east1.run.app), with its source in [AI-Cost-Efficiency-Portfolio-Project](https://github.com/GlassHouse97/AI-Cost-Efficiency-Portfolio-Project). The homepage and case study link to that dashboard and the current learner ZIPs in its repository. The earlier copied assets remain in `public/ai-cost-efficiency/` with a source manifest recording their file hashes.

## Updating the portfolio

- **Add or update a project:** edit `src/data/projects.json`. The homepage cards are generated automatically. Follow the [step-by-step guide](docs/ADDING_PROJECTS.md) for a copyable example, optional screenshots, and dedicated case-study pages.
- Homepage introduction and toolbox: `src/pages/index.astro`
- Project case studies: `src/pages/projects/`
- Shared styles: `src/styles/global.css`
- Shared layouts and navigation: `src/layouts/` and `src/components/`
- Published images: `public/assets/`
