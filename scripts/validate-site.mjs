import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "src/data/projects.json"), "utf8"));
if (!fs.existsSync(path.join(dist, "index.html"))) throw new Error("No built homepage. Run npm run build first.");
if (!fs.existsSync(path.join(dist, "404.html"))) throw new Error("The custom 404 page is missing from dist/.");

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(name) : [name];
  });
}

const failures = [];
let checked = 0;
const origin = "https://portfolio.chrisdelgado.workers.dev";
for (const file of filesIn(dist).filter((file) => file.endsWith(".html"))) {
  const pagePath = `/${path.relative(dist, file).split(path.sep).join("/")}`;
  const html = fs.readFileSync(file, "utf8").replace(/<!--[^]*?-->/g, "").replace(/(<script\b[^>]*>)[^]*?<\/script>/gi, "$1</script>");
  for (const match of html.matchAll(/\b(?:href|src|poster)\s*=\s*["']([^"']+)["']/gi)) {
    const value = match[1].replaceAll("&amp;", "&");
    if (/^(?:https?:|mailto:|tel:|data:|blob:|\/\/)/i.test(value) || value.startsWith("#")) continue;
    const url = new URL(value, `${origin}${pagePath}`);
    const name = decodeURIComponent(url.pathname);
    const target = path.resolve(dist, `.${name}`);
    if (!target.startsWith(`${dist}${path.sep}`) && target !== dist) {
      failures.push(`${pagePath}: path escapes dist: ${value}`);
      continue;
    }
    const candidates = [target, `${target}.html`, path.join(target, "index.html")];
    if (!candidates.some((p) => fs.existsSync(p) && fs.statSync(p).isFile())) failures.push(`${pagePath}: missing internal link or asset ${value}`);
    checked++;
  }
}
const home = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const cardCount = (home.match(/class="project-card"/g) || []).length;
if (cardCount !== catalog.length) failures.push(`Homepage rendered ${cardCount} project cards for ${catalog.length} catalog entries.`);
if (failures.length) throw new Error(`Site validation failed:\n${failures.join("\n")}`);
console.log(`Validated ${cardCount} homepage project cards and ${checked} internal links/assets.`);
