import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadState, saveState } from "../state.js";

const CLASS_EVENT_INTERVAL = 5;

export function registerProgressionTools(server: McpServer): void {
  server.registerTool(
    "level_up",
    {
      description:
        "Increments the player's level by 1. Returns the new level and whether a class selection event should trigger (every 5 levels).",
      inputSchema: {},
    },
    async () => {
      const state = loadState();
      state.player.level += 1;
      const classEvent = state.player.level % CLASS_EVENT_INTERVAL === 0;
      saveState(state);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { new_level: state.player.level, class_event: classEvent },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "set_class",
    {
      description:
        "Sets the player's class and its narrative perks. Called after the player makes their class selection.",
      inputSchema: {
        className: z.string().describe("Name of the chosen class"),
        perks: z
          .array(z.string())
          .describe("List of 2-3 narrative perk descriptions for this class"),
      },
    },
    async ({ className, perks }) => {
      const state = loadState();
      state.player.class = className;
      state.player.perks = perks;
      saveState(state);
      return {
        content: [
          {
            type: "text",
            text: `Class set to "${className}" with perks: ${perks.join(", ")}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_progression",
    {
      description: "Returns the player's current level, class, and perks.",
      inputSchema: {},
    },
    async () => {
      const state = loadState();
      const result = {
        level: state.player.level,
        class: state.player.class,
        perks: state.player.perks,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
