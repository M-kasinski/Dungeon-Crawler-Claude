# LitRPG Dungeon Crawler — Vision Projet

---

## L'ambition

Créer une expérience de jeu narratif LitRPG immersive directement dans Claude Desktop, sans interface dédiée, sans coût API. Le joueur interagit en langage naturel avec Claude qui joue le rôle du "système" — ce narrateur omniscient, sarcastique et brutal qu'on retrouve dans Dungeon Crawler Carl. L'univers est un donjon procédural, les combats sont narrés littérairement, et les vrais moments de gameplay sont les choix : quel loot ramasser, quelle classe choisir, où se diriger.

---

## Ce qu'on ne fait pas

On ne construit pas un jeu vidéo. Il n'y a pas d'interface graphique, pas de calcul de dégâts, pas de moteur de règles complexe. Le combat existe dans la narration, pas dans la mécanique.

---

## Ce qu'on fait vraiment

On construit un **serveur MCP Node.js** qui donne à Claude une mémoire persistante. Sans lui, chaque conversation repart de zéro. Avec lui, Claude sait qui tu es, ce que tu portes, où tu en es, ce que tu as vécu. Le MCP est invisible pour le joueur — c'est simplement ce qui fait que le monde existe entre les sessions.

---

## Le pari technique

Un LLM seul ne peut pas être un jeu — son contexte s'efface, il invente des incohérences, il oublie ton inventaire. Le MCP résout exactement ça en externalisant tout ce qui est factuel. Claude garde ce pour quoi il est imbattable : la narration, le ton, la créativité. Le MCP garde ce qu'un LLM gère mal : la persistance, la cohérence, l'état.

---

## L'expérience joueur cible

Tu ouvres Claude Desktop. Tu tapes `/mcp__dungeon__start_session`. Claude lit ton état, reprend l'histoire exactement où tu l'avais laissée, et la session commence. Tu joues en écrivant naturellement. Quand tu trouves du loot, Claude te propose 3 items et tu choisis. Quand tu montes de niveau, il te propose 3 classes adaptées à ton style. Quand tu arrives à un carrefour, tu décides où aller. Tout le reste est de la littérature.