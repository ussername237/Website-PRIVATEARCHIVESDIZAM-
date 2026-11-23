import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ArrowIcon from "../components/ArrowIcon.jsx";
import UndoToast from "../components/UndoToast.jsx";
import { getSession, logout } from "../lib/auth.js";
import {
  getGenreSlug,
  getMovieGenres,
  groupMoviesByGenre,
  UNKNOWN_GENRE,
} from "../lib/genres.js";
import {
  ensureStarterMovies,
  fetchCollectionVersion,
  fetchMovies,
  getCachedCollectionVersion,
  hydrateMoviePosters,
  hasOmdb,
  hasTmdb,
  loadMovies,
  saveMovies,
  searchMovies,
  fetchMovieDetails,
  fetchMovieVideos,
} from "../lib/movies.js";

const FILTERS = [
  { id: "all", label: "ALL FILM" },
  { id: "unwatched", label: "Watchlist" },
  { id: "watched", label: "Sudah ditonton" },
  { id: "favorites", label: "Favorit" },
];

const movieExtrasCache = new Map();

function getMovieExtras(movie) {
  const key = String(movie.tmdbId || movie.title);
  if (!movieExtrasCache.has(key)) {
    const request = fetchMovieDetails(movie)
      .then(async (details) => ({
        details,
        videos: await fetchMovieVideos(details.id),
      }))
      .catch((error) => {
        movieExtrasCache.delete(key);
        throw error;
      });
    movieExtrasCache.set(key, request);
  }
  return movieExtrasCache.get(key);
}

const ICONS = {
  home: <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" />,
  explore: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  watchlist: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  genres: <path d="M4 6h16M4 12h16M4 18h16" />,
  watched: <path d="m5 12 4 4L19 6" />,
  favorite: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  exit: <path d="M10 17l5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />,
  film: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4" />
    </>
  ),
};

