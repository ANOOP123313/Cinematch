/* ===========================
   RECOMMENDATION SYSTEM
   TMDB-first architecture with
   graceful curated fallback.
=========================== */

/* ===========================
   CONFIGURATION
   Add your TMDB API key here:
=========================== */
const TMDB_API_KEY_HARDCODED = "###################"; // Paste your TMDB API key here

const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_API_KEY = (
  TMDB_API_KEY_HARDCODED ||
  (typeof window !== "undefined" && (
    window.TMDB_API_KEY ||
    window.__TMDB_API_KEY__ ||
    window.localStorage?.getItem?.("TMDB_API_KEY") ||
    ""
  )) ||
  ""
);

const apiCache = new Map();
const requestCache = new Map();

function getPlaceholderImage(title) {
  const label = String(title || "Untitled").trim().slice(0, 28);
  const safeLabel = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#111827"/><stop offset="100%" stop-color="#1f2937"/></linearGradient></defs><rect width="600" height="900" fill="url(#g)"/><text x="300" y="470" fill="#f8fafc" font-family="Inter,system-ui,ui-sans-serif,Helvetica,Arial,sans-serif" font-size="34" font-weight="700" text-anchor="middle" dominant-baseline="middle">${safeLabel}</text><text x="300" y="520" fill="#94a3b8" font-family="Inter,system-ui,ui-sans-serif,Helvetica,Arial,sans-serif" font-size="18" text-anchor="middle" dominant-baseline="middle">Image unavailable</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/* ===========================
   CURATED LOCAL DATA (fallback)
=========================== */
const curatedData = {
  action: {
    Eng: ["The Boys", "Jack Ryan", "Daredevil", "24", "Prison Break"],
    korea: ["Vincenzo", "Taxi Driver", "Signal", "Vagabond"],
    hindi: ["Mirzapur", "Sacred Games", "Special Ops", "Family Man", "Delhi Crime"],
    tamil: ["Vikram", "Kaithi", "Master", "Enthiran", "Valimai"],
    malayalam: ["Drishyam", "Lucifer", "Minnal Murali", "Nayattu", "Driving Licence"]
  },
  comedy: {
    Eng: ["Brooklyn Nine-Nine", "The Office", "Friends", "Schitt's Creek", "Arrested Development"],
    korea: ["Welcome to Waikiki", "Strong Girl Bong-soon", "My ID is Gangnam Beauty"],
    hindi: ["Fukrey", "Hera Pheri", "Golmaal", "Andaz Apna Apna", "Chhichhore"],
    tamil: ["Soodhu Kavvum", "Inaindha Kaigal", "Naduvula Konjam Pakkatha Kaanom", "Irudhi Suttru"],
    malayalam: ["Oru Indian Pranayakadha", "Maheshinte Prathikaaram", "Thondimuthalum Driksakshiyum"]
  },
  drama: {
    Eng: ["Breaking Bad", "The Crown", "Succession", "Ozark", "Mad Men"],
    korea: ["Crash Landing on You", "Sky Castle", "Itaewon Class", "My Mister"],
    hindi: ["Panchayat", "Scam 1992", "Jamtara", "Aspirants", "TVF Pitchers"],
    tamil: ["Ponniyin Selvan", "96", "Vaanam Kottattum", "Soorarai Pottru"],
    malayalam: ["Drishyam 2", "Kumbalangi Nights", "Joji", "C U Soon", "Android Kunjappan"]
  },
  "sci-fi": {
    Eng: ["Stranger Things", "Black Mirror", "The Mandalorian", "Dark", "Westworld"],
    jap: ["Psycho Pass", "Steins;Gate", "Godzilla Minus One", "Ergo Proxy"],
    hindi: ["Koi Mil Gaya", "Ra.One", "Love Story 2050"],
    tamil: ["Enthiran", "2.0", "Ayalaan"],
    malayalam: ["Minnal Murali", "Android Kunjappan Ver 5.25"]
  },
  fantasy: {
    Eng: ["Game of Thrones", "The Witcher", "Shadow and Bone", "House of the Dragon"],
    jap: ["Attack on Titan", "Demon Slayer", "Fullmetal Alchemist"],
    hindi: ["Brahmastra", "Adipurush", "Tanhaji", "Baahubali (Hindi dub)"],
    tamil: ["Baahubali (Tamil dub)", "Kochadaiiyaan", "Ponniyin Selvan"],
    malayalam: ["Minnal Murali", "Churuli"]
  },
  romance: {
    Eng: ["Outlander", "Normal People", "Bridgerton"],
    korea: ["Business Proposal", "Our Beloved Summer", "Something in the Rain", "Reply 1988"],
    Thai: ["2gether", "Theory of Love", "Bad Buddy"],
    hindi: ["Yeh Jawaani Hai Deewani", "Jab We Met", "Kal Ho Naa Ho", "DDLJ", "Dil Dhadakne Do"],
    tamil: ["96", "Vinnaithaandi Varuvaayaa", "OK Kanmani", "Kaadhal"],
    malayalam: ["Premam", "Ustad Hotel", "Bangalore Days", "Om Shanti Oshana", "Love Action Drama"]
  },
  anime: {
    jap: ["Your Name", "One Piece", "Naruto", "Jujutsu Kaisen", "Demon Slayer", "Solo Leveling", "Haikyuu", "Death Note", "Attack on Titan", "Fullmetal Alchemist"]
  },
  horror: {
    Eng: ["The Haunting of Hill House", "Marianne", "American Horror Story", "The Terror"],
    korea: ["Sweet Home", "Kingdom", "All of Us Are Dead"],
    hindi: ["Stree", "Tumbbad", "Bhool Bhulaiyaa", "Roohi", "Pari"],
    tamil: ["Airaa", "Eeram", "Aval", "Demonte Colony", "Yavarum Nalam"],
    malayalam: ["Ezra", "Pretham", "Bhoothakaalam", "Forensic", "Friday"]
  },
  thriller: {
    Eng: ["Mindhunter", "You", "Bodyguard", "Killing Eve", "True Detective"],
    hindi: ["Andhadhun", "Badla", "A Wednesday", "Kahaani", "Special Ops"],
    tamil: ["Vikram", "Irumbu Thirai", "Ratsasan", "Thadam", "Maanagaram"],
    malayalam: ["Drishyam", "Joseph", "Forensic", "Anjaam Pathiraa", "Mumbai Police"]
  },
  documentary: {
    Eng: ["Our Planet", "The Social Dilemma", "Making a Murderer", "Wild Wild Country"],
    hindi: ["Writing with Fire", "An Insignificant Man", "The Hunt for Veerappan"],
    tamil: ["Visaranai", "Kadaisi Vivasayi"],
    malayalam: ["Aadujeevitham"]
  },
  western: {
    Eng: ["Westworld", "Yellowstone", "Deadwood", "Longmire"],
    hindi: ["Sonchiriya", "Gangs of Wasseypur", "Bandit Queen"],
    tamil: ["Kaithi", "Vikram Vedha", "Vada Chennai"],
    malayalam: ["Ee.Ma.Yau", "Thondimuthalum Driksakshiyum"]
  },
  BL: {
    Thai: ["KinnPorsche", "Not Me", "Bad Buddy", "2gether", "Dark Blue Kiss"],
    jap: ["Given", "Cherry Magic", "Absolute BL", "Old Fashion Cupcake"]
  }
};

/* ===========================
   LANGUAGE LABELS
=========================== */
const LANG_LABELS = {
  Eng: "🇺🇸 English",
  korea: "🇰🇷 Korean",
  jap: "🇯🇵 Japanese",
  Thai: "🇹🇭 Thai",
  hindi: "🇮🇳 Hindi",
  tamil: "🇮🇳 Tamil",
  malayalam: "🇮🇳 Malayalam"
};

/* ===========================
   API STRATEGY PER LANGUAGE
   Priority:
   TMDB
   ↓
   TVMaze/Jikan
   ↓
   curatedData
=========================== */
const API_STRATEGY = {
  Eng: "tvmaze",
  korea: "tvmaze",
  jap: "jikan",
  Thai: "tvmaze",
  hindi: "tmdb",
  tamil: "tmdb",
  malayalam: "tmdb"
};

const TVMAZE_LANG = {
  Eng: "English",
  korea: "Korean",
  Thai: "Thai",
  hindi: "Hindi"
};

const TVMAZE_GENRE = {
  action: "Action",
  comedy: "Comedy",
  drama: "Drama",
  "sci-fi": "Science-Fiction",
  fantasy: "Fantasy",
  romance: "Romance",
  horror: "Horror",
  thriller: "Thriller",
  documentary: "Documentary",
  western: "Western",
  anime: "Anime",
  BL: "Romance"
};

const JIKAN_GENRE_IDS = {
  action: 1,
  comedy: 4,
  drama: 8,
  "sci-fi": 24,
  fantasy: 10,
  romance: 22,
  horror: 14,
  thriller: 41,
  anime: null
};

const TMDB_GENRE_IDS = {
  action: 28,
  comedy: 35,
  drama: 18,
  "sci-fi": 878,
  fantasy: 14,
  romance: 10749,
  horror: 27,
  thriller: 53,
  documentary: 99,
  western: 37,
  BL: 10749
};

const TMDB_GENRE_LABELS = {
  28: "Action",
  35: "Comedy",
  18: "Drama",
  878: "Sci-Fi",
  14: "Fantasy",
  10749: "Romance",
  27: "Horror",
  53: "Thriller",
  99: "Documentary",
  37: "Western",
  16: "Animation"
};

const TMDB_LANG_CODES = {
  Eng: "en",
  korea: "ko",
  jap: "ja",
  Thai: "th",
  hindi: "hi",
  tamil: "ta",
  malayalam: "ml"
};

/* ===========================
   STATE
=========================== */
let selectedGenre = null;
let selectedLang = null;

/* ===========================
   INIT
=========================== */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".genre-pill").forEach((pill) => {
    pill.addEventListener("click", () => selectGenre(pill.dataset.genre, pill));
  });
});

