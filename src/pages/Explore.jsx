import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MovieCarousel from "../components/MovieCarousel.jsx";
import AppNavigation from "../components/AppNavigation.jsx";
import { getSession } from "../lib/auth.js";
import { getMovieGenres } from "../lib/genres.js";
import {
  FALLBACK_MOVIES,
  fetchLatestMovies,
  fetchMovies,
  hasOmdb,
  hasTmdb,
  loadMovies,
  saveMovies,
  searchMovies,
  searchTmdbPage,
} from "../lib/movies.js";
import "./Landing.css";

export default function Explore() {
  const navigate = useNavigate();
  const email = getSession()?.email || "";
  const [movies, setMovies] = useState([]);
  const [collection, setCollection] = useState(() => loadMovies(email));
  const [collectionLoaded, setCollectionLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [sourceWarning, setSourceWarning] = useState("");
  const [source, setSource] = useState("demo");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const availableGenres = [...new Set(movies.flatMap(getMovieGenres))]
    .sort((genreA, genreB) => genreA.localeCompare(genreB, "id"));
  const visibleMovies = genreFilter
    ? movies.filter((movie) => getMovieGenres(movie).includes(genreFilter))
    : movies;

  useEffect(() => {
    let active = true;
    fetchMovies(email)
      .then((items) => {
        if (active) {
          setCollection(items);
          setCollectionLoaded(true);
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Gagal memuat koleksi.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const term = query.trim();
    let active = true;

    if (!term) {
      setLoading(true);
      setSearching(false);
      setError("");
      setSourceWarning("");
      fetchLatestMovies()
        .then((result) => {
          if (active) {
            setMovies(result.movies);
            setSource(result.source);
            setPage(result.page || 1);
            setHasMore(result.hasMore);
          }
        })
        .catch((loadError) => {
          if (active) {
            setMovies([]);
            setError(loadError.message || "Gagal memuat film terbaru.");
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setSearching(true);
    setError("");
    const timer = window.setTimeout(() => {
      const request = hasTmdb
        ? searchTmdbPage(term)
        : searchMovies(term);
      request
        .then((result) => {
          if (!active) return;
          setMovies(result.movies);
          setPage(1);
          setHasMore(result.hasMore);
          setSourceWarning(result.warning || "");
          setSource(result.source || (hasTmdb && hasOmdb ? "combined" : hasOmdb ? "omdb" : "tmdb"));
        })
        .catch((searchError) => {
          if (active) {
            const normalizedTerm = term.toLowerCase();
            const localMatches = FALLBACK_MOVIES.filter((movie) =>
              movie.title.toLowerCase().includes(normalizedTerm)
            );
            setMovies(localMatches);
            setSource("demo");
            setError(localMatches.length ? "" : (searchError.message || "Pencarian film gagal."));
          }
        })
        .finally(() => {
          if (active) {
            setSearching(false);
            setLoading(false);
          }
        });
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  async function submitSearch(event) {
    event.preventDefault();
  }

  async function loadMoreMovies() {
    if (loading || searching || !hasMore) return;
    setLoading(true);
    setError("");
    try {
      const nextPage = page + 1;
      const result = query.trim()
        ? hasTmdb
          ? await searchTmdbPage(query.trim(), nextPage)
          : await searchMovies(query.trim(), nextPage)
        : await fetchLatestMovies(nextPage);
      setMovies((current) => [...current, ...result.movies]);
      setPage(result.page || nextPage);
      setHasMore(result.hasMore);
      setSourceWarning(result.warning || "");
    } catch (loadError) {
      setError(loadError.message || "Gagal memuat halaman film berikutnya.");
    } finally {
      setLoading(false);
    }
  }

  async function addMovie(movie) {
    if (!collectionLoaded) return;
    const alreadyAdded = collection.some(
      (item) =>
        (movie.tmdbId && item.tmdbId === movie.tmdbId) ||
        item.title === movie.title
    );
    if (alreadyAdded) return;
    const next = [{ ...movie, uid: Date.now(), watched: false, favorite: false }, ...collection];
    try {
      await saveMovies(email, next);
      setCollection(next);
      setError("");
    } catch (saveError) {
      setError(saveError.message || "Gagal menyimpan film.");
    }
  }

  return (
    <div className="archive-secondary-page min-h-screen bg-[#0D0B0E] text-[#D8C9A7]">
      <AppNavigation />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-7">
          <p className="text-xs tracking-[0.18em] text-slate-500">KATALOG</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Cari film & series
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Cari film dan series dari TMDB serta OMDb.
              </p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400">
              {source === "combined"
                ? "TMDB + OMDb"
                : source === "omdb"
                  ? "Data OMDb"
                  : source === "tmdb"
                    ? "Data TMDB"
                    : "Mode demo"}
            </span>
          </div>
        </header>

        <form
          onSubmit={submitSearch}
          className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-white/[0.07] bg-[#111318] p-3"
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari judul atau tahun"
            aria-label="Cari judul atau tahun"
            className="min-w-0 flex-1 rounded-xl bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-slate-600 focus:ring-1 focus:ring-white/20 sm:text-sm"
          />
          <select
            value={genreFilter}
            onChange={(event) => setGenreFilter(event.target.value)}
            aria-label="Filter berdasarkan genre"
            className="min-h-11 rounded-xl border border-white/10 bg-[#17191f] px-3 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-white/20"
          >
            <option value="">Semua genre</option>
            {availableGenres.map((genre) => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </form>

        {!hasTmdb && (
          <p className="mb-6 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] p-3 text-xs text-amber-100/80">
            Tambahkan VITE_TMDB_KEY ke .env.local untuk katalog, detail, dan trailer TMDB.
          </p>
        )}
        {!hasOmdb && (
          <p className="mb-6 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] p-3 text-xs text-amber-100/80">
            Tambahkan VITE_OMDB_KEY untuk menambah hasil pencarian dari OMDb.
          </p>
        )}
        {error && (
          <p className="mb-6 rounded-xl border border-red-300/10 bg-red-300/[0.04] p-3 text-sm text-red-200">
            {error}
          </p>
        )}
        {sourceWarning && (
          <p className="mb-6 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] p-3 text-xs text-amber-100/80">
            {hasTmdb
              ? "Hasil TMDB tetap tersedia, tetapi sumber tambahan gagal"
              : "Sumber pencarian gagal"}
            : {sourceWarning}
          </p>
        )}

        {!query.trim() && movies.length > 0 && (
          <section className="mb-10">
            <div className="mv-page">
              <MovieCarousel
                movies={visibleMovies.slice(0, 8)}
                ctaHref="/dashboard"
                ctaLabel="Ke koleksi"
              />
            </div>
          </section>
        )}

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-300">
            {query ? "Hasil pencarian" : "Sedang tayang"}
          </h2>
          <span className="text-xs text-slate-600">{visibleMovies.length} film</span>
        </div>
        {loading ? (
          <p className="rounded-2xl border border-white/[0.07] p-8 text-center text-sm text-slate-500">
            Memuat daftar film...
          </p>
        ) : visibleMovies.length ? (
          <div className="divide-y divide-white/[0.07] overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101216]">
            {visibleMovies.map((movie) => {
              const added = collection.some(
                (item) =>
                  item.tmdbId === movie.tmdbId || item.title === movie.title
              );
              return (
                <article
                  key={movie.tmdbId}
                  className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4"
                >
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/movie/${movie.tmdbId}`, { state: { movie } })
                    }
                    className="movie-open-button flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Poster src={movie.poster} title={movie.title} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-100">
                        {movie.title}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {movie.year || "Tahun belum diketahui"}
                        {movie.rating ? ` · ★ ${movie.rating}` : ""}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/movie/${movie.tmdbId}`, { state: { movie } })}
                    className="movie-open-button hidden rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 sm:block"
                  >
                    Trailer & detail
                  </button>
                  <button
                    type="button"
                    disabled={added || !collectionLoaded}
                    onClick={() => addMovie(movie)}
                    className="min-h-11 rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-950 transition hover:bg-slate-200 disabled:bg-white/5 disabled:text-slate-500"
                  >
                    {added
                      ? "Tersimpan"
                      : collectionLoaded
                        ? "Simpan"
                        : "Memuat..."}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
            Tidak ada film ditemukan untuk pencarian atau genre ini. Periksa pilihan Anda.
          </p>
        )}
        {!loading && hasMore && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={loadMoreMovies}
              className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-white/25 hover:bg-white/[0.04]"
            >
              Muat film lainnya
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function Poster({ src, title }) {
  return (
    <span className="grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/[0.04] text-center text-[9px] text-slate-500">
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
