import {
  BrowserRouter,
  Link,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";

import { refreshSession } from "./lib/auth.js";

const Landing = lazy(() => import("./pages/Landing.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Explore = lazy(() => import("./pages/Explore.jsx"));
const Favorites = lazy(() => import("./pages/Favorites.jsx"));
const GenreCollection = lazy(() => import("./pages/GenreCollection.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const MovieDetails = lazy(() => import("./pages/MovieDetails.jsx"));

export default function App() {
  useEffect(() => {
    const activeAnimations = new WeakMap();
    const selector =
      'button:not(:disabled):not(.da-modal-backdrop), a[href], [role="button"], select:not(:disabled)';

    function animateAction(event) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!(event.target instanceof Element)) return;

      const action = event.target.closest(selector);
      if (!action || typeof action.animate !== "function") return;

      activeAnimations.get(action)?.cancel();
      const animation = action.animate(
        [
          { scale: "1", filter: "brightness(1)" },
          { scale: "0.94", filter: "brightness(0.92)", offset: 0.38 },
          { scale: "1", filter: "brightness(1)" },
        ],
        {
          duration: 360,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        }
      );
      const clearAnimation = () => {
        if (activeAnimations.get(action) === animation) {
          activeAnimations.delete(action);
        }
      };
      animation.onfinish = clearAnimation;
      animation.oncancel = clearAnimation;
      activeAnimations.set(action, animation);
    }

    function animateKeyboardAction(event) {
      if (event.detail === 0) animateAction(event);
    }

    document.addEventListener("pointerdown", animateAction, true);
    document.addEventListener("click", animateKeyboardAction, true);
    return () => {
      document.removeEventListener("pointerdown", animateAction, true);
      document.removeEventListener("click", animateKeyboardAction, true);
    };
  }, []);

  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <main className="grid min-h-screen place-items-center bg-[#0B1F4B] text-[#F5F3EE]">
            Memuat halaman...
          </main>
        }
      >
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/welcome" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/explore" element={<RequireAuth><Explore /></RequireAuth>} />
          <Route path="/favorites" element={<RequireAuth><Favorites /></RequireAuth>} />
          <Route path="/genres" element={<RequireAuth><GenreCollection /></RequireAuth>} />
          <Route path="/genres/:genreSlug" element={<RequireAuth><GenreCollection /></RequireAuth>} />
          <Route path="/movie/:movieId" element={<RequireAuth><MovieDetails /></RequireAuth>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function RequireAuth({ children }) {
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    refreshSession()
      .then((session) => {
        if (active) setStatus(session ? "authenticated" : "unauthenticated");
      })
      .catch((sessionError) => {
        if (active) {
          setError(sessionError.message || "Sesi tidak dapat diverifikasi.");
          setStatus("error");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (status === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0B1F4B] text-[#F5F3EE]">
        Memeriksa sesi...
      </main>
    );
  }
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }
  if (status === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0B1F4B] p-6 text-[#F5F3EE]">
        <div className="max-w-md text-center">
          <p role="alert">{error}</p>
          <Link className="mt-4 inline-block underline underline-offset-4" to="/login">
            Buka halaman login
          </Link>
        </div>
      </main>
    );
  }
  return children;
}