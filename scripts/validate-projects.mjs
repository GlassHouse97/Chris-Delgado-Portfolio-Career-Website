import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fail = (message) => { throw new Error(message); };
const readJSON = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const catalog = readJSON("src/data/projects.json");
const seen = new Set();
const previewTypes = new Set(["ai", "distributor", "dnd", "darts"]);

function httpsURL(value, label) {
  let url;
  try { url = new URL(value); } catch { fail(`${label} must be a complete HTTPS URL.`); }
  if (url.protocol !== "https:") fail(`${label} must use HTTPS.`);
}

function localPath(value, label) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.split("/").includes("..")) {
    fail(`${label} must be an absolute site path such as /projects/my-project/.`);
  }
  return value.split(/[?#]/)[0];
}

if (!Array.isArray(catalog) || !catalog.length) fail("The project catalog must be a nonempty JSON array.");
for (const [index, project] of catalog.entries()) {
  const label = `Project ${index + 1} (${project?.slug || "missing slug"})`;
  if (!project || typeof project !== "object" || Array.isArray(project)) fail(`${label} must be an object.`);
  for (const field of ["slug", "category", "emoji", "title", "summary", "repo", "accent"]) {
    if (typeof project[field] !== "string" || !project[field].trim()) fail(`${label} needs a nonempty ${field}.`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) fail(`${label} needs a lowercase, hyphenated slug.`);
  if (seen.has(project.slug)) fail(`Duplicate project slug: ${project.slug}`);
  seen.add(project.slug);
  if (!/^#[0-9a-f]{6}$/i.test(project.accent)) fail(`${label} needs a six-digit hex accent color.`);
  if (!Array.isArray(project.skills) || !project.skills.length || project.skills.some((s) => typeof s !== "string" || !s.trim())) {
    fail(`${label} needs at least one skill, written as a string.`);
  }
  httpsURL(project.repo, `${label} repo`);
  if (project.preview !== undefined && !previewTypes.has(project.preview)) fail(`${label} has an unknown preview. Omit preview for an automatic card.`);
  if (project.caseStudy !== undefined) {
    const urlPath = localPath(project.caseStudy, `${label} caseStudy`).replace(/\/$/, "");
    if (!fs.existsSync(path.join(root, "src/pages", `${urlPath}.astro`)) && !fs.existsSync(path.join(root, "src/pages", urlPath, "index.astro"))) {
      fail(`${label} caseStudy has no matching Astro page. Omit caseStudy to link directly to the repository.`);
    }
  }
  if (project.live !== undefined) {
    if (project.live.startsWith("/")) localPath(project.live, `${label} live`);
    else httpsURL(project.live, `${label} live`);
    if (typeof project.liveLabel !== "string" || !project.liveLabel.trim()) fail(`${label} needs liveLabel for its live link.`);
  }
  if (project.image !== undefined) {
    const imagePath = localPath(project.image, `${label} image`);
    if (!fs.existsSync(path.join(root, "public", imagePath))) fail(`${label} image does not exist under public/.`);
    if (typeof project.imageAlt !== "string" || !project.imageAlt.trim()) fail(`${label} image needs descriptive imageAlt text.`);
  }
}

// Keep deployment explicit, so Wrangler never falls back to framework auto-setup.
const configPath = path.join(root, "wrangler.jsonc");
if (!fs.existsSync(configPath)) fail("Missing wrangler.jsonc. Restore the committed static-assets configuration before deploying.");
const parsed = ts.parseConfigFileTextToJson(configPath, fs.readFileSync(configPath, "utf8"));
if (parsed.error) fail("wrangler.jsonc is not valid JSON/JSONC.");
const config = parsed.config;
if (config.name !== "portfolio") fail("The Worker name must stay portfolio to update the existing live site.");
if (config.assets?.directory !== "./dist" || config.assets?.not_found_handling !== "404-page") fail("Keep assets.directory as ./dist and not_found_handling as 404-page.");
if (config.main) fail("This portfolio serves static assets and should not have a Worker script entry point.");
const pkg = readJSON("package.json");
const lock = readJSON("package-lock.json");
const version = pkg.devDependencies?.wrangler;
if (!/^\d+\.\d+\.\d+$/.test(version || "") || lock.packages?.["node_modules/wrangler"]?.version !== version) {
  fail("Pin Wrangler to an exact version in package.json and commit the matching package-lock.json.");
}
console.log(`Validated ${catalog.length} projects and the static Cloudflare deployment configuration.`);
