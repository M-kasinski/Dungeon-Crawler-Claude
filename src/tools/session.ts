import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStorage } from "../storage.js";

export function registerSessionTools(server: McpServer): void {
  server.registerTool(
    "save_summary",
    {
      description:
        "Saves a narrative summary of the current chapter. Overwrites the previous summary. Call at the end of each chapter so the story can be resumed later.",
      inputSchema: {
        text: z
          .string()
          .describe(
            "Dense narrative summary: what happened, where the protagonist is, key events, active wounds, items acquired"
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
        "Returns a fully formatted context block with everything needed to resume the story: protagonist info, arc plan, story threads, equipment, inventory, and session summary.",
      inputSchema: {},
    },
    async () => {
      const state = await getStorage().load();

      const equippedLines = [
        `  Arme:       ${state.equipped.weapon ? `${state.equipped.weapon.name} — ${state.equipped.weapon.description}` : "aucune"}`,
        `  Armure:     ${state.equipped.armor ? `${state.equipped.armor.name} — ${state.equipped.armor.description}` : "aucune"}`,
        `  Accessoire: ${state.equipped.accessory ? `${state.equipped.accessory.name} — ${state.equipped.accessory.description}` : "aucun"}`,
      ].join("\n");

      const inventoryLines =
        state.inventory.length === 0
          ? "  (vide)"
          : state.inventory
              .map((item) => `  - ${item.name} [${item.type}]: ${item.description}`)
              .join("\n");

      const perksLine =
        state.player.perks.length === 0
          ? "aucun"
          : state.player.perks.join(", ");

      const threadsLines =
        state.story_threads.length === 0
          ? "  (aucun fil actif)"
          : state.story_threads.map((t) => `  - ${t}`).join("\n");

      const arcBlock = state.story_arc
        ? [
            `  Titre:      ${state.story_arc.title}`,
            `  Acte:       ${state.story_arc.current_act + 1}/${state.story_arc.acts.length} — ${state.story_arc.acts[state.story_arc.current_act] ?? "(terminé)"}`,
            `  Climax:     ${state.story_arc.climax}`,
            `  Résolution: ${state.story_arc.resolution}`,
          ].join("\n")
        : "  (aucun arc défini)";

      const context = `
=== DUNGEON CRAWLER CLAUDE — CONTEXTE HISTOIRE ===

PROTAGONISTE
  Nom:       ${state.player.name ?? "(non défini)"}
  Classe:    ${state.player.class ?? "(non choisie)"}
  Niveau:    ${state.player.level}
  Location:  ${state.player.location}
  Perks:     ${perksLine}
  Backstory: ${state.player.backstory || "(non défini)"}

STATS
  STR ${state.player.stats.str}  AGI ${state.player.stats.agi}  INT ${state.player.stats.int}  VIT ${state.player.stats.vit}  LCK ${state.player.stats.lck}

ARC NARRATIF
${arcBlock}

FILS NARRATIFS ACTIFS
${threadsLines}

DUNGEON
  Floor: ${state.floor}  Tome: ${state.tome}  Thème: ${state.floor_theme}

RYTHME
  Événements ce floor: ${state.floor_event_count} | Depuis dernier level up: ${state.events_since_level_up}

BLESSURES (${state.wounds.length})
${state.wounds.length === 0 ? "  (aucune)" : state.wounds.map((w) => `  - ${w}`).join("\n")}

ÉQUIPEMENT
${equippedLines}

INVENTAIRE (${state.inventory.length} objet(s))
${inventoryLines}

TOTAL MOTS ÉCRITS: ${state.total_words.toLocaleString("fr-FR")}

RÉSUMÉ DERNIÈRE SESSION
${state.session_summary || "(aucun résumé — nouvelle histoire)"}

===================================================
`.trim();

      return {
        content: [{ type: "text", text: context }],
      };
    }
  );

  server.registerTool(
    "set_story_arc",
    {
      description:
        "Creates or replaces the narrative arc plan. Call before the first chapter of each new tome. Display the plan to the author before writing.",
      inputSchema: {
        title: z.string().describe("Arc title — e.g. 'Tome 1 : L'Éveil'"),
        acts: z
          .array(z.string())
          .min(2)
          .max(5)
          .describe("List of acts — e.g. ['Acte 1 : Descente', 'Acte 2 : La Guilde Noire']"),
        climax: z.string().describe("Arc climax — e.g. 'Confrontation with the Floor 10 Boss'"),
        resolution: z
          .string()
          .describe("Arc resolution/consequence — e.g. 'Marcus earns his reputation as an independent'"),
      },
    },
    async ({ title, acts, climax, resolution }) => {
      const storage = getStorage();
      const state = await storage.load();
      state.story_arc = { title, acts, climax, resolution, current_act: 0 };
      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ story_arc: state.story_arc }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_story_arc",
    {
      description:
        "Returns the current arc plan and position. Call at the start of each chapter to verify the narrative direction.",
      inputSchema: {},
    },
    async () => {
      const state = await getStorage().load();
      if (!state.story_arc) {
        return {
          content: [{ type: "text", text: "No arc defined. Call set_story_arc first." }],
        };
      }
      const arc = state.story_arc;
      const result = {
        title: arc.title,
        current_act_index: arc.current_act,
        current_act_name: arc.acts[arc.current_act] ?? "(all acts complete)",
        total_acts: arc.acts.length,
        all_acts: arc.acts,
        climax: arc.climax,
        resolution: arc.resolution,
        acts_remaining: arc.acts.length - arc.current_act - 1,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "advance_arc",
    {
      description:
        "Advances to the next act of the narrative arc. Call when an act is narratively concluded.",
      inputSchema: {},
    },
    async () => {
      const storage = getStorage();
      const state = await storage.load();
      if (!state.story_arc) {
        return {
          content: [{ type: "text", text: "No arc defined." }],
        };
      }
      const prev = state.story_arc.current_act;
      const max = state.story_arc.acts.length - 1;
      state.story_arc.current_act = Math.min(prev + 1, max);
      await storage.save(state);
      const arc = state.story_arc;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                previous_act: arc.acts[prev],
                current_act: arc.acts[arc.current_act] ?? "(arc complete)",
                current_act_index: arc.current_act,
                arc_complete: prev >= max,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "add_story_thread",
    {
      description:
        "Adds an unresolved narrative thread. Call when a tension or mystery element is introduced in the prose.",
      inputSchema: {
        thread: z
          .string()
          .describe(
            "Thread description — e.g. 'The black guild has been tracking the protagonist since Floor 2'"
          ),
      },
    },
    async ({ thread }) => {
      const storage = getStorage();
      const state = await storage.load();
      if (!state.story_threads.includes(thread)) {
        state.story_threads.push(thread);
      }
      await storage.save(state);
      return {
        content: [
          { type: "text", text: JSON.stringify({ story_threads: state.story_threads }, null, 2) },
        ],
      };
    }
  );

  server.registerTool(
    "resolve_story_thread",
    {
      description:
        "Closes a narrative thread. Call when a thread is resolved in the prose.",
      inputSchema: {
        thread: z.string().describe("Exact text of the thread to remove"),
      },
    },
    async ({ thread }) => {
      const storage = getStorage();
      const state = await storage.load();
      const idx = state.story_threads.indexOf(thread);
      const resolved = idx !== -1;
      if (resolved) state.story_threads.splice(idx, 1);
      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ resolved, story_threads: state.story_threads }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "log_words",
    {
      description:
        "Adds N words to the novel's total word counter. Call after each chapter with an estimated word count.",
      inputSchema: {
        count: z.number().int().min(1).describe("Number of words in this chapter"),
      },
    },
    async ({ count }) => {
      const storage = getStorage();
      const state = await storage.load();
      state.total_words += count;
      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { chapter_words: count, total_words: state.total_words },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
