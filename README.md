# Les petites avancées

Site pastel qui présente les avancées de la recherche sur le diabète de type 1, alimenté par l'agent **HERMES T1D** (VPS Hostinger).
Hébergé gratuitement sur GitHub Pages.

**Circuit :** Hermès fait sa veille → il vérifie ses sources → il te propose les avancées sur Telegram → tu réponds « publie 1,3 » → il pousse sur GitHub → le site se met à jour en 1 à 2 minutes.

```
index.html, style.css, app.js   → le site
data/news.json                  → les avancées publiées (seul fichier modifié par Hermès)
hermes/add_news.py              → script : proposer / publier / rejeter (vérifie et déduplique)
hermes/SKILL.md                 → la skill à installer dans le profil t1d d'Hermès
```

## 1. Créer le dépôt GitHub (5 min, depuis ton PC)

1. Sur github.com, crée un dépôt **public** nommé par exemple `petites-avancees` (sans README).
2. Dézippe le dossier, puis dans un terminal :
   ```bash
   cd diabete-site
   git init -b main
   git add -A
   git commit -m "Premier jet du site"
   git remote add origin https://github.com/TON_PSEUDO/petites-avancees.git
   git push -u origin main
   ```
3. Dans le dépôt : **Settings → Pages → Source : Deploy from a branch → Branch : `main` / `(root)` → Save**.
4. 1 à 2 minutes plus tard, le site est en ligne sur `https://TON_PSEUDO.github.io/petites-avancees/`. C'est ce lien que tu lui donnes.

> Le titre, le sous-titre et la dédicace « Pour toi 💗 » se changent dans le bloc `meta` en haut de `data/news.json`.

## 2. Autoriser le VPS à publier (clé de déploiement)

En SSH sur le VPS, avec l'utilisateur qui fait tourner Hermès :

```bash
ssh-keygen -t ed25519 -f ~/.ssh/petites_avancees -N "" -C "hermes-vps"
cat ~/.ssh/petites_avancees.pub
```

Colle la clé affichée dans GitHub : **dépôt → Settings → Deploy keys → Add deploy key**, et **coche « Allow write access »**.
Cette clé ne donne accès qu'à ce dépôt, pas à ton compte.

Toujours sur le VPS :

```bash
cat >> ~/.ssh/config <<'EOF'
Host github-avancees
  HostName github.com
  User git
  IdentityFile ~/.ssh/petites_avancees
  IdentitiesOnly yes
EOF

git clone git@github-avancees:TON_PSEUDO/petites-avancees.git ~/diabete-site
cd ~/diabete-site
git config user.name "Hermès T1D"
git config user.email "hermes@localhost"

python3 hermes/add_news.py direct data/news.json --dry-run
# doit afficher : "Publiés : 0 | Doublons ignorés : 2"  → tout est OK
```

## 3. Brancher HERMES T1D

1. Installe la skill **dans le profil t1d** (pas dans le profil par défaut). Le plus simple : demande-le à l'agent lui-même, sur Telegram ou en ligne de commande :

   > Installe comme skill le fichier `~/diabete-site/hermes/SKILL.md` (nom : veille-t1d-site), puis recharge tes skills.

   Vérifie ensuite avec `/skills` qu'elle apparaît.

2. Programme la veille (ou modifie celle qui existe déjà pour ne pas la doubler) :

   > Chaque matin à 7h30 (heure de Paris), fais ta veille sur le diabète de type 1, puis utilise la skill `veille-t1d-site` pour me proposer les avancées sur Telegram.

3. Au quotidien, tu reçois une liste numérotée sur Telegram et tu réponds simplement :
   - `publie 1,3` ou `publie tout`
   - `rejette 2` (elle ne reviendra plus)
   - `liste` pour revoir ce qui attend

   Les propositions en attente restent sur le VPS ; rien n'apparaît sur le site tant que tu n'as pas dit « publie ».

> Pourquoi une validation ? Le site parle de santé à quelqu'un qui vit avec la maladie. La skill oblige Hermès à ouvrir chaque source et chaque référence NCT / PMID / DOI avant de proposer, mais un LLM peut encore se tromper : ton coup d'œil de 30 secondes est la dernière barrière. Si un jour tu veux du 100 % automatique, dis-lui « publie sans validation » (commande `direct`).

## Dépannage

| Symptôme | Cause probable |
|---|---|
| `ERREUR : champ manquant…` / `references doit être…` | Hermès a mal rempli le JSON ; le message dit quoi corriger, il relance. |
| `git push a échoué : Permission denied` | « Allow write access » pas coché sur la clé de déploiement. |
| `git pull a échoué` | Tu as modifié le dépôt depuis ton PC pendant ce temps : sur le VPS, `cd ~/diabete-site && git pull --rebase`. |
| Le site ne bouge pas | Onglet **Actions** du dépôt : le déploiement Pages prend 1 à 2 min. Rafraîchis le navigateur. |
| Une news publiée est fausse | Dans `data/news.json` sur GitHub (icône crayon) : supprime l'article et ajoute son lien dans `"exclus": ["https://..."]` du bloc `meta`. |