function Icon({ name, className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {ICONS[name]}
    </svg>
  );
}
export default function Dashboard() {
  const navigate = useNavigate();
  const email = getSession()?.email || "";
  const [movies, setMovies] = useState(() => loadMovies(email));
  const [collectionLoaded, setCollectionLoaded] = useState(false);
  const [posterNotice, setPosterNotice] = useState("");
  const [saveStatus, setSaveStatus] = useState("loading");
  const [saveError, setSaveError] = useState("");
  const [signOutError, setSignOutError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [saveRetry, setSaveRetry] = useState(0);
  const [collectionRetry, setCollectionRetry] = useState(0);
  const [collectionSearch, setCollectionSearch] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [collectionGenre, setCollectionGenre] = useState("");
  const [collectionSort, setCollectionSort] = useState("added");
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [spotlightDrag, setSpotlightDrag] = useState(0);
  const [spotlightDragging, setSpotlightDragging] = useState(false);
  const [selectedUid, setSelectedUid] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [undoState, setUndoState] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newYear, setNewYear] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingTmdb, setSearchingTmdb] = useState(false);
  const [addError, setAddError] = useState("");
  const [addNotice, setAddNotice] = useState("");
  const posterRefreshInProgress = useRef(false);
  const collectionSyncInProgress = useRef(false);
  const skipNextSave = useRef(false);
  const undoTimer = useRef(null);
  const saveVersion = useRef(0);
  const spotlightPointer = useRef(null);
  const skipSpotlightClick = useRef(false);

  useEffect(() => {
    if (!addOpen) {
      setSearchingTmdb(false);
      return;
    }

    const title = newTitle.trim();
    const year = newYear.trim();
    setSearchResults([]);
    setAddError("");
    setAddNotice("");

    if (!title || (!hasTmdb && !hasOmdb)) {
      setSearchingTmdb(false);
      return;
    }

    let active = true;
    setSearchingTmdb(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await searchMovies(title);
        if (!active) return;
        const results = result.movies;
        setSearchResults(results);
        if (!results.length) {
          setAddNotice("Film atau series tidak ditemukan. Anda masih bisa menyimpannya secara manual.");
        }
      } catch (error) {
        if (active) {
          setAddError(error.message || "Pencarian film dan series gagal.");
        }
      } finally {
        if (active) setSearchingTmdb(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [addOpen, newTitle, newYear]);

  async function refreshMissingPosters(allowBeforeLoaded = false) {
    if (
      !email ||
      !hasTmdb ||
      (!collectionLoaded && !allowBeforeLoaded) ||
      posterRefreshInProgress.current
    ) {
      return;
    }
    const lastCheck = Number(localStorage.getItem(`mv_poster_check_${email}`) || 0);
    if (Date.now() - lastCheck < 6 * 60 * 60 * 1000) return;

    posterRefreshInProgress.current = true;
    try {
      const result = await hydrateMoviePosters(email);
      if (result.updated > 0 || result.unresolved > 0) {
        setMovies(loadMovies(email));
      }
      localStorage.setItem(
        `mv_poster_check_${email}`,
        String(Date.now() - (result.failed > 0 ? 5 * 60 * 60 * 1000 : 0))
      );
      if (result.failed > 0) {
        setPosterNotice(
          "Sebagian poster belum dapat diperiksa dari TMDB. Pemeriksaan akan dicoba lagi nanti."
        );
      } else if (result.unresolved > 0) {
        setPosterNotice(
          "Beberapa poster belum tersedia di TMDB. Kami akan memeriksanya kembali secara otomatis."
        );
      } else {
        setPosterNotice("");
      }
    } catch (error) {
      setPosterNotice(error.message || "Gagal memeriksa poster dari TMDB.");
      localStorage.setItem(
        `mv_poster_check_${email}`,
        String(Date.now() - 5 * 60 * 60 * 1000)
      );
    } finally {
      posterRefreshInProgress.current = false;
    }
  }

  /* ---------- load from server ---------- */
  useEffect(() => {
    if (!email) return;
    let active = true;
    fetchMovies(email)
      .then(async (serverMovies) => {
        let items = serverMovies;
        if (
          !serverMovies.length &&
          localStorage.getItem(`mv_static_migrated_${email}`) !== "1"
        ) {
          items = await ensureStarterMovies(email);
        }
        if (!active) return;
        skipNextSave.current = true;
        setMovies(items);
        setCollectionLoaded(true);
        setSaveStatus("saved");
        setSaveError("");
        return refreshMissingPosters(true);
      })
      .catch((error) => {
        if (active) {
          setSaveError(error.message || "Gagal memuat koleksi film.");
          setSaveStatus("error");
        }
      });
    return () => {
      active = false;
    };
  }, [email, collectionRetry]);

  /* ---------- keep the collection fresh across devices ---------- */
  useEffect(() => {
    if (!email || !collectionLoaded) return;
    let active = true;

    async function refreshCollection() {
      if (
        !active ||
        collectionSyncInProgress.current ||
        saveStatus === "saving" ||
        addOpen ||
        selectedUid !== null ||
        document.visibilityState === "hidden"
      ) {
        return;
      }

      collectionSyncInProgress.current = true;
      try {
        const cachedVersion = getCachedCollectionVersion(email);
        const remoteVersion = await fetchCollectionVersion(email);
        if (!active) return;
        if (cachedVersion !== null && remoteVersion.version === cachedVersion) {
          return;
        }

        const latestMovies = await fetchMovies(email);
        if (!active) return;
        setMovies((currentMovies) =>
          JSON.stringify(currentMovies) === JSON.stringify(latestMovies)
            ? currentMovies
            : latestMovies
        );
        setSaveError("");
        setSaveStatus("saved");
      } catch (error) {
        if (!active) return;
        setSaveError(error.message || "Gagal menyinkronkan koleksi.");
        setSaveStatus("error");
      } finally {
        collectionSyncInProgress.current = false;
      }
    }

    const interval = window.setInterval(refreshCollection, 10000);
    window.addEventListener("focus", refreshCollection);
    document.addEventListener("visibilitychange", refreshCollection);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshCollection);
      document.removeEventListener("visibilitychange", refreshCollection);
    };
  }, [email, collectionLoaded, saveStatus, addOpen, selectedUid]);

  /* ---------- periodic poster refresh ---------- */
  useEffect(() => {
    if (!email || !hasTmdb || !collectionLoaded) return;
    const refreshIfDue = () => {
      const lastCheck = Number(localStorage.getItem(`mv_poster_check_${email}`) || 0);
      if (Date.now() - lastCheck >= 6 * 60 * 60 * 1000) refreshMissingPosters();
    };
    const interval = window.setInterval(refreshIfDue, 60 * 60 * 1000);
    document.addEventListener("visibilitychange", refreshIfDue);
    window.addEventListener("focus", refreshIfDue);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfDue);
      window.removeEventListener("focus", refreshIfDue);
    };
  }, [email, collectionLoaded]);

  /* ---------- debounced save ---------- */
  useEffect(() => {
    if (!email || !collectionLoaded) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const version = ++saveVersion.current;
    setSaveStatus("saving");
    const timeout = window.setTimeout(() => {
      saveMovies(email, movies)
        .then(() => {
          if (saveVersion.current === version) {
            setSaveStatus("saved");
            setSaveError("");
          }
        })
        .catch((error) => {
          if (saveVersion.current !== version) return;
          setSaveStatus("error");
          setSaveError(error.message || "Gagal menyimpan koleksi ke server.");
        });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [movies, email, collectionLoaded, saveRetry]);

  useEffect(() => () => window.clearTimeout(undoTimer.current), []);

  useEffect(() => {
    if (!email) return;
    function syncMovies(event) {
      if (collectionLoaded && event.key === `mv_movies_${email}`) {
        setMovies(loadMovies(email));
      }
    }
    window.addEventListener("storage", syncMovies);
    return () => window.removeEventListener("storage", syncMovies);
  }, [email, collectionLoaded]);

  /* ---------- modal: Esc to close + lock body scroll ---------- */
  const modalOpen = selectedUid !== null || addOpen;
  useEffect(() => {
    if (!modalOpen) return;
    const body = document.body;
    const root = document.documentElement;
    const scrollY = window.scrollY;
    const previous = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
      rootOverflow: root.style.overflow,
      rootOverscrollBehavior: root.style.overscrollBehavior,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    function onKey(event) {
      if (event.key !== "Escape") return;
      if (addOpen) setAddOpen(false);
      else setSelectedUid(null);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.left = previous.bodyLeft;
      body.style.right = previous.bodyRight;
      body.style.width = previous.bodyWidth;
      body.style.overflow = previous.bodyOverflow;
      body.style.paddingRight = previous.bodyPaddingRight;
      root.style.overflow = previous.rootOverflow;
      root.style.overscrollBehavior = previous.rootOverscrollBehavior;
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", onKey);
    };
  }, [modalOpen, addOpen]);

  /* ---------- derived data ---------- */
  const watchedCount = useMemo(() => movies.filter((m) => m.watched).length, [movies]);
  const unwatchedCount = movies.length - watchedCount;
  const favoriteCount = useMemo(() => movies.filter((m) => m.favorite).length, [movies]);
  const genreGroups = useMemo(() => groupMoviesByGenre(movies), [movies]);
  const availableGenres = useMemo(() => {
    const genres = new Set(movies.flatMap(getMovieGenres));
    if (movies.some((movie) => getMovieGenres(movie).length === 0)) {
      genres.add(UNKNOWN_GENRE);
    }
    return [...genres].sort((genreA, genreB) => genreA.localeCompare(genreB, "id"));
  }, [movies]);
  const watchedPercent = movies.length ? Math.round((watchedCount / movies.length) * 100) : 0;
  const activeSpotlightIndex = movies.length ? spotlightIndex % movies.length : 0;
  const spotlightMovie = movies[activeSpotlightIndex] || null;
  const spotlightSlots = movies.length > 1
    ? [-1, 0, 1]
        .map((offset) => ({
          offset,
          index: (activeSpotlightIndex + offset + movies.length) % movies.length,
        }))
        .filter((slot, index, slots) =>
          slots.findIndex((candidate) => candidate.index === slot.index) === index
        )
    : spotlightMovie ? [{ offset: 0, index: activeSpotlightIndex }] : [];

  const visibleMovies = useMemo(() => {
    const query = collectionSearch.trim().toLowerCase();
    const filtered = movies.filter((movie) => {
      const matchesQuery =
        !query ||
        movie.title.toLowerCase().includes(query) ||
        String(movie.year || movie.expectedYear || "").includes(query) ||
        String(movie.note || "").toLowerCase().includes(query) ||
        getMovieGenres(movie).some((genre) => genre.toLowerCase().includes(query));
      const matchesFilter =
        collectionFilter === "all" ||
        (collectionFilter === "watched" && movie.watched) ||
        (collectionFilter === "unwatched" && !movie.watched) ||
        (collectionFilter === "favorites" && movie.favorite);
      const movieGenres = getMovieGenres(movie);
      const matchesGenre =
        !collectionGenre ||
        (collectionGenre === UNKNOWN_GENRE
          ? movieGenres.length === 0
          : movieGenres.includes(collectionGenre));
      return matchesQuery && matchesFilter && matchesGenre;
    });
    const yearOf = (m) => String(m.year || m.expectedYear || "");
    return filtered.sort((a, b) => {
      if (collectionSort === "title-asc") return a.title.localeCompare(b.title, "id");
      if (collectionSort === "title-desc") return b.title.localeCompare(a.title, "id");
      if (collectionSort === "year-desc") return yearOf(b).localeCompare(yearOf(a));
      if (collectionSort === "year-asc") return yearOf(a).localeCompare(yearOf(b));
      return movies.indexOf(a) - movies.indexOf(b);
    });
  }, [movies, collectionSearch, collectionFilter, collectionGenre, collectionSort]);

  const selectedMovie = useMemo(
    () => movies.find((m) => m.uid === selectedUid) || null,
    [movies, selectedUid]
  );
  const activeFilterLabel = FILTERS.find((f) => f.id === collectionFilter)?.label;

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setSignOutError(error.message || "Gagal keluar. Coba lagi.");
    } finally {
      setSigningOut(false);
    }
  }

  /* ---------- actions ---------- */
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToList(filter) {
    setCollectionFilter(filter);
    document.getElementById("collection-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function focusCollectionSearch() {
    goToList("all");
    window.setTimeout(() => {
      document.getElementById("collection-search")?.focus({ preventScroll: true });
    }, 250);
  }

  function moveSpotlight(direction) {
    if (movies.length < 2) return;
    setSpotlightIndex((current) => (current + direction + movies.length) % movies.length);
  }

  function startSpotlightDrag(event) {
    if (event.button !== 0 || movies.length < 2) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    spotlightPointer.current = {
      id: event.pointerId,
      startX: event.clientX,
      uid: event.currentTarget.dataset.uid,
    };
    setSpotlightDragging(true);
  }

  function updateSpotlightDrag(event) {
    if (spotlightPointer.current?.id !== event.pointerId) return;
    const distance = event.clientX - spotlightPointer.current.startX;
    setSpotlightDrag(Math.max(-180, Math.min(180, distance)));
  }

  function endSpotlightDrag(event) {
    if (spotlightPointer.current?.id !== event.pointerId) return;
    const distance = event.clientX - spotlightPointer.current.startX;
    if (Math.abs(distance) > 48) {
      moveSpotlight(distance < 0 ? 1 : -1);
      skipSpotlightClick.current = {
        uid: spotlightPointer.current.uid,
        expires: Date.now() + 500,
      };
    }
    spotlightPointer.current = null;
    setSpotlightDrag(0);
    setSpotlightDragging(false);
  }

  function cancelSpotlightDrag() {
    spotlightPointer.current = null;
    setSpotlightDrag(0);
    setSpotlightDragging(false);
  }

  function updateMovie(uid, updates) {
    if (!collectionLoaded) return;
    setMovies((current) =>
      current.map((movie) => (movie.uid === uid ? { ...movie, ...updates } : movie))
    );
  }

  function markAllAsFavorite() {
    if (!collectionLoaded) return;
    setMovies((current) =>
      current.map((movie) =>
        movie.favorite ? movie : { ...movie, favorite: true }
      )
    );
  }

  function markAllAsWatched() {
    if (!collectionLoaded) return;
    setMovies((current) =>
      current.map((movie) =>
        movie.watched ? movie : { ...movie, watched: true }
      )
    );
  }

  function removeMovie(movie) {
    if (!collectionLoaded) return;
    const originalIndex = movies.findIndex((item) => item.uid === movie.uid);
    setUndoState({ movie, index: originalIndex, key: Date.now() });
    setSelectedUid(null);
    setMovies((current) => current.filter((item) => item.uid !== movie.uid));
  }

  function undoRemoveMovie() {
    if (!undoState || !collectionLoaded) return;
    const { movie, index } = undoState;
    setMovies((current) => {
      if (current.some((item) => item.uid === movie.uid)) return current;
      const next = [...current];
      const insertAt = index >= 0 && index <= next.length ? index : 0;
      next.splice(insertAt, 0, movie);
      return next;
    });
    setUndoState(null);
  }

  function openAdd() {
    setAddError("");
    setAddNotice("");
    setNewTitle("");
    setNewYear("");
    setSearchResults([]);
    setAddOpen(true);
  }

  function addMovie(movie) {
    if (!collectionLoaded) return;
    const duplicate = movies.some(
      (item) =>
        item.tmdbId === movie.tmdbId ||
        (item.title.toLowerCase() === movie.title.toLowerCase() && item.year === movie.year)
    );
    if (duplicate) {
      setAddError("Film tersebut sudah ada di koleksi.");
      return;
    }
    const nextMovie = {
      ...movie,
      uid: Date.now(),
      watched: false,
      favorite: false,
      personalRating: 0,
      personalRatingScale: 10,
    };
    setMovies([nextMovie, ...movies]);
    setAddError("");
    setAddNotice(
      movie.poster
        ? `${movie.title} ditambahkan dengan poster TMDB.`
        : `${movie.title} ditambahkan, tetapi TMDB belum menyediakan posternya.`
    );
  }

  async function addManualMovie() {
    if (!collectionLoaded) return;
    const title = newTitle.trim();
    const year = newYear.trim();
    if (!title) {
      setAddError("Masukkan judul film terlebih dahulu.");
      return;
    }
    const fullTitle = year ? `${title} ${year}` : title;
    const duplicate = movies.some(
      (item) =>
        normalizeMovieTitle(item.title) === normalizeMovieTitle(title) &&
        (!year || item.year === year || item.expectedYear === year)
    );
    if (duplicate) {
      setAddError("Film tersebut sudah ada di koleksi.");
      return;
    }
    const slug = fullTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const nextMovie = {
      uid: Date.now(),
      tmdbId: `manual-${slug}`,
      title,
      year: "",
      expectedYear: year,
      releaseDate: "",
      lang: "",
      rating: null,
      personalRating: 0,
      personalRatingScale: 10,
      poster: null,
      backdrop: null,
      overview: "",
      genres: [],
      watched: false,
      favorite: false,
      metadataSource: "",
    };
    const next = [nextMovie, ...movies];
    setMovies(next);
    setSearchResults([]);
    setNewTitle("");
    setNewYear("");
    setAddError("");
    if (!hasTmdb && !hasOmdb) {
      setAddNotice(`${fullTitle} ditambahkan. Tambahkan VITE_TMDB_KEY atau VITE_OMDB_KEY untuk mendeteksi poster.`);
      return;
    }
    try {
      const result = await searchMovies(title);
      const results = result.movies;
      const normalizedTitle = normalizeMovieTitle(title);
      const match = results.find(
        (movie) =>
          normalizeMovieTitle(movie.title) === normalizedTitle && (!year || movie.year === year)
      );
      if (!match) {
        setAddNotice(`${fullTitle} tersimpan. Belum ditemukan kecocokan judul/tahun yang tepat.`);
        return;
      }
      const matchedMovie = {
        ...match,
        uid: nextMovie.uid,
        watched: false,
        favorite: false,
        personalRating: 0,
        personalRatingScale: 10,
      };
      setMovies(next.map((movie) => (movie.uid === nextMovie.uid ? matchedMovie : movie)));
      setAddNotice(
        `${match.poster
          ? `${fullTitle} ditambahkan dan poster TMDB berhasil ditemukan.`
          : `${fullTitle} cocok dengan data TMDB, tetapi posternya belum tersedia.`}${
          match.genres?.length
            ? ` Genre otomatis: ${match.genres.join(", ")}.`
            : " Genre belum tersedia dari sumber film."
        }`
      );
    } catch (error) {
      setAddError(
        `${fullTitle} tersimpan, tetapi pencarian posternya gagal: ${error.message || "kesalahan TMDB."}`
      );
    }
  }

  const stats = [
    { label: "Total koleksi", value: movies.length, filter: "all", detail: "Film tersimpan", icon: "film" },
    { label: "Sudah ditonton", value: watchedCount, filter: "watched", detail: `${watchedPercent}% dari koleksi`, icon: "watched" },
    { label: "Watchlist", value: unwatchedCount, filter: "unwatched", detail: "Belum ditonton", icon: "watchlist" },
    { label: "Favorit", value: favoriteCount, filter: "favorites", detail: "Pilihan spesialmu", icon: "favorite" },
  ];

  const navItems = [
    { id: "all", label: "HOME", icon: "home", onClick: () => { setCollectionFilter("all"); scrollToTop(); }, active: collectionFilter === "all" },
    { id: "explore", label: "SEARCH", icon: "explore", onClick: focusCollectionSearch, active: false },
    { id: "unwatched", label: "WATCHLIST", icon: "watchlist", onClick: () => goToList("unwatched"), active: collectionFilter === "unwatched" },
    { id: "favorites", label: "FAV", icon: "favorite", onClick: () => goToList("favorites"), active: collectionFilter === "favorites" },
    { id: "genres", label: "GENRE", icon: "genres", onClick: () => navigate("/genres"), active: false },
  ];

  const initial = (email[0] || "A").toUpperCase();
  const saveLabel =
    saveStatus === "saving" ? "Menyimpan…"
    : saveStatus === "error" ? (collectionLoaded ? "Gagal menyimpan" : "Gagal memuat")
    : saveStatus === "loading" ? "Memuat koleksi…"
    : "Tersimpan";

  return (
    <div className={"darchive-dashboard min-h-screen overflow-x-clip bg-[#0B1F4B] text-[#F5F3EE]" + (modalOpen ? " is-modal-open" : "")}>
      <div className="dashboard-watermark" aria-hidden="true">
        <span>LAZIR</span>
        <span>LAZIAF</span>
        <span>DIZAM</span>
      </div>
      {/* ===== Sidebar (laptop) ===== */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[#F5F3EE]/15 bg-[#0B1F4B] px-4 py-6 lg:flex">
        <button
          type="button"
          onClick={scrollToTop}
          className="da-brand-link mb-8 flex items-center gap-3 rounded-xl px-2 py-1 text-left"
        >
          <BrandMonogram />
          <span className="min-w-0 text-[11px] font-semibold leading-tight tracking-[0.12em]">
            <span className="block">PRIVATE ARCHIVES</span>
            <span className="mt-1 block text-[#FF8A81]">DIZAM</span>
          </span>
        </button>
        <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              aria-current={item.active ? "page" : undefined}
              className={
                "da-nav-action flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition " +
                (item.active
                  ? "bg-[#FF5A4F]/25 text-[#F5F3EE]"
                  : "text-[#F5F3EE]/65 hover:bg-[#F5F3EE]/[0.06] hover:text-[#F5F3EE]")
              }
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          onClick={openAdd}
          className="da-add-film mt-auto flex items-center justify-center gap-2 rounded-xl bg-[#FF5A4F] px-4 py-3 text-sm font-medium transition hover:brightness-125"
        >
          <Icon name="plus" className="h-4 w-4" />
          Tambah film
        </button>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="group mt-3 flex items-center justify-center gap-2 rounded-xl border border-[#F5F3EE]/15 bg-[#F5F3EE]/[0.035] px-4 py-2.5 text-xs font-semibold tracking-[0.08em] text-[#F5F3EE]/60 backdrop-blur transition duration-300 hover:border-[#FF5A4F]/35 hover:bg-[#FF5A4F]/10 hover:text-[#F5F3EE]"
          aria-label="Keluar"
        >
          <Icon name="exit" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          Keluar
        </button>
      </aside>

      <div className="dashboard-content lg:pl-60">
        {/* ===== Header ===== */}
        <header className="sticky top-0 z-20 border-b border-[#F5F3EE]/15 bg-[#0B1F4B]/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
            <button type="button" onClick={scrollToTop} aria-label="Kembali ke atas" className="lg:hidden">
              <BrandMonogram />
            </button>
            <div className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-xs font-semibold tracking-[0.1em] sm:text-sm">
                PRIVATE ARCHIVES
              </span>
              <span className="mt-1 block text-[10px] font-semibold tracking-[0.18em] text-[#FF8A81]">
                DIZAM
              </span>
            </div>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="group grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#F5F3EE]/15 bg-[#F5F3EE]/[0.04] text-[#F5F3EE]/65 backdrop-blur transition duration-300 hover:border-[#FF5A4F]/40 hover:bg-[#FF5A4F]/12 hover:text-[#F5F3EE] lg:hidden"
              aria-label="Keluar"
              title="Keluar"
            >
              <Icon name="exit" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          </div>
        </header>

        {signOutError && (
          <p role="alert" className="mx-auto max-w-6xl px-4 pt-3 text-sm text-[#FFABA3] sm:px-6">
            {signOutError}
          </p>
        )}

        <main className="da-dashboard-main mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          {/* ===== Stats ===== */}
          <section aria-label="Statistik koleksi" className="da-stat-overview grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => {
              const active = collectionFilter === stat.filter;
              return (
                <button
                  key={stat.filter}
                  type="button"
                  aria-pressed={active}
                  onClick={() => goToList(stat.filter)}
                  className={
                    "da-stat-card min-w-0 rounded-2xl border p-4 text-left transition duration-300 hover:-translate-y-0.5 sm:p-5 " +
                    (active
                      ? "border-[#F5F3EE]/40 bg-[#FF5A4F]/20"
                      : "border-[#F5F3EE]/15 bg-[#F5F3EE]/[0.04] hover:border-[#F5F3EE]/30")
                  }
                >
                  <span className="flex items-center justify-between gap-2 text-xs text-[#F5F3EE]/65">
                    <span className="truncate">{stat.label}</span>
                    <Icon name={stat.icon} className="h-4 w-4 shrink-0" />
                  </span>
                  <AnimatedNumber
                    value={stat.value}
                    className="mt-3 block text-3xl font-semibold tabular-nums sm:text-4xl"
                  />
                  <span className="mt-1 block truncate text-[11px] text-[#F5F3EE]/50">{stat.detail}</span>
                </button>
              );
            })}
          </section>

          {/* ===== Cinematic interactive spotlight ===== */}
          {spotlightMovie && (
            <section
              className="da-spotlight da-featured-showcase mt-8 overflow-hidden rounded-[1.75rem] border border-[#F5F3EE]/15"
              aria-label="Film pilihan"
            >
              {spotlightMovie.backdrop && (
                <img
                  className="da-spotlight-backdrop"
                  src={spotlightMovie.backdrop}
                  alt=""
                  aria-hidden="true"
                />
              )}
              <div className="da-spotlight-content">
                <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 sm:px-7 sm:pt-7">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#F5F3EE]/65">
                      lazirlaziafdizam
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                      ARCHIVES KAMU
                    </h2>
                  </div>
                  <span className="rounded-full border border-[#F5F3EE]/20 bg-[#0B1F4B]/45 px-3 py-1.5 text-xs text-[#F5F3EE]/80 backdrop-blur">
                    Seret poster untuk menjelajah
                  </span>
                </div>

                <div
                  className={"da-carousel-stage" + (spotlightDragging ? " is-dragging" : "")}
                  tabIndex={0}
                  aria-label="Carousel film. Gunakan tombol panah kiri atau kanan."
                  onKeyDown={(event) => {
                    if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      moveSpotlight(-1);
                    } else if (event.key === "ArrowRight") {
                      event.preventDefault();
                      moveSpotlight(1);
                    }
                  }}
                >
                  {spotlightSlots.map(({ offset, index }) => {
                    const movie = movies[index];
                    const carouselImage = movie.backdrop || movie.poster;
                    const isActive = offset === 0;
                    const distance = offset * 31;
                    const dragged = isActive ? spotlightDrag : spotlightDrag * 0.12;
                    return (
                      <button
                        key={movie.uid}
                        type="button"
                        aria-label={isActive ? `Lihat detail ${movie.title}` : `Pilih ${movie.title}`}
                        aria-current={isActive ? "true" : undefined}
                        data-uid={movie.uid}
                        onPointerDown={isActive ? startSpotlightDrag : undefined}
                        onPointerMove={isActive ? updateSpotlightDrag : undefined}
                        onPointerUp={isActive ? endSpotlightDrag : undefined}
                        onPointerCancel={isActive ? cancelSpotlightDrag : undefined}
                        onClick={() => {
                          const skippedClick = skipSpotlightClick.current;
                          if (isActive && skippedClick?.uid === String(movie.uid) && skippedClick.expires > Date.now()) {
                            skipSpotlightClick.current = null;
                            return;
                          }
                          if (skippedClick && skippedClick.expires <= Date.now()) {
                            skipSpotlightClick.current = null;
                          }
                          if (isActive) setSelectedUid(movie.uid);
                          else setSpotlightIndex(index);
                        }}
                        className={
                          "da-carousel-card" +
                          (isActive ? " is-active" : " is-side") +
                          (offset < 0 ? " is-left" : "") +
                          (offset > 0 ? " is-right" : "")
                        }
                        style={{
                          "--card-offset":
                            offset < 0 ? "max(-31vw, -250px)" : offset > 0 ? "min(31vw, 250px)" : "0px",
                          "--card-drag": `${dragged}px`,
                          "--card-rotation": `${offset * -11}deg`,
                        }}
                      >
                        <span className="da-carousel-poster">
                          {carouselImage ? (
                            <img
                              src={carouselImage.replace("/w1280/", "/w780/").replace("/w500/", "/w342/")}
                              alt={`Poster ${movie.title}`}
                              draggable="false"
                            />
                          ) : (
                            <span className="grid h-full place-items-center p-5 text-center text-sm text-[#F5F3EE]/70">
                              {movie.title}
                            </span>
                          )}
                          <span className="da-carousel-shade" />
                          {movie.favorite && <span className="da-carousel-favorite">★ Favorit</span>}
                          <span className="da-carousel-caption">
                            <strong>{movie.title}</strong>
                            <small>{movie.year || movie.expectedYear || "Tahun tidak diketahui"}</small>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="da-carousel-controls">
                  <button
                    type="button"
                    className="da-carousel-arrow"
                    onClick={() => moveSpotlight(-1)}
                    disabled={movies.length < 2}
                    aria-label="Film sebelumnya"
                  >
                    <ArrowIcon direction="left" className="h-4 w-4" />
                  </button>
                  <div className="da-carousel-progress" aria-live="polite">
                    <span className="da-carousel-count">
                      {String(activeSpotlightIndex + 1).padStart(2, "0")}
                      <span> / {String(movies.length).padStart(2, "0")}</span>
                    </span>
                    <span
                      className="da-carousel-track"
                      role="progressbar"
                      aria-label="Posisi film"
                      aria-valuemin={1}
                      aria-valuemax={movies.length}
                      aria-valuenow={activeSpotlightIndex + 1}
                    >
                      <span style={{ width: `${((activeSpotlightIndex + 1) / movies.length) * 100}%` }} />
                    </span>
                  </div>
                  <button
                    type="button"
                    className="da-carousel-arrow"
                    onClick={() => moveSpotlight(1)}
                    disabled={movies.length < 2}
                    aria-label="Film berikutnya"
                  >
                    <ArrowIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ===== Collection ===== */}
          <section id="collection-list" className="da-collection-section mt-10 scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{activeFilterLabel}</h1>
                <p className="mt-1 text-xs text-[#F5F3EE]/55" aria-live="polite">
                  {collectionSearch.trim() || collectionFilter !== "all" || collectionGenre
                    ? `Menampilkan ${visibleMovies.length} dari ${movies.length} film`
                    : `${movies.length} film dalam koleksi`}
                  {collectionGenre ? ` · Genre: ${collectionGenre}` : ""}
                  {" · "}
                  <span className={saveStatus === "error" ? "text-[#F5F3EE]" : ""} role="status">{saveLabel}</span>
                </p>
              </div>
              <label>
                <span className="sr-only">Urutkan koleksi</span>
                <select
                  value={collectionSort}
                  onChange={(event) => setCollectionSort(event.target.value)}
                  className="rounded-xl border border-[#F5F3EE]/15 bg-[#0B1F4B] px-3 py-2 text-sm outline-none"
                >
                  <option value="added">Urutan ditambahkan</option>
                  <option value="title-asc">Judul: A ke Z</option>
                  <option value="title-desc">Judul: Z ke A</option>
                  <option value="year-desc">Tahun: terbaru</option>
                  <option value="year-asc">Tahun: terlama</option>
                </select>
              </label>
            </div>

            <label className="relative mt-4 block">
              <span className="sr-only">Cari di koleksi</span>
              <Icon name="explore" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F5F3EE]/50" />
              <input
                id="collection-search"
                value={collectionSearch}
                onChange={(event) => setCollectionSearch(event.target.value)}
                placeholder="Cari judul, tahun, genre, atau catatan"
                className="w-full rounded-xl border border-[#F5F3EE]/15 bg-[#F5F3EE]/[0.04] py-3 pl-10 pr-3 text-sm outline-none placeholder:text-[#F5F3EE]/40"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter koleksi">
              {FILTERS.map((filter) => {
                const active = collectionFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCollectionFilter(filter.id)}
                    className={
                      "da-filter-chip rounded-full border px-4 py-1.5 text-sm transition " +
                      (active
                        ? "border-[#FF5A4F] bg-[#FF5A4F] text-[#F5F3EE]"
                        : "border-[#F5F3EE]/20 text-[#F5F3EE]/75 hover:border-[#F5F3EE]/45")
                    }
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <section aria-label="Genre film" className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold tracking-[0.12em] text-[#F5F3EE]/60">
                  GENRE FILM
                </h2>
                <button
                  type="button"
                  onClick={() => navigate("/genres")}
                  className="text-xs text-[#FF8A81] transition hover:text-[#F5F3EE]"
                >
                  Semua genre
                </button>
              </div>
              {genreGroups.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {genreGroups.map(([genre, genreMovies]) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => navigate(`/genres/${getGenreSlug(genre)}`)}
                      className="rounded-full border border-[#F5F3EE]/20 px-3 py-1.5 text-xs text-[#F5F3EE]/80 transition hover:border-[#FF5A4F] hover:bg-[#FF5A4F]/15 hover:text-[#F5F3EE]"
                    >
                      {genre}
                      <span className="ml-1.5 text-[#F5F3EE]/45">{genreMovies.length}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#F5F3EE]/45">
                  Genre akan muncul setelah film tersimpan.
                </p>
              )}
            </section>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="collection-genre">
                Filter berdasarkan genre
              </label>
              <select
                id="collection-genre"
                value={collectionGenre}
                onChange={(event) => setCollectionGenre(event.target.value)}
                className="min-h-10 rounded-full border border-[#F5F3EE]/20 bg-[#0B1F4B] px-4 py-2 text-sm text-[#F5F3EE] outline-none focus:border-[#FF5A4F]"
              >
                <option value="">Semua genre</option>
                {availableGenres.map((genre) => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => navigate("/genres")}
                className="min-h-10 rounded-full border border-[#F5F3EE]/20 px-4 py-2 text-sm text-[#F5F3EE]/75 transition hover:border-[#FF5A4F]/60 hover:text-[#F5F3EE]"
              >
                Lihat halaman genre
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Aksi massal koleksi">
              <button
                type="button"
                onClick={markAllAsFavorite}
                disabled={!collectionLoaded || movies.length === 0 || favoriteCount === movies.length}
                className="min-h-11 rounded-xl border border-[#F5F3EE]/20 px-4 py-2 text-sm font-medium transition hover:border-[#FF8A81] hover:bg-[#FF5A4F]/10 disabled:cursor-not-allowed disabled:opacity-45"
              >
                ★ Favoritkan semua film
              </button>
              <button
                type="button"
                onClick={markAllAsWatched}
                disabled={!collectionLoaded || movies.length === 0 || watchedCount === movies.length}
                className="min-h-11 rounded-xl border border-[#F5F3EE]/20 px-4 py-2 text-sm font-medium transition hover:border-[#FF8A81] hover:bg-[#FF5A4F]/10 disabled:cursor-not-allowed disabled:opacity-45"
              >
                ✓ Tandai semua ditonton
              </button>
            </div>
            <p className="mt-2 text-xs text-[#F5F3EE]/50">
              Aksi ini berlaku untuk seluruh koleksi, bukan hanya hasil filter.
            </p>

            {saveStatus === "error" && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#FF5A4F] bg-[#FF5A4F]/15 px-4 py-3">
                <p className="text-sm">{saveError || "Koleksi belum berhasil disimpan."}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSaveError("");
                    if (collectionLoaded) {
                      setSaveRetry((c) => c + 1);
                    } else {
                      setSaveStatus("loading");
                      setCollectionRetry((c) => c + 1);
                    }
                  }}
                  className="rounded-full border border-[#F5F3EE]/30 px-3 py-1.5 text-xs transition hover:bg-[#F5F3EE]/10"
                >
                  {collectionLoaded ? "Coba simpan lagi" : "Muat ulang"}
                </button>
              </div>
            )}

            {posterNotice && (
              <p className="mt-4 rounded-xl border border-[#F5F3EE]/15 bg-[#F5F3EE]/[0.04] px-4 py-3 text-xs text-[#F5F3EE]/70">
                {posterNotice}
              </p>
            )}

            {visibleMovies.length > 0 ? (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
                {visibleMovies.map((movie, index) => (
                  <MovieCard
                    key={movie.uid}
                    movie={movie}
                    eager={index < 5}
                    onOpen={() => setSelectedUid(movie.uid)}
                    onToggleFavorite={() => updateMovie(movie.uid, { favorite: !movie.favorite })}
                    onToggleWatched={() => updateMovie(movie.uid, { watched: !movie.watched })}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-[#F5F3EE]/20 p-8 text-center">
                <p className="text-sm text-[#F5F3EE]/70">
                  {movies.length === 0
                    ? "Koleksi masih kosong. Tambahkan film pertamamu."
                    : "Tidak ada film yang cocok dengan pencarian atau filter ini."}
                </p>
                <button
                  type="button"
                  onClick={movies.length === 0 ? openAdd : () => { setCollectionSearch(""); setCollectionFilter("all"); setCollectionGenre(""); }}
                  className="mt-4 rounded-full bg-[#FF5A4F] px-5 py-2 text-sm transition hover:brightness-125"
                >
                  {movies.length === 0 ? "Tambah film" : "Reset filter"}
                </button>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ===== Bottom navigation (HP) ===== */}
      <nav
        aria-label="Navigasi utama"
        className="da-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 items-center border-t border-[#F5F3EE]/15 bg-[#0B1F4B]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"
      >
        {navItems.slice(0, 2).map((item) => (
          <BottomNavButton key={item.id} item={item} />
        ))}
        <button
          type="button"
          onClick={openAdd}
          aria-label="Tambah film"
          className="da-add-button da-nav-action mx-auto -mt-6 grid h-12 w-12 place-items-center rounded-full border-4 border-[#0B1F4B] bg-[#FF5A4F] shadow-lg"
        >
          <Icon name="plus" className="h-5 w-5" />
        </button>
        {navItems.slice(2).map((item) => (
          <BottomNavButton key={item.id} item={item} />
        ))}
      </nav>

      {/* ===== Undo toast ===== */}
      {undoState && (
        <UndoToast
          key={undoState.key || undoState.movie.uid}
          message={`“${undoState.movie.title}” dihapus dari koleksi.`}
          onUndo={undoRemoveMovie}
          onDismiss={() => setUndoState(null)}
          duration={4000}
        />
      )}

      {/* ===== Detail modal ===== */}
      {selectedMovie && (
        <ModalShell onClose={() => setSelectedUid(null)} label={selectedMovie.title} wide>
          <div className="grid gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
            <div className="mx-auto w-40 sm:w-full">
              <div className="aspect-[2/3] overflow-hidden rounded-xl border border-[#F5F3EE]/15 bg-[#F5F3EE]/[0.05]">
                {selectedMovie.poster ? (
                  <img src={selectedMovie.poster} alt={`Poster ${selectedMovie.title}`} className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full place-items-center p-3 text-center text-xs text-[#F5F3EE]/60">{selectedMovie.title}</span>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight">{selectedMovie.title}</h2>
              <p className="mt-1 text-sm text-[#F5F3EE]/60">
                {selectedMovie.year || selectedMovie.expectedYear || "Tahun tidak diketahui"}
                {selectedMovie.rating ? ` · ★ ${selectedMovie.rating} TMDB` : ""}
              </p>
              {selectedMovie.genres?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedMovie.genres.map((genre, i) => (
                    <span key={`${genre.id ?? genre}-${i}`} className="rounded-full border border-[#F5F3EE]/20 px-2.5 py-0.5 text-xs text-[#F5F3EE]/80">
                      {genre.name ?? genre}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-4 text-sm leading-relaxed text-[#F5F3EE]/80">
                {selectedMovie.overview || "Sinopsis belum tersedia."}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={Boolean(selectedMovie.watched)}
                  onClick={() => updateMovie(selectedMovie.uid, { watched: !selectedMovie.watched })}
                  className={"rounded-full border px-4 py-2 text-sm transition " + (selectedMovie.watched ? "border-[#FF5A4F] bg-[#FF5A4F]" : "border-[#F5F3EE]/25 hover:bg-[#F5F3EE]/10")}
                >
                  {selectedMovie.watched ? "✓ Sudah ditonton" : "Tandai ditonton"}
                </button>
                <button
                  type="button"
                  aria-pressed={Boolean(selectedMovie.favorite)}
                  onClick={() => updateMovie(selectedMovie.uid, { favorite: !selectedMovie.favorite })}
                  className={"rounded-full border px-4 py-2 text-sm transition " + (selectedMovie.favorite ? "border-[#F5F3EE]/60 bg-[#F5F3EE]/15" : "border-[#F5F3EE]/25 hover:bg-[#F5F3EE]/10")}
                >
                  {selectedMovie.favorite ? "★ Favorit" : "☆ Favoritkan"}
                </button>
              </div>

              {selectedMovie.watched && (
                <PersonalRating
                  value={selectedMovie.personalRating || 0}
                  onChange={(personalRating) =>
                    updateMovie(selectedMovie.uid, {
                      personalRating,
                      personalRatingScale: 10,
                    })
                  }
                />
              )}

              <label className="mt-4 block">
                <span className="text-sm text-[#F5F3EE]/70">Catatan pribadi</span>
                <textarea
                  value={selectedMovie.note || ""}
                  onChange={(event) => updateMovie(selectedMovie.uid, { note: event.target.value })}
                  maxLength={1000}
                  rows={3}
                  placeholder="Tulis catatan…"
                  className="mt-1 w-full resize-y rounded-xl border border-[#F5F3EE]/15 bg-[#F5F3EE]/[0.04] p-3 text-sm outline-none"
                />
                <span className="block text-right text-[11px] text-[#F5F3EE]/40">{(selectedMovie.note || "").length}/1000</span>
              </label>

              <MovieExtras key={selectedMovie.uid} movie={selectedMovie} />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#F5F3EE]/15 pt-4">
                {/^\d+$/.test(String(selectedMovie.tmdbId)) && (
                  <a
                    href={`https://www.themoviedb.org/movie/${selectedMovie.tmdbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-[#F5F3EE]/25 px-4 py-2 text-sm transition hover:bg-[#F5F3EE]/10"
                  >
                    Halaman TMDB <ArrowIcon direction="up-right" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => removeMovie(selectedMovie)}
                  className="rounded-full border border-[#FF5A4F] px-4 py-2 text-sm transition hover:bg-[#FF5A4F]/30"
                >
                  Hapus dari koleksi
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ===== Add-film modal ===== */}
      {addOpen && (
        <ModalShell onClose={() => setAddOpen(false)} label="Tambah film">
          <div className="da-add-modal">
            <div className="da-add-modal__heading">
              <span className="da-add-modal__icon" aria-hidden="true">
                <Icon name="film" className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="da-add-modal__eyebrow">KOLEKSI PRIBADI</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">Tambah film</h2>
                <p className="mt-1 text-sm text-[#F5F3EE]/60">
                  Cari judul film atau series dan pilih kecocokan.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Cari judul film"
                aria-label="Judul film"
                autoFocus
                className="min-w-0 rounded-xl border border-[#F5F3EE]/15 bg-[#F5F3EE]/[0.04] px-4 py-3 text-base outline-none placeholder:text-[#F5F3EE]/40 sm:text-sm"
              />
              <input
                value={newYear}
                onChange={(event) => setNewYear(event.target.value)}
                placeholder="Tahun"
                aria-label="Tahun film (opsional)"
                inputMode="numeric"
                maxLength={4}
                className="min-w-0 rounded-xl border border-[#F5F3EE]/15 bg-[#F5F3EE]/[0.04] px-4 py-3 text-base outline-none placeholder:text-[#F5F3EE]/40 sm:text-sm"
              />
            </div>
            {searchingTmdb && (
              <p role="status" aria-live="polite" className="da-add-modal__status mt-3">
                <span className="da-add-modal__status-dot" aria-hidden="true" />
                Mencari film dan series…
              </p>
            )}
            <button
              type="button"
              onClick={addManualMovie}
              className="da-add-modal__manual mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#F5F3EE]/30 px-4 py-3 text-sm font-medium transition hover:border-[#FF5A4F]/60 hover:bg-[#FF5A4F]/[0.08]"
            >
              <Icon name="plus" className="h-4 w-4" />
              Simpan manual
            </button>
            {!hasTmdb && (
              <p className="mt-3 rounded-xl border border-[#F5F3EE]/10 bg-[#F5F3EE]/[0.03] p-3 text-xs text-[#F5F3EE]/60">
                TMDB belum terhubung. Film bisa disimpan manual, tetapi deteksi poster memerlukan VITE_TMDB_KEY.
              </p>
            )}
            {addError && <p role="alert" className="mt-3 text-sm">{addError}</p>}
            {addNotice && <p role="status" className="mt-3 text-sm text-[#F5F3EE]/80">{addNotice}</p>}
            {searchResults.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs text-[#F5F3EE]/55">Pilih hasil yang tepat agar poster dan tahun tidak tertukar.</p>
                <div className="da-add-modal__results divide-y divide-[#F5F3EE]/10 rounded-xl border border-[#F5F3EE]/15">
                  {searchResults.map((movie) => {
                    const isAdded = movies.some(
                      (item) =>
                        item.tmdbId === movie.tmdbId ||
                        (item.title.toLowerCase() === movie.title.toLowerCase() && item.year === movie.year)
                    );
                    return (
                      <article key={movie.tmdbId} className="da-add-modal__result flex items-center gap-3 p-3 transition">
                        <Poster src={movie.poster} title={movie.title} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{movie.title}</p>
                          <p className="mt-1 text-xs text-[#F5F3EE]/55">
                            {movie.year || "Tahun belum tersedia"}
                            {movie.rating ? ` · ★ ${movie.rating}` : ""}
                            {!movie.poster ? " · Tanpa poster" : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addMovie(movie)}
                          disabled={isAdded}
                          className="min-h-11 shrink-0 rounded-full bg-[#F5F3EE] px-4 py-2 text-xs font-medium text-[#0B1F4B] transition hover:brightness-110 disabled:bg-[#F5F3EE]/10 disabled:text-[#F5F3EE]/55"
                        >
                          {isAdded ? "Ditambahkan" : "Tambahkan"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}

/* ================= components ================= */

function MovieCard({ movie, eager, onOpen, onToggleFavorite, onToggleWatched }) {
  return (
    <article className="da-card group relative min-w-0 overflow-hidden rounded-2xl border border-[#F5F3EE]/15 bg-[#F5F3EE]/[0.04] transition duration-300 hover:-translate-y-1 hover:border-[#F5F3EE]/40">
      <button type="button" onClick={onOpen} className="block w-full text-left" aria-label={`Lihat detail ${movie.title}`}>
        <span className="relative block aspect-[2/3] overflow-hidden bg-[#F5F3EE]/[0.06]">
          {movie.poster ? (
            <img
              src={movie.poster.replace("/w500/", "/w342/")}
              alt={`Poster ${movie.title}`}
              loading={eager ? "eager" : "lazy"}
              className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <span className="grid h-full place-items-center p-4 text-center text-xs text-[#F5F3EE]/60">{movie.title}</span>
          )}
          <span className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-[#0B1F4B]/90 via-[#0B1F4B]/10 to-transparent p-3 opacity-0 transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
            <span className="text-xs font-medium">Lihat detail</span>
          </span>
          {movie.watched && (
            <span className="absolute left-2 top-2 rounded-full bg-[#0B1F4B]/80 px-2 py-0.5 text-[10px] font-medium">✓ Ditonton</span>
          )}
        </span>
        <span className="block min-w-0 px-3 pb-3 pt-2.5">
          <span className="block truncate text-sm font-semibold">{movie.title}</span>
          <span className="mt-0.5 block text-xs text-[#F5F3EE]/55">
            {movie.year || movie.expectedYear || "Tahun tidak diketahui"}
            {movie.watched && movie.personalRating
              ? ` · ★ ${formatPersonalRating(movie.personalRating)}/10`
              : ""}
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label={movie.favorite ? "Hapus dari favorit" : "Tambah ke favorit"}
        aria-pressed={Boolean(movie.favorite)}
        onClick={onToggleFavorite}
        className={
          "da-favorite-toggle absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-[#0B1F4B]/80 text-sm transition hover:scale-110 " +
          (movie.favorite ? "text-[#F5F3EE]" : "text-[#F5F3EE]/60")
        }
      >
        {movie.favorite ? "★" : "☆"}
      </button>
      <button
        type="button"
        aria-label={movie.watched ? "Tandai belum ditonton" : "Tandai sudah ditonton"}
        aria-pressed={Boolean(movie.watched)}
        onClick={onToggleWatched}
        className={
          "da-watched-toggle absolute right-2 top-12 grid h-8 w-8 place-items-center rounded-full bg-[#0B1F4B]/80 text-sm transition hover:scale-110 " +
          (movie.watched ? "text-[#FF8A81]" : "text-[#F5F3EE]/60")
        }
      >
        {movie.watched ? "✓" : "○"}
      </button>
    </article>
  );
}

function BottomNavButton({ item }) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      aria-current={item.active ? "page" : undefined}
      className={"da-nav-action flex w-full min-w-0 flex-col items-center gap-1 rounded-lg py-1 text-[9px] transition sm:text-[11px] " + (item.active ? "text-[#F5F3EE]" : "text-[#F5F3EE]/55")}
    >
      <Icon name={item.icon} className="h-5 w-5" />
      <span className="max-w-full whitespace-normal text-center leading-[1.1]">
        {item.label}
      </span>
    </button>
  );
}

function BrandMonogram({ className = "", onClick }) {
  return (
    <span className={`brand-monogram ${className}`} role="img" aria-label="Logo LLD" onClick={onClick}>
      <span className="brand-monogram__letter brand-monogram__letter--l" aria-hidden="true">L</span>
      <span className="brand-monogram__letter brand-monogram__letter--l2" aria-hidden="true">L</span>
      <span className="brand-monogram__letter brand-monogram__letter--d" aria-hidden="true">D</span>
    </span>
  );
}

function PersonalRating({ value, onChange }) {
  const [rolling, setRolling] = useState(false);
  const rollTimer = useRef(null);
  const ratings = Array.from({ length: 19 }, (_, index) => (index + 2) / 2);

  useEffect(() => () => window.clearTimeout(rollTimer.current), []);

  function rollRating() {
    if (rolling) return;
    setRolling(true);
    const result = (Math.floor(Math.random() * ratings.length) + 2) / 2;
    rollTimer.current = window.setTimeout(() => {
      onChange(result);
      setRolling(false);
    }, 820);
  }

  return (
    <div className="da-rating-control" aria-label="Rating pribadi">
      <span className="text-sm text-[#F5F3EE]/70">Rating pribadi</span>
      <select
        aria-label="Pilih rating pribadi"
        value={value || 0}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        <option value={0}>Belum dinilai</option>
        {ratings.map((rating) => (
          <option key={rating} value={rating}>
            {formatPersonalRating(rating)}/10
          </option>
        ))}
      </select>
      <button
        type="button"
        className="da-dice-button"
        onClick={rollRating}
        disabled={rolling}
        aria-label="Lempar dadu untuk mengacak rating"
      >
        <span className="da-dice-scene" aria-hidden="true">
          <span className={"da-dice-cube" + (rolling ? " is-rolling" : "")}>
            {[
              { side: "front", dots: [0, 2, 4, 6, 8] },
              { side: "back", dots: [0, 1, 2, 3, 4, 5] },
              { side: "right", dots: [0, 4, 8] },
              { side: "left", dots: [0, 2, 4, 6, 8] },
              { side: "top", dots: [0, 8] },
              { side: "bottom", dots: [0, 2, 3, 5, 6, 8] },
            ].map(({ side, dots }) => (
              <span className={`da-dice-face da-dice-face--${side}`} key={side}>
                {dots.map((dot) => (
                  <i
                    className="da-dice-pip"
                    key={dot}
                    style={{
                      gridColumn: (dot % 3) + 1,
                      gridRow: Math.floor(dot / 3) + 1,
                    }}
                  />
                ))}
              </span>
            ))}
          </span>
        </span>
        <span>{rolling ? "Mengocok…" : "Acak rating"}</span>
      </button>
      {value > 0 && (
        <output className="da-rating-value" aria-live="polite">
          {formatPersonalRating(value)}/10
        </output>
      )}
    </div>
  );
}

function MovieExtras({ movie }) {
  const [extras, setExtras] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setExtras(null);
    setLoading(true);
    setError("");

    if (!hasTmdb) {
      setLoading(false);
      setError("Detail pemeran, Instagram, dan trailer memerlukan VITE_TMDB_KEY.");
      return () => {
        active = false;
      };
    }

    getMovieExtras(movie)
      .then((result) => {
        if (active) setExtras(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Detail tambahan gagal dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [movie.tmdbId, movie.title]);

  if (loading) {
    return (
      <p className="mt-4 text-xs text-[#F5F3EE]/55" role="status">
        Memuat pemeran dan trailer…
      </p>
    );
  }

  if (error) {
    return (
      <p className="da-movie-extras text-xs leading-relaxed text-[#F5F3EE]/60" role="status">
        {error}
      </p>
    );
  }

  const cast = extras.details.cast.slice(0, 8);
  const videos = extras.videos.slice(0, 3);

  return (
    <section className="da-movie-extras" aria-label="Pemeran dan trailer">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Pemeran & trailer</h3>
          <p className="mt-1 text-[11px] text-[#F5F3EE]/50">
            Informasi dan tautan resmi dari TMDB
          </p>
        </div>
        <a
          href={extras.details.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-[#FFB7AF] transition hover:text-white"
        >
          Sumber TMDB <ArrowIcon direction="up-right" />
        </a>
      </div>

      {extras.details.overview && !movie.overview && (
        <p className="mb-3 text-xs leading-relaxed text-[#F5F3EE]/65">
          {extras.details.overview}
        </p>
      )}

      {cast.length > 0 && (
        <>
          <h4 className="mb-2 text-xs font-medium text-[#F5F3EE]/75">Pemeran</h4>
          <div className="da-movie-extras-grid">
            {cast.map((person) => (
              <a
                key={person.id}
                href={person.instagram || person.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="da-cast-link"
                aria-label={
                  person.instagram
                    ? `Buka Instagram ${person.name}`
                    : `Buka profil TMDB ${person.name}`
                }
              >
                {person.profile ? (
                  <img src={person.profile} alt="" loading="lazy" />
                ) : (
                  <span className="da-cast-link__placeholder" aria-hidden="true">
                    {person.name.slice(0, 1)}
                  </span>
                )}
                <span>
                  <strong>{person.name}</strong>
                  <small>
                    {person.character || "Pemeran"}
                    {person.instagram ? " · Instagram" : " · Instagram tidak tersedia"}
                  </small>
                </span>
              </a>
            ))}
          </div>
        </>
      )}

      <h4 className="mb-2 mt-4 text-xs font-medium text-[#F5F3EE]/75">Trailer</h4>
      {videos.length > 0 ? (
        <div className="da-movie-extras-grid">
          {videos.map((video) => (
            <a
              key={video.id}
              href={`https://www.youtube.com/watch?v=${video.key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="da-trailer-link"
            >
              <img
                src={`https://img.youtube.com/vi/${video.key}/hqdefault.jpg`}
                alt=""
                loading="lazy"
              />
              <span>
                <strong>{video.name}</strong>
                <small>{video.official ? "Trailer resmi" : video.type} · Putar di YouTube</small>
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#F5F3EE]/50">Belum ada trailer yang tersedia.</p>
      )}
    </section>
  );
}

function formatPersonalRating(value) {
  return Number(value).toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

function ModalShell({ onClose, label, wide = false, children }) {
  return (
    <div className="da-modal-shell fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" aria-label="Tutup" onClick={onClose} className="da-modal-backdrop absolute inset-0 cursor-default bg-[#0B1F4B]/80 backdrop-blur-sm" />
      <div
        className={
          "da-modal-panel da-modal-in relative max-h-[92vh] w-full overflow-y-auto overflow-x-hidden rounded-t-3xl border border-[#F5F3EE]/20 bg-[#0B1F4B] p-5 shadow-2xl sm:rounded-3xl sm:p-7 " +
          (wide ? "sm:max-w-3xl" : "sm:max-w-xl")
        }
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Kembali"
          className="da-modal-close mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#F5F3EE]/20 px-3 text-xs font-medium text-[#F5F3EE]/80 transition hover:bg-[#F5F3EE]/10"
        >
          <Icon name="close" className="h-4 w-4" />
          <span>Kembali</span>
        </button>
        {children}
      </div>
    </div>
  );
}

function AnimatedNumber({ value, className }) {
  const [displayedValue, setDisplayedValue] = useState(0);
  const displayedValueRef = useRef(0);

  useEffect(() => {
    const startValue = displayedValueRef.current;
    const difference = value - startValue;
    const startTime = performance.now();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || difference === 0) {
      displayedValueRef.current = value;
      setDisplayedValue(value);
      return undefined;
    }
    let frameId;
    function animate(now) {
      const progress = Math.min((now - startTime) / 500, 1);
      const eased = 1 - (1 - progress) ** 3;
      const nextValue = Math.round(startValue + difference * eased);
      displayedValueRef.current = nextValue;
      setDisplayedValue(nextValue);
      if (progress < 1) frameId = window.requestAnimationFrame(animate);
    }
    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [value]);

  return (
    <span className={className} aria-live="polite" aria-atomic="true">
      {displayedValue.toLocaleString("id-ID")}
    </span>
  );
}

function normalizeMovieTitle(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function Poster({ src, title }) {
  return (
    <span className="grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#F5F3EE]/[0.06] text-center text-[9px] text-[#F5F3EE]/60">
      {src ? (
        <img
          src={src.replace("/w500/", "/w185/").replace("/w342/", "/w185/")}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          width="48"
          height="64"
        />
      ) : (
        title.slice(0, 20)
      )}
    </span>
  );
}
