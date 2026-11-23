import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AppNavigation from "../components/AppNavigation.jsx";
import ArrowIcon from "../components/ArrowIcon.jsx";
import { getSession } from "../lib/auth.js";
import { getGenreSlug, groupMoviesByGenre } from "../lib/genres.js";
import { fetchMovies, GENRE_MAP, loadMovies } from "../lib/movies.js";

export default function GenreCollection() {
  const { genreSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const email = getSession()?.email || "";
  const [movies, setMovies] = useState(() => loadMovies(email));
  const [error, setError] = useState("");
  const [collectionLoaded, setCollectionLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMovies(email)
      .then((items) => {
        if (active) {
          setMovies(items);
          setCollectionLoaded(true);
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Gagal memuat koleksi.");
      });
    return () => {
      active = false;
    };
  }, [email]);

  useEffect(() => {
    function syncMovies(event) {
      if (event.key === `mv_movies_${email}`) {
        setMovies(loadMovies(email));
      }
    }
    window.addEventListener("storage", syncMovies);
    return () => window.removeEventListener("storage", syncMovies);
  }, [email]);

  const groups = useMemo(() => {
    const genreMovies = new Map(groupMoviesByGenre(movies));
    for (const genre of Object.values(GENRE_MAP)) {
      if (!genreMovies.has(genre)) genreMovies.set(genre, []);
    }
    return [...genreMovies.entries()].sort(([genreA], [genreB]) =>
      genreA.localeCompare(genreB, "id")
    );
  }, [movies]);
  const selectedGroup = groups.find(([genre]) => getGenreSlug(genre) === genreSlug);

  useLayoutEffect(() => {
    if (genreSlug || !collectionLoaded) return;
    const targetSlug =
      sessionStorage.getItem("mv_scroll_to_genre") ||
      sessionStorage.getItem("mv_last_clicked_genre");
    if (targetSlug) {
      sessionStorage.removeItem("mv_scroll_to_genre");
      const targetEl = document.getElementById(`genre-card-${targetSlug}`);
      if (targetEl) {
        targetEl.scrollIntoView({ block: "center", behavior: "instant" });
        return;
      }
    }
    const storedScroll = sessionStorage.getItem("mv_genre_list_scroll");
    if (storedScroll !== null) {
      sessionStorage.removeItem("mv_genre_list_scroll");
      const scrollY = Number(storedScroll);
      if (Number.isFinite(scrollY)) {
        window.scrollTo(0, scrollY);
      }
    }
  }, [collectionLoaded, genreSlug, location.key, groups.length]);

  function goBack() {
    if (genreSlug) {
      sessionStorage.setItem("mv_scroll_to_genre", genreSlug);
      sessionStorage.setItem("mv_last_clicked_genre", genreSlug);
      navigate("/genres");
      return;
    }
    navigate("/dashboard");
  }

  function openGenre(slug) {
    sessionStorage.setItem("mv_scroll_to_genre", slug);
    sessionStorage.setItem("mv_last_clicked_genre", slug);
    sessionStorage.setItem("mv_genre_list_scroll", String(window.scrollY));
    window.setTimeout(() => {
      navigate(`/genres/${slug}`, {
        state: {
          fromGenreList: true,
          genreListScrollY: window.scrollY,
          genreSlug: slug,
        },
      });
    }, 120);
  }

  return (
    <div className="darchive-dashboard min-h-screen overflow-x-clip bg-[#0B1F4B] text-[#F5F3EE]">
      <div className="dashboard-watermark" aria-hidden="true">
        <span>LAZIR</span>
        <span>LAZIAF</span>
        <span>DIZAM</span>
      </div>
      <div className="dashboard-content relative z-10">
        <AppNavigation onBack={goBack} />
        <main className="mx-auto max-w-6xl px-4 py-8 pb-28 sm:px-6 sm:py-10 sm:pb-32">
          <header className="mb-7">
            <p className="text-xs tracking-[0.18em] text-[#F5F3EE]/50">KOLEKSI BERDASARKAN GENRE</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {genreSlug && selectedGroup ? selectedGroup[0] : "Jelajahi genre"}
            </h1>
            <p className="mt-2 text-sm text-[#F5F3EE]/65">
              Film tersimpan dikelompokkan otomatis berdasarkan metadata genre film.
            </p>
          </header>

          {error && (
            <p role="alert" className="mb-5 rounded-xl border border-[#FF5A4F]/30 bg-[#FF5A4F]/10 p-3 text-sm text-[#F5F3EE]">
              {error}
            </p>
          )}

          {!collectionLoaded ? (
            <p className="rounded-2xl border border-[#F5F3EE]/15 bg-[#12285A] p-8 text-center text-sm text-[#F5F3EE]/55">
              Memuat koleksi...
            </p>
          ) : genreSlug ? (
            selectedGroup ? (
              selectedGroup[1].length ? (
                <MovieList movies={selectedGroup[1]} navigate={navigate} />
              ) : (
                <p className="rounded-2xl border border-dashed border-[#F5F3EE]/20 bg-[#12285A] p-8 text-center text-sm text-[#F5F3EE]/55">
                  Belum ada film tersimpan di genre {selectedGroup[0]}.
                </p>
              )
            ) : (
              <section className="rounded-2xl border border-dashed border-[#F5F3EE]/20 bg-[#12285A] p-10 text-center">
                <p className="text-sm text-[#F5F3EE]/80">Genre tidak ditemukan di koleksi.</p>
                <button
                  type="button"
                  onClick={goBack}
                  className="mt-4 inline-block text-sm text-[#FF8A81] underline underline-offset-4"
                >
                  Kembali ke semua genre
                </button>
              </section>
            )
          ) : groups.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map(([genre, genreMovies]) => (
                <button
                  type="button"
                  key={genre}
                  id={`genre-card-${getGenreSlug(genre)}`}
                  onClick={() => openGenre(getGenreSlug(genre))}
                  className="da-card da-stat-card group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#F5F3EE]/15 bg-[#12285A] p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-[#FF5A4F]/60 hover:shadow-2xl active:scale-[0.96]"
                >
                  <div>
                    <span className="block text-lg font-semibold tracking-tight text-[#F5F3EE] transition group-hover:text-white">{genre}</span>
                    <span className="mt-2 block text-xs font-medium text-[#FF8A81]">
                      {genreMovies.length} film
                    </span>
                  </div>
                  <span className="mt-4 block truncate text-xs text-[#F5F3EE]/60 transition group-hover:text-[#F5F3EE]/85">
                    {genreMovies.slice(0, 3).map((movie) => movie.title).join(" · ") || "Belum ada film"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <section className="rounded-2xl border border-dashed border-[#F5F3EE]/20 bg-[#12285A] p-10 text-center">
              <p className="text-sm text-[#F5F3EE]/80">Belum ada film tersimpan di koleksi.</p>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="mt-5 rounded-full bg-[#FF5A4F] px-4 py-2 text-xs font-medium text-[#F5F3EE] transition hover:brightness-110"
              >
                Kembali ke Beranda
              </button>
            </section>
          )}
        </main>

        {/* Tombol kembali ergonomis di bagian bawah (posisi nyaman di HP dan laptop) */}
        <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 sm:bottom-8 sm:left-8 sm:translate-x-0">
          <button
            type="button"
            onClick={goBack}
            aria-label={genreSlug ? "Kembali ke daftar genre" : "Kembali ke Dashboard"}
            className="da-floating-back group flex min-h-[46px] items-center gap-2.5 rounded-full border border-[#F5F3EE]/25 bg-[#0B1F4B]/95 px-6 py-2.5 text-xs font-semibold tracking-wider text-[#F5F3EE] shadow-[0_10px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl transition duration-300 hover:scale-105 hover:border-[#FF5A4F]/60 hover:bg-[#FF5A4F]/20 hover:text-white active:scale-95 sm:min-h-[48px] sm:px-6 sm:text-sm"
          >
            <ArrowIcon direction="left" className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            <span>Kembali</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function MovieList({ movies, navigate }) {
  return (
    <div className="divide-y divide-[#F5F3EE]/10 overflow-hidden rounded-2xl border border-[#F5F3EE]/15 bg-[#12285A]">
      {movies.map((movie) => (
        <article key={movie.uid} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
          <button
            type="button"
            onClick={() => navigate(`/movie/${movie.tmdbId}`, { state: { movie } })}
            className="movie-open-button flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <Poster src={movie.poster} title={movie.title} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-[#F5F3EE]">{movie.title}</span>
              <span className="mt-1 block text-xs text-[#F5F3EE]/55">
                {movie.year || movie.expectedYear || "Tahun belum diketahui"}
                {movie.favorite ? " · Favorit" : ""}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate(`/movie/${movie.tmdbId}`, { state: { movie } })}
            className="rounded-full border border-[#F5F3EE]/20 px-3 py-2 text-xs text-[#F5F3EE]/75 transition hover:border-[#FF5A4F]/50 hover:bg-[#FF5A4F]/10"
          >
            Detail
          </button>
        </article>
      ))}
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
      ) : title.slice(0, 20)}
    </span>
  );
}
