const SESSION_COOKIE = "darchive_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 100_000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const MAX_COLLECTION_ITEMS = 1000;
const MAX_COLLECTION_BYTES = 1_800_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (
      url.pathname === "/api/collection" ||
      url.pathname === "/api/collection/version"
    ) {
      try {
        requireAuthConfig(env);
        assertSameOrigin(request);
        const session = await readSession(request, env.SESSION_SECRET);
        if (!session) throw new AuthError(401, "Sesi login berakhir. Silakan masuk kembali.");

        if (url.pathname === "/api/collection/version") {
          if (request.method === "GET") {
            return await getCollectionVersion(env.DB, session.id);
          }
          return json({ error: "Metode permintaan tidak didukung." }, 405, {
            Allow: "GET",
          });
        }

        if (request.method === "GET") return await getCollection(env.DB, session.id);
        if (request.method === "PUT") return await putCollection(request, env.DB, session.id);
        return json({ error: "Metode permintaan tidak didukung." }, 405, {
          Allow: "GET, PUT",
        });
      } catch (error) {
        if (error instanceof AuthError) {
          return json({ error: error.message }, error.status);
        }
        throw error;
      }
    }

    if (!url.pathname.startsWith("/api/auth/")) {
      return env.ASSETS.fetch(request);
    }

    try {
      if (url.pathname === "/api/auth/session" && request.method === "GET") {
        requireAuthConfig(env);
        const session = await readSession(request, env.SESSION_SECRET);
        return json({ user: session });
      }

      if (url.pathname === "/api/auth/register" && request.method === "POST") {
        requireAuthConfig(env);
        assertSameOrigin(request);
        return await register(request, env);
      }

      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        requireAuthConfig(env);
        assertSameOrigin(request);
        return await login(request, env);
      }

      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        assertSameOrigin(request);
        return json({ ok: true }, 200, {
          "Set-Cookie": expireSessionCookie(request),
        });
      }

      return json({ error: "Endpoint autentikasi tidak ditemukan." }, 404);
    } catch (error) {
      if (error instanceof AuthError) {
        return json({ error: error.message }, error.status);
      }
      throw error;
    }
  },
};

async function getCollectionVersion(db, userId) {
  const row = await db
    .prepare("SELECT version FROM user_collections WHERE user_id = ?")
    .bind(userId)
    .first();
  return json({ exists: Boolean(row), version: row?.version ?? 0 });
}

async function getCollection(db, userId) {
  const row = await db
    .prepare("SELECT movies_json, version FROM user_collections WHERE user_id = ?")
    .bind(userId)
    .first();
  if (!row) return json({ movies: [], version: 0, exists: false });

  let movies;
  try {
    movies = JSON.parse(row.movies_json);
  } catch {
    throw new AuthError(500, "Data koleksi di server tidak dapat dibaca.");
  }
  if (!Array.isArray(movies)) {
    throw new AuthError(500, "Data koleksi di server tidak valid.");
  }
  return json({ movies, version: row.version, exists: true });
}

async function putCollection(request, db, userId) {
  const { movies, expectedVersion } = await readCollectionBody(request);
  const moviesJson = JSON.stringify(movies);
  const updatedAt = new Date().toISOString();
  const result = await db
    .prepare(
      `INSERT INTO user_collections (user_id, movies_json, version, updated_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         movies_json = excluded.movies_json,
         version = user_collections.version + 1,
         updated_at = excluded.updated_at
       WHERE user_collections.version = ?
       RETURNING version`
    )
    .bind(userId, moviesJson, updatedAt, expectedVersion)
    .first();

  if (!result) {
    const latest = await getCollectionRecord(db, userId);
    return json(
      {
        error: "Koleksi berubah di perangkat lain. Coba simpan lagi.",
        movies: latest?.movies || [],
        version: latest?.version || 0,
        exists: Boolean(latest),
      },
      409
    );
  }

  return json({ movies, version: result.version, exists: true });
}

