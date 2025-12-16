import { useState, useEffect } from "react";
import useAuthStore from "../../store/auth-store.js";

const VITE_AUTH_ENDPOINT = import.meta.env.VITE_AUTH_ENDPOINT;
const VITE_REG_ENDPOINT = import.meta.env.VITE_REG_ENDPOINT;

const initialRegForm = {
  username: "",
  full_name: "",
  password: "",
  confirmPassword: "",
};

const createInitialLoginForm = () => ({
  login: localStorage.getItem("lastLoginEmail") || "",
  password: "",
});

export default function AuthModal({ isOpen, onClose }) {
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [tab, setTab] = useState("login");
  const [loginForm, setLoginForm] = useState(() => createInitialLoginForm());
  const [isPasswordMatch, setIsPasswordMatch] = useState(true);
  const [registerForm, setRegisterForm] = useState(initialRegForm);
  const [registerError, setRegisterError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isRegEmailValid, setIsRegEmailValid] = useState(false);

  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setIsLogged = useAuthStore((state) => state.setIsLogged);

  // LOGIN FORM SENDING

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");

    try {
      const body = new URLSearchParams();
      body.append("username", loginForm.login);
      body.append("password", loginForm.password);

      const res = await fetch(VITE_AUTH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          console.warn("Unauthorized:", data);
          setLoginError("Неверный логин или пароль, или аккаунт неактивен");
        } else {
          console.error("Login failed:", res.status, data);
          setLoginError(
            "Ошибка входа: " + (data.detail || `код ${res.status}`)
          );
        }
        return;
      }

      console.log("Login response:", data);

      if (data.refresh_token && data.access_token) {
        localStorage.setItem("refreshToken", data.refresh_token);
        localStorage.setItem("lastLoginEmail", loginForm.login);
        setAccessToken(data.access_token);
        setIsLogged(true);
        onClose();
      } else {
        setLoginError("Ответ сервера не содержит токены.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setLoginError("Какая-то ошибка");
    }
  };

  // REGISTRATION FORM SENDING
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError("");

    try {
      const res = await fetch(VITE_REG_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: registerForm.username,
          full_name: registerForm.full_name,
          password: registerForm.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRegisterError(data.detail);
      } else {
        setRegisterSuccess(true);
      }
      console.log("Register response:", data);
    } catch (err) {
      console.error("Register error:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoginForm(createInitialLoginForm());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-35 z-[1000] flex items-center justify-center">
      <div
        className="bg-white rounded-xl shadow-2xl p-8 min-w-[500px] max-w-[500px] relative min-h-[560px]"
        onClick={(e) => {
          e.stopPropagation();
          setLoginError("");
        }}
      >
        <button
          className="absolute top-3 right-4 text-xl w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-700 transition p-0"
          style={{ lineHeight: 1 }}
          onClick={onClose}
          aria-label="Закрыть"
        >
          &times;
        </button>
        <div className="flex justify-center mb-6 gap-2">
          <button
            className={`px-4 py-2 rounded-t-md font-medium text-base transition border-b-2 ${
              tab === "login"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500"
            }`}
            onClick={() => setTab("login")}
          >
            Вход
          </button>
          <button
            className={`px-4 py-2 rounded-t-md font-medium text-base transition border-b-2 ${
              tab === "register"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500"
            }`}
            onClick={() => setTab("register")}
          >
            Регистрация
          </button>
        </div>
        {tab === "login" ? (
          <form className="flex flex-col gap-4" onSubmit={handleLoginSubmit}>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="login-username"
                className="text-base text-gray-700"
              >
                Email
              </label>
              <input
                type="text"
                id="login-username"
                name="username"
                className="px-3 py-2 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={loginForm.login}
                onChange={(e) => {
                  setLoginForm({ ...loginForm, login: e.target.value });
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="login-password"
                className="text-base text-gray-700"
              >
                Пароль
              </label>
              <input
                type="password"
                id="login-password"
                name="password"
                className="px-3 py-2 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-5 py-2 text-base font-medium transition"
            >
              Вход
            </button>
            {loginError && <p className="text-red-600">{loginError}</p>}
          </form>
        ) : registerSuccess ? (
          <div className="flex flex-col items-center justify-center min-h-[200px]">
            <div className="text-green-600 text-lg font-semibold mb-4">
              Регистрация прошла успешно! Напишите Александру Носкову, чтобы он
              активировал вашу учетную запись
            </div>
            <button
              className="px-4 py-2 rounded-t-md font-medium text-base transition border-b-2 border-blue-600 text-white bg-blue-600"
              onClick={() => {
                onClose();
                setRegisterSuccess(false);
                setRegisterForm(initialRegForm);
              }}
            >
              OK
            </button>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleRegisterSubmit}>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="register-username"
                className="text-base text-gray-700"
              >
                Email (в домене legalbet.com или legalbet.ru) *
              </label>
              <input
                type="text"
                id="register-username"
                name="username"
                className="px-3 py-2 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={registerForm.username}
                onChange={(e) => {
                  setRegisterForm({
                    ...registerForm,
                    username: e.target.value,
                  });
                  setIsRegEmailValid(
                    e.target.value.includes("legalbet.com") ||
                      e.target.value.includes("legalbet.ru")
                  );
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="register-fullname"
                className="text-base text-gray-700"
              >
                Имя *
              </label>
              <input
                type="text"
                id="register-fullname"
                name="full_name"
                className="px-3 py-2 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={registerForm.full_name}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    full_name: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="register-password"
                className="text-base text-gray-700"
              >
                Пароль *
              </label>
              <input
                type="password"
                id="register-password"
                name="password"
                className="px-3 py-2 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={registerForm.password}
                onChange={(e) => {
                  setRegisterForm({
                    ...registerForm,
                    password: e.target.value,
                  });
                  setIsPasswordMatch(
                    e.target.value === registerForm.confirmPassword
                  );
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="register-confirmPassword"
                className="text-base text-gray-700"
              >
                Еще раз пароль *
              </label>
              <input
                type="password"
                id="register-confirmPassword"
                name="confirmPassword"
                className="px-3 py-2 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={registerForm.confirmPassword}
                onChange={(e) => {
                  setRegisterForm({
                    ...registerForm,
                    confirmPassword: e.target.value,
                  });
                  setIsPasswordMatch(registerForm.password === e.target.value);
                }}
              />
            </div>
            <button
              disabled={
                !isPasswordMatch ||
                !registerForm.password ||
                !registerForm.confirmPassword ||
                !isRegEmailValid ||
                !registerForm.full_name
              }
              type="submit"
              className={`${
                !isPasswordMatch ||
                !registerForm.password ||
                !registerForm.confirmPassword ||
                !isRegEmailValid ||
                !registerForm.full_name
                  ? "bg-gray-400 hover:bg-gray-400"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white rounded-md px-5 py-2 text-base font-medium transition`}
            >
              Регистрация
            </button>
            {registerError && (
              <div className="text-red-600">{registerError}</div>
            )}
            {!isPasswordMatch && (
              <div className="text-red-600">Пароли не совпадают</div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
