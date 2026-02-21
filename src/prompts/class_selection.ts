import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadState } from "../state.js";

export function registerClassSelectionPrompt(server: McpServer): void {
  server.registerPrompt(
    "class_selection",
    {
      description:
        "Triggers a class selection event: generate 3 classes tailored to the player's history, then persist the chosen class.",
      argsSchema: {
        context: z
          .string()
          .optional()
          .describe(
            "Optional notes about the player's playstyle or recent actions to inform class suggestions"
          ),
      },
    },
    async ({ context }) => {
      const state = loadState();
      const playstyleNote = context
        ? `\nAdditional context about the player's playstyle: ${context}`
        : "";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `You are the System — the sardonic narrator of this dungeon. A class selection event has triggered.

CURRENT PLAYER STATE:
- Name: ${state.player.name ?? "(unknown)"}
- Level: ${state.player.level}
- Current class: ${state.player.class ?? "(none yet)"}
- Inventory items: ${state.inventory.length}
- Locations visited: ${state.visited_locations.length}${playstyleNote}

Generate exactly 3 class options tailored to this player's journey so far. For each class, provide:
- A name (creative, dungeon-flavored — not generic fantasy classes)
- 2-3 narrative perks (what this class means for the story and narration, not game mechanics)

Present all 3 options with flavor text. Wait for the player's choice. After they choose, call the \`set_class\` tool with the className and the array of perk descriptions.

Do NOT call set_class before the player has chosen.`,
            },
          },
        ],
      };
    }
  );
}