async function getCollectionRecord(db, userId) {
  const row = await db
    .prepare("SELECT movies_json, version FROM user_collections WHERE user_id = ?")
    .bind(userId)
    .first();
  if (!row) return null;

  try {
    const movies = JSON.parse(row.movies_json);
    if (!Array.isArray(movies)) throw new Error("Stored collection is not an array.");
    return { movies, version: row.version };
  } catch {
    throw new AuthError(500, "Data koleksi di server tidak valid.");
  }
}

async function readCollectionBody(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new AuthError(415, "Permintaan harus menggunakan JSON.");
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_COLLECTION_BYTES) {
    throw new AuthError(413, "Ukuran koleksi terlalu besar.");
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_COLLECTION_BYTES) {
    throw new AuthError(413, "Ukuran koleksi terlalu besar.");
  }

  let body;
  try {
    body = JSON.parse(decoder.decode(bytes));
  } catch {
    throw new AuthError(400, "Isi permintaan tidak valid.");
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !Array.isArray(body.movies) ||
    body.movies.length > MAX_COLLECTION_ITEMS
  ) {
    throw new AuthError(400, "Daftar koleksi tidak valid (maksimal 1.000 film).");
  }
  if (
    !Number.isSafeInteger(body.expectedVersion) ||
    body.expectedVersion < 0
  ) {
    throw new AuthError(400, "Versi koleksi tidak valid.");
  }
  if (body.movies.some((movie) => !movie || typeof movie !== "object" || Array.isArray(movie))) {
    throw new AuthError(400, "Data film di dalam koleksi tidak valid.");
  }

  return { movies: body.movies, expectedVersion: body.expectedVersion };
}

async function register(request, env) {
  if (
    typeof env.REGISTRATION_SECRET !== "string" ||
    env.REGISTRATION_SECRET.length < 32
  ) {
    throw new AuthError(503, "Kode registrasi server belum dikonfigurasi.");
  }

  const body = await readJson(request);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const registrationCode =
    typeof body.registrationCode === "string" ? body.registrationCode : "";

  if (!name || name.length > 80 || !isValidEmail(email)) {
    throw new AuthError(400, "Nama atau email tidak valid.");
  }
  if (password.length < 12 || password.length > 256) {
    throw new AuthError(400, "Password harus berisi 12 sampai 256 karakter.");
  }
  const attemptKey = await hashText(
    `registration\u0000${request.headers.get("CF-Connecting-IP") || "unknown"}`
  );
  const attempts = await recordAttempt(env.DB, attemptKey);
  if (attempts > MAX_LOGIN_ATTEMPTS) {
    throw new AuthError(429, "Terlalu banyak percobaan. Coba lagi dalam 15 menit.");
  }
  if (!constantTimeEqual(registrationCode, env.REGISTRATION_SECRET)) {
    throw new AuthError(403, "Kode registrasi tidak valid.");
  }
  await clearAttempts(env.DB, attemptKey);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await hashPassword(password, salt);
  const user = {
    id: crypto.randomUUID(),
    name,
    email,
  };
  const result = await env.DB.prepare(
    `INSERT INTO users (id, name, email, password_salt, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO NOTHING`
  )
    .bind(
      user.id,
      user.name,
      user.email,
      encodeBase64Url(salt),
      passwordHash,
      new Date().toISOString()
    )
    .run();

  if (result.meta.changes !== 1) {
    throw new AuthError(409, "Email sudah terdaftar.");
  }

  return withSession(request, env.SESSION_SECRET, user);
}

