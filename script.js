const API_KEY = "cOihK1K4YTpS5akJAzT51X8HelyCbZ07tDte19aG";
let allFetchedMovies = [];
let watchlist = JSON.parse(localStorage.getItem("myWatchlist")) || [];

const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const movieContainer = document.getElementById("movie-container");
const watchlistContainer = document.getElementById("watchlist-container");
const loadingContainer = document.getElementById("loading-container");
const loadingMessage = document.getElementById("loading-message");
const errorMessage = document.getElementById("error-message");
const filterType = document.getElementById("filter-type");
const sortOptions = document.getElementById("sort-options");

renderWatchlist();

searchBtn.addEventListener("click", handleSearch);
filterType.addEventListener("change", applyFiltersAndSort);
sortOptions.addEventListener("change", applyFiltersAndSort);

searchInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        handleSearch();
    }
});

async function handleSearch() {
    const movieName = searchInput.value.trim();

    if (!movieName) {
        showError("Please enter a movie name to search!");
        return;
    }

    hideError();
    showLoading("Searching for movies...");
    movieContainer.innerHTML = "";
    
    try {
        const searchUrl = `https://api.watchmode.com/v1/search/?apiKey=${API_KEY}&search_field=name&search_value=${encodeURIComponent(movieName)}`;
        const response = await fetch(searchUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to safely fetch data (Status Code: ${response.status})`);
        }

        const data = await response.json();
        const results = data.title_results || [];

        if (results.length === 0) {
            hideLoading();
            renderEmptyState(movieContainer, `No movies found matching "${movieName}".`);
            return;
        }

        showLoading(`Found ${results.length} titles. Loading details...`);
        
        const limitedResults = results.slice(0, 12);
        await fetchMovieDetails(limitedResults);
        
        hideLoading();
        applyFiltersAndSort();
    } catch (error) {
        hideLoading();
        showError(`Error: ${error.message}. Please try again later.`);
    }
}

async function fetchMovieDetails(movies) {
    const detailedPromises = movies.map(async (movie) => {
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
        } catch (error) {
            return { ...movie, poster: null };
        }
    });

    allFetchedMovies = await Promise.all(detailedPromises);
}

function applyFiltersAndSort() {
    if (allFetchedMovies.length === 0) return;

    let filteredMovies = [...allFetchedMovies];
    const selectedFilter = filterType.value;
    const selectedSort = sortOptions.value;

    if (selectedFilter !== "all") {
        filteredMovies = filteredMovies.filter(movie => movie.type === selectedFilter);
    }

    if (selectedSort === "az") {
        filteredMovies.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (selectedSort === "year-desc") {
        filteredMovies.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (selectedSort === "year-asc") {
        filteredMovies.sort((a, b) => (a.year || 9999) - (b.year || 9999));
    }

    renderMovies(filteredMovies, movieContainer, false);
}

function renderMovies(movies, container, isWatchlist) {
    if (movies.length === 0) {
        const message = isWatchlist ? "Your watchlist is empty." : "No movies found matching your current filter.";
        renderEmptyState(container, message);
        return;
    }

    container.innerHTML = movies.map(movie => {
        const imageUrl = movie.poster || "https://via.placeholder.com/220x320?text=No+Poster";
        const inWatchlist = watchlist.some(item => item.id === movie.id);

        return `
            <div class="movie-card">
                <img src="${imageUrl}" alt="${movie.name || "Movie Poster"}" onerror="this.src='https://via.placeholder.com/220x320?text=No+Poster'">
                <h3 title="${movie.name || "Unknown Title"}">${movie.name || "Unknown Title"}</h3>
                <p><strong>Year:</strong> ${movie.year || 'N/A'}</p>
                <p><strong>Type:</strong> ${formatType(movie.type)}</p>
                <button 
                    class="watchlist-btn ${inWatchlist ? 'remove-btn' : 'add-btn'}" 
                    onclick="toggleWatchlist(${movie.id})">
                    ${inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                </button>
            </div>
        `;
    }).join("");
}

window.toggleWatchlist = function (id) {
    const existingIndex = watchlist.findIndex(m => m.id === id);

    if (existingIndex !== -1) {
        watchlist.splice(existingIndex, 1);
    } else {
        const movieToAdd = allFetchedMovies.find(m => m.id === id);
        if (movieToAdd) {
            watchlist.push(movieToAdd);
        }
    }

    saveWatchlist();
    renderWatchlist();
    
    if (allFetchedMovies.length > 0) {
        applyFiltersAndSort();
    }
};

function renderWatchlist() {
    renderMovies(watchlist, watchlistContainer, true);
}

function saveWatchlist() {
    localStorage.setItem("myWatchlist", JSON.stringify(watchlist));
}

function showLoading(message) {
    loadingMessage.textContent = message;
    loadingContainer.style.display = "flex";
}

function hideLoading() {
    loadingContainer.style.display = "none";
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
}

function hideError() {
    errorMessage.style.display = "none";
}

function renderEmptyState(container, message) {
    container.innerHTML = `<p class="empty-msg">${message}</p>`;
}

function formatType(type) {
    if (!type) return "Unknown";
    if (type === "tv_series") return "TV Series";
    if (type === "movie") return "Movie";
    return type.charAt(0).toUpperCase() + type.slice(1);
}