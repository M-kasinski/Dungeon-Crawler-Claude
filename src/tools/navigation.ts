import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStorage } from "../storage.js";

const FLOOR_THEMES = [
  "Flooded Ruins",
  "Bone Cathedral",
  "Fungal Depths",
  "Crumbling Archive",
  "Sulfur Vents",
  "Frozen Tombs",
  "Flesh Labyrinth",
  "Shattered Clockwork",
  "Drowned Marketplace",
  "Crystalline Abyss",
  "Plague Ward",
  "Ember Vaults",
];

export function registerNavigationTools(server: McpServer): void {
  server.registerTool(
    "move_to",
    {
      description:
        "Canonical tool for significant narrative movement. Moves the player to a new location and adds the previous location to visited_locations.",
      inputSchema: {
        location: z.string().describe("The new location to move to"),
      },
    },
    async ({ location }) => {
      const storage = getStorage();
      const state = await storage.load();
      const previous = state.player.location;

      if (!state.visited_locations.includes(previous)) {
        state.visited_locations.push(previous);
      }

      state.player.location = location;
      await storage.save(state);

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
    "descend_floor",
    {
      description:
        "Major transition tool for descending to the next dungeon floor. Irreversible. Clears visited_locations for the new floor. Every 5 floors triggers a tome milestone — call end_chapter to close the tome and tell the player to start a new conversation. Do not use this for ordinary room-to-room movement.",
      inputSchema: {},
    },
    async () => {
      const storage = getStorage();
      const state = await storage.load();
      state.floor += 1;
      state.visited_locations = [];
      state.player.location = `Floor ${state.floor} - Entrance`;
      state.floor_event_count = 0;

      const available = FLOOR_THEMES.filter((t) => t !== state.floor_theme);
      state.floor_theme = available[Math.floor(Math.random() * available.length)];

      let milestone = false;
      if (state.floor % 5 === 0) {
        state.tome += 1;
        milestone = true;
      }

      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { floor: state.floor, tome: state.tome, milestone, floor_theme: state.floor_theme },
              null,
              2
            ),
          },
        ],
      };
    }
  );

}
