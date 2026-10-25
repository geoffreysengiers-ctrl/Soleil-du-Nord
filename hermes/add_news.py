#!/usr/bin/env python3
"""
Veille santé -> site "Soleil du Nord" (5 thèmes, voir THEMES).

Avec validation (recommandé) :
  python3 hermes/add_news.py proposer /tmp/veille.json       # met en attente + affiche la liste numérotée
  python3 hermes/add_news.py liste                           # revoir ce qui attend
  python3 hermes/add_news.py publier 1,3                     # publie les n°1 et 3 (ou "tout")
  python3 hermes/add_news.py rejeter 2                       # écarte le n°2 (ou "tout"), il ne reviendra plus

Sans validation :
  python3 hermes/add_news.py direct /tmp/veille.json         # publie tout de suite

Options : --no-push (écrit sans git push), --dry-run (vérifie seulement)

Format d'une avancée (liste JSON) :
{
  "theme": "Diabète",                   # voir THEMES (obligatoire)
  "date": "2026-10-20",                 # date de publication de la source (AAAA-MM-JJ)
  "titre": "...",                       # court, français, sans jargon
  "resume": "...",                      # 2 à 4 phrases simples
  "pourquoi": "...",                    # (optionnel) ce que ça change concrètement
  "categorie": "Cellules souches",      # voir CATEGORIES
  "niveau": "Essai clinique",           # voir NIVEAUX
  "type": "Type 1",                     # (diabète seulement, Type 1 par défaut)
  "pays": "États-Unis",                 # (optionnel)
  "source_nom": "NEJM",
  "source_url": "https://...",
  "references": ["NCT04786262", "PMID:40544428", "DOI:10.1056/NEJMoa2506549"],  # (optionnel)
  "importance": 2                       # 1 info, 2 notable, 3 majeur
}
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
import unicodedata
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

RACINE = Path(__file__).resolve().parent.parent
FICHIER = RACINE / "data" / "news.json"
ATTENTE = RACINE / "hermes" / ".en_attente.json"   # reste sur le VPS (.gitignore)
REJETES = RACINE / "hermes" / ".rejetes.json"

THEMES = {"Diabète", "Épilepsie", "Encéphalite auto-immune",
          "Insuffisance ovarienne précoce", "Maturation in vitro"}
TYPES = {"Type 1", "Type 2", "Général"}   # sous-type, uniquement pour le thème Diabète
NIVEAUX = {"Recherche", "Essai clinique", "Approuvé", "Disponible"}
CATEGORIES = {"Traitement", "Immunothérapie", "Cellules souches", "Thérapie génique", "Chirurgie",
              "Technologie", "Fertilité", "Diagnostic", "Dépistage & prévention", "Complications",
              "Recherche", "Quotidien"}
OBLIGATOIRES = ["theme", "date", "titre", "resume", "categorie", "niveau", "source_nom", "source_url"]
REF_OK = re.compile(r"^(NCT\d{8}|PMID:\d{5,9}|DOI:10\.\d{4,9}/\S+)$", re.I)


# ---------- utilitaires ----------
def normaliser(t):
    t = unicodedata.normalize("NFD", t or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def url_cle(u):
    u = re.sub(r"^https?://(www\.)?", "", (u or "").strip().lower())
    return u.split("#")[0].split("?utm")[0].rstrip("/")


def lire(chemin, defaut):
    return json.loads(chemin.read_text(encoding="utf-8")) if chemin.exists() else defaut


def ecrire(chemin, data):
    chemin.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def git(*args):
    r = subprocess.run(["git", "-C", str(RACINE), *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} a échoué : {r.stderr.strip()}")
    return r.stdout.strip()


def valider(a, i):
    err = []
    for c in OBLIGATOIRES:
        if not str(a.get(c, "")).strip():
            err.append(f"#{i}: champ manquant '{c}'")
    th = a.get("theme")
    if th and th not in THEMES:
        err.append(f"#{i}: theme '{th}' invalide ({' | '.join(sorted(THEMES))})")
    if th == "Diabète":
        a.setdefault("type", "Type 1")
        if a["type"] not in TYPES:
            err.append(f"#{i}: type '{a['type']}' invalide ({', '.join(sorted(TYPES))})")
    elif "type" in a:
        err.append(f"#{i}: 'type' ne sert que pour le thème Diabète, retire-le")
    if a.get("niveau") and a["niveau"] not in NIVEAUX:
        err.append(f"#{i}: niveau '{a['niveau']}' invalide ({', '.join(sorted(NIVEAUX))})")
    if a.get("categorie") and a["categorie"] not in CATEGORIES:
        err.append(f"#{i}: catégorie '{a['categorie']}' invalide ({', '.join(sorted(CATEGORIES))})")
    try:
        if date.fromisoformat(str(a.get("date", ""))) > date.today():
            err.append(f"#{i}: date dans le futur")
    except ValueError:
        err.append(f"#{i}: date invalide (AAAA-MM-JJ)")
    if a.get("source_url") and not str(a["source_url"]).startswith(("http://", "https://")):
        err.append(f"#{i}: source_url doit commencer par http(s)://")
    refs = a.get("references", [])
    if not isinstance(refs, list) or any(not REF_OK.match(str(r)) for r in refs):
        err.append(f"#{i}: references doit être une liste comme ['NCT01234567', 'PMID:12345678', 'DOI:10.xxxx/yyy']")
    imp = a.get("importance", 1)
    if not isinstance(imp, int) or not 1 <= imp <= 3:
        err.append(f"#{i}: importance doit être 1, 2 ou 3")
    if len(str(a.get("resume", ""))) > 900:
        err.append(f"#{i}: résumé trop long (900 caractères max)")
    return err


def charger_entree(chemin):
    brut = sys.stdin.read() if chemin == "-" else Path(chemin).read_text(encoding="utf-8")
    try:
        d = json.loads(brut)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"JSON illisible ({e})")
    if isinstance(d, dict):
        d = d.get("articles", [d])
    erreurs = [e for i, a in enumerate(d) for e in valider(a, i)]
    if erreurs:
        raise RuntimeError("rien n'a été ajouté.\n" + "\n".join(erreurs))
    return d


def filtrer_nouveaux(candidats, deja):
    """Écarte ce qui est déjà publié, en attente, rejeté ou exclu."""
    vus_url = {url_cle(a.get("source_url")) for a in deja}
    vus_url |= {url_cle(u) for u in lire(FICHIER, {}).get("meta", {}).get("exclus", [])}
    vus_url |= set(lire(REJETES, []))
    vus_titre = {normaliser(a.get("titre")) for a in deja}
    nouveaux, doublons = [], []
    for a in candidats:
        cu, ct = url_cle(a["source_url"]), normaliser(a["titre"])
        if cu in vus_url or ct in vus_titre:
            doublons.append(a["titre"])
            continue
        a = {k: (v.strip() if isinstance(v, str) else v) for k, v in a.items()}
        a["id"] = hashlib.sha1(cu.encode()).hexdigest()[:12]
        a.setdefault("importance", 1)
        nouveaux.append(a)
        vus_url.add(cu)
        vus_titre.add(ct)
    return nouveaux, doublons


def selection(arg, n):
    if arg.strip().lower() in ("tout", "all", "*"):
        return list(range(n))
    idx = sorted({int(x) - 1 for x in re.split(r"[,\s]+", arg.strip()) if x})
    if any(i < 0 or i >= n for i in idx):
        raise RuntimeError(f"numéro hors liste (1 à {n})")
    return idx


def afficher_attente(attente):
    if not attente:
        print("Rien en attente de validation.")
        return
    print(f"{len(attente)} avancée(s) en attente de validation :\n")
    for i, a in enumerate(attente, 1):
        etoiles = "★" * a.get("importance", 1)
        refs = ", ".join(a.get("references", [])) or "aucune"
        print(f"{i}. [{a.get('theme', 'Diabète')} · {a['niveau']}] {a['titre']} {etoiles}\n   {a['source_nom']} ({a['date']}) — réf : {refs}\n   {a['source_url']}\n")
    print('Répondre « publie 1,3 », « publie tout », « rejette 2 »…')


def publier_sur_site(articles, no_push, dry_run):
    if not dry_run and not no_push:
        git("pull", "--rebase", "--quiet")
    data = lire(FICHIER, {"meta": {}, "articles": []})
    nouveaux, doublons = filtrer_nouveaux(articles, data["articles"])
    for a in nouveaux:
        a["date_ajout"] = date.today().isoformat()
    print(f"Publiés : {len(nouveaux)} | Doublons ignorés : {len(doublons)}")
    for a in nouveaux:
        print("  + " + a["titre"])
    for t in doublons:
        print("  = " + t)
    if dry_run or not nouveaux:
        return
    data["articles"].extend(nouveaux)
    data["articles"].sort(key=lambda a: (a.get("date", ""), a.get("importance", 1)), reverse=True)
    data.setdefault("meta", {})["derniere_maj"] = datetime.now(ZoneInfo("Europe/Paris")).isoformat(timespec="seconds")
    ecrire(FICHIER, data)
    if no_push:
        print("Fichier écrit (pas de push).")
        return
    git("add", "data/news.json")
    themes = ", ".join(sorted({a["theme"] for a in nouveaux}))
    git("commit", "-m", f"Veille ({themes}) : {len(nouveaux)} nouvelle(s) avancée(s)")
    git("push", "--quiet")
    print("En ligne ✔ (le site se met à jour en 1 à 2 minutes)")


# ---------- commandes ----------
def main():
    p = argparse.ArgumentParser(description="Veille santé -> site")
    p.add_argument("commande", choices=["proposer", "liste", "publier", "rejeter", "direct"])
    p.add_argument("arg", nargs="?", help="fichier JSON (proposer/direct) ou numéros (publier/rejeter)")
    p.add_argument("--no-push", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    a = p.parse_args()
    attente = lire(ATTENTE, [])

    if a.commande == "liste":
        afficher_attente(attente)

    elif a.commande == "proposer":
        if not a.arg:
            raise RuntimeError("indique le fichier JSON")
        candidats = charger_entree(a.arg)
        nouveaux, doublons = filtrer_nouveaux(candidats, lire(FICHIER, {}).get("articles", []) + attente)
        if doublons:
            print(f"Déjà vus, ignorés : {len(doublons)}")
        if not a.dry_run:
            ecrire(ATTENTE, attente + nouveaux)
        afficher_attente(attente + nouveaux)

    elif a.commande == "direct":
        if not a.arg:
            raise RuntimeError("indique le fichier JSON")
        publier_sur_site(charger_entree(a.arg), a.no_push, a.dry_run)

    elif a.commande in ("publier", "rejeter"):
        if not attente:
            print("Rien en attente.")
            return
        if not a.arg:
            raise RuntimeError("indique les numéros (ex. 1,3) ou « tout »")
        idx = selection(a.arg, len(attente))
        choisis = [attente[i] for i in idx]
        restants = [x for i, x in enumerate(attente) if i not in idx]
        if a.commande == "publier":
            publier_sur_site(choisis, a.no_push, a.dry_run)
        else:
            if not a.dry_run:
                ecrire(REJETES, lire(REJETES, []) + [url_cle(x["source_url"]) for x in choisis])
            print(f"Rejetés : {len(choisis)}")
            for x in choisis:
                print("  - " + x["titre"])
        if not a.dry_run:
            ecrire(ATTENTE, restants)
        if restants:
            print(f"\nEncore {len(restants)} en attente (python3 hermes/add_news.py liste).")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as e:
        sys.exit(f"ERREUR : {e}")
