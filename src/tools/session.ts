import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStorage } from "../storage.js";
import { createEntityId, type StoryThread } from "../state.js";

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function findThreadMatches(
  storyThreads: StoryThread[],
  input: { id?: string; thread?: string }
): StoryThread[] {
  if (input.id) {
    return storyThreads.filter((storyThread) => storyThread.id === input.id);
  }

  if (!input.thread) {
    return [];
  }

  const normalized = normalizeText(input.thread);
  return storyThreads.filter(
    (storyThread) => normalizeText(storyThread.text) === normalized
  );
}

export function registerSessionTools(server: McpServer): void {
  server.registerTool(
    "get_session_context",
    {
      description:
        "Returns a fully formatted context block for story resumption or narrative debugging. Prefer the start prompt at the beginning of a normal session.",
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
          : state.story_threads.map((thread) => `  - ${thread.text}`).join("\n");

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
${state.wounds.length === 0 ? "  (aucune)" : state.wounds.map((wound) => `  - ${wound.description}`).join("\n")}

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
      const normalized = normalizeText(thread);
      const existing = state.story_threads.find(
        (storyThread) => normalizeText(storyThread.text) === normalized
      );
      const storyThread = existing ?? { id: createEntityId(), text: thread };
      if (!existing) {
        state.story_threads.push(storyThread);
      }
      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                story_thread: storyThread,
                duplicated: existing !== undefined,
                story_threads: state.story_threads,
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
    "resolve_story_thread",
    {
      description:
        "Closes a narrative thread. Prefer using the thread id returned by add_story_thread. Text matching is supported only when it is unambiguous.",
      inputSchema: {
        id: z.string().optional().describe("Stable thread id to resolve"),
        thread: z
          .string()
          .optional()
          .describe("Exact thread text to remove when no id is available"),
      },
    },
    async ({ id, thread }) => {
      const storage = getStorage();
      const state = await storage.load();
      if (!id && !thread) {
        return {
          content: [{ type: "text", text: 'Provide either "id" or "thread".' }],
          isError: true,
        };
      }

      const matches = findThreadMatches(state.story_threads, { id, thread });
      if (matches.length > 1) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  resolved: false,
                  reason: "ambiguous_story_thread_match",
                  candidates: matches,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const storyThread = matches[0];
      const resolved = storyThread !== undefined;
      if (storyThread) {
        const idx = state.story_threads.findIndex((entry) => entry.id === storyThread.id);
        state.story_threads.splice(idx, 1);
      }
      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { resolved, story_thread: storyThread ?? null, story_threads: state.story_threads },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "end_chapter",
    {
      description:
        "Single atomic call to close a chapter and prepare the next session. Saves summary, logs word count, adds new story threads, and resolves closed ones. Always call this at the end of a chapter before closing the conversation.",
      inputSchema: {
        summary: z
          .string()
          .describe(
            "Dense narrative summary for next session: location, key events, wounds, items acquired, cliffhanger if any"
          ),
        word_count: z.number().int().min(1).describe("Estimated word count written this chapter"),
        new_threads: z
          .array(z.string())
          .optional()
          .describe("New unresolved narrative threads introduced this chapter"),
        resolved_thread_ids: z
          .array(z.string())
          .optional()
          .describe("Preferred: stable thread ids returned by add_story_thread for threads resolved this chapter"),
        resolved_threads: z
          .array(z.string())
          .optional()
          .describe("Fallback: exact thread text when no id is available"),
      },
    },
    async ({ summary, word_count, new_threads = [], resolved_thread_ids = [], resolved_threads = [] }) => {
      const storage = getStorage();
      const state = await storage.load();
      const createdThreadIds: string[] = [];
      const unresolvedResolutionRequests: Array<{
        thread: string;
        reason: "not_found" | "ambiguous_story_thread_match";
        candidates?: StoryThread[];
      }> = [];

      state.session_summary = summary;
      state.total_words += word_count;

      for (const thread of new_threads) {
        const normalized = normalizeText(thread);
        const existing = state.story_threads.find(
          (storyThread) => normalizeText(storyThread.text) === normalized
        );
        if (!existing) {
          const storyThread = { id: createEntityId(), text: thread };
          state.story_threads.push(storyThread);
          createdThreadIds.push(storyThread.id);
        }
      }

      for (const id of resolved_thread_ids) {
        const matches = findThreadMatches(state.story_threads, { id });
        if (matches.length === 1) {
          const idx = state.story_threads.findIndex((entry) => entry.id === matches[0].id);
          state.story_threads.splice(idx, 1);
        }
      }

      for (const thread of resolved_threads) {
        const matches = findThreadMatches(state.story_threads, { thread });
        if (matches.length === 1) {
          const idx = state.story_threads.findIndex((entry) => entry.id === matches[0].id);
          state.story_threads.splice(idx, 1);
          continue;
        }

        unresolvedResolutionRequests.push({
          thread,
          reason: matches.length === 0 ? "not_found" : "ambiguous_story_thread_match",
          candidates: matches.length > 1 ? matches : undefined,
        });
      }

      await storage.save(state);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "chapter_closed",
                chapter_words: word_count,
                total_words: state.total_words,
                active_threads: state.story_threads.length,
                created_thread_ids: createdThreadIds,
                unresolved_resolution_requests: unresolvedResolutionRequests,
                story_threads: state.story_threads,
                instruction: "State saved. You can close this conversation and start a new one with /dungeon__start.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
