---
name: veille-t1d-site
description: Faire la veille sur 5 thèmes médicaux (diabète, épilepsie, encéphalite auto-immune, insuffisance ovarienne précoce, maturation in vitro), puis proposer et publier les avancées sur le site « Soleil du Nord » après validation de Geoffrey sur Telegram.
---

# Veille santé → site « Soleil du Nord »

Le site lit `data/news.json` dans le dépôt cloné à `~/diabete-site`.
Tu ne modifies JAMAIS ce fichier à la main : tu passes toujours par `python3 hermes/add_news.py`, qui vérifie le format, écarte les doublons et publie.

## Qui lit le site

Une jeune femme que ces sujets touchent de près. Elle n'est pas médecin. Écris pour elle :
- en français, avec des phrases courtes ; un terme technique est toujours expliqué entre parenthèses ;
- honnête sur le stade : un résultat chez la souris ou sur 12 patients n'est pas « bientôt disponible » ;
- ni alarmiste ni porteuse de faux espoirs, jamais de « guérison miracle » ni de « solution à l'infertilité » ;
- aucun conseil médical (« il faudrait changer / arrêter / essayer… » est interdit).

## Les 5 thèmes (champ `theme`, écrit exactement ainsi)

Fais une recherche séparée pour CHAQUE thème, en français et en anglais (mots-clés anglais entre crochets).

