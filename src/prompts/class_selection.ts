import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStorage } from "../storage.js";

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
      const state = await getStorage().load();
      const playstyleNote = context
        ? `\nAdditional context about the player's playstyle: ${context}`
        : "";

      const tier = state.player.class_tier;
      const tierLabel =
        tier === 0
          ? "CLASS SELECTION — You are still an unclassed Adventurer."
          : tier === 1
            ? `CLASS EVOLUTION — Your class "${state.player.class}" is ready to evolve into a specialization.`
            : `CLASS MASTERY — Your specialization "${state.player.class}" can now transcend into its ultimate form.`;

      const tierInstruction =
        tier === 0
          ? "Generate exactly 3 classes tailored to this player's journey. Each class should feel earned — rooted in what they've done, not generic fantasy archetypes."
          : tier === 1
            ? `Generate exactly 3 specializations that branch from the "${state.player.class}" class. Each should deepen or twist the existing identity in a distinct direction.`
            : `Generate exactly 3 mastery paths — ultimate, legendary forms of "${state.player.class}". These should feel monumental. A player who reaches mastery is becoming something the dungeon has never seen.`;

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `You are the System — the sardonic narrator of this dungeon. ${tierLabel}

CURRENT PLAYER STATE:
- Name: ${state.player.name ?? "(unknown)"}
- Level: ${state.player.level}
- Current class: ${state.player.class ?? "(none yet)"}
- Current perks: ${state.player.perks.length > 0 ? state.player.perks.join(" | ") : "(none)"}
- Inventory items: ${state.inventory.length}
- Locations visited: ${state.visited_locations.length}${playstyleNote}

${tierInstruction}

For each option, provide:
- A name (creative, dungeon-flavored)
- 2-3 narrative perks (what this class means for the story and narration — not game mechanics; each perk must say WHAT the player can do AND in WHAT context)

Present all 3 options with flavor text. Wait for the player's choice. After they choose, call the \`set_class\` tool with the className and the array of perk descriptions.

Do NOT call set_class before the player has chosen.`,
            },
          },
        ],
      };
    }
  );
}
