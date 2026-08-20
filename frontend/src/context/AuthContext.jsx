import { useCallback, useEffect, useState } from 'react';
import * as authApi from '../api/authApi';
import { setOnUnauthorized } from '../api/axiosClient';
import { AuthContext } from './authContextInstance';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(logout);
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const check = token
      ? authApi.me()
          .then((data) => setUser(data.user))
          .catch((err) => {
            // Seul un 401 (token vraiment invalide/expiré) doit déconnecter. Un incident
            // réseau ou serveur transitoire ne doit pas faire perdre la session — l'agent
            // reste non connecté pour ce chargement mais retentera au suivant, sans avoir
            // à se ré-authentifier pour une simple coupure passagère.
            if (err.response?.status === 401) {
              localStorage.removeItem('token');
            }
          })
      : Promise.resolve();
    check.finally(() => setInitializing(false));
  }, []);

  async function login(username, password) {
    const data = await authApi.login(username, password);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  }

  return (
    <AuthContext.Provider value={{ user, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
