import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "https://portfolio.chrisdelgado.workers.dev",
  output: "static",
  adapter: cloudflare(),
});