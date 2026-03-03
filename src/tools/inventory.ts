import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStorage } from "../storage.js";
import { createEntityId, type Item, type ItemType } from "../state.js";

const ITEM_TYPES: [ItemType, ...ItemType[]] = [
  "weapon",
  "armor",
  "accessory",
  "consumable",
  "misc",
];

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function findItemsByName(items: Item[], name: string): Item[] {
  const normalized = normalizeText(name);
  return items.filter((item) => normalizeText(item.name) === normalized);
}

export function registerInventoryTools(server: McpServer): void {
  server.registerTool(
    "add_item",
    {
      description: "Adds an item to the player's inventory.",
      inputSchema: {
        name: z.string().describe("Item name"),
        type: z
          .enum(ITEM_TYPES)
          .describe(
            'Item type: "weapon", "armor", "accessory", "consumable", or "misc"'
          ),
        description: z.string().describe("Short narrative description of the item"),
      },
    },
    async ({ name, type, description }) => {
      const storage = getStorage();
      const state = await storage.load();
      const item = { id: createEntityId(), name, type, description };
      state.inventory.push(item);
      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                item,
                inventory_count: state.inventory.length,
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
    "remove_item",
    {
      description:
        "Removes an item from the player's inventory. Prefer using the item id returned by add_item. Name matching is supported only when it identifies a single item.",
      inputSchema: {
        id: z.string().optional().describe("Stable item id to remove"),
        name: z
          .string()
          .optional()
          .describe("Item name to remove when there is only one matching item"),
      },
    },
    async ({ id, name }) => {
      const storage = getStorage();
      const state = await storage.load();
      if (!id && !name) {
        return {
          content: [
            { type: "text", text: 'Provide either "id" or "name".' },
          ],
          isError: true,
        };
      }

      let matches: Item[] = [];
      if (id) {
        matches = state.inventory.filter((item) => item.id === id);
      } else if (name) {
        matches = findItemsByName(state.inventory, name);
      }

      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Item ${id ? `with id "${id}"` : `"${name}"`} not found in inventory.`,
            },
          ],
          isError: true,
        };
      }

      if (!id && matches.length > 1) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  removed: false,
                  reason: "ambiguous_item_match",
                  candidates: matches.map((item) => ({
                    id: item.id,
                    name: item.name,
                    type: item.type,
                  })),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const itemToRemove = matches[0];
      const index = state.inventory.findIndex((item) => item.id === itemToRemove.id);
      state.inventory.splice(index, 1);
      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                removed: true,
                item: itemToRemove,
                inventory_count: state.inventory.length,
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
