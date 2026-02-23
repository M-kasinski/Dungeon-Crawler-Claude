import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPlayerTools } from "./tools/player.js";
import { registerInventoryTools } from "./tools/inventory.js";
import { registerEquipmentTools } from "./tools/equipment.js";
import { registerProgressionTools } from "./tools/progression.js";
import { registerNavigationTools } from "./tools/navigation.js";
import { registerSessionTools } from "./tools/session.js";
import { registerEventsTools } from "./tools/events.js";
import { registerStartSessionPrompt } from "./prompts/start_session.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "dungeon",
    version: "1.0.0",
  });

  // Tools — MVP order
  registerPlayerTools(server);
  registerInventoryTools(server);
  registerEquipmentTools(server);
  registerProgressionTools(server);
  registerNavigationTools(server);
  registerSessionTools(server);
  registerEventsTools(server);

  // Prompts
  registerStartSessionPrompt(server);

  return server;
}
