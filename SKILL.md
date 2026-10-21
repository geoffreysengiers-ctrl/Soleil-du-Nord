---
name: veille-t1d-site
description: Proposer puis publier sur le site « Les petites avancées » les avancées sur le diabète de type 1 trouvées pendant la veille, après validation de Geoffrey sur Telegram.
---

# Publier la veille T1D sur le site

Le site lit `data/news.json` dans le dépôt cloné à `~/diabete-site`.
Tu ne modifies JAMAIS ce fichier à la main : tu passes toujours par `python3 hermes/add_news.py`, qui vérifie le format, écarte les doublons et publie.

## Qui lit le site

Une jeune femme qui vit avec un diabète de type 1. Elle n'est pas médecin. Écris pour elle :
- en français, avec des phrases courtes ; un terme technique est toujours expliqué entre parenthèses ;
- honnête sur le stade : un résultat chez la souris ou sur 12 patients n'est pas « bientôt disponible » ;
- ni alarmiste ni porteuse de faux espoirs, jamais de « guérison miracle » ;
- aucun conseil médical (« il faudrait changer / arrêter / essayer… » est interdit).

## Ce qui mérite d'être proposé

À garder : résultats d'essais cliniques, lancements d'essais importants, autorisations (HAS, ANSM, EMA, FDA…), arrivées ou remboursements en France, thérapies cellulaires (îlots dérivés de cellules souches, encapsulation), immunothérapies (teplizumab, etc.), technologie (capteurs, pompes, boucle fermée), dépistage précoce, publications dans des revues à comité de lecture.

À écarter : communiqués purement commerciaux, compléments « miracle », articles sans source primaire, redites, tout ce qui a plus de 60 jours.

Un passage = 1 à 5 avancées au maximum. Zéro est une bonne réponse si rien de solide n'est sorti.

## Vérification obligatoire avant de proposer

Pour chaque avancée :
1. Ouvre réellement `source_url` et confirme que la page dit bien ce que tu résumes.
2. Pour chaque référence NCT / PMID / DOI, ouvre la page correspondante (clinicaltrials.gov/study/NCT…, pubmed.ncbi.nlm.nih.gov/…, doi.org/…) et vérifie qu'elle existe et parle du même sujet. Si tu n'as pas pu vérifier une référence, retire-la. N'invente jamais d'identifiant.
3. Les chiffres du résumé doivent venir de la source, pas de ta mémoire.

## Format (liste JSON)

```json
[
  {
    "date": "AAAA-MM-JJ",
    "titre": "Titre court et clair (~90 caractères max)",
    "resume": "2 à 4 phrases : qui, quoi, où, combien de patients, résultat principal.",
    "pourquoi": "1 phrase : ce que ça pourrait changer au quotidien, et quand si on le sait.",
    "categorie": "Cellules souches | Immunothérapie | Technologie | Traitement | Dépistage & prévention | Complications | Recherche | Quotidien",
    "niveau": "Recherche | Essai clinique | Approuvé | Disponible",
    "pays": "Pays de l'équipe ou de l'autorisation",
    "source_nom": "Nom de la revue ou du média",
    "source_url": "https://source-primaire",
    "references": ["NCT01234567", "PMID:12345678", "DOI:10.xxxx/yyyy"],
    "importance": 1
  }
]
```

- `niveau` : Recherche = labo ou animal ; Essai clinique = testé chez l'humain ; Approuvé = autorisé par une agence ; Disponible = utilisable par les patients (préciser le pays si ce n'est pas la France).
- `importance` : 1 = info, 2 = notable, 3 = majeur (rare : grosse autorisation, résultat de phase 3).
- `type` est facultatif (Type 1 par défaut). Mets `"Général"` seulement si l'info concerne tous les diabètes.

## Procédure (avec validation)

1. Fais ta veille habituelle puis la vérification ci-dessus.
2. Écris les avancées retenues dans `/tmp/veille_t1d.json`.
3. Lance :
   ```bash
   cd ~/diabete-site && python3 hermes/add_news.py proposer /tmp/veille_t1d.json
   ```
4. Envoie à Geoffrey sur Telegram la liste numérotée affichée par le script, telle quelle.
5. Quand il répond :
   - « publie 1,3 » ou « publie tout » → `python3 hermes/add_news.py publier 1,3` (ou `publier tout`)
   - « rejette 2 » → `python3 hermes/add_news.py rejeter 2`
   - « liste » → `python3 hermes/add_news.py liste`
6. Réponds-lui avec la sortie du script (ce qui est en ligne, ce qui reste en attente).

Si le script affiche `ERREUR`, corrige le JSON selon le message et relance. Ne contourne jamais le script et n'édite jamais `data/news.json` directement.

Si Geoffrey demande un jour de publier sans validation, utilise `python3 hermes/add_news.py direct /tmp/veille_t1d.json` à la place des étapes 3 à 5.
