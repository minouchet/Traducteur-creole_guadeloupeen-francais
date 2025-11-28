// script.js (version : dropdown pendant saisie + Enter/Chèché pour afficher résultats paginés + Montré tout)

let data = [];
const PAGE_SIZE = 50; // 50 résultats par page

// charger JSON (inchangé)
fetch("dico.json")
  .then(r => r.json())
  .then(json => { data = json; })
  .catch(err => console.error("Erreur chargement JSON:", err));

// utilitaires
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function highlight(text, query) {
  if (!text) return "—";
  if (!query) return text;

  const safeQ = escapeRegex(query);
  const regex = new RegExp(`(${safeQ})`, "gi");

  // Highlight dans tout type de texte (phrase, liste, etc.)
  return text.replace(regex, "<span class='highlight'>$1</span>");
}

// NOTE: on retourne maintenant la LISTE COMPLÈTE (pas slice)
// getRankedMatches garde ta logique de tri (mots d'abord)
function getRankedMatches(query) {
  const q = query.toLowerCase();

  // Mot
  const exactMot = data.filter(e => e.Mot?.toLowerCase() === q);
  const startsMot = data.filter(e => e.Mot?.toLowerCase().startsWith(q) && e.Mot.toLowerCase() !== q);
  const containsMot = data.filter(e => e.Mot?.toLowerCase().includes(q) && !e.Mot.toLowerCase().startsWith(q));

  // Traduction
  const exactTrad = data.filter(e => e.Traduction?.toLowerCase() === q);
  const startsTrad = data.filter(e => e.Traduction?.toLowerCase().startsWith(q) && e.Traduction.toLowerCase() !== q);
  const containsTrad = data.filter(e => e.Traduction?.toLowerCase().includes(q) && !e.Traduction.toLowerCase().startsWith(q));

  // Exemples → troisième couche
  const containsEx = data.filter(e =>
    e.Exemples &&
    e.Exemples.toLowerCase().includes(q) &&
    !(e.Mot?.toLowerCase().includes(q)) &&
    !(e.Traduction?.toLowerCase().includes(q))
  );

  return [
    ...exactMot,
    ...startsMot,
    ...containsMot,
    ...exactTrad,
    ...startsTrad,
    ...containsTrad,

    // ajouté en dernier
    ...containsEx
  ];
}

// ----------------- DOM -----------------
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const suggestionsBox = document.getElementById("suggestions");
  const resultsDiv = document.getElementById("results");
  const paginationDiv = document.getElementById("pagination");
  const searchBtn = document.getElementById("searchBtn");
  const showAllBtn = document.getElementById("showAllBtn");

  let selectedIndex = -1;
  let currentMatches = []; // stocke les matches pour pagination
  let currentQuery = "";
  let currentPage = 1;

const clearBtn = document.getElementById("clearSearch");

clearBtn.addEventListener("click", () => {
  input.value = "";
  suggestionsBox.classList.remove("show");
  resultsDiv.innerHTML = "";
  clearBtn.style.display = "none";
  input.focus();
});

