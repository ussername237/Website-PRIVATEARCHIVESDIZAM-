import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ArrowIcon from "../components/ArrowIcon.jsx";
import { login, refreshSession, register } from "../lib/auth.js";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [mode, setMode] = useState("login");
  const [registrationCode, setRegistrationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  useEffect(() => {
    let active = true;
    refreshSession()
      .then((session) => {
        if (active && session) navigate("/dashboard", { replace: true });
      })
      .catch((sessionError) => {
        if (active) setError(sessionError.message || "Sesi login tidak dapat diperiksa.");
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  function update(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function pulseInput(event) {
    const input = event.currentTarget;
    input.classList.remove("is-typing");
    void input.offsetWidth;
    input.classList.add("is-typing");
    window.clearTimeout(input._typingTimer);
    input._typingTimer = window.setTimeout(() => {
      input.classList.remove("is-typing");
    }, 180);
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);

    try {
      if (isRegister) {
        if (!form.name.trim()) throw new Error("Nama wajib diisi.");
        if (form.password.length < 12) throw new Error("Password minimal 12 karakter.");
        await register(
          form.name.trim(),
          form.email.trim(),
          form.password,
          registrationCode
        );
      } else {
        await login(form.email.trim(), form.password);
      }

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.message || "Tidak dapat masuk. Periksa kembali data Anda."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/" className="landing-brand da-brand-link">
          <span className="brand-monogram" role="img" aria-label="Logo LLD">
            <span className="brand-monogram__letter brand-monogram__letter--l" aria-hidden="true">L</span>
            <span className="brand-monogram__letter brand-monogram__letter--l2" aria-hidden="true">L</span>
            <span className="brand-monogram__letter brand-monogram__letter--d" aria-hidden="true">D</span>
          </span>
        </Link>
      </header>

      <main className="admin-main">
        <section className="admin-card">
          <h2>
            {isRegister ? "Buat akun" : "ADMIN SIGN IN"}
          </h2>

          <form onSubmit={submit} className="admin-form">
            {isRegister && (
              <label>
                Nama
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  onInput={pulseInput}
                  placeholder="Nama Anda"
                  autoComplete="name"
                  required
                />
              </label>
            )}

            {isRegister && (
              <label>
                Kode registrasi
                <input
                  type="password"
                  value={registrationCode}
                  onChange={(event) => setRegistrationCode(event.target.value)}
                  onInput={pulseInput}
                  placeholder="Masukkan kode undangan"
                  autoComplete="off"
                  required
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  update("email", e.target.value)
                }
                onInput={pulseInput}
                placeholder="nama@email.com"
                autoComplete="username"
                required
              />
            </label>

            <label>
              Password
              <span className="admin-password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  aria-label="Password"
                  value={form.password}
                  onChange={(e) =>
                    update("password", e.target.value)
                  }
                  onInput={pulseInput}
                  placeholder="Masukkan password"
                  minLength={undefined}
                  maxLength={256}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="admin-password-toggle"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={showPassword}
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <PasswordVisibilityIcon visible={showPassword} />
                </button>
              </span>
            </label>

            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="admin-submit" disabled={busy}>
              {busy
                ? "Memproses..."
                : isRegister
                  ? "Buat akun"
                  : "Masuk"}
              <ArrowIcon />
            </button>
          </form>

          <div className="admin-toggle">
            {isRegister ? "Sudah memiliki akun?" : "Belum memiliki akun?"}
            <button
              type="button"
              onClick={() => {
                setMode(isRegister ? "login" : "register");
                setRegistrationCode("");
                setError("");
              }}
            >
              {isRegister ? "Masuk" : "Buat akun"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function PasswordVisibilityIcon({ visible }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12s3.3-6.1 9.5-6.1 9.5 6.1 9.5 6.1-3.3 6.1-9.5 6.1S2.5 12 2.5 12Z" />
      {visible ? (
        <>
          <circle cx="12" cy="12" r="2.7" />
          <path d="m13.7 10.3 1-1" />
        </>
      ) : (
        <path d="m4 4 16 16" />
      )}
    </svg>
  );
}