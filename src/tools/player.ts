import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadState, saveState, DEFAULT_STATE } from "../state.js";

export function registerPlayerTools(server: McpServer): void {
  server.registerTool(
    "get_state",
    {
      description:
        "Returns the complete current game state (player, inventory, equipment, map, session summary).",
      inputSchema: {},
    },
    async () => {
      const state = loadState();
      return {
        content: [{ type: "text", text: JSON.stringify(state, null, 2) }],
      };
    }
  );

  server.registerTool(
    "update_player",
    {
      description:
        "Updates one or more player fields. Only provided fields are changed.",
      inputSchema: {
        name: z.string().optional().describe("Player name"),
        class: z.string().optional().describe("Player class"),
        level: z.number().int().min(1).optional().describe("Player level"),
        location: z.string().optional().describe("Current location"),
      },
    },
    async ({ name, class: playerClass, level, location }) => {
      const state = loadState();
      if (name !== undefined) state.player.name = name;
      if (playerClass !== undefined) state.player.class = playerClass;
      if (level !== undefined) state.player.level = level;
      if (location !== undefined) state.player.location = location;
      saveState(state);
      return {
        content: [
          {
            type: "text",
            text: `Player updated: ${JSON.stringify(state.player, null, 2)}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "reset_game",
    {
      description:
        "Resets the entire game state to its initial values. Irreversible.",
      inputSchema: {},
    },
    async () => {
      saveState(structuredClone(DEFAULT_STATE));
      return {
        content: [{ type: "text", text: "Game state reset to default." }],
      };
    }
  );
}
