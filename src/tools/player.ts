import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DEFAULT_STATE } from "../state.js";
import { getStorage } from "../storage.js";

export function registerPlayerTools(server: McpServer): void {
  server.registerTool(
    "get_state",
    {
      description:
        "Returns the complete current game state (player, inventory, equipment, map, session summary).",
      inputSchema: {},
    },
    async () => {
      const state = await getStorage().load();
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
      const storage = getStorage();
      const state = await storage.load();
      if (name !== undefined) state.player.name = name;
      if (playerClass !== undefined) state.player.class = playerClass;
      if (level !== undefined) state.player.level = level;
      if (location !== undefined) state.player.location = location;
      await storage.save(state);
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
    "add_wound",
    {
      description:
        "Adds a persistent wound to the player. Call when the player takes an injury during combat or a trap. Wounds persist across sessions and should be referenced in narration.",
      inputSchema: {
        description: z.string().describe("Vivid, specific wound description — e.g. 'fractured left forearm', 'spider venom coursing through the veins'"),
      },
    },
    async ({ description }) => {
      const storage = getStorage();
      const state = await storage.load();
      state.wounds.push(description);
      await storage.save(state);
      return {
        content: [{ type: "text", text: JSON.stringify({ wounds: state.wounds }, null, 2) }],
      };
    }
  );

  server.registerTool(
    "heal_wound",
    {
      description:
        "Removes a wound from the player. Call when a wound is healed via consumable, rest, or magic.",
      inputSchema: {
        description: z.string().describe("Exact wound description to remove"),
      },
    },
    async ({ description }) => {
      const storage = getStorage();
      const state = await storage.load();
      const idx = state.wounds.indexOf(description);
      const healed = idx !== -1;
      if (healed) state.wounds.splice(idx, 1);
      await storage.save(state);
      return {
        content: [{ type: "text", text: JSON.stringify({ wounds: state.wounds, healed }, null, 2) }],
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
      await getStorage().save(structuredClone(DEFAULT_STATE));
      return {
        content: [{ type: "text", text: "Game state reset to default." }],
      };
    }
  );
}
