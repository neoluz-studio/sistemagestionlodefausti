'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from './api-client';
import {
  clearTokens,
  getRefreshToken,
  getUserState,
  setTokens,
  setUserState,
} from './auth-storage';
import { AuthUser, StoreContext } from './types';

type LoginInput = {
  identifier: string;
  password: string;
};

type AuthState = {
  user: AuthUser | null;
  store: StoreContext;
  isAuthenticated: boolean;
  loading: boolean;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    store: null,
    isAuthenticated: false,
    loading: true,
  });

  const applyPayload = useCallback((payload: any) => {
    setTokens(payload.accessToken, payload.refreshToken);
    setUserState(payload.user, payload.store);
    setState({
      user: payload.user,
      store: payload.store,
      isAuthenticated: true,
      loading: false,
    });
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const res = await api.post('/api/v1/auth/login', input);
      const payload = res.data.data ?? res.data;
      applyPayload(payload);
      return payload;
    },
    [applyPayload],
  );

  const refresh = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');
    const res = await api.post('/api/v1/auth/refresh', { refreshToken });
    const payload = res.data.data ?? res.data;
    applyPayload(payload);
    return payload;
  }, [applyPayload]);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await api.post('/api/v1/auth/logout', { refreshToken });
      }
    } finally {
      clearTokens();
      setState({ user: null, store: null, isAuthenticated: false, loading: false });
    }
  }, []);

  const me = useCallback(async () => {
    const res = await api.get('/api/v1/auth/me');
    const payload = res.data.data ?? res.data;
    setState({
      user: payload.user,
      store: payload.store,
      isAuthenticated: true,
      loading: false,
    });
    return payload;
  }, []);

  useEffect(() => {
    const cachedUser = getUserState<AuthUser>();
    if (cachedUser) {
      setState((prev) => ({
        ...prev,
        user: cachedUser,
        isAuthenticated: true,
        loading: false,
      }));
      return;
    }
    setState((prev) => ({ ...prev, loading: false }));
  }, []);

  return useMemo(
    () => ({ ...state, login, logout, refresh, me }),
    [state, login, logout, refresh, me],
  );
}
