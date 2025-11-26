let data = [];

// Charger le dictionnaire JSON
fetch("dico.json")
    .then(r => r.json())
    .then(json => {
        data = json;
        console.log("JSON chargé :", data);
    })
    .catch(err => console.error("Erreur chargement JSON:", err));

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("searchInput");
    const resultsDiv = document.getElementById("results");
    const suggestionsBox = document.getElementById("suggestions");

    input.addEventListener("input", () => {
        const query = input.value.trim();

        if (query.length === 0) {
            resultsDiv.innerHTML = "";
            suggestionsBox.innerHTML = "";
            suggestionsBox.style.display = "none";
            return;
        }

        const matches = getRankedMatches(query);

        // 🔥 AU LIEU D'AFFICHER DIRECTEMENT LES CARTES :
        showSuggestions(matches, query);
    });
});


// -------------------------------
//   RECHERCHE + TRI PRIORITAIRE
// -------------------------------
function getRankedMatches(query) {
    const q = query.toLowerCase();

    // --- 1) Recherche dans les Mots ---
    const exactMot = data.filter(e =>
        typeof e.Mot === "string" &&
        e.Mot.toLowerCase() === q
    );

    const startsMot = data.filter(e =>
        typeof e.Mot === "string" &&
        e.Mot.toLowerCase().startsWith(q) &&
        e.Mot.toLowerCase() !== q
    );

    const containsMot = data.filter(e =>
        typeof e.Mot === "string" &&
        e.Mot.toLowerCase().includes(q) &&
        !e.Mot.toLowerCase().startsWith(q) &&
        e.Mot.toLowerCase() !== q
    );


    // --- 2) Recherche dans les Traductions ---
    const exactTrad = data.filter(e =>
        typeof e.Traduction === "string" &&
        e.Traduction.toLowerCase() === q
    );

    const startsTrad = data.filter(e =>
        typeof e.Traduction === "string" &&
        e.Traduction.toLowerCase().startsWith(q) &&
        e.Traduction.toLowerCase() !== q
    );

    const containsTrad = data.filter(e =>
        typeof e.Traduction === "string" &&
        e.Traduction.toLowerCase().includes(q) &&
        !e.Traduction.toLowerCase().startsWith(q) &&
        e.Traduction.toLowerCase() !== q
    );

    // IMPORTANT :
    // On garde la priorité stricte :
    // 1) MOTS
    // 2) TRADUCTIONS
    return [
        ...exactMot,
        ...startsMot,
        ...containsMot,

        ...exactTrad,
        ...startsTrad,
        ...containsTrad
    ].slice(0, 50);
}


// --------------------------------
//      HIGHLIGHT des résultats
// --------------------------------
function highlight(text, query) {
    if (!text) return "—";
    const regex = new RegExp(query, "gi");
    return text.replace(regex, match => `<span class="highlight">${match}</span>`);
}


// --------------------------------
//        AFFICHAGE DES CARTES
// --------------------------------
function displayResults(results) {
    const container = document.getElementById("results");
    container.innerHTML = "";

    const query = document.getElementById("searchInput").value;

    results.forEach(item => {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <h2>${highlight(item.Mot, query)}</h2>
            <p><strong>Traduction :</strong> ${highlight(item.Traduction, query)}</p>
            <p><strong>Exemples :</strong> ${item.Exemples || "—"}</p>
            <p><strong>Synonymes :</strong> ${item.Synonymes || "—"}</p>
        `;

        container.appendChild(card);
    });
}

function showSuggestions(results, query) {
    const suggestionsBox = document.getElementById("suggestions");
    suggestionsBox.innerHTML = "";

    if (results.length === 0) {
        suggestionsBox.style.display = "none";
        return;
    }

    suggestionsBox.style.display = "block";

    results.slice(0, 30).forEach(item => {
        const div = document.createElement("div");
        div.className = "suggestion-item";

        const motHighlighted = highlight(item.Mot, query);
        const tradHighlighted = highlight(item.Traduction, query);

        div.innerHTML = `
            <strong>${motHighlighted}</strong>
            <br>
            <span style="font-size: 0.85em; color: #666;">${tradHighlighted}</span>
        `;

        // 🔥 CLIC = mot sélectionné
        div.addEventListener("click", () => {
            document.getElementById("searchInput").value = item.Mot;
            suggestionsBox.style.display = "none";
            displayResults([item]); // 🔥 seul le mot cliqué s'affiche
        });

        suggestionsBox.appendChild(div);
    });
}

document.addEventListener("click", (e) => {
    if (!e.target.closest("#suggestions") && !e.target.closest("#searchInput")) {
        document.getElementById("suggestions").style.display = "none";
    }
});