async function login(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!isValidEmail(email) || !password || password.length > 256) {
    throw new AuthError(400, "Email dan password tidak valid.");
  }

  const attemptKey = await hashText(
    `login\u0000${request.headers.get("CF-Connecting-IP") || "unknown"}\u0000${email}`
  );
  const attempts = await recordAttempt(env.DB, attemptKey);
  if (attempts > MAX_LOGIN_ATTEMPTS) {
    throw new AuthError(429, "Terlalu banyak percobaan. Coba lagi dalam 15 menit.");
  }

  const account = await env.DB.prepare(
    "SELECT id, name, email, password_salt, password_hash FROM users WHERE email = ?"
  )
    .bind(email)
    .first();
  const salt = account
    ? decodeBase64Url(account.password_salt)
    : new Uint8Array(16);
  const expectedHash = account
    ? account.password_hash
    : "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const actualHash = await hashPassword(password, salt);

  if (!account || !constantTimeEqual(actualHash, expectedHash)) {
    throw new AuthError(401, "Email atau password salah.");
  }

  await clearAttempts(env.DB, attemptKey);
  return withSession(request, env.SESSION_SECRET, {
    id: account.id,
    name: account.name,
    email: account.email,
  });
}

async function readJson(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new AuthError(415, "Permintaan harus menggunakan JSON.");
  }

  const text = await request.text();
  if (text.length > 4096) {
    throw new AuthError(413, "Permintaan terlalu besar.");
  }
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("JSON body must be an object.");
    }
    return body;
  } catch {
    throw new AuthError(400, "Isi permintaan tidak valid.");
  }
}

function requireAuthConfig(env) {
  if (
    !env.DB ||
    typeof env.SESSION_SECRET !== "string" ||
    env.SESSION_SECRET.length < 32
  ) {
    throw new AuthError(503, "Autentikasi server belum dikonfigurasi.");
  }
}

function assertSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    throw new AuthError(403, "Permintaan lintas situs ditolak.");
  }
  if (request.headers.get("Sec-Fetch-Site") === "cross-site") {
    throw new AuthError(403, "Permintaan lintas situs ditolak.");
  }
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PASSWORD_ITERATIONS,
    },
    key,
    256
  );
  return encodeBase64Url(new Uint8Array(derived));
}

async function hashText(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return encodeBase64Url(new Uint8Array(digest));
}

async function recordAttempt(db, key) {
  const now = Math.floor(Date.now() / 1000);
  const resetBefore = now - LOGIN_WINDOW_SECONDS;
  await db.prepare(
    `INSERT INTO login_attempts (key_hash, attempts, window_started_at)
     VALUES (?, 1, ?)
     ON CONFLICT(key_hash) DO UPDATE SET
       attempts = CASE
         WHEN login_attempts.window_started_at <= ? THEN 1
         ELSE login_attempts.attempts + 1
       END,
       window_started_at = CASE
         WHEN login_attempts.window_started_at <= ? THEN excluded.window_started_at
         ELSE login_attempts.window_started_at
       END`
  )
    .bind(key, now, resetBefore, resetBefore)
    .run();

  const record = await db
    .prepare("SELECT attempts FROM login_attempts WHERE key_hash = ?")
    .bind(key)
    .first();
  return record?.attempts || 0;
}

async function clearAttempts(db, key) {
  await db.prepare("DELETE FROM login_attempts WHERE key_hash = ?").bind(key).run();
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function withSession(request, secret, user) {
  const token = await createSessionToken(secret, user);
  return json({ user }, 200, {
    "Set-Cookie": sessionCookie(request, token),
  });
}

async function createSessionToken(secret, user) {
  const payload = encodeBase64Url(
    encoder.encode(
      JSON.stringify({
        ...user,
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      })
    )
  );
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  return `${payload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

async function readSession(request, secret) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    decodeBase64Url(signature),
    encoder.encode(payload)
  );
  if (!isValid) return null;

  try {
    const session = JSON.parse(decoder.decode(decodeBase64Url(payload)));
    if (!session.id || !session.email || session.exp <= Date.now() / 1000) {
      return null;
    }
    return { id: session.id, name: session.name, email: session.email };
  } catch {
    return null;
  }
}

function getCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  const value = cookies
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return value ? value.slice(name.length + 1) : "";
}

function sessionCookie(request, token) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

function expireSessionCookie(request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function json(body, status = 200, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}