/* ===========================
   GENRE SELECTION
=========================== */
function selectGenre(genre, pillEl) {
  selectedGenre = genre;
  selectedLang = null;
  document.querySelectorAll(".genre-pill").forEach((p) => p.classList.remove("active"));
  pillEl.classList.add("active");
  buildLangButtons(genre);
}

function buildLangButtons(genre) {
  const langRow = document.getElementById("langRow");
  const langStep = document.getElementById("langStep");
  langRow.innerHTML = "";
  if (!curatedData[genre]) return;

  langStep.style.opacity = "1";
  langStep.style.pointerEvents = "auto";

  Object.keys(curatedData[genre]).forEach((lang, i) => {
    const btn = document.createElement("button");
    btn.className = "lang-btn";
    btn.textContent = LANG_LABELS[lang] || lang;
    btn.style.animationDelay = `${i * 60}ms`;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".lang-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedLang = lang;
    });
    langRow.appendChild(btn);
  });
}

/* ===========================
   MAIN ENTRY
=========================== */
async function getRecommendations() {
  const container = document.getElementById("recommendations");
  if (!selectedGenre || !selectedLang) {
    showEmpty(container, "👆", "Pick a genre and a language first!");
    return;
  }

  showSkeletons(container, 8);

  const requestKey = `${selectedGenre}:${selectedLang}`;
  if (requestCache.has(requestKey)) {
    return;
  }

  requestCache.set(requestKey, true);

  try {
    if (selectedGenre === "anime") {
      const results = await fetchJikan();
      if (results.length) {
        renderItems(container, results, {
          title: "Anime",
          meta: `${results.length} titles from MyAnimeList · sorted by score`,
          sourceLabel: "● MyAnimeList · Free · No key",
          sourceClass: "jikan",
          itemTypeLabel: "Anime",
          itemTypeClass: "anime"
        });
      } else {
        renderCurated(container, true);
      }
      return;
    }

    const strategy = selectedLang === "korea" ? "tvmaze+tmdb" : (API_STRATEGY[selectedLang] || "curated");

    if (strategy === "tmdb") {
      const results = await fetchTMDBResults();
      if (results.length) {
        renderItems(container, results, {
          title: selectedGenre.toUpperCase(),
          meta: `${results.length} titles from TMDB · sorted by popularity`,
          sourceLabel: "● TMDB · Poster-rich results",
          sourceClass: "curated",
          itemTypeLabel: "Movie",
          itemTypeClass: "tv"
        });
      } else {
        renderCurated(container, true);
      }
      return;
    }

    if (strategy === "tvmaze+tmdb") {
      const tvResults = await fetchTVmazeResults();
      if (tvResults.length) {
        renderItems(container, tvResults, {
          title: selectedGenre.toUpperCase(),
          meta: `${tvResults.length} titles from TVmaze · sorted by rating`,
          sourceLabel: "● TVmaze · Free · No key",
          sourceClass: "tvmaze",
          itemTypeLabel: "TV",
          itemTypeClass: "tv"
        });
      } else {
        const tmdbResults = await fetchTMDBResults({ mediaType: "tv" });
        if (tmdbResults.length) {
          renderItems(container, tmdbResults, {
            title: selectedGenre.toUpperCase(),
            meta: `${tmdbResults.length} titles from TMDB · sorted by popularity`,
            sourceLabel: "● TMDB fallback · Poster-rich results",
            sourceClass: "curated",
            itemTypeLabel: "TV",
            itemTypeClass: "tv"
          });
        } else {
          renderCurated(container, true);
        }
      }
      return;
    }

    if (strategy === "tvmaze") {
      const results = await fetchTVmazeResults();
      if (results.length) {
        renderItems(container, results, {
          title: selectedGenre.toUpperCase(),
          meta: `${results.length} titles from TVmaze · sorted by rating`,
          sourceLabel: "● TVmaze · Free · No key",
          sourceClass: "tvmaze",
          itemTypeLabel: "TV",
          itemTypeClass: "tv"
        });
      } else {
        renderCurated(container, true);
      }
      return;
    }

    renderCurated(container, false);
  } catch (error) {
    console.error("Recommendation fetch failed:", error);
    renderCurated(container, true);
  } finally {
    requestCache.delete(requestKey);
  }
}

