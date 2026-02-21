import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStorage } from "../storage.js";

export function registerSessionTools(server: McpServer): void {
  server.registerTool(
    "save_summary",
    {
      description:
        "Saves a narrative summary of the current session. Overwrites the previous summary. Call this at the end of a session so the story can be resumed later.",
      inputSchema: {
        text: z
          .string()
          .describe(
            "Narrative summary of the session: what happened, where the player is, key events"
          ),
      },
    },
    async ({ text }) => {
      const storage = getStorage();
      const state = await storage.load();
      state.session_summary = text;
      await storage.save(state);
      return {
        content: [{ type: "text", text: "Session summary saved." }],
      };
    }
  );

  server.registerTool(
    "get_session_context",
    {
      description:
        "Returns a fully formatted context block with everything needed to resume the game: player info, equipment, inventory, map, and session summary.",
      inputSchema: {},
    },
    async () => {
      const state = await getStorage().load();

      const equippedLines = [
        `  Weapon: ${state.equipped.weapon ? `${state.equipped.weapon.name} — ${state.equipped.weapon.description}` : "none"}`,
        `  Armor:  ${state.equipped.armor ? `${state.equipped.armor.name} — ${state.equipped.armor.description}` : "none"}`,
        `  Accessory: ${state.equipped.accessory ? `${state.equipped.accessory.name} — ${state.equipped.accessory.description}` : "none"}`,
      ].join("\n");

      const inventoryLines =
        state.inventory.length === 0
          ? "  (empty)"
          : state.inventory
              .map((item) => `  - ${item.name} [${item.type}]: ${item.description}`)
              .join("\n");

      const visitedLines =
        state.visited_locations.length === 0
          ? "  (none yet)"
          : state.visited_locations.map((loc) => `  - ${loc}`).join("\n");

      const perksLine =
        state.player.perks.length === 0
          ? "none"
          : state.player.perks.join(", ");

      const context = `
=== DUNGEON CRAWLER — SESSION CONTEXT ===

PLAYER
  Name:     ${state.player.name ?? "(unknown)"}
  Class:    ${state.player.class ?? "(not chosen)"}
  Level:    ${state.player.level}
  Location: ${state.player.location}
  Perks:    ${perksLine}

EQUIPPED
${equippedLines}

INVENTORY (${state.inventory.length} item(s))
${inventoryLines}

VISITED LOCATIONS
${visitedLines}

LAST SESSION SUMMARY
${state.session_summary || "(no summary saved yet — this is a fresh start)"}

==========================================
`.trim();

      return {
        content: [{ type: "text", text: context }],
      };
    }
  );
}
