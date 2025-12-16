import useAuthStore from "../store/auth-store";

export const dataFetch = async (payload, fetchMethod, dataEndpoint) => {
  const { accessToken, refreshAccessToken, logout } = useAuthStore.getState();

  const buildOptions = (token) => {
    const options = {
      method: fetchMethod,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    if (fetchMethod !== "GET" && payload !== null) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(payload);
    }

    return options;
  };

  let tokenToUse = accessToken;

  let response = await fetch(dataEndpoint, buildOptions(tokenToUse));

  if (response.status === 401) {
    console.log("Access token expired, refreshing...");

    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      tokenToUse = newAccessToken;
      response = await fetch(dataEndpoint, buildOptions(tokenToUse));
    } else {
      logout();
      throw new Error("Please log in again");
    }
  }

  return response;
};
