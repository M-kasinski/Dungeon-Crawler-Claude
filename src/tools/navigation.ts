import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadState, saveState } from "../state.js";

export function registerNavigationTools(server: McpServer): void {
  server.registerTool(
    "move_to",
    {
      description:
        "Moves the player to a new location. The previous location is added to visited_locations.",
      inputSchema: {
        location: z.string().describe("The new location to move to"),
      },
    },
    async ({ location }) => {
      const state = loadState();
      const previous = state.player.location;

      if (!state.visited_locations.includes(previous)) {
        state.visited_locations.push(previous);
      }

      state.player.location = location;
      saveState(state);

      return {
        content: [
          {
            type: "text",
            text: `Moved from "${previous}" to "${location}". Visited locations: ${state.visited_locations.length}.`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_map",
    {
      description:
        "Returns the player's current location and all visited locations.",
      inputSchema: {},
    },
    async () => {
      const state = loadState();
      const result = {
        current_location: state.player.location,
        visited_locations: state.visited_locations,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "suggest_exits",
    {
      description:
        "Given a description of the current room/situation, returns visited locations to avoid and a structure for Claude to fill with 2-4 novel exit suggestions.",
      inputSchema: {
        context: z
          .string()
          .describe("Brief description of the current room or situation"),
      },
    },
    async ({ context }) => {
      const state = loadState();
      const result = {
        current_location: state.player.location,
        visited_locations: state.visited_locations,
        instruction:
          "Generate 2-4 exit names that are NOT in visited_locations. Make them evocative and fitting for the dungeon context described below.",
        context,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
