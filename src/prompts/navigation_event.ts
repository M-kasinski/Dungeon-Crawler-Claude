import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getStorage } from "../storage.js";

export function registerNavigationEventPrompt(server: McpServer): void {
  server.registerPrompt(
    "navigation_event",
    {
      description:
        "Triggers a navigation event: present 2-4 unexplored exits for the player to choose from, then move them.",
    },
    async () => {
      const state = await getStorage().load();
      const visitedList =
        state.visited_locations.length > 0
          ? state.visited_locations.map((l) => `  - ${l}`).join("\n")
          : "  (none yet)";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `You are the System — the sardonic narrator of this dungeon. The player has reached a crossroads.

CURRENT STATE:
- Current location: ${state.player.location}
- Already visited:
${visitedList}

Generate 2-4 exit options. Each exit must:
1. Have an evocative name that fits a dungeon environment
2. NOT be any of the already-visited locations listed above
3. NOT be the current location

Describe each exit briefly with a sentence of narrative flavor. Present them to the player and wait for their choice. After they choose, call the \`move_to\` tool with the chosen location name.

Do NOT call move_to before the player has chosen.`,
            },
          },
        ],
      };
    }
  );
}
