# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Architecture du projet

Serveur MCP Node.js/TypeScript. Claude Desktop gère la narration, le MCP gère la persistance d'état.

### Stack
- `@modelcontextprotocol/sdk` ^1.12.0
- `zod` ^3.23.0 (validation des inputs)
- TypeScript — `module: "Node16"`, `moduleResolution: "Node16"`
- `"type": "module"` dans package.json (ESM)

### Structure
```
src/
  index.ts              # entrée stdio — wire server + StdioServerTransport
  server.ts             # createServer() — importe et enregistre tous les tools/prompts
  state.ts              # GameState, loadState(), saveState(), DEFAULT_STATE
  tools/
    player.ts           # MVP1 : get_state, update_player, reset_game
    inventory.ts        # MVP2 : add_item, remove_item, get_inventory
    equipment.ts        # MVP3 : equip_item, unequip_slot, get_equipped
    progression.ts      # MVP4 : level_up, set_class, get_progression
    navigation.ts       # MVP5 : move_to, get_map, suggest_exits
    session.ts          # MVP6 : save_summary, get_session_context
  prompts/
    loot_event.ts       # MVP2 — template loot
    class_selection.ts  # MVP4 — template choix de classe (argsSchema: { context? })
    navigation_event.ts # MVP5 — template navigation
    start_session.ts    # MVP6 — reprise de session (prompt principal joueur)
data/state.json         # état persistant JSON (gitignored, créé au premier run)
build/                  # JS compilé (gitignored) — npm run build
```

### Règles critiques
- **JAMAIS `console.log()`** — corrompt le flux JSON-RPC stdio. Utiliser `console.error()`.
- **Imports ESM avec `.js`** dans les sources `.ts` : `import { x } from "./state.js"`
- `registerPrompt` utilise `argsSchema` (Zod object) pour les prompts avec arguments
- Pattern tools : chaque fichier `tools/*.ts` exporte `registerXxxTools(server: McpServer): void`

### Pattern GameState
```typescript
interface Item { name: string; type: string; description: string; }
interface GameState {
  player: { name: string|null; class: string|null; level: number; location: string; perks: string[]; };
  inventory: Item[];
  equipped: { weapon: Item|null; armor: Item|null; accessory: Item|null; };
  visited_locations: string[];
  session_summary: string;
}
```

### Config Claude Desktop
`~/Library/Application Support/Claude/claude_desktop_config.json`
```json
"dungeon": {
  "command": "/Users/m.kasinski/.nvm/versions/node/v24.11.0/bin/node",
  "args": ["/Users/m.kasinski/labs/Dungeon_crawler_claude/build/index.js"]
}
```
Namespace des tools : `dungeon__get_state`, prompt joueur : `/dungeon__start_session`
Logs : `~/Library/Logs/Claude/mcp-server-dungeon.log`