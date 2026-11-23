export const UNKNOWN_GENRE = "Genre belum diketahui";

export function getMovieGenres(movie) {
  if (!Array.isArray(movie?.genres)) return [];

  return [...new Set(
    movie.genres
      .map((genre) => (typeof genre === "string" ? genre : genre?.name))
      .filter((genre) => typeof genre === "string" && genre.trim())
      .map((genre) => {
        const label = genre.trim();
        return label === "Romansa" ? "Romance" : label;
      })
  )];
}

export function getGenreSlug(genre) {
  return genre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function groupMoviesByGenre(movies) {
  const groups = new Map();

  for (const movie of movies) {
    const genres = getMovieGenres(movie);
    for (const genre of genres.length ? genres : [UNKNOWN_GENRE]) {
      if (!groups.has(genre)) groups.set(genre, []);
      groups.get(genre).push(movie);
    }
  }

  return [...groups.entries()].sort(([genreA], [genreB]) =>
    genreA.localeCompare(genreB, "id")
  );
}
