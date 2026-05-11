"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearStoredToken, getStoredToken, setStoredToken } from "../lib/auth";

const AuthContext = createContext({
  token: null,
  ready: false,
  setToken: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredToken();
    if (stored) {
      setTokenState(stored);
    }
    setReady(true);
  }, []);

  const setToken = useCallback((nextToken) => {
    if (nextToken) {
      setStoredToken(nextToken);
      setTokenState(nextToken);
      return;
    }

    clearStoredToken();
    setTokenState(null);
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
  }, [setToken]);

  const value = useMemo(
    () => ({
      token,
      ready,
      setToken,
      signOut,
    }),
    [token, ready, setToken, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
