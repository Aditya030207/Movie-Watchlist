const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const movieContainer = document.getElementById("movie-container");
const watchlistContainer = document.getElementById("watchlist-container");
const loadingMessage = document.getElementById("loading-message");
const filterType = document.getElementById("filter-type");
const sortOptions = document.getElementById("sort-options");

const API_KEY = "cOihK1K4YTpS5akJAzT51X8HelyCbZ07tDte19aG";

let allFetchedMovies = [];
let watchlist = JSON.parse(localStorage.getItem("myWatchlist")) || [];

renderWatchlist();

searchBtn.addEventListener("click", async function () {
    const movieName = searchInput.value.trim();

    if (movieName === "") {
        alert("Please enter a movie name!");
        return;
    }

    loadingMessage.textContent = "Searching for movies...";
    loadingMessage.style.display = "block";
    movieContainer.innerHTML = "";

    const searchUrl = `https://api.watchmode.com/v1/search/?apiKey=${API_KEY}&search_field=name&search_value=${encodeURIComponent(movieName)}`;

    try {
        const response = await fetch(searchUrl);
        if (!response.ok) throw new Error("Search failed: " + response.status);
        
        const data = await response.json();
        const results = data.title_results || [];

        if (results.length === 0) {
            loadingMessage.style.display = "none";
            movieContainer.innerHTML = `<p class="empty-msg">No titles found for "${movieName}".</p>`;
            return;
        }

        loadingMessage.textContent = `Found ${results.length} titles. Fetching posters...`;

        // Limit to top 12 results to save API credits and improve performance
        const limitedResults = results.slice(0, 12);

        // Fetch details for each movie to get the poster URL
        const detailedMovies = await Promise.all(
            limitedResults.map(async (movie) => {
                try {
                    const detailsUrl = `https://api.watchmode.com/v1/title/${movie.id}/details/?apiKey=${API_KEY}`;
                    const detailsRes = await fetch(detailsUrl);
                    if (!detailsRes.ok) return { ...movie, poster: null };
                    
                    const detailsData = await detailsRes.json();
                    return {
                        ...movie,
                        poster: detailsData.poster,
                        rating: detailsData.user_rating,
                        plot: detailsData.plot_overview
                    };
                } catch (e) {
                    return { ...movie, poster: null };
                }
            })
        );

        allFetchedMovies = detailedMovies;
        loadingMessage.style.display = "none";
        applyFiltersAndSort();
    } catch (error) {
        loadingMessage.style.display = "none";
        movieContainer.innerHTML = `<p style="color: #ef4444;">Error: ${error.message}</p>`;
    }
});

filterType.addEventListener("change", applyFiltersAndSort);
sortOptions.addEventListener("change", applyFiltersAndSort);

function applyFiltersAndSort() {
    let filtered = [...allFetchedMovies];

    if (filterType.value !== "all") {
        filtered = filtered.filter(movie => movie.type === filterType.value);
    }

    if (sortOptions.value === "az") {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOptions.value === "year-desc") {
        filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sortOptions.value === "year-asc") {
        filtered.sort((a, b) => (a.year || 9999) - (b.year || 9999));
    }

    renderMovies(filtered, movieContainer, false);
}

function renderMovies(movies, container, isWatchlist) {
    if (movies.length === 0) {
        container.innerHTML = `<p class="empty-msg">${isWatchlist ? "Your watchlist is empty." : "No movies found. Try another search!"}</p>`;
        return;
    }

    container.innerHTML = movies.map(movie => {
        const imageUrl = movie.poster || "https://via.placeholder.com/220x320?text=No+Poster";
        const inWatchlist = watchlist.find(item => item.id === movie.id);

        return `
            <div class="movie-card">
                <img src="${imageUrl}" alt="${movie.name}">
                <h3>${movie.name}</h3>
                <p>Year: ${movie.year || 'N/A'}</p>
                <p>Type: ${movie.type || 'Movie'}</p>
                <button 
                    class="watchlist-btn ${inWatchlist ? 'remove-btn' : 'add-btn'}" 
                    onclick="toggleWatchlist(${movie.id})">
                    ${inWatchlist ? 'Remove' : 'Add to Watchlist'}
                </button>
            </div>
        `;
    }).join("");
}

window.toggleWatchlist = function (id) {
    const movieInWatchlist = watchlist.find(m => m.id === id);

    if (movieInWatchlist) {
        watchlist = watchlist.filter(m => m.id !== id);
    } else {
        const movieToAdd = allFetchedMovies.find(m => m.id === id);
        if (movieToAdd) {
            watchlist.push(movieToAdd);
        }
    }

    localStorage.setItem("myWatchlist", JSON.stringify(watchlist));
    renderWatchlist();
    // We don't need to re-apply filters if we just toggled, but it helps update the UI state
    if (allFetchedMovies.length > 0) applyFiltersAndSort();
};

function renderWatchlist() {
    renderMovies(watchlist, watchlistContainer, true);
}