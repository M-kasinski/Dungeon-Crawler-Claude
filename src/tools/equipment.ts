import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStorage } from "../storage.js";
import type { Item } from "../state.js";

const EQUIPPABLE_TYPES = ["weapon", "armor", "accessory"] as const;
type EquipSlot = (typeof EQUIPPABLE_TYPES)[number];

function isEquippable(type: string): type is EquipSlot {
  return (EQUIPPABLE_TYPES as readonly string[]).includes(type);
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function findByName(items: Item[], name: string): Item[] {
  const normalized = normalizeText(name);
  return items.filter((item) => normalizeText(item.name) === normalized);
}

export function registerEquipmentTools(server: McpServer): void {
  server.registerTool(
    "equip_item",
    {
      description:
        "Equips an item from inventory. Prefer the item id returned by add_item. The item's type determines the slot (weapon/armor/accessory). If the slot is occupied, the previous item is returned to inventory.",
      inputSchema: {
        id: z.string().optional().describe("Stable item id to equip"),
        name: z
          .string()
          .optional()
          .describe("Item name to equip when there is only one matching item"),
      },
    },
    async ({ id, name }) => {
      const storage = getStorage();
      const state = await storage.load();
      if (!id && !name) {
        return {
          content: [{ type: "text", text: 'Provide either "id" or "name".' }],
          isError: true,
        };
      }

      let matches: Item[] = [];
      if (id) {
        matches = state.inventory.filter((item) => item.id === id);
      } else if (name) {
        matches = findByName(state.inventory, name);
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
                  equipped: false,
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

      const item = matches[0];
      const index = state.inventory.findIndex((inventoryItem) => inventoryItem.id === item.id);
      if (!isEquippable(item.type)) {
        return {
          content: [
            {
              type: "text",
              text: `"${item.name}" (type: ${item.type}) cannot be equipped. Only weapon, armor, and accessory types can be equipped.`,
            },
          ],
          isError: true,
        };
      }

      const slot = item.type;
      const previousItem = state.equipped[slot];

      // Move previous item back to inventory
      if (previousItem !== null) {
        state.inventory.push(previousItem);
      }

      // Remove item from inventory and equip it
      state.inventory.splice(index, 1);
      state.equipped[slot] = item;

      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                equipped: true,
                slot,
                item,
                previous_item: previousItem,
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
    "unequip_slot",
    {
      description:
        "Unequips the item in the given slot and returns it to inventory.",
      inputSchema: {
        slot: z
          .enum(["weapon", "armor", "accessory"])
          .describe("Equipment slot to unequip"),
      },
    },
    async ({ slot }) => {
      const storage = getStorage();
      const state = await storage.load();
      const item = state.equipped[slot];

      if (item === null) {
        return {
          content: [{ type: "text", text: `No item equipped in slot "${slot}".` }],
          isError: true,
        };
      }

      state.inventory.push(item);
      state.equipped[slot] = null;
      await storage.save(state);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                unequipped: true,
                slot,
                item,
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
