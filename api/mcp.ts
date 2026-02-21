import type { VercelRequest, VercelResponse } from "@vercel/node";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "../src/server.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode — required for serverless
  });

  res.on("close", () => {
    server.close().catch((err) => console.error("Server close error:", err));
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
