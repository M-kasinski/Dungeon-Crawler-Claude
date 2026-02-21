import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStorage } from "../storage.js";

export function registerInventoryTools(server: McpServer): void {
  server.registerTool(
    "add_item",
    {
      description: "Adds an item to the player's inventory.",
      inputSchema: {
        name: z.string().describe("Item name"),
        type: z
          .string()
          .describe(
            'Item type: "weapon", "armor", "accessory", "consumable", or "misc"'
          ),
        description: z.string().describe("Short narrative description of the item"),
      },
    },
    async ({ name, type, description }) => {
      const storage = getStorage();
      const state = await storage.load();
      state.inventory.push({ name, type, description });
      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: `"${name}" added to inventory. Inventory now has ${state.inventory.length} item(s).`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "remove_item",
    {
      description: "Removes an item from the player's inventory by name.",
      inputSchema: {
        name: z.string().describe("Name of the item to remove"),
      },
    },
    async ({ name }) => {
      const storage = getStorage();
      const state = await storage.load();
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
      state.inventory.splice(index, 1);
      await storage.save(state);
      return {
        content: [
          {
            type: "text",
            text: `"${name}" removed from inventory.`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_inventory",
    {
      description:
        "Returns the player's current inventory and equipped items.",
      inputSchema: {},
    },
    async () => {
      const state = await getStorage().load();
      const result = {
        inventory: state.inventory,
        equipped: state.equipped,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
