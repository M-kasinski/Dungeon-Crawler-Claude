# Backlog — Dungeon Crawler Claude

---

## Lot 3 — Stats réelles & loot contextualisé

**Priorité :** Haute
**Complexité :** Moyenne
**Prérequis :** Lot 1 & 2 (floor_theme, floor_event_count, wounds en place)

### Contexte

Les stats (STR, AGI, INT, VIT, LCK) existent dans le state mais n'ont aucun effet mécanique réel. Deux joueurs aux stats opposées vivent exactement la même session. De même, le loot est généré dans le vide — un légendaire peut apparaître au floor 1, un trash item au floor 20. Ce lot rend les stats et le loot cohérents avec l'état du jeu.

---

### Feature 1 — `resolve_combat(enemy_level)`

**Objectif :** Calculer l'issue d'un combat selon les stats du joueur vs le niveau de l'ennemi. Claude reçoit le résultat et narre — les stats deviennent réelles sans sortir du mode narratif.

**Nouvel outil :** `resolve_combat`

Input :
```typescript
{
  enemy_level: number;  // niveau de l'ennemi (décidé par Claude narrativement)
  enemy_type?: string;  // optionnel — ex: "undead", "beast", "aberrant" (influence la stat utilisée)
}
```

Logique de calcul suggérée :
- Comparer `player.level` + stat pertinente vs `enemy_level`
- Stat utilisée selon `enemy_type` (ou aléatoire si absent) :
  - undead / brute → STR
  - beast / fast → AGI
  - aberrant / magic → INT
  - trap / environment → LCK
  - endurance → VIT
- Calculer un score joueur : `player_score = stat_value + player.level + random(1, 6)`
- Calculer un score ennemi : `enemy_score = enemy_level * 2 + random(1, 6)`
- Issue :
  - `player_score > enemy_score + 4` → **victory** (clean)
  - `player_score > enemy_score` → **victory** (with cost — wound possible)
  - `player_score === enemy_score` → **narrow_escape** (fuite, pas de loot)
  - `player_score < enemy_score` → **defeat** (wound guaranteed, fuite forcée)

Output :
```json
{
  "outcome": "victory" | "victory_costly" | "narrow_escape" | "defeat",
  "stat_used": "str",
  "player_score": 18,
  "enemy_score": 14,
  "wound_suggested": true,
  "loot_earned": true
}
```

- Si `wound_suggested: true`, Claude doit appeler `add_wound` avec une description narrative
- Si `loot_earned: true`, Claude déclenche un loot event (3 items)
- Claude **narre** l'issue — il ne révèle pas les scores

**Fichier :** `src/tools/combat.ts` (nouveau)
**Registration :** ajouter dans `src/server.ts`
**Prompt :** ajouter dans COMBAT section de `start_session.ts` :
- "Before narrating a combat, call resolve_combat(enemy_level) to determine the outcome. Use the result to shape the narration — never reveal the scores."

---

### Feature 2 — Rareté des items & loot contextualisé

**Objectif :** Les items générés reflètent le contexte (floor, classe, stats). Un floor 1 ne peut pas produire du légendaire. Un floor 15 dans un "Flesh Labyrinth" ne produit pas la même chose qu'un "Frozen Tombs".

**Changement d'interface :** Ajouter `rarity` à `Item` dans `src/state.ts` :
```typescript
interface Item {
  name: string;
  type: string;
  description: string;
  rarity: "common" | "rare" | "legendary";
}
```

**Nouvel outil :** `get_loot_context`

Input : aucun (lit le state)

Output :
```json
{
  "floor": 7,
  "floor_theme": "Fungal Depths",
  "player_level": 6,
  "player_class": "Mycelial Harbinger",
  "stats": { "str": 14, "agi": 11, "int": 18, "vit": 12, "lck": 10 },
  "rarity_pool": ["common", "common", "rare"],
  "loot_instruction": "Generate 3 items fitting the Fungal Depths theme, at floor 7. Use the rarity_pool for each item respectively. A 'rare' item should feel meaningfully powerful. A 'legendary' item (floor 10+) should feel game-changing."
}
```

Logique `rarity_pool` :
- Floor 1-3 : `["common", "common", "common"]`
- Floor 4-7 : `["common", "common", "rare"]`
- Floor 8-11 : `["common", "rare", "rare"]`
- Floor 12-14 : `["rare", "rare", "rare"]`
- Floor 15+ : `["rare", "rare", "legendary"]`
- Bonus LCK : si `lck >= 15`, upgrade une rareté aléatoire d'un cran

**Changement `add_item` :** Ajouter `rarity` comme input obligatoire dans `src/tools/inventory.ts`.

**Prompt :** Remplacer dans LOOT EVENTS section de `start_session.ts` :
- "Before generating loot items, call get_loot_context to get the floor theme, rarity pool, and instruction."
- "Generate items that fit the floor_theme and match the assigned rarity for each slot."

**Fichier :** `src/tools/combat.ts` pour `get_loot_context` (avec `resolve_combat`) ou `src/tools/loot.ts` (nouveau fichier séparé)

---

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/state.ts` | Ajouter `rarity` à `Item` |
| `src/tools/combat.ts` | Nouveau — `resolve_combat` + `get_loot_context` |
| `src/tools/inventory.ts` | Modifier `add_item` (ajouter `rarity` input) |
| `src/tools/session.ts` | Vérifier que `get_session_context` affiche la rareté des items |
| `src/server.ts` | Enregistrer `registerCombatTools` |
| `src/prompts/start_session.ts` | Mettre à jour COMBAT + LOOT sections |

### Vérification

1. `npm run build` sans erreur
2. Appeler `resolve_combat(5)` avec player level 3, STR 10 → vérifier defeat
3. Appeler `resolve_combat(2)` avec player level 5, STR 18 → vérifier victory
4. Appeler `get_loot_context` au floor 1 → `rarity_pool: ["common","common","common"]`
5. Appeler `get_loot_context` au floor 15 → pool avec legendary
6. Appeler `add_item` avec rarity → vérifier dans `get_state`
