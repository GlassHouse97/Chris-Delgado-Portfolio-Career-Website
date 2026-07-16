# Chris Delgado Portfolio

A static Astro portfolio for Chris Delgado, presenting three project case studies across data analysis, full-stack Python development, and practical automation.

## Pages

- `/` - portfolio homepage
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

## Cloudflare Pages settings

When connecting this repository to Cloudflare Pages, use:

- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`
- Node.js version: read automatically from `.nvmrc` (`22`)

No environment variables, database, CMS, or server runtime are required.

## Updating the portfolio

- Homepage content: `src/pages/index.astro`
- Project case studies: `src/pages/projects/`
- Shared styles: `src/styles/global.css`
- Shared layouts and navigation: `src/layouts/` and `src/components/`
- Published images: `public/assets/`
