let data = [];

function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function rankSuggestion(item, query) {
    const word = item.Mot;
    const normWord = normalize(word);
    const normQuery = normalize(query);

    // Scores
    let score = 0;

    // 1️⃣ Exact match accentué
    if (word === query) score += 100;

    // 2️⃣ Commence par la recherche accentuée
    if (word.startsWith(query)) score += 80;

    // 3️⃣ Commence par la version non accentuée
    if (normWord.startsWith(normQuery)) score += 60;

    // 4️⃣ Contient la séquence
    if (normWord.includes(normQuery)) score += 40;

    // 5️⃣ Recherche dans la traduction (peu de poids)
    if (normalize(item.Traduction).includes(normQuery)) score += 10;

    return score;
}

function updateSuggestions(query) {
    const suggestionsBox = document.getElementById("suggestions");
    suggestionsBox.innerHTML = "";

    if (query.length < 1) return;

    const matches = mots
        .map(item => ({
            ...item,
            score: rankSuggestion(item, query)
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20); // 20 suggestions max

    matches.forEach(item => {
        const div = document.createElement("div");
        div.className = "suggestion-item";

        const regex = new RegExp(`(${query})`, "gi");
        const highlighted = item.Mot.replace(regex, "<span class='highlight'>$1</span>");

        div.innerHTML = `${highlighted} <span style="color:#666;">– ${item.Traduction}</span>`;

        div.onclick = () => {
            document.getElementById("searchInput").value = item.Mot;
            suggestionsBox.innerHTML = "";
            displayResult(item);
        };

        suggestionsBox.appendChild(div);
    });
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