input.addEventListener("input", () => {
  clearBtn.style.display = input.value.trim() ? "block" : "none";
});


  // --- affichage dropdown (uniquement pendant la saisie) ---
  function showSuggestions(matches, query) {
    suggestionsBox.innerHTML = "";
    selectedIndex = -1;

    if (!matches || matches.length === 0 || !query) {
      suggestionsBox.classList.remove("show");
      return;
    }

    matches.slice(0, 10).forEach((item) => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      const left = item.Mot || item.Traduction || "";
      const right = item.Traduction && item.Mot ? item.Traduction : "";

      div.innerHTML = `
        <div class="s-left">${highlight(left, query)}</div>
        <div class="s-right"><small style="color:#666">${highlight(right, query)}</small></div>
      `;

      div.addEventListener("click", () => {
        input.value = item.Mot || left;
        suggestionsBox.classList.remove("show");
        // afficher un seul résultat (celui cliqué)
        displayPagedResults([item], input.value, 1, true);
      });

      div.addEventListener("mouseenter", () => {
        const items = suggestionsBox.querySelectorAll(".suggestion-item");
        selectedIndex = Array.from(items).indexOf(div);
        updateSuggestionHighlight(items);
      });

      suggestionsBox.appendChild(div);
    });

    suggestionsBox.classList.add("show");
  }

  function updateSuggestionHighlight(items) {
    items.forEach((el, i) => el.classList.toggle("selected", i === selectedIndex));
  }

  // --- pagination helper ---
  function paginate(array, page = 1, pageSize = PAGE_SIZE) {
    const total = array.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const slice = array.slice(start, start + pageSize);
    return { slice, total, totalPages };
  }

  function renderPagination(total, totalPages, page) {
    setupScrollButtons();
    paginationDiv.innerHTML = "";
    if (totalPages <= 1) return;

// ---- Boutons Alé anba & Alé anwo ----
function setupScrollButtons() {
  // BOUTON ALÉ ANWO (bas de page)
  let upBtn = document.getElementById("backToTopBtn");
  if (!upBtn) {
    upBtn = document.createElement("button");
    upBtn.id = "backToTopBtn";
    upBtn.className = "back-top-btn";
    upBtn.textContent = "Alé anwo";

    // ajouter tout en bas
    document.body.appendChild(upBtn);

    upBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // BOUTON ALÉ ANBA (haut de page)
  let downBtn = document.getElementById("goDownBtn");
  if (!downBtn) {
    downBtn = document.createElement("button");
    downBtn.id = "goDownBtn";
    downBtn.className = "back-bottom-btn";
    downBtn.textContent = "Alé anba";

    // ajouter tout en haut du body
    document.body.insertBefore(downBtn, document.body.firstChild);

    downBtn.addEventListener("click", () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  }
}

    // Prev
    const prev = document.createElement("button");
    prev.className = "pagination-btn";
    prev.textContent = "‹";
    prev.disabled = page === 1;
    prev.addEventListener("click", () => {
      goToPage(page - 1);
    });
    paginationDiv.appendChild(prev);

    // pages (smart display: show first, .., around current, .., last)
    const maxButtons = 7;
    const createPageBtn = (n) => {
      const b = document.createElement("button");
      b.className = "pagination-btn" + (n === page ? " active" : "");
      b.textContent = n;
      b.addEventListener("click", () => goToPage(n));
      return b;
    };

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) paginationDiv.appendChild(createPageBtn(i));
    } else {
      // logic for ellipsis
      const neighborhood = 2;
      const pages = new Set([1, totalPages]);
      for (let i = page - neighborhood; i <= page + neighborhood; i++) {
        if (i > 1 && i < totalPages) pages.add(i);
      }
      const pagesArr = Array.from(pages).sort((a,b)=>a-b);
      pagesArr.forEach((p, idx) => {
        if (idx > 0 && p - pagesArr[idx-1] > 1) {
          const dots = document.createElement("span");
          dots.textContent = " … ";
          dots.style.margin = "0 6px";
          paginationDiv.appendChild(dots);
        }
        paginationDiv.appendChild(createPageBtn(p));
      });
    }

    // Next
    const next = document.createElement("button");
    next.className = "pagination-btn";
    next.textContent = "›";
    next.disabled = page === totalPages;
    next.addEventListener("click", () => goToPage(page + 1));
    paginationDiv.appendChild(next);
// ---- Sélecteur de page (si beaucoup de pages) ----
if (totalPages > 4) {
  const jumpDiv = document.createElement("div");
  jumpDiv.style.marginTop = "10px";

  jumpDiv.innerHTML = `
    <input id="jumpPageInput" type="number" min="1" max="${totalPages}"
      placeholder="Mèt on paj…" class="jump-input">
    <button id="jumpPageBtn" class="pagination-btn">Alé</button>
  `;

  paginationDiv.appendChild(jumpDiv);

  const jumpBtn = jumpDiv.querySelector("#jumpPageBtn");
  const jumpInput = jumpDiv.querySelector("#jumpPageInput");

jumpInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const p = parseInt(jumpInput.value, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      goToPage(p);
    } else {
      jumpInput.value = "";
      jumpInput.placeholder = "Paj pa bon";
    }
  }
});

  jumpBtn.addEventListener("click", () => {
    const p = parseInt(jumpInput.value, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      goToPage(p);
    } else {
      jumpInput.value = "";
      jumpInput.placeholder = "Paj pa bon";
    }
  });
}

  }

  function goToPage(page) {
    currentPage = page;
    displayPagedResults(currentMatches, currentQuery, currentPage, false);
    window.scrollTo({ top: document.getElementById("results").offsetTop - 20, behavior: "smooth" });
  }

  // --- affichage paginé (affiche la liste principale) ---
  // if singleOnly true => display only single item (no pagination)
  function displayPagedResults(matches, query, page = 1, singleOnly = false) {
    resultsDiv.innerHTML = "";
    paginationDiv.innerHTML = "";

    if (!matches || matches.length === 0) {
      resultsDiv.innerHTML = `<p>Pon mo touvé...</p>`;
      return;
    }

    if (singleOnly) {
      // clone one card
      const item = matches[0];
      const card = createCard(item, query);
      resultsDiv.appendChild(card);
      return;
    }

    const { slice, total, totalPages } = paginate(matches, page);

    slice.forEach(item => {
      const card = createCard(item, query);
      // clic sur carte => affiche seulement cette carte
      card.addEventListener("click", () => {
        input.value = item.Mot || "";
        resultsDiv.innerHTML = "";
        resultsDiv.appendChild(createCard(item, query));
        suggestionsBox.classList.remove("show");
        paginationDiv.innerHTML = "";
      });
      resultsDiv.appendChild(card);
    });

    // render pagination
    renderPagination(total, totalPages, page);
  }

  function createCard(item, query) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h2>${highlight(item.Mot || "", query)}</h2>
      <p><strong>Traduction :</strong> ${highlight(item.Traduction || "", query)}</p>
      <p><strong>Exemples :</strong> ${highlight(item.Exemples || "—", query)}</p>
      <p><strong>Synonymes :</strong> ${highlight(item.Synonymes || "—", query)}</p>
    `;
    return card;
  }

  // --- événements utilisateur ---

  // pendant la saisie : afficher SUGGESTIONS SEULEMENT (PAS la liste principale)
  input.addEventListener("input", () => {
    const query = input.value.trim();
    if (!query) {
      suggestionsBox.innerHTML = "";
      suggestionsBox.classList.remove("show");
      return;
    }
    const matches = getRankedMatches(query);
    showSuggestions(matches, query);
    // NE PAS appeler displayPagedResults ici
  });

  // navigation clavier & Enter
  input.addEventListener("keydown", (e) => {
    const items = suggestionsBox.querySelectorAll(".suggestion-item");

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (items.length === 0) return;
      selectedIndex = (selectedIndex + 1) % items.length;
      updateSuggestionHighlight(items);
      items[selectedIndex].scrollIntoView({ block: "nearest" });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length === 0) return;
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateSuggestionHighlight(items);
      items[selectedIndex].scrollIntoView({ block: "nearest" });
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const query = input.value.trim();
      // si une suggestion est sélectionnée -> click dessus
      if (selectedIndex >= 0 && items[selectedIndex]) {
        items[selectedIndex].click();
        return;
      }
      // sinon : lancer la recherche complète (Entrée)
      currentQuery = query;
      currentMatches = getRankedMatches(currentQuery);
      currentPage = 1;
      suggestionsBox.classList.remove("show");
      displayPagedResults(currentMatches, currentQuery, currentPage, false);
    }
  });

  // bouton Chèché
  if (searchBtn) {
    searchBtn.textContent = "Chèché";
    searchBtn.addEventListener("click", () => {
      const query = input.value.trim();
      currentQuery = query;
      currentMatches = getRankedMatches(currentQuery);
      currentPage = 1;
      suggestionsBox.classList.remove("show");
      displayPagedResults(currentMatches, currentQuery, currentPage, false);
    });
  }

  // bouton Montré tout diksyonnè-la
  if (showAllBtn) {
    showAllBtn.addEventListener("click", () => {
      currentQuery = ""; // pas de filtre
      currentMatches = data.slice(); // tout le dico
      currentPage = 1;
      suggestionsBox.classList.remove("show");
      displayPagedResults(currentMatches, currentQuery, currentPage, false);
    });
  }

  // fermer dropdown si clic en dehors
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      suggestionsBox.classList.remove("show");
    }
  });

  // helper pour ajouter/remove classe
  function updateSuggestionHighlight(items) {
    items.forEach((el, i) => el.classList.toggle("selected", i === selectedIndex));
  }
});

