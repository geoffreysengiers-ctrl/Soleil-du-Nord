// Affiche les avancées contenues dans data/news.json
(function () {
  const NIVEAUX = {
    "Recherche": "recherche",
    "Essai clinique": "essai",
    "Approuvé": "approuve",
    "Disponible": "disponible",
  };
  // Les grands sujets suivis par Hermès (un article sans "theme" = Diabète, pour les anciens)
  const SUJETS = {
    "Diabète": "diabete",
    "Épilepsie": "epilepsie",
    "Encéphalite auto-immune": "encephalite",
    "Insuffisance ovarienne précoce": "iop",
    "Maturation in vitro": "miv",
  };
  const CATEGORIES = ["Tout voir", "Traitement", "Immunothérapie", "Cellules souches", "Thérapie génique",
                      "Chirurgie", "Technologie", "Fertilité", "Diagnostic", "Dépistage & prévention",
                      "Complications", "Recherche", "Quotidien"];
  const PAR_PAGE = 20;
  const sujetDe = (a) => (a.theme && SUJETS[a.theme]) ? a.theme : "Diabète";

  const etat = { sujet: "Tous", theme: "Tout voir", niveau: "Tout", q: "", affiches: PAR_PAGE };
  try { const s = localStorage.getItem("sujet"); if (s && (s === "Tous" || SUJETS[s])) etat.sujet = s; } catch (_) {}
  let articles = [];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sansAccent = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const urlSure = (u) => /^https?:\/\//i.test(u || "") ? u : "#";

  function dateFr(iso) {
    const d = new Date(iso + "T12:00:00");
    return isNaN(d) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }
  // Identifiant stable d'un article, pour pouvoir partager un lien direct vers sa carte
  function idArticle(a) {
    const base = sansAccent((a.date || "") + "-" + (a.titre || "")).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return "a-" + base.slice(0, 70);
  }

  /* ---------- Articles déjà vus (gardés dans le téléphone) ---------- */
  // Lors de la toute première visite avec cette fonction, ce qui a été ajouté
  // avant cette date compte comme déjà vu (elle les avait déjà sur le site).
  const DEJA_VUS_AVANT = "2026-10-25";
  let lus = new Set();
  let memoireOk = true;
  function chargerLus() {
    try {
      const brut = localStorage.getItem("lus");
      if (brut === null) {
        lus = new Set(articles.filter((a) => (a.date_ajout || a.date || "") < DEJA_VUS_AVANT).map(idArticle));
        sauverLus();
      } else {
        lus = new Set(JSON.parse(brut));
      }
    } catch (_) { memoireOk = false; lus = new Set(articles.map(idArticle)); }
  }
  function sauverLus() {
    try { localStorage.setItem("lus", JSON.stringify([...lus])); } catch (_) {}
  }
  const estLu = (a) => lus.has(idArticle(a));

  function marquerLu(id) {
    if (!id || lus.has(id)) return;
    lus.add(id);
    sauverLus();
    const el = $(id);
    if (el) {
      el.classList.remove("non-lu");
      const tag = el.querySelector(".tag.nouveau");
      if (tag) { tag.classList.add("part"); setTimeout(() => tag.remove(), 600); }
    }
    majCompteurs();
  }
  function toutMarquerLu() {
    articles.forEach((a) => lus.add(idArticle(a)));
    sauverLus();
    rendre();
    toast("Tout est marqué comme lu ✓");
  }

  // Une carte compte comme vue quand elle reste bien visible 2 secondes
  let guetteur = null;
  const minuteurs = new Map();
  function guetterLecture() {
    if (!("IntersectionObserver" in window)) return;
    if (guetteur) guetteur.disconnect();
    minuteurs.forEach(clearTimeout); minuteurs.clear();
    guetteur = new IntersectionObserver((entrees) => {
      entrees.forEach((e) => {
        const id = e.target.id;
        const bienVisible = e.isIntersecting && (e.intersectionRatio >= 0.6 ||
          e.intersectionRect.height >= 0.5 * (e.rootBounds ? e.rootBounds.height : innerHeight));
        if (bienVisible && document.visibilityState === "visible") {
          if (!minuteurs.has(id)) minuteurs.set(id, setTimeout(() => {
            minuteurs.delete(id); guetteur.unobserve(e.target); marquerLu(id);
          }, 2000));
        } else if (minuteurs.has(id)) {
          clearTimeout(minuteurs.get(id)); minuteurs.delete(id);
        }
      });
    }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] });
    document.querySelectorAll(".carte.non-lu").forEach((c) => guetteur.observe(c));
  }

  // Petites bulles roses sur les thèmes + barre « x non lus »
  function majCompteurs() {
    document.querySelectorAll("#chips-sujet .chip").forEach((b) => { b.innerHTML = etiquetteSujet(b.dataset.v); });
    const n = articles.filter((a) => !estLu(a)).length;
    const barre = $("barre-lus");
    barre.hidden = !memoireOk || n === 0;
    $("nb-non-lus").textContent = n === 1 ? "1 article pas encore lu" : n + " articles pas encore lus";
  }

  /* ---------- Petit message en bas de l'écran ---------- */
  let minuteurToast;
  function toast(texte) {
    const t = $("toast");
    t.textContent = texte;
    t.hidden = false;
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(() => { t.hidden = true; }, 2200);
  }

  /* ---------- Filtres en pastilles ---------- */
  function dessinerChips(conteneur, valeurs, cle, etiquette) {
    conteneur.innerHTML = valeurs.map((v) =>
      `<button class="chip" type="button" data-v="${esc(v)}" aria-pressed="${etat[cle] === v}">${etiquette ? etiquette(v) : esc(v)}</button>`).join("");
  }
  function chips(conteneur, valeurs, cle, etiquette, apres) {
    dessinerChips(conteneur, valeurs, cle, etiquette);
    conteneur.addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      etat[cle] = b.dataset.v;
      etat.affiches = PAR_PAGE;
      conteneur.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === b));
      // Sur téléphone, la pastille choisie se recentre dans la ligne qui défile
      b.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      if (apres) apres();
      rendre();
    });
  }

  // Pastille d'un sujet : petit rond de couleur + nom + nombre d'articles
  function etiquetteSujet(v) {
    const du = v === "Tous" ? articles : articles.filter((a) => sujetDe(a) === v);
    const nonLus = du.filter((a) => !estLu(a)).length;
    const rond = v === "Tous" ? "" : `<i class="rond ${SUJETS[v]}"></i>`;
    const compte = nonLus
      ? `<span class="bulle-nl" title="${nonLus} pas encore lu(s)">${nonLus}</span>`
      : `<span class="compte">${du.length}</span>`;
    return `${rond}${esc(v)} ${compte}`;
  }

  // Les catégories proposées dépendent du sujet choisi
  function majCategories() {
    const presents = new Set(articles.filter((a) => etat.sujet === "Tous" || sujetDe(a) === etat.sujet).map((a) => a.categorie));
    const valeurs = CATEGORIES.filter((t) => t === "Tout voir" || presents.has(t));
    if (!valeurs.includes(etat.theme)) etat.theme = "Tout voir";
    dessinerChips($("chips-type"), valeurs, "theme");
    $("chips-type").hidden = valeurs.length <= 2;
  }

  function choisirSujet() {
    try { localStorage.setItem("sujet", etat.sujet); } catch (_) {}
    majCategories();
  }

  function filtrer() {
    const q = sansAccent(etat.q);
    return articles.filter((a) => {
      if (etat.sujet !== "Tous" && sujetDe(a) !== etat.sujet) return false;
      if (etat.theme !== "Tout voir" && a.categorie !== etat.theme) return false;
      if (etat.niveau !== "Tout" && a.niveau !== etat.niveau) return false;
      if (q) {
        const texte = sansAccent([sujetDe(a), a.titre, a.resume, a.pourquoi, a.pays, a.categorie, a.source_nom, (a.references || []).join(" ")].join(" "));
        if (!texte.includes(q)) return false;
      }
      return true;
    });
  }

  function refs(liste) {
    if (!Array.isArray(liste) || !liste.length) return "";
    return '<span class="refs">' + liste.map((r) => {
      const v = String(r).trim();
      let m;
      if ((m = v.match(/^NCT\d{8}$/i))) return `<a href="https://clinicaltrials.gov/study/${m[0].toUpperCase()}" target="_blank" rel="noopener" title="Essai clinique">${esc(m[0].toUpperCase())}</a>`;
      if ((m = v.match(/^PMID:(\d+)$/i))) return `<a href="https://pubmed.ncbi.nlm.nih.gov/${m[1]}/" target="_blank" rel="noopener" title="Article PubMed">PubMed ${esc(m[1])}</a>`;
      if ((m = v.match(/^DOI:(10\..+)$/i))) return `<a href="https://doi.org/${encodeURI(m[1])}" target="_blank" rel="noopener" title="Publication">DOI</a>`;
      return "";
    }).join("") + "</span>";
  }

  function carte(a) {
    const niv = NIVEAUX[a.niveau] || "recherche";
    const neuf = !estLu(a);
    return `
      <article class="carte${a.importance >= 3 ? " importante" : ""}${neuf ? " non-lu" : ""}" id="${idArticle(a)}">
        <div class="carte-haut">
          ${neuf ? '<span class="tag nouveau">✨ Nouveau</span>' : ""}
          <span class="tag sujet ${SUJETS[sujetDe(a)]}">${esc(sujetDe(a))}${sujetDe(a) === "Diabète" && a.type && a.type !== "Général" ? " · " + esc(a.type) : ""}</span>
          <span class="tag niveau ${niv}">${esc(a.niveau)}</span>
          ${a.categorie ? `<span class="tag">${esc(a.categorie)}</span>` : ""}
          ${a.pays ? `<span class="tag">📍 ${esc(a.pays)}</span>` : ""}
          <span class="date">${dateFr(a.date)}</span>
        </div>
        <h2>${esc(a.titre)}</h2>
        <p>${esc(a.resume)}</p>
        ${a.pourquoi ? `<p class="pourquoi"><strong>Ce que ça change :</strong> ${esc(a.pourquoi)}</p>` : ""}
        <div class="liens">
          <a class="source" data-id="${idArticle(a)}" href="${esc(urlSure(a.source_url))}" target="_blank" rel="noopener">Lire la source · ${esc(a.source_nom)} →</a>
          ${refs(a.references)}
          <button class="partager" type="button" data-id="${idArticle(a)}" aria-label="Partager cet article">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Partager
          </button>
        </div>
      </article>`;
  }

  /* ---------- Partage d'un article ---------- */
  async function partager(id) {
    const a = articles.find((x) => idArticle(x) === id);
    if (!a) return;
    const lien = location.origin + location.pathname + "#" + id;
    const texte = a.titre + (a.pourquoi ? "\n\n" + a.pourquoi : "") +
      (a.source_url ? "\n\nSource : " + a.source_url : "");
    if (navigator.share) {
      try { await navigator.share({ title: a.titre, text: texte, url: lien }); } catch (_) { /* partage annulé */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(texte + "\n\n" + lien);
      toast("Lien copié ✓ Il n'y a plus qu'à le coller");
    } catch (_) {
      prompt("Copie ce lien :", lien);
    }
  }

  function rendre() {
    const res = filtrer();
    const visibles = res.slice(0, etat.affiches);
    $("liste").innerHTML = visibles.map(carte).join("") +
      (res.length > visibles.length ? `<button class="chip plus" id="plus" type="button">Voir plus (${res.length - visibles.length})</button>` : "");
    $("vide").hidden = res.length > 0;
    $("vide").textContent = (etat.sujet !== "Tous" && !articles.some((a) => sujetDe(a) === etat.sujet))
      ? "Hermès commence tout juste sa veille sur ce thème… les premières avancées arrivent bientôt 🌸"
      : "Rien pour ces filtres… pour l'instant 🌸";
    const plus = $("plus");
    if (plus) plus.onclick = () => { etat.affiches += PAR_PAGE; rendre(); };
    majCompteurs();
    guetterLecture();
  }

  // Ouvre directement l'article reçu par lien partagé (…/#a-2026-10-21-…)
  function allerAuLienPartage() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const rang = articles.findIndex((a) => idArticle(a) === id);
    if (rang < 0) return;
    // On enlève les filtres pour être sûr que la carte soit visible
    if (filtrer().indexOf(articles[rang]) < 0) {
      etat.sujet = "Tous"; etat.theme = "Tout voir"; etat.niveau = "Tout"; etat.q = ""; $("recherche").value = "";
      document.querySelectorAll("#chips-sujet .chip, #chips-niveau .chip").forEach((c) =>
        c.setAttribute("aria-pressed", c.dataset.v === "Tous" || c.dataset.v === "Tout"));
      majCategories();
    }
    const rangVisible = filtrer().indexOf(articles[rang]);
    if (rangVisible >= etat.affiches) { etat.affiches = rangVisible + 1; }
    rendre();
    const el = $(id);
    if (!el) return;
    el.classList.add("eclaire");
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    setTimeout(() => el.classList.remove("eclaire"), 2600);
  }

  /* ---------- Le mot du jour ---------- */
  let citations = null;
  function numeroDuJour() {
    const d = new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }
  async function citationDuJour() {
    if (!citations) {
      try {
        const r = await fetch("data/citations.json?v=" + numeroDuJour());
        citations = (await r.json()).citations || [];
      } catch (_) { citations = []; }
    }
    return citations.length ? citations[numeroDuJour() % citations.length]
                            : { texte: "Tu illumines mes journées, même de loin." };
  }
  // Sous le titre : « Citation du jour : … »
  async function afficherCitationSousTitre() {
    const c = await citationDuJour();
    $("sous-titre").innerHTML = '<span class="citation-label">Citation du jour :</span> « ' + esc(c.texte) + ' »' +
      (c.auteur ? ' <span class="citation-auteur">— ' + esc(c.auteur) + "</span>" : "");
  }
  async function ouvrirMot() {
    const c = await citationDuJour();
    $("mot-texte").textContent = "« " + c.texte + " »";
    $("mot-auteur").textContent = c.auteur ? "— " + c.auteur : "";
    $("mot-auteur").hidden = !c.auteur;
    $("mot").hidden = false;
    $("mot-fermer").focus();
  }
  function fermerMot() { $("mot").hidden = true; }

  function brancherSecrets() {
    document.querySelectorAll(".secret").forEach((el) => {
      el.addEventListener("click", ouvrirMot);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrirMot(); } });
    });
    $("mot-fermer").addEventListener("click", fermerMot);
    $("mot").addEventListener("click", (e) => { if (e.target === $("mot")) fermerMot(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") fermerMot(); });
  }

  async function demarrer() {
    brancherSecrets();
    afficherCitationSousTitre();
    $("liste").addEventListener("click", (e) => {
      const b = e.target.closest(".partager");
      if (b) { marquerLu(b.dataset.id); partager(b.dataset.id); }
      const src = e.target.closest(".source");
      if (src) marquerLu(src.dataset.id);
    });
    try {
      const r = await fetch("data/news.json?v=" + Date.now(), { cache: "no-store" });
      const data = await r.json();
      const meta = data.meta || {};
      if (meta.dedicace) $("dedicace").textContent = meta.dedicace;
      if (meta.titre) { $("titre").textContent = meta.titre; document.title = meta.titre; }

      articles = (data.articles || []).slice().sort((a, b) =>
        (b.date || "").localeCompare(a.date || "") || (b.importance || 0) - (a.importance || 0));
      chargerLus();
      $("tout-lu").addEventListener("click", toutMarquerLu);
      // En revenant sur l'appli, on relance le guet des cartes visibles
      document.addEventListener("visibilitychange", () => { if (!document.hidden) guetterLecture(); });

      chips($("chips-sujet"), ["Tous", ...Object.keys(SUJETS)], "sujet", etiquetteSujet, choisirSujet);
      chips($("chips-type"), [], "theme");
      majCategories();
      const actif = document.querySelector('#chips-sujet .chip[aria-pressed="true"]');
      if (actif) actif.scrollIntoView({ block: "nearest", inline: "center" });
      chips($("chips-niveau"), ["Tout", ...Object.keys(NIVEAUX)], "niveau");
      $("recherche").addEventListener("input", (e) => { etat.q = e.target.value; etat.affiches = PAR_PAGE; rendre(); });
      rendre();
      allerAuLienPartage();
      window.addEventListener("hashchange", allerAuLienPartage);
    } catch (err) {
      $("liste").innerHTML = '<p class="erreur">Impossible de charger les nouvelles pour le moment. Réessaie un peu plus tard 🌷</p>';
      console.error(err);
    }
  }

  // Appli installable : le service worker garde une copie pour l'ouverture hors ligne
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  demarrer();
})();
