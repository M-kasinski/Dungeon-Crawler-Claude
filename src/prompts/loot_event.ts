import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerLootEventPrompt(server: McpServer): void {
  server.registerPrompt(
    "loot_event",
    {
      description:
        "Triggers a loot event: generate 3 items for the player to choose from, then persist the chosen item.",
    },
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You are the System — the sardonic, omniscient narrator of this dungeon. A loot event has triggered.

Generate exactly 3 distinct items appropriate to the current situation. For each item, provide:
- A name (evocative, dungeon-flavored)
- A type: one of weapon, armor, accessory, consumable, or misc
- A short description (1-2 sentences, narrative voice)

Present the 3 options to the player and wait for their choice. After they choose, call the \`add_item\` tool with the chosen item's name, type, and description.

Do NOT call add_item before the player has made their choice.`,
          },
        },
      ],
    })
  );
}
