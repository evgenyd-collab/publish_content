import { useState, useEffect } from "react";
import { Routes, Route, useLocation, NavLink } from "react-router-dom";
import BonusList from "./BonusList.jsx";
import BonusDetailsPage from "./components/molecules/bonus-details-page/index.jsx";
import RedirectIfServerPage from "./helpers/redirect-if-server-page.js";
import TestTab from "./TestTab.jsx";
import AuthModal from "./components/modals/auth-modal";
import BookmakerRatingsPage from "./odds/BookmakerRatingsPage.jsx";
import BookmakerDetailsPage from "./odds/BookmakerDetailsPage.jsx";
import NewsPage from "./news/NewsPage.jsx";
import TranslationsPage from "./translations/TranslationsPage.jsx";
import TranslationDetailsPage from "./translations/TranslationDetailsPage.jsx";
import ArticlesPage from "./articles/ArticlesPage.jsx";

import useAuthStore from "./store/auth-store.js";

function getInitialTheme() {
  // 1. Check localStorage
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") return saved === "dark";
  // 2. Check system preference
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return true;
  }
  return false;
}

import { TranslationsProvider } from "./translations/context/TranslationsContext.jsx";

function App() {
  // Use function to get initial theme synchronously
  const [isDarkTheme, setIsDarkTheme] = useState(getInitialTheme);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const location = useLocation();
  const showThemeToggle = !location.pathname.startsWith("/bonuses");

  const isLogged = useAuthStore((state) => state.isLogged);
  const setIsLogged = useAuthStore((state) => state.setIsLogged);
  const logout = useAuthStore((state) => state.logout);
  const refreshToken = localStorage.getItem("refreshToken");
  const accessToken = useAuthStore.getState().accessToken;
  // console.log(accessToken);

  // Effect to apply theme to body and update localStorage when isDarkTheme changes
  useEffect(() => {
    if (isDarkTheme) {
      document.body.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkTheme]);

  // реагируем на обновление токена / разлогин
  useEffect(() => {
    if (refreshToken) {
      setIsLogged(true);
    } else {
      setIsLogged(false);
    }
  }, [refreshToken, setIsLogged]);

  // Theme toggle function
  const toggleTheme = () => {
    setIsDarkTheme((prev) => !prev);
  };

  const isOddsDetails = location.pathname.startsWith("/bookmakers/odds/");
  const isBonusListActive =
    location.pathname === "/" || (location.pathname.startsWith("/bookmakers") && !isOddsDetails);
  const isTestActive = location.pathname.startsWith("/test");
  const isOddsActive = location.pathname.startsWith("/odds") || isOddsDetails;
  const isNewsActive = location.pathname.startsWith("/news");
  const isTranslationsActive = location.pathname.startsWith("/translations");
  const isArticlesActive = location.pathname.startsWith("/articles");

  return (
    <TranslationsProvider>
      <nav className="mt-4 flex justify-between space-x-6 border-b pb-2 items-center w-[95%]">
        <div />
        <div>
            {isBonusListActive ? (
              <span
                className="px-4 py-2 font-medium text-sm text-teal-600 border-b-2 border-teal-600 cursor-default pointer-events-none bg-transparent"
                aria-current="page"
              >
                Bonus List
              </span>
            ) : (
              <NavLink
                to="/"
                end
                className="px-4 py-2 font-medium text-sm text-gray-600 hover:text-teal-600 hover:bg-gray-100 transition"
              >
                Bonus List
              </NavLink>
            )}
            <NavLink
              to="/test"
              className={({ isActive }) =>
                isActive
                  ? "px-4 py-2 font-medium text-sm text-teal-600 border-b-2 border-teal-600 cursor-default pointer-events-none bg-transparent"
                  : "px-4 py-2 font-medium text-sm text-gray-600 hover:text-teal-600 hover:bg-gray-100 transition"
              }
              tabIndex={isTestActive ? -1 : 0}
              aria-current={isTestActive ? "page" : undefined}
            >
              Bonus Top
            </NavLink>
            <NavLink
              to="/odds"
              className={({ isActive }) =>
                isActive || isOddsActive
                  ? "px-4 py-2 font-medium text-sm text-teal-600 border-b-2 border-teal-600 cursor-default pointer-events-none bg-transparent"
                  : "px-4 py-2 font-medium text-sm text-gray-600 hover:text-teal-600 hover:bg-gray-100 transition"
              }
              tabIndex={isOddsActive ? -1 : 0}
              aria-current={isOddsActive ? "page" : undefined}
            >
              Odds
            </NavLink>
            <NavLink
              to="/news"
              className={({ isActive }) =>
                isActive || isNewsActive
                  ? "px-4 py-2 font-medium text-sm text-teal-600 border-b-2 border-teal-600 cursor-default pointer-events-none bg-transparent"
                  : "px-4 py-2 font-medium text-sm text-gray-600 hover:text-teal-600 hover:bg-gray-100 transition"
              }
              tabIndex={isNewsActive ? -1 : 0}
              aria-current={isNewsActive ? "page" : undefined}
            >
              News
            </NavLink>
            <NavLink
              to="/translations"
              className={({ isActive }) =>
                isActive || isTranslationsActive
                  ? "px-4 py-2 font-medium text-sm text-teal-600 border-b-2 border-teal-600 cursor-default pointer-events-none bg-transparent"
                  : "px-4 py-2 font-medium text-sm text-gray-600 hover:text-teal-600 hover:bg-gray-100 transition"
              }
              tabIndex={isTranslationsActive ? -1 : 0}
              aria-current={isTranslationsActive ? "page" : undefined}
            >
              Translations
            </NavLink>
            <NavLink
              to="/articles"
              className={({ isActive }) =>
                isActive || isArticlesActive
                  ? "px-4 py-2 font-medium text-sm text-teal-600 border-b-2 border-teal-600 cursor-default pointer-events-none bg-transparent"
                  : "px-4 py-2 font-medium text-sm text-gray-600 hover:text-teal-600 hover:bg-gray-100 transition"
              }
              tabIndex={isArticlesActive ? -1 : 0}
              aria-current={isArticlesActive ? "page" : undefined}
            >
              Articles
            </NavLink>
          </div>
        <div className="flex row">
          {isLogged && refreshToken ? (
            <>
              <button
                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition mr-4"
                type="button"
                onClick={() => logout()}
              >
                Выход
              </button>
              {/* <button
              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition ml-4"
              type="button"
              onClick={() => localStorage.setItem("accessToken", "")}
            >
              Очистить ACCESS
            </button>
            <button
              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition ml-4"
              type="button"
              onClick={() => localStorage.setItem("refreshToken", "")}
            >
              Очистить REFRESH
            </button> */}
            </>
          ) : (
            <button
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition mr-4"
              type="button"
              onClick={() => setAuthModalOpen(true)}
            >
              Вход / регистрация
            </button>
          )}
          {showThemeToggle && (
            <label className="flex items-center space-x-2 cursor-pointer">
              <div className="relative inline-block w-10 h-5 align-middle select-none">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isDarkTheme}
                  onChange={toggleTheme}
                />
                <div
                  className={`w-10 h-5 rounded-full shadow-inner ${
                    isDarkTheme ? "bg-green-300" : "bg-gray-300"
                  }`}
                ></div>
                <div
                  className={`absolute w-5 h-5 bg-white rounded-full shadow inset-y-0 left-0 transition-transform ${
                    isDarkTheme ? "transform translate-x-full bg-green-500" : ""
                  }`}
                ></div>
              </div>
              <span className="text-sm">{isDarkTheme ? "Dark" : "Light"}</span>
            </label>
          )}
        </div>
      </nav>
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
      <RedirectIfServerPage />
      <Routes>
        <Route
          path="/bookmakers/odds/:localeAndId"
          element={<BookmakerDetailsPage />}
        />
        <Route path="/bookmakers" element={<BonusList />} />
        <Route path="bookmakers/:params" element={<BonusList />} />
        <Route path="/bonuses/:id" element={<BonusDetailsPage />} />
        <Route path="/test" element={<TestTab />} />
        <Route path="/odds" element={<BookmakerRatingsPage />} />
        <Route
          path="/odds/:locale/:sport/:bookmakerId"
          element={<BookmakerDetailsPage />}
        />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/translations" element={<TranslationsPage />} />
        <Route path="/translations/:id" element={<TranslationDetailsPage />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/" element={<BonusList />} />
      </Routes>
    </TranslationsProvider>
  );
}

export default App;
