import { create } from "zustand";

const REFRESH_ENDPOINT = import.meta.env.VITE_REFRESH_ENDPOINT;

const useAuthStore = create((set, get) => ({
  accessToken: localStorage.getItem("accessToken") ?? "",
  refreshToken: localStorage.getItem("refreshToken") ?? "",
  isLogged: !!localStorage.getItem("accessToken"),

  setAccessToken: (newToken) => {
    set({ accessToken: newToken });
    localStorage.setItem("accessToken", newToken);
  },

  setRefreshToken: (newToken) => {
    set({ refreshToken: newToken });
    localStorage.setItem("refreshToken", newToken);
  },

  setIsLogged: (newValue) => {
    set({ isLogged: newValue });
  },

  logout: () => {
    console.log("Logging out");
    set({ accessToken: "", refreshToken: "", isLogged: false });
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },

  refreshAccessToken: async () => {
    try {
      const { refreshToken, logout, setAccessToken, setIsLogged } = get();

      if (!refreshToken) {
        logout();
        return null;
      }

      const body = new URLSearchParams();
      body.append("refresh_token", refreshToken);

      console.log("REFRESH_ENDPOINT=", JSON.stringify(REFRESH_ENDPOINT));

      const res = await fetch(REFRESH_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!res.ok) {
        logout();
        return null;
      }

      const data = await res.json();
      setAccessToken(data.access_token);
      setIsLogged(true);

      return data.access_token;
    } catch (e) {
      console.error("Token refresh error:", e);
      get().logout();
      return null;
    }
  },
}));

export default useAuthStore;
