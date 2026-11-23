let sessionCache = null;

export function getSession() {
  return sessionCache;
}

export async function isLoggedIn() {
  return Boolean(await refreshSession());
}

export async function refreshSession() {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });

  if (response.status === 401) {
    sessionCache = null;
    return null;
  }

  const data = await readResponse(response);
  sessionCache = data.user;
  return sessionCache;
}

export async function login(email, password) {
  const data = await sendAuthRequest("/api/auth/login", { email, password });
  sessionCache = data.user;
  return sessionCache;
}

export async function register(name, email, password, registrationCode) {
  const data = await sendAuthRequest("/api/auth/register", {
    name,
    email,
    password,
    registrationCode,
  });
  sessionCache = data.user;
  return sessionCache;
}

export async function logout() {
  await sendAuthRequest("/api/auth/logout");
  sessionCache = null;
}

async function sendAuthRequest(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Server tidak dapat dijangkau. Pastikan aplikasi aktif, lalu coba lagi.");
    }
    throw error;
  }
  return readResponse(response);
}

async function readResponse(response) {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Respons autentikasi server tidak valid.");
  }

  if (!response.ok) {
    throw new Error(data.error || "Permintaan autentikasi gagal.");
  }
  return data;
}
