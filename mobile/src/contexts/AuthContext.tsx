import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken, removeToken, saveToken } from '../services/tokenStorage';
import api from '../services/api';

export interface User {
  user_id: number;
  username: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  status: 'ACTIVE' | 'LOCKED' | 'BANNED';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (newToken: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await getToken();
        if (storedToken) {
          setToken(storedToken);
          // Thử lấy thông tin user hiện tại nếu token còn hạn
          try {
            const res = await api.get<any>('/auth/me');
            const userData = res?.data?.user || res?.data;
            if (userData && (userData.user_id || userData.username)) {
              setUser(userData);
            }
          } catch (e) {
            // Token hết hạn hoặc không hợp lệ -> xóa token
            await removeToken();
            setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Failed to load stored auth:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStoredAuth();
  }, []);

  const login = async (newToken: string, userData: User) => {
    await saveToken(newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = async () => {
    await removeToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
