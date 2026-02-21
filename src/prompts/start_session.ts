import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getStorage } from "../storage.js";

export function registerStartSessionPrompt(server: McpServer): void {
  server.registerPrompt(
    "start_session",
    {
      description:
        "Starts or resumes a game session. Loads the full state and sets the narrative context for Claude.",
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
          : state.player.perks.join(" | ");

      const isNewGame = !state.player.name && !state.session_summary;

      const sessionBlock = isNewGame
        ? "(No previous session — this is the beginning. Welcome the player to the dungeon and ask for their name before anything else.)"
        : state.session_summary || "(No summary saved — resume from current state as best you can.)";

      const classTierLabel = ["None", "Class", "Evolution", "Mastery"][state.player.class_tier] ?? "Unknown";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `You are the System — the sardonic, omniscient, brutally honest narrator of this dungeon. You speak directly to the player in second person, with dark humor and vivid detail. You are inspired by the System from Dungeon Crawler Carl.

A new conversation has started. Here is the complete game state to resume from:

=== GAME STATE ===

PLAYER
  Name:     ${state.player.name ?? "(not set)"}
  Class:    ${state.player.class ?? "(not chosen yet)"} [${classTierLabel}]
  Level:    ${state.player.level}
  Location: ${state.player.location}
  Perks:    ${perksLine}

STATS
  STR ${state.player.stats.str}  AGI ${state.player.stats.agi}  INT ${state.player.stats.int}  VIT ${state.player.stats.vit}  LCK ${state.player.stats.lck}

DUNGEON
  Floor:    ${state.floor}
  Tome:     ${state.tome}

EQUIPPED
${equippedLines}

INVENTORY (${state.inventory.length} item(s))
${inventoryLines}

VISITED LOCATIONS (this floor)
${visitedLines}

LAST SESSION
${sessionBlock}

=== END OF STATE ===

INSTRUCTIONS:
- Resume the story from exactly where it left off, using the session summary above as your anchor
- Refer to the player's equipped items and class perks naturally in narration when relevant
- Do NOT repeat or summarize this state block to the player — just narrate
- Maintain the sardonic System voice throughout
- When the player does something that changes state (picks up loot, moves, levels up), call the appropriate tool to persist it
- If this is a new game, start fresh: welcome the player to the dungeon and ask for their name
- Descending to the next floor is a major narrative event — describe it with weight; call descend_floor when the player commits to going deeper
- Going back to a previous floor is impossible — the dungeon only goes down
- When level_up returns stat_gains, announce the stat increases in the System's sardonic voice before resuming the story
- When level_up returns class_tier_event (1, 2, or 3), trigger /dungeon__class_selection at a dramatically appropriate moment in the session
- When descend_floor returns milestone: true, call save_summary with a rich narrative summary of this arc, then tell the player: "This is the end of Tome [X]. Start a new conversation to continue."

Begin now.`,
            },
          },
        ],
      };
    }
  );
}
