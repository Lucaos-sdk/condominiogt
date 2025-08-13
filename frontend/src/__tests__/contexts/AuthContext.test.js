import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = mockLocalStorage;

// Mock window.location
delete window.location;
window.location = { href: '' };

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
  });

  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  test('initializes with loading state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  test('loads user from localStorage on initialization', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    };

    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'mock-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for useEffect to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  test('handles invalid user data in localStorage', async () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'mock-token';
      if (key === 'user') return 'invalid-json';
      return null;
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
  });

  test('successful login updates state and localStorage', async () => {
    const mockLoginResponse = {
      data: {
        success: true,
        token: 'new-token',
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin',
        },
      },
    };

    mockedAxios.post.mockResolvedValueOnce(mockLoginResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('test@example.com', 'password');
    });

    expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password',
    });

    expect(loginResult).toEqual({ success: true });
    expect(result.current.user).toEqual(mockLoginResponse.data.user);
    expect(result.current.isAuthenticated).toBe(true);
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'new-token');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'user',
      JSON.stringify(mockLoginResponse.data.user)
    );
  });

  test('failed login returns error message', async () => {
    const mockErrorResponse = {
      response: {
        data: {
          success: false,
          message: 'Credenciais inválidas',
        },
      },
    };

    mockedAxios.post.mockRejectedValueOnce(mockErrorResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('test@example.com', 'wrong-password');
    });

    expect(loginResult).toEqual({
      success: false,
      message: 'Credenciais inválidas',
    });

    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  test('login handles network error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('test@example.com', 'password');
    });

    expect(loginResult).toEqual({
      success: false,
      message: 'Erro de conexão. Tente novamente.',
    });
  });

  test('logout clears state and localStorage', async () => {
    // First, set up a logged-in state
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    };

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Set initial state
    await act(async () => {
      result.current.setUser(mockUser);
      result.current.setIsAuthenticated(true);
    });

    // Mock successful logout response
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

    // Perform logout
    await act(async () => {
      await result.current.logout();
    });

    expect(mockedAxios.post).toHaveBeenCalledWith('/auth/logout');
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
  });

  test('logout handles API error gracefully', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Logout failed'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    // Should still clear local state even if API call fails
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
  });

  test('updateProfile updates user data', async () => {
    const initialUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    };

    const updatedUser = {
      ...initialUser,
      name: 'Updated Name',
      email: 'updated@example.com',
    };

    const mockUpdateResponse = {
      data: {
        success: true,
        user: updatedUser,
      },
    };

    mockedAxios.put.mockResolvedValueOnce(mockUpdateResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Set initial user
    await act(async () => {
      result.current.setUser(initialUser);
      result.current.setIsAuthenticated(true);
    });

    // Update profile
    let updateResult;
    await act(async () => {
      updateResult = await result.current.updateProfile({
        name: 'Updated Name',
        email: 'updated@example.com',
      });
    });

    expect(mockedAxios.put).toHaveBeenCalledWith('/auth/profile', {
      name: 'Updated Name',
      email: 'updated@example.com',
    });

    expect(updateResult).toEqual({ success: true });
    expect(result.current.user).toEqual(updatedUser);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'user',
      JSON.stringify(updatedUser)
    );
  });

  test('updateProfile handles API error', async () => {
    const mockErrorResponse = {
      response: {
        data: {
          success: false,
          message: 'Validation error',
        },
      },
    };

    mockedAxios.put.mockRejectedValueOnce(mockErrorResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    let updateResult;
    await act(async () => {
      updateResult = await result.current.updateProfile({
        name: 'Updated Name',
      });
    });

    expect(updateResult).toEqual({
      success: false,
      message: 'Validation error',
    });
  });

  test('provides all expected context values', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('isAuthenticated');
    expect(result.current).toHaveProperty('login');
    expect(result.current).toHaveProperty('logout');
    expect(result.current).toHaveProperty('updateProfile');
  });

  test('throws error when used outside AuthProvider', () => {
    // Mock console.error to avoid error output in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth deve ser usado dentro do AuthProvider');

    consoleSpy.mockRestore();
  });
});