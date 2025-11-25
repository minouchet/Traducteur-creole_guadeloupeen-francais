let data = [];

// Normalisation pour ignorer accents et casse
function normalizeString(str) {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

// Fonction pour mettre en surbrillance les lettres correspondant à la saisie
function highlightMatch(text, query) {
    if (!query) return text;
    const normalizedText = normalizeString(text);
    let startIndex = normalizedText.indexOf(query);
    if (startIndex === -1) return text;
    const endIndex = startIndex + query.length;
    return (
        text.substring(0, startIndex) +
        `<span class="highlight">${text.substring(startIndex, endIndex)}</span>` +
        text.substring(endIndex)
    );
}

// Charger le dictionnaire
fetch("dico.json")
    .then(response => {
        if (!response.ok) throw new Error("Impossible de charger dico.json");
        return response.json();
    })
    .then(json => {
        data = json;
        console.log("JSON chargé :", data);
    })
    .catch(err => console.error("Erreur chargement JSON :", err));

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("searchInput");
    const suggestionsContainer = document.getElementById("suggestions");
    const resultsContainer = document.getElementById("results");

    input.addEventListener("input", function() {
        const query = normalizeString(this.value);
        suggestionsContainer.innerHTML = "";

        if (!query) return;

        const matches = data
            .filter(entry => {
                const motMatch = typeof entry.Mot === "string" && normalizeString(entry.Mot).includes(query);
                const tradMatch = typeof entry.Traduction === "string" && normalizeString(entry.Traduction).includes(query);
                return motMatch || tradMatch;
            })
            .slice(0, 50);

        matches.forEach(item => {
            const div = document.createElement("div");
            div.className = "suggestion-item";

            const motHighlighted = highlightMatch(item.Mot, query);
            const tradHighlighted = highlightMatch(item.Traduction, query);

            div.innerHTML = `${motHighlighted} – <span style="font-style:italic">${tradHighlighted}</span>`;

            div.addEventListener("click", () => {
                input.value = item.Mot;
                suggestionsContainer.innerHTML = "";
                displayResult(item);
            });

            suggestionsContainer.appendChild(div);
        });
    });

    // Fermer dropdown si clic en dehors
    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.innerHTML = "";
        }
    });
});

// Affichage du mot sélectionné avec tous les détails
function displayResult(item) {
    const container = document.getElementById("results");
    container.innerHTML = `
        <div class="card">
            <h2>${item.Mot}</h2>
            <p><strong>Traduction :</strong> ${item.Traduction}</p>
            <p><strong>Exemple :</strong> ${item.Exemples || "—"}</p>
            <p><strong>Synonymes :</strong> ${item.Synonymes || "—"}</p>
        </div>
    `;
}