### `Diabète` [type 1 diabetes]
Essais et autorisations, thérapies cellulaires (îlots issus de cellules souches, encapsulation, greffe d'îlots), immunothérapies (teplizumab…), capteurs, pompes, boucle fermée, dépistage précoce, remboursements en France. Ajoute `type` (Type 1 par défaut ; « Type 2 » ou « Général » si besoin).

### `Épilepsie` [epilepsy]
Nouveaux antiépileptiques et autorisations, épilepsies pharmacorésistantes, chirurgie (dont laser), neurostimulation (nerf vague, stimulation cérébrale profonde, RNS), thérapies géniques et ASO (syndrome de Dravet, etc.), régimes cétogènes étudiés en essai, détection et prédiction des crises (objets connectés, EEG), SUDEP, grossesse et épilepsie.

### `Encéphalite auto-immune` [autoimmune encephalitis, anti-NMDA receptor, LGI1, CASPR2, GAD65]
Diagnostic (tests d'anticorps, critères), traitements de 1re et 2e ligne (corticoïdes, IgIV, échanges plasmatiques, rituximab), nouvelles immunothérapies en essai (satralizumab, inébilizumab, bortézomib, anti-FcRn, CAR-T…), rechutes, récupération à long terme (mémoire, fatigue, épilepsie séquellaire), rééducation.

### `Insuffisance ovarienne précoce` [premature ovarian insufficiency, POI]
Causes et génétique, diagnostic, traitement hormonal substitutif et santé des os et du cœur, fertilité (don d'ovocytes, activation ovarienne in vitro « IVA »), cellules souches, PRP ovarien, préservation de la fertilité, recommandations (ESHRE, CNGOF…). Pour le PRP, les cellules souches et l'IVA : dis clairement que les preuves sont encore faibles quand c'est le cas.

### `Maturation in vitro` [in vitro maturation, IVM oocytes, CAPA-IVM]
Résultats et taux de grossesse ou de naissance, comparaisons avec la FIV classique, MIV dans le SOPK, MIV pour la préservation de la fertilité (avant un cancer…), nouvelles méthodes de culture, sécurité pour les enfants nés après MIV, disponibilité en France.

## Ce qui mérite d'être proposé

À garder : résultats d'essais cliniques, lancements d'essais importants, autorisations (HAS, ANSM, EMA, FDA…), arrivées ou remboursements en France, recommandations officielles, publications dans des revues à comité de lecture.

À écarter : communiqués purement commerciaux, cliniques qui font leur publicité, compléments « miracle », articles sans source primaire, redites, tout ce qui a plus de 60 jours (90 jours pour Encéphalite auto-immune, Insuffisance ovarienne précoce et Maturation in vitro, où il sort moins de nouvelles).

Un passage = 0 à 3 avancées par thème, 10 au total au maximum. Zéro pour un thème est une bonne réponse si rien de solide n'est sorti.

## Vérification obligatoire avant de proposer

Pour chaque avancée :
1. Ouvre réellement `source_url` et confirme que la page dit bien ce que tu résumes.
2. Pour chaque référence NCT / PMID / DOI, ouvre la page correspondante (clinicaltrials.gov/study/NCT…, pubmed.ncbi.nlm.nih.gov/…, doi.org/…) et vérifie qu'elle existe et parle du même sujet. Si tu n'as pas pu vérifier une référence, retire-la. N'invente jamais d'identifiant.
3. Les chiffres du résumé doivent venir de la source, pas de ta mémoire.
4. Vérifie que le `theme` est le bon (une épilepsie causée par une encéphalite auto-immune → `Encéphalite auto-immune`).

## Format (liste JSON)

```json
[
  {
    "theme": "Diabète | Épilepsie | Encéphalite auto-immune | Insuffisance ovarienne précoce | Maturation in vitro",
    "date": "AAAA-MM-JJ",
    "titre": "Titre court et clair (~90 caractères max)",
    "resume": "2 à 4 phrases : qui, quoi, où, combien de patients, résultat principal.",
    "pourquoi": "1 phrase : ce que ça pourrait changer au quotidien, et quand si on le sait.",
    "categorie": "Traitement | Immunothérapie | Cellules souches | Thérapie génique | Chirurgie | Technologie | Fertilité | Diagnostic | Dépistage & prévention | Complications | Recherche | Quotidien",
    "niveau": "Recherche | Essai clinique | Approuvé | Disponible",
    "pays": "Pays de l'équipe ou de l'autorisation",
    "source_nom": "Nom de la revue ou du média",
    "source_url": "https://source-primaire",
    "references": ["NCT01234567", "PMID:12345678", "DOI:10.xxxx/yyyy"],
    "importance": 1
  }
]
```

- `theme` est obligatoire et doit être écrit exactement comme ci-dessus (avec les accents).
- `type` : uniquement pour le thème Diabète ; ne le mets jamais pour les autres thèmes.
- `niveau` : Recherche = labo ou animal ; Essai clinique = testé chez l'humain ; Approuvé = autorisé par une agence ; Disponible = utilisable par les patients (préciser le pays si ce n'est pas la France).
- `importance` : 1 = info, 2 = notable, 3 = majeur (rare : grosse autorisation, résultat de phase 3).

## Procédure (avec validation)

1. Fais ta veille sur les 5 thèmes puis la vérification ci-dessus.
2. Écris les avancées retenues dans `/tmp/veille.json`.
3. Lance :
   ```bash
   cd ~/diabete-site && git pull --rebase --quiet && python3 hermes/add_news.py proposer /tmp/veille.json
   ```
4. Envoie à Geoffrey sur Telegram la liste numérotée affichée par le script, telle quelle (le thème est indiqué entre crochets).
5. Quand il répond :
   - « publie 1,3 » ou « publie tout » → `python3 hermes/add_news.py publier 1,3` (ou `publier tout`)
   - « rejette 2 » → `python3 hermes/add_news.py rejeter 2`
   - « liste » → `python3 hermes/add_news.py liste`
6. Réponds-lui avec la sortie du script (ce qui est en ligne, ce qui reste en attente).

Si le script affiche `ERREUR`, corrige le JSON selon le message et relance. Ne contourne jamais le script et n'édite jamais `data/news.json` directement.

Si Geoffrey demande un jour de publier sans validation, utilise `python3 hermes/add_news.py direct /tmp/veille.json` à la place des étapes 3 à 5.
