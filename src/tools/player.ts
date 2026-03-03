import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStorage } from "../storage.js";
import { createEntityId } from "../state.js";

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function registerPlayerTools(server: McpServer): void {
  server.registerTool(
    "update_player",
    {
      description:
        "Updates player setup fields. Use this for initial setup or exceptional corrections only, not for normal narrative movement. Use move_to for story movement, set_class for class changes, and level_up for level changes.",
      inputSchema: {
        name: z.string().optional().describe("Player name"),
        location: z.string().optional().describe("Current location"),
        backstory: z.string().optional().describe("Protagonist backstory / origin"),
      },
    },
    async ({ name, location, backstory }) => {
      const storage = getStorage();
      const state = await storage.load();
      if (name !== undefined) state.player.name = name;
      if (location !== undefined) state.player.location = location;
      if (backstory !== undefined) state.player.backstory = backstory;
      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: `Player updated: ${JSON.stringify(state.player, null, 2)}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "add_wound",
    {
      description:
        "Adds a persistent wound to the player. Call when the player takes an injury during combat or a trap. Wounds persist across sessions and should be referenced in narration.",
      inputSchema: {
        description: z.string().describe("Vivid, specific wound description — e.g. 'fractured left forearm', 'spider venom coursing through the veins'"),
      },
    },
    async ({ description }) => {
      const storage = getStorage();
      const state = await storage.load();
      const normalized = normalizeText(description);
      const existing = state.wounds.find(
        (wound) => normalizeText(wound.description) === normalized
      );

      const wound = existing ?? { id: createEntityId(), description };
      if (!existing) {
        state.wounds.push(wound);
      }

      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { wound, duplicated: existing !== undefined, wounds: state.wounds },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "heal_wound",
    {
      description:
        "Removes a wound from the player. Prefer using the wound id returned by add_wound. Description matching is supported as a fallback when it is unambiguous.",
      inputSchema: {
        id: z.string().optional().describe("Stable wound id returned by add_wound"),
        description: z
          .string()
          .optional()
          .describe("Exact wound description to remove when no id is available"),
      },
    },
    async ({ id, description }) => {
      const storage = getStorage();
      const state = await storage.load();
      if (!id && !description) {
        return {
          content: [{ type: "text", text: 'Provide either "id" or "description".' }],
          isError: true,
        };
      }

      let matchIndexes: number[] = [];
      if (id) {
        matchIndexes = state.wounds
          .map((wound, index) => ({ wound, index }))
          .filter(({ wound }) => wound.id === id)
          .map(({ index }) => index);
      } else if (description) {
        const normalized = normalizeText(description);
        matchIndexes = state.wounds
          .map((wound, index) => ({ wound, index }))
          .filter(({ wound }) => normalizeText(wound.description) === normalized)
          .map(({ index }) => index);
      }

      if (matchIndexes.length === 0) {
        await storage.save(state);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ wounds: state.wounds, healed: false }, null, 2),
            },
          ],
        };
      }

      if (matchIndexes.length > 1) {
        const candidates = matchIndexes.map((index) => state.wounds[index]);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  healed: false,
                  reason: "ambiguous_wound_match",
                  candidates,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const healedWound = state.wounds[matchIndexes[0]];
      state.wounds.splice(matchIndexes[0], 1);
      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { healed: true, healed_wound: healedWound, wounds: state.wounds },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
