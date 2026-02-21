# MVP MCP — LitRPG Dungeon Crawler

---

## MVP 1 — Scaffolding MCP + State de base

**Objectif :** Un serveur MCP qui tourne, que Claude Desktop peut connecter, avec un state persistant lisible et modifiable.

**Tools exposés :**
```
get_state()           → retourne tout le state JSON
update_player(patch)  → modifie nom, niveau, localisation
reset_game()          → remet le state à zéro
```

**State initial :**
```json
{
  "player": {
    "name": null,
    "class": null,
    "level": 1,
    "location": "Floor 1 - Entrance"
  },
  "inventory": [],
  "equipped": { "weapon": null, "armor": null, "accessory": null },
  "visited_locations": [],
  "session_summary": ""
}
```

**Résultat :** Claude Desktop voit le MCP, peut lire et écrire le state. Fondation de tout le reste.

---

## MVP 2 — Inventaire et loot

**Objectif :** Gérer les items trouvés pendant la narration.

**Tools exposés :**
```
add_item(item)        → ajoute un item à l'inventaire
remove_item(name)     → retire un item
get_inventory()       → retourne inventaire + équipé
```

**Prompt MCP exposé :**
```
loot_event            → template que Claude utilise pour générer 
                        3 items et appeler add_item après choix
```

**Résultat :** Claude peut générer du loot, le joueur choisit en chat, l'item est persisté.

---

## MVP 3 — Équipement

**Objectif :** Distinguer ce qui est porté de ce qui est transporté, et que Claude en tienne compte dans la narration.

**Tools exposés :**
```
equip_item(name)      → déplace de inventory vers equipped
unequip_slot(slot)    → remet dans inventory
get_equipped()        → retourne uniquement l'équipement actuel
```

**Résultat :** Claude appelle `get_equipped()` en début de scène de combat et narre avec les vrais items du joueur.

---

## MVP 4 — Progression et classes

**Objectif :** Gérer les level ups et le choix de classe avec persistance.

**Tools exposés :**
```
level_up()            → incrémente le level, retourne si class_event doit se déclencher
set_class(className, perks)  → enregistre la classe et ses perks narratifs
get_progression()     → retourne level + classe + perks actifs
```

**Prompt MCP exposé :**
```
class_selection       → template pour générer 3 classes adaptées 
                        à l'historique du joueur et appeler set_class
```

**Résultat :** La classe choisie est persistée et ses perks sont injectés dans le contexte à chaque session.

---

## MVP 5 — Navigation et carte

**Objectif :** Tracker les déplacements et éviter les répétitions de lieux.

**Tools exposés :**
```
move_to(location)           → change la localisation courante, ajoute aux visités
get_map()                   → retourne localisation actuelle + lieux visités
suggest_exits(context)      → génère 2-4 sorties possibles depuis le contexte actuel
```

**Prompt MCP exposé :**
```
navigation_event      → template pour proposer les sorties 
                        et appeler move_to après choix
```

**Résultat :** Le donjon se construit au fur et à mesure, aucun lieu n'est reproposé.

---

## MVP 6 — Session et résumé

**Objectif :** Permettre de reprendre une partie proprement après un reset de conversation.

**Tools exposés :**
```
save_summary(text)    → écrase le résumé de session actuel
get_session_context() → retourne state complet + résumé formaté prêt à injecter
```

**Prompt MCP exposé :**
```
start_session         → charge get_session_context() et pose 
                        le contexte narratif complet en début de conversation
```

**Résultat :** Le joueur tape `/mcp__dungeon__start_session` et Claude sait exactement où reprendre.

---

**Ordre :** 1 → 2 → 3 → 4 → 5 → 6. Le MVP 6 est le dernier car il consolide tout ce qui a été construit avant.