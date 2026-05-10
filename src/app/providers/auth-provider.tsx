'use client';

import {
  createContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { AuthState } from '@/entities/user/model/types';

// ── Tipo del contexto ───────────────────────────────────────────────

type AuthContextType = {
  state: AuthState;
  setState: Dispatch<SetStateAction<AuthState>>;
};

// ── Contexto (exportado para useAuth) ───────────────────────────────

export const AuthContext = createContext<AuthContextType | null>(null);

// ── Constantes ──────────────────────────────────────────────────────

const TOKEN_KEY = 'token';
const USER_KEY = 'auth_user';

// ── Provider ────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Flag para evitar que el efecto de sincronización borre datos
  // antes de que la hidratación desde localStorage termine.
  const hydrated = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);

        if (token && savedUser) {
          const user = JSON.parse(savedUser);
          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
      hydrated.current = true;
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Sincronizar user en localStorage cuando cambia el estado.
  // Solo DESPUÉS de la hidratación inicial para no borrar datos prematuramente.
  useEffect(() => {
    if (!hydrated.current) return;

    if (state.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(state.user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ state, setState }}>
      {children}
    </AuthContext.Provider>
  );
}
