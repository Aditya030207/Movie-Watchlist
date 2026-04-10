const API_CODE = "cOihK1K4YTpS5akJAzT51X8HelyCbZ07tDte19aG";
let recentSearchData = [];
let userWatchlist = [];

const searchInputBox = document.getElementById("movie-searchbox");
const startSearchBtn = document.getElementById("find-btn");
const displayResults = document.getElementById("results-area");
const displayWatchlist = document.getElementById("saved-movies-area");
const loaderSection = document.getElementById("loader-div");
const processingText = document.getElementById("loader-text");
const alertBox = document.getElementById("error-alert");
const typeSelect = document.getElementById("category-dropdown");
const orderSelect = document.getElementById("sorting-dropdown");

function setupPage() {
    const saved = localStorage.getItem("my_saved_movies");
    if (saved) {
        try {
            userWatchlist = JSON.parse(saved);
        } catch (err) {
            userWatchlist = [];
        }
    }
    showWatchlist();

    startSearchBtn.addEventListener("click", runSearch);
    typeSelect.addEventListener("change", updateListDisplay);
    orderSelect.addEventListener("change", updateListDisplay);

    searchInputBox.addEventListener("keypress", function (evt) {
        if (evt.key === "Enter") {
            runSearch();
        }
    });
}

async function runSearch() {
    const query = searchInputBox.value.trim();

    if (!query) {
        showProblem("Please type a movie name first!");
        return;
    }

    alertBox.style.display = "none";
    processingText.textContent = "Fetching movies...";
    loaderSection.style.display = "flex";
    displayResults.innerHTML = "";
    
    try {
        const fetchUrl = `https://api.watchmode.com/v1/search/?apiKey=${API_CODE}&search_field=name&search_value=${encodeURIComponent(query)}`;
        const result = await fetch(fetchUrl);
        
        if (!result.ok) {
            throw new Error("Bad response from server");
        }

        const jsonData = await result.json();
        const rawItems = jsonData.title_results || [];

        if (rawItems.length === 0) {
            loaderSection.style.display = "none";
            displayResults.innerHTML = `<p class="no-data-text">Could not find any movies for "${query}".</p>`;
            return;
        }

        processingText.textContent = "Loading movie info...";
        const maxResults = rawItems.slice(0, 10);
        await getExtraDetails(maxResults);
        
        loaderSection.style.display = "none";
        updateListDisplay();
    } catch (e) {
        loaderSection.style.display = "none";
        showProblem("Something went wrong while searching. Try again later.");
    }
}

async function getExtraDetails(moviesList) {
    const fetchPromises = moviesList.map(async (movie) => {
        try {
            const url = `https://api.watchmode.com/v1/title/${movie.id}/details/?apiKey=${API_CODE}`;
            const res = await fetch(url);
            
            if (!res.ok) {
                return { ...movie, poster: null };
            }

            const info = await res.json();
            return {
                ...movie,
                poster: info.poster,
                year: info.year
            };
        } catch (err) {
            return { ...movie, poster: null };
        }
    });

    recentSearchData = await Promise.all(fetchPromises);
}

function updateListDisplay() {
    if (recentSearchData.length === 0) return;

    let itemsToShow = [...recentSearchData];
    const chosenType = typeSelect.value;
    const chosenOrder = orderSelect.value;

    if (chosenType !== "all") {
        itemsToShow = itemsToShow.filter(m => m.type === chosenType);
    }

    if (chosenOrder === "az") {
        itemsToShow.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (chosenOrder === "newest") {
        itemsToShow.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (chosenOrder === "oldest") {
        itemsToShow.sort((a, b) => (a.year || 9999) - (b.year || 9999));
    }

    drawCards(itemsToShow, displayResults, false);
}

function drawCards(movieArray, gridDiv, isItWatchlist) {
    if (movieArray.length === 0) {
        const text = isItWatchlist ? "Your watchlist is empty right now." : "No movies match that filter.";
        gridDiv.innerHTML = `<p class="no-data-text">${text}</p>`;
        return;
    }

    let allHtml = "";
    for (let i = 0; i < movieArray.length; i++) {
        const currentMovie = movieArray[i];
        const imgSource = currentMovie.poster || "https://via.placeholder.com/220x320?text=No+Cover";
        const alreadyAdded = userWatchlist.some(m => m.id === currentMovie.id);
        const buttonClass = alreadyAdded ? "btn-remove" : "btn-add";
        const buttonText = alreadyAdded ? "Remove" : "Add to List";

        allHtml += `
            <div class="card-item">
                <img src="${imgSource}" alt="${currentMovie.name || "Cover"}" onerror="this.src='https://via.placeholder.com/220x320?text=No+Cover'">
                <h3>${currentMovie.name || "Title missing"}</h3>
                <p>Year: ${currentMovie.year || "Unknown"}</p>
                <p>Type: ${fixTypeString(currentMovie.type)}</p>
                <button class="${buttonClass}" onclick="modifyWatchlist(${currentMovie.id})">
                    ${buttonText}
                </button>
            </div>
        `;
    }

    gridDiv.innerHTML = allHtml;
}

window.modifyWatchlist = function (movieId) {
    const pos = userWatchlist.findIndex(m => m.id === movieId);

    if (pos !== -1) {
        userWatchlist.splice(pos, 1);
    } else {
        const found = recentSearchData.find(m => m.id === movieId);
        if (found) {
            userWatchlist.push(found);
        }
    }

    localStorage.setItem("my_saved_movies", JSON.stringify(userWatchlist));
    showWatchlist();
    
    if (recentSearchData.length > 0) {
        updateListDisplay();
    }
};

function showWatchlist() {
    drawCards(userWatchlist, displayWatchlist, true);
}

function showProblem(textMsg) {
    alertBox.textContent = textMsg;
    alertBox.style.display = "block";
}

function fixTypeString(rawType) {
    if (!rawType) return "Unknown";
    if (rawType === "tv_series") return "TV Show";
    if (rawType === "movie") return "Movie";
    return rawType;
}

setupPage();