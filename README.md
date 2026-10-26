# Chris Delgado Portfolio

A static Astro portfolio for Chris Delgado, featuring AI Cost Efficiency & Workflow Value alongside three case studies across data analysis, full-stack Python development, and practical automation.

## Live site

[View the live portfolio](https://portfolio.chrisdelgado.workers.dev/)

## Pages

- `/` - portfolio homepage
- `/projects/ai-cost-efficiency/` - AI case study with links to the live dashboard and both learner downloads
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

The static site is written to `dist/`.

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

- Homepage content: `src/pages/index.astro`
- Project case studies: `src/pages/projects/`
- Shared styles: `src/styles/global.css`
- Shared layouts and navigation: `src/layouts/` and `src/components/`
- Published images: `public/assets/`
