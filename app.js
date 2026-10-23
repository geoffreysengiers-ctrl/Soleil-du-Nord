// Affiche les avancées contenues dans data/news.json
(function () {
  const NIVEAUX = {
    "Recherche": "recherche",
    "Essai clinique": "essai",
    "Approuvé": "approuve",
    "Disponible": "disponible",
  };
  const THEMES = ["Tout voir", "Cellules souches", "Immunothérapie", "Technologie", "Traitement",
                  "Dépistage & prévention", "Complications", "Recherche", "Quotidien"];
  const PAR_PAGE = 20;

  const etat = { theme: "Tout voir", niveau: "Tout", q: "", affiches: PAR_PAGE };
  let articles = [];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sansAccent = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const urlSure = (u) => /^https?:\/\//i.test(u || "") ? u : "#";

  function dateFr(iso) {
    const d = new Date(iso + "T12:00:00");
    return isNaN(d) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }
  function joursDepuis(iso) {
    return (Date.now() - new Date(iso + "T12:00:00").getTime()) / 86400000;
  }

  // Liste déroulante : chaque option affiche le nombre d'articles correspondants
  function liste(select, valeurs, cle, champ, tous) {
    select.innerHTML = valeurs.map((v) => {
      const n = v === tous ? articles.length : articles.filter((a) => a[champ] === v).length;
      return `<option value="${esc(v)}"${etat[cle] === v ? " selected" : ""}>${esc(v)} (${n})</option>`;
    }).join("");
    select.addEventListener("change", () => {
      etat[cle] = select.value;
      etat.affiches = PAR_PAGE;
      rendre();
    });
  }

  function majFiltresActifs() {
    const actif = etat.theme !== "Tout voir" || etat.niveau !== "Tout" || etat.q.trim() !== "";
    $("effacer").hidden = !actif;
    $("filtre-theme").classList.toggle("actif", etat.theme !== "Tout voir");
    $("filtre-niveau").classList.toggle("actif", etat.niveau !== "Tout");
  }

  function filtrer() {
    const q = sansAccent(etat.q);
    return articles.filter((a) => {
      if (etat.theme !== "Tout voir" && a.categorie !== etat.theme) return false;
      if (etat.niveau !== "Tout" && a.niveau !== etat.niveau) return false;
      if (q) {
        const texte = sansAccent([a.titre, a.resume, a.pourquoi, a.pays, a.categorie, a.source_nom, (a.references || []).join(" ")].join(" "));
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
    const neuf = joursDepuis(a.date_ajout || a.date) <= 7;
    return `
      <article class="carte${a.importance >= 3 ? " importante" : ""}">
        <div class="carte-haut">
          ${neuf ? '<span class="tag nouveau">✨ Nouveau</span>' : ""}
          <span class="tag niveau ${niv}">${esc(a.niveau)}</span>
          ${a.type && a.type !== "Type 1" ? `<span class="tag">${esc(a.type)}</span>` : ""}
          ${a.categorie ? `<span class="tag">${esc(a.categorie)}</span>` : ""}
          ${a.pays ? `<span class="tag">📍 ${esc(a.pays)}</span>` : ""}
          <span class="date">${dateFr(a.date)}</span>
        </div>
        <h2>${esc(a.titre)}</h2>
        <p>${esc(a.resume)}</p>
        ${a.pourquoi ? `<p class="pourquoi"><strong>Ce que ça change :</strong> ${esc(a.pourquoi)}</p>` : ""}
        <div class="liens">
          <a class="source" href="${esc(urlSure(a.source_url))}" target="_blank" rel="noopener">Lire la source · ${esc(a.source_nom)} →</a>
          ${refs(a.references)}
        </div>
      </article>`;
  }

  function rendre() {
    const res = filtrer();
    const visibles = res.slice(0, etat.affiches);
    $("liste").innerHTML = visibles.map(carte).join("") +
      (res.length > visibles.length ? `<button class="chip plus" id="plus" type="button">Voir plus (${res.length - visibles.length})</button>` : "");
    $("vide").hidden = res.length > 0;
    majFiltresActifs();
    const plus = $("plus");
    if (plus) plus.onclick = () => { etat.affiches += PAR_PAGE; rendre(); };
  }

  async function demarrer() {
    try {
      const r = await fetch("data/news.json?v=" + Date.now(), { cache: "no-store" });
      const data = await r.json();
      const meta = data.meta || {};
      if (meta.dedicace) $("dedicace").textContent = meta.dedicace;
      if (meta.titre) { $("titre").textContent = meta.titre; document.title = meta.titre; }
      if (meta.sous_titre) $("sous-titre").textContent = meta.sous_titre;
      if (meta.derniere_maj) $("maj").textContent = "Mis à jour le " + dateFr(meta.derniere_maj.slice(0, 10));
      else $("maj").hidden = true;

      articles = (data.articles || []).slice().sort((a, b) =>
        (b.date || "").localeCompare(a.date || "") || (b.importance || 0) - (a.importance || 0));

      const presents = new Set(articles.map((a) => a.categorie));
      liste($("filtre-theme"), THEMES.filter((t) => t === "Tout voir" || presents.has(t)), "theme", "categorie", "Tout voir");
      liste($("filtre-niveau"), ["Tout", ...Object.keys(NIVEAUX)], "niveau", "niveau", "Tout");
      $("recherche").addEventListener("input", (e) => { etat.q = e.target.value; etat.affiches = PAR_PAGE; rendre(); });
      $("effacer").addEventListener("click", () => {
        etat.theme = "Tout voir"; etat.niveau = "Tout"; etat.q = ""; etat.affiches = PAR_PAGE;
        $("filtre-theme").value = "Tout voir"; $("filtre-niveau").value = "Tout"; $("recherche").value = "";
        rendre();
      });
      rendre();
    } catch (err) {
      $("liste").innerHTML = '<p class="erreur">Impossible de charger les nouvelles pour le moment. Réessaie un peu plus tard 🌷</p>';
      console.error(err);
    }
  }

  demarrer();
})();
