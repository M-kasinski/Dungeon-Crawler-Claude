import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadState, saveState } from "../state.js";

const EQUIPPABLE_TYPES = ["weapon", "armor", "accessory"] as const;
type EquipSlot = (typeof EQUIPPABLE_TYPES)[number];

function isEquippable(type: string): type is EquipSlot {
  return (EQUIPPABLE_TYPES as readonly string[]).includes(type);
}

export function registerEquipmentTools(server: McpServer): void {
  server.registerTool(
    "equip_item",
    {
      description:
        "Equips an item from inventory. The item's type determines the slot (weapon/armor/accessory). If the slot is occupied, the previous item is returned to inventory.",
      inputSchema: {
        name: z.string().describe("Name of the item to equip"),
      },
    },
    async ({ name }) => {
      const state = loadState();

      const index = state.inventory.findIndex(
        (item) => item.name.toLowerCase() === name.toLowerCase()
      );
      if (index === -1) {
        return {
          content: [
            { type: "text", text: `Item "${name}" not found in inventory.` },
          ],
          isError: true,
        };
      }

      const item = state.inventory[index];
      if (!isEquippable(item.type)) {
        return {
          content: [
            {
              type: "text",
              text: `"${name}" (type: ${item.type}) cannot be equipped. Only weapon, armor, and accessory types can be equipped.`,
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

      saveState(state);

      const msg = previousItem
        ? `"${name}" equipped as ${slot}. "${previousItem.name}" returned to inventory.`
        : `"${name}" equipped as ${slot}.`;

      return { content: [{ type: "text", text: msg }] };
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
      const state = loadState();
      const item = state.equipped[slot];

      if (item === null) {
        return {
          content: [{ type: "text", text: `No item equipped in slot "${slot}".` }],
          isError: true,
        };
      }

      state.inventory.push(item);
      state.equipped[slot] = null;
      saveState(state);

      return {
        content: [
          {
            type: "text",
            text: `"${item.name}" unequipped from ${slot} and returned to inventory.`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_equipped",
    {
      description: "Returns the currently equipped items.",
      inputSchema: {},
    },
    async () => {
      const state = loadState();
      return {
        content: [
          { type: "text", text: JSON.stringify(state.equipped, null, 2) },
        ],
      };
    }
  );
}