/* ===========================
   Fetch helpers
=========================== */
async function fetchJson(url) {
  const cached = apiCache.get(url);
  if (cached) {
    return cached;
  }

  const promise = fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Request failed: ${response.status} ${text}`);
      }
      return response.json();
    })
    .catch((error) => {
      apiCache.delete(url);
      throw error;
    });

  apiCache.set(url, promise);
  return promise;
}

function getTMDBParams(options = {}) {
  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    include_adult: "false",
    language: "en-US",
    sort_by: "popularity.desc",
    page: "1"
  });

  if (options.withOriginalLanguage) {
    params.set("with_original_language", options.withOriginalLanguage);
  }

  if (options.withGenres) {
    params.set("with_genres", options.withGenres);
  }

  return params;
}

async function fetchTMDBResults(options = {}) {
  if (!TMDB_API_KEY) {
    throw new Error("TMDB API key is not configured.");
  }

  const mediaType = options.mediaType || "movie";
  const langCode = TMDB_LANG_CODES[selectedLang] || "en";
  const genreId = TMDB_GENRE_IDS[selectedGenre];
  const endpoint = mediaType === "tv" ? "/discover/tv" : "/discover/movie";
  const params = getTMDBParams({
    withOriginalLanguage: langCode,
    withGenres: genreId
  });

  const url = `${TMDB_API_BASE_URL}${endpoint}?${params.toString()}`;
  const data = await fetchJson(url);
  return (data.results || [])
    .filter((item) => item.poster_path)
    .slice(0, 16)
    .map((item) => ({
      title: item.title || item.name || "Untitled",
      rating: item.vote_average ? Number(item.vote_average).toFixed(1) : null,
      summary: item.overview ? item.overview.slice(0, 160) : "",
      year: (item.release_date || item.first_air_date || "").slice(0, 4),
      posterPath: item.poster_path,
      posterUrl: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : null,
      genres: (item.genre_ids || []).slice(0, 2).map((id) => TMDB_GENRE_LABELS[id]).filter(Boolean),
      source: "tmdb"
    }));
}

async function fetchTVmazeResults() {
  const genre = TVMAZE_GENRE[selectedGenre] || selectedGenre;
  const lang = TVMAZE_LANG[selectedLang] || selectedLang;

  const res = await fetch("https://api.tvmaze.com/shows?page=0");
  if (!res.ok) {
    throw new Error("TVmaze request failed");
  }

  const allShows = await res.json();
  let results = allShows.filter((show) => {
    const matchesGenre = show.genres && show.genres.some((g) => g.toLowerCase().includes(genre.toLowerCase()));
    const matchesLang = show.language && show.language.toLowerCase() === lang.toLowerCase();
    return matchesGenre && matchesLang;
  });

  if (results.length < 4) {
    const searchRes = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(genre)}`);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const extra = searchData
        .map((entry) => entry.show)
        .filter((show) => show.language && show.language.toLowerCase() === lang.toLowerCase());
      results = [...results, ...extra];
    }
  }

  const seen = new Set();
  return results
    .filter((show) => {
      if (seen.has(show.id)) return false;
      seen.add(show.id);
      return true;
    })
    .sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0))
    .slice(0, 16)
    .map((show) => ({
      title: show.name || "Untitled",
      rating: show.rating?.average ? Number(show.rating.average).toFixed(1) : null,
      summary: show.summary ? show.summary.replace(/<[^>]+>/g, "").slice(0, 160) : "",
      year: show.premiered ? show.premiered.slice(0, 4) : "",
      posterUrl: show.image?.medium || show.image?.original || null,
      genres: (show.genres || []).slice(0, 2),
      source: "tvmaze"
    }));
}

