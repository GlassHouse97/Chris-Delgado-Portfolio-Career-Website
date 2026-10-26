# Add a project from any computer

Open [src/data/projects.json on GitHub](https://github.com/GlassHouse97/Chris-Delgado-Portfolio-Career-Website/blob/main/src/data/projects.json) and select the pencil icon. Add an object to the array, using a comma between objects. The array order is the order on the homepage.

This is a complete example for a new card:

```json
{
  "slug": "my-new-project",
  "category": "Analytics",
  "emoji": "📊",
  "title": "My New Project",
  "summary": "The problem I solved, what I built, and why the result matters.",
  "repo": "https://github.com/GlassHouse97/REPLACE-WITH-YOUR-REPO",
  "accent": "#7cc8ff",
  "skills": ["Python", "SQL", "Data analysis"]
}
```

Replace the example name, repository, and copy before saving. This entry automatically creates a styled homepage card linking to the repository. No deployment configuration changes or new Astro page are needed.

## Optional additions

- **Live demo or download:** Add `"live": "https://your-demo-url"` and `"liveLabel": "Open the demo"`. A local site path is also supported.
- **Screenshot:** Upload an image into `public/assets/`, then add `"image": "/assets/my-project.png"` and `"imageAlt": "A description of the screenshot"`. Omit both to use the automatic title-and-emoji preview.
- **Dedicated case study:** Create a page such as `src/pages/projects/my-new-project.astro`, reusing the existing `ProjectLayout`. Add `"caseStudy": "/projects/my-new-project/"` to the entry. The card title and case-study action will link there.
- **Existing illustrated previews:** The four original entries use `preview` values for their custom visuals. Leave `preview` out of a new entry; the default preview works automatically.

## Publish and check

Commit the change to `main` in GitHub, or open a pull request to review it first. In either case, **Validate portfolio** checks the project list, builds the site, checks internal links and assets, and runs a Cloudflare deployment dry run.

Cloudflare independently runs the same validated build for pushes to `main` and deploys the result automatically. GitHub validation does not itself publish, and Cloudflare does not wait for the separate GitHub Actions job. The important project, configuration, and link checks are part of `npm run build`, so Cloudflare runs them too.

Check the commit's **Workers Builds: portfolio** status for deployment success, then open [the live portfolio](https://portfolio.chrisdelgado.workers.dev/). If a build fails, Cloudflare keeps serving the last successful deployment. Read the failed step before retrying.

When working locally:

```powershell
git pull --ff-only
npm ci
npm run build
npm run deploy:check
git add src/data/projects.json
git commit -m "Add my new project"
git push
```

Stage any new images or case-study page along with the project entry. Pull remote changes before editing locally if you have also edited through GitHub.

## Keep these deployment settings

- Worker name `portfolio`
- Production branch `main`
- Build command `npm run build`
- Deploy command `npx wrangler deploy`
- Assets directory `./dist` in `wrangler.jsonc`
- Exact Wrangler version in `package.json`, with the matching `package-lock.json`

Project additions are content changes. Keep this deployment setup in place when adding or rearranging projects. The build reports a clear error if the configuration is removed or no longer matches.
