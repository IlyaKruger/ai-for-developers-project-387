import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createApp } from "./app.js";
import { createDb } from "./db.js";

const db = createDb();
const app = createApp(db);

if (existsSync("public/index.html")) {
  app.use("/*", serveStatic({ root: "./public" }));
  app.get("/*", async (c) => c.html(await readFile("public/index.html", "utf-8")));
}

const port = Number(process.env.PORT) || 3001;
serve({ fetch: app.fetch, port }, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