async function fetchJikan() {
  const genreId = JIKAN_GENRE_IDS[selectedGenre];
  let url = "https://api.jikan.moe/v4/top/anime?limit=20&type=tv";
  if (genreId) {
    url = `https://api.jikan.moe/v4/anime?genres=${genreId}&order_by=score&sort=desc&limit=20&sfw=true`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Jikan request failed");
  }

  const data = await response.json();
  return (data.data || [])
    .slice(0, 16)
    .map((anime) => ({
      title: anime.title_english || anime.title || "Untitled",
      rating: anime.score ? Number(anime.score).toFixed(1) : null,
      summary: anime.synopsis ? anime.synopsis.slice(0, 160) + "…" : "",
      year: anime.aired?.from ? anime.aired.from.slice(0, 4) : "",
      posterUrl: anime.images?.jpg?.image_url || null,
      genres: (anime.genres || []).slice(0, 2).map((g) => g.name),
      source: "jikan"
    }));
}

/* ===========================
   RENDERING
=========================== */
function renderItems(container, items, options = {}) {
  const langLabel = LANG_LABELS[selectedLang] || selectedLang;
  const title = options.title || selectedGenre.toUpperCase();
  const meta = options.meta || "Recommendations";
  const sourceLabel = options.sourceLabel || "● Live results";
  const sourceClass = options.sourceClass || "curated";
  const itemTypeLabel = options.itemTypeLabel || "Title";
  const itemTypeClass = options.itemTypeClass || "tv";

  container.innerHTML = `
    <div class="reco-header"><span>${title}</span> · ${langLabel}</div>
    <div class="reco-meta">${meta}</div>
    <div class="source-pills">
      <span class="source-pill ${sourceClass}">${sourceLabel}</span>
    </div>
    <div class="reco-grid" id="recoGrid"></div>
  `;

  const grid = document.getElementById("recoGrid");

  items.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "recommend-item";
    card.style.animationDelay = `${i * 55}ms`;

    const titleText = item.title || "Untitled";
    const summary = item.summary || "";
    const rating = item.rating || null;
    const year = item.year || "";
    const genres = (item.genres || []).slice(0, 2).join(", ");
    const posterUrl = item.posterUrl || (item.posterPath ? `${TMDB_IMAGE_BASE_URL}${item.posterPath}` : null);
    const placeholderSrc = getPlaceholderImage(titleText).replace(/'/g, "\\'");
    const imageMarkup = `
      <img
        src="${posterUrl || getPlaceholderImage(titleText)}"
        alt="${escHtml(titleText)}"
        loading="lazy"
        onerror="this.onerror=null;this.src='${placeholderSrc}'"
      />
    `;

    card.innerHTML = `
      <div class="poster-wrap">
        ${imageMarkup}
        ${rating ? `<div class="rating-badge">⭐ ${rating}</div>` : ""}
        <div class="type-tag ${itemTypeClass}">${itemTypeLabel}</div>
      </div>
      <div class="card-body">
        <div class="title">${escHtml(titleText)}</div>
        ${summary ? `<div class="overview">${escHtml(summary)}</div>` : ""}
        <div class="card-footer">
          ${year ? `<span class="year-badge">${year}</span>` : "<span></span>"}
          <span class="genre-tag">${escHtml(genres || selectedGenre)}</span>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

function renderCurated(container, apiFailed = false) {
  const data = curatedData[selectedGenre]?.[selectedLang];
  if (!data || data.length === 0) {
    showEmpty(container, "🎬", "No titles found for that combo.");
    return;
  }

  const langLabel = LANG_LABELS[selectedLang] || selectedLang;
  container.innerHTML = `
    <div class="reco-header">
      <span>${selectedGenre.toUpperCase()}</span> · ${langLabel}
    </div>
    <div class="reco-meta">
      ${apiFailed ? "Showing curated picks (live data unavailable)" : "Curated picks for this language"}
    </div>
    <div class="source-pills">
      <span class="source-pill curated">● Curated picks</span>
    </div>
    <div class="reco-grid" id="recoGrid"></div>
  `;

  const grid = document.getElementById("recoGrid");
  data.forEach((title, i) => {
    const placeholderSrc = getPlaceholderImage(title).replace(/'/g, "\\'");
    const card = document.createElement("div");
    card.className = "recommend-item";
    card.style.animationDelay = `${i * 65}ms`;

    card.innerHTML = `
      <div class="poster-wrap">
        <img
          src="${getPlaceholderImage(title)}"
          alt="${escHtml(title)}"
          loading="lazy"
          onerror="this.onerror=null;this.src='${placeholderSrc}'"
        />
      </div>
      <div class="card-body">
        <div class="title">${escHtml(title)}</div>
        <div class="overview">A handpicked recommendation for ${langLabel} ${selectedGenre} fans.</div>
        <div class="card-footer">
          <span></span>
          <span class="genre-tag">${selectedGenre}</span>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

/* ===========================
   SKELETONS
=========================== */
function showSkeletons(container, count) {
  const langLabel = LANG_LABELS[selectedLang] || selectedLang;
  container.innerHTML = `
    <div class="reco-header"><span>${selectedGenre.toUpperCase()}</span> · ${langLabel}</div>
    <div class="reco-meta">Fetching live data…</div>
    <div class="reco-grid">
      ${"<div class='recommend-item skeleton'><div class='skeleton-poster'></div><div class='skeleton-body'><div class='skeleton-line medium'></div><div class='skeleton-line'></div><div class='skeleton-line short'></div></div></div>".repeat(count)}
    </div>
  `;
}

/* ===========================
   HELPERS
=========================== */
function showEmpty(container, emoji, msg) {
  container.innerHTML = `<div class="empty-state"><span class="emoji">${emoji}</span>${msg}</div>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
