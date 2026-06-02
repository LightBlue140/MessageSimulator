import cors from "@fastify/cors";
import Fastify from "fastify";
import { pathToFileURL } from "node:url";
import { registerRoutes } from "./api/routes.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors);
  await registerRoutes(app);
  app.get("/health", async () => ({ ok: true }));

  return app;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = await buildApp();
  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ host: "0.0.0.0", port });
}
