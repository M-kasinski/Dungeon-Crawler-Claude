import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStorage } from "../storage.js";

export function registerProgressionTools(server: McpServer): void {
  server.registerTool(
    "level_up",
    {
      description:
        "Increments the player's level by 1. Returns the new level and class_tier_event (1=choose class, 2=evolve, 3=mastery) when a class milestone is reached, or null otherwise.",
      inputSchema: {},
    },
    async () => {
      const storage = getStorage();
      const state = await storage.load();
      state.player.level += 1;

      let classTierEvent: number | null = null;
      const { level, class_tier } = state.player;
      if (level === 5 && class_tier === 0) classTierEvent = 1;
      else if (level === 10 && class_tier === 1) classTierEvent = 2;
      else if (level === 15 && class_tier === 2) classTierEvent = 3;

      const STATS = ["str", "agi", "int", "vit", "lck"] as const;
      const statGains: Record<string, number> = {};
      for (const s of STATS) { state.player.stats[s] += 1; statGains[s] = 1; }
      for (let i = 0; i < 2; i++) {
        const pick = STATS[Math.floor(Math.random() * STATS.length)];
        state.player.stats[pick] += 1;
        statGains[pick] += 1;
      }

      state.events_since_level_up = 0;
      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { new_level: state.player.level, class_tier_event: classTierEvent, stat_gains: statGains, stats: state.player.stats, events_since_level_up: 0 },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "set_class",
    {
      description:
        "Sets the player's class and its narrative perks. Called after the player makes their class selection.",
      inputSchema: {
        className: z.string().describe("Name of the chosen class"),
        perks: z
          .array(z.string())
          .describe("List of 2-3 narrative perk descriptions for this class"),
      },
    },
    async ({ className, perks }) => {
      const storage = getStorage();
      const state = await storage.load();
      state.player.class = className;
      state.player.perks = perks;
      state.player.class_tier = Math.min(state.player.class_tier + 1, 3);
      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: `Class set to "${className}" (tier ${state.player.class_tier}) with perks: ${perks.join(", ")}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_progression",
    {
      description: "Returns the player's current level, class, and perks.",
      inputSchema: {},
    },
    async () => {
      const state = await getStorage().load();
      const result = {
        level: state.player.level,
        class: state.player.class,
        perks: state.player.perks,
        stats: state.player.stats,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
