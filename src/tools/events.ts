import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStorage } from "../storage.js";

const LEVEL_UP_THRESHOLD = 4;
const FLOOR_COMPLETE_THRESHOLD = 5;

export function registerEventsTools(server: McpServer): void {
  server.registerTool(
    "log_event",
    {
      description:
        "Logs a significant concluded story event. Call after: combat resolved, loot chosen, NPC interaction complete, trap triggered, discovery made, puzzle solved. Do not use for minor beats or atmosphere. Increments pacing counters and signals when a level up is due or the floor feels complete.",
      inputSchema: {
        type: z
          .enum(["combat", "loot", "npc", "trap", "discovery", "puzzle"])
          .describe("Type of event that just concluded"),
      },
    },
    async ({ type }) => {
      const storage = getStorage();
      const state = await storage.load();

      state.floor_event_count += 1;
      state.events_since_level_up += 1;

      await storage.save(state);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                type,
                floor_event_count: state.floor_event_count,
                events_since_level_up: state.events_since_level_up,
                level_up_available: state.events_since_level_up >= LEVEL_UP_THRESHOLD,
                floor_complete: state.floor_event_count >= FLOOR_COMPLETE_THRESHOLD,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
