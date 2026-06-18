<p align="center">
  <img src="assets/banner.png" alt="SondageMaster">
</p>

<p align="center">
  <a href="https://discord.gg/vymF8TAaYz">
    <img src="https://img.shields.io/badge/Discord-Support-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Serveur support Discord">
  </a>
  <a href="https://discord.gg/vymF8TAaYz">
    <img src="https://img.shields.io/badge/Rejoindre-le_serveur-7289DA?style=flat-square&logo=discord&logoColor=white" alt="Rejoindre le serveur">
  </a>
</p>

# SondageMaster

Bot pour faire des sondages sur Discord. Panneaux Components V2, votes au clic, tout en français.

Tu balances une question + des choix, les membres votent sur les boutons. Les résultats se mettent à jour en direct (ou restent cachés si tu préfères).

## install

```bash
git clone https://github.com/biney-codemaster/sondage-master.git
cd sondage-master
npm install
cp .env.example .env
```

`DISCORD_TOKEN` + `CLIENT_ID` dans le `.env`, puis :

```bash
npm run deploy
npm start
```

`GUILD_ID` optionnel pour tester sans attendre la propagation globale.

## commandes

`/sondage creer` avec la question et les choix séparés par des virgules (`Oui, Non, Peut-être`). Tu peux ajouter une durée, autoriser plusieurs votes, masquer les scores tant que c'est ouvert, ou demander un rôle pour voter.

`/sondage terminer` pour couper, `/sondage resultats` pour le détail, `/sondage liste` pour voir ce qui tourne, `/sondage annuler` pour supprimer, `/sondage modifier` si t'as foiré le titre.

`/config` pour les logs, les rôles gestionnaires et la couleur des panneaux. `/aide` si besoin.

## notes

Re-cliquer sur un bouton retire ton vote. En mode choix multiples tu peux en cocher plusieurs (avec une limite si tu veux).

Les admins, Manage Server et les rôles passés en gestionnaire peuvent tout gérer.

Code dans `src/`, données dans `data/`. MIT.
