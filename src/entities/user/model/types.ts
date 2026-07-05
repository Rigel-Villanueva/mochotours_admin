/**
 * Tipos de la entidad User.
 * Coinciden con la respuesta del POST /api/auth/login del backend.
 */

/** Usuario autenticado */
export type User = {
  id: string;
  email: string;
  rol?: 'admin' | 'superadmin';
};

/** Sesión devuelta por el backend al hacer login */
export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

/** Datos que se envían al hacer login */
export type LoginInput = {
  email: string;
  password: string;
};

/** Estado de autenticación que usa el AuthProvider */
export type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};
