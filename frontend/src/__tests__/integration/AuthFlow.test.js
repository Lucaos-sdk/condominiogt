import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, createMockApiResponse, createMockApiError } from '../utils/test-utils';
import App from '../../App';
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
window.location = { href: '', pathname: '/' };

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    
    // Default to no stored credentials
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  test('complete login flow from login page to dashboard', async () => {
    const mockLoginResponse = createMockApiResponse({
      token: 'mock-jwt-token',
      user: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        condominiums: [
          { id: 1, name: 'Condominium Test' }
        ]
      }
    });

    const mockDashboardData = createMockApiResponse({
      metrics: {
        totalUnits: 100,
        totalBalance: 50000,
        totalMaintenanceRequests: 5,
        totalBookings: 12
      }
    });

    mockedAxios.post.mockResolvedValueOnce(mockLoginResponse);
    mockedAxios.get.mockResolvedValue(mockDashboardData);

    const user = userEvent.setup();
    render(<App />);

    // Should start on login page
    expect(screen.getByRole('heading', { name: /condominiogt/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();

    // Fill login form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    await user.clear(emailInput);
    await user.type(emailInput, 'john@example.com');
    await user.clear(passwordInput);
    await user.type(passwordInput, 'password123');

    // Submit login
    await user.click(submitButton);

    // Wait for login to complete and redirect to dashboard
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', {
        email: 'john@example.com',
        password: 'password123'
      });
    });

    // Verify localStorage was updated
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'user',
      JSON.stringify(mockLoginResponse.data.user)
    );

    // Should navigate to dashboard
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });

  test('login with invalid credentials shows error', async () => {
    const mockLoginError = createMockApiError('Credenciais inválidas', 401);
    mockedAxios.post.mockRejectedValueOnce(mockLoginError);

    const user = userEvent.setup();
    render(<App />);

    // Fill login form with invalid credentials
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    await user.clear(emailInput);
    await user.type(emailInput, 'invalid@example.com');
    await user.clear(passwordInput);
    await user.type(passwordInput, 'wrongpassword');

    await user.click(submitButton);

    // Should show error message and stay on login page
    await waitFor(() => {
      expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument();
    });

    // Should not have stored anything in localStorage
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  test('automatic login with stored credentials', async () => {
    const mockUser = {
      id: 1,
      name: 'Stored User',
      email: 'stored@example.com',
      role: 'manager',
    };

    // Mock stored credentials
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'stored-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    const mockDashboardData = createMockApiResponse({
      metrics: { totalUnits: 50 }
    });

    mockedAxios.get.mockResolvedValue(mockDashboardData);

    render(<App />);

    // Should automatically navigate to dashboard without login
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    // Should display stored user info
    expect(screen.getByText('Stored User')).toBeInTheDocument();
  });

  test('logout flow clears session and redirects to login', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    };

    // Start with stored credentials
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'stored-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    const mockLogoutResponse = createMockApiResponse({ message: 'Logout successful' });
    mockedAxios.post.mockResolvedValueOnce(mockLogoutResponse);
    mockedAxios.get.mockResolvedValue(createMockApiResponse({}));

    const user = userEvent.setup();
    render(<App />);

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    // Find and click user profile dropdown
    const profileButton = screen.getByRole('button', { name: /test user/i });
    await user.click(profileButton);

    // Click logout
    const logoutButton = screen.getByText(/sair/i);
    await user.click(logoutButton);

    // Should call logout API
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/logout');
    });

    // Should clear localStorage
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');

    // Should redirect to login page
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /condominiogt/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
  });

  test('expired token automatically redirects to login', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    };

    // Start with stored credentials
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'expired-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    // Mock 401 response for expired token
    const mockExpiredTokenError = createMockApiError('Token expired', 401);
    mockedAxios.get.mockRejectedValueOnce(mockExpiredTokenError);

    render(<App />);

    // Should automatically redirect to login due to expired token
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /condominiogt/i })).toBeInTheDocument();
    });

    // Should have cleared localStorage
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
  });

  test('navigation between protected routes works after authentication', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    };

    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'valid-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    // Mock API responses for different pages
    mockedAxios.get.mockResolvedValue(createMockApiResponse({}));

    const user = userEvent.setup();
    render(<App />);

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    // Navigate to financial module
    const financialLink = screen.getByText(/financeiro/i);
    await user.click(financialLink);

    await waitFor(() => {
      expect(screen.getByText(/transações/i)).toBeInTheDocument();
    });

    // Navigate to users module
    const usersLink = screen.getByText(/usuários/i);
    await user.click(usersLink);

    await waitFor(() => {
      expect(screen.getByText(/lista de usuários/i)).toBeInTheDocument();
    });
  });

  test('handles network errors during login gracefully', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));

    const user = userEvent.setup();
    render(<App />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    await user.clear(emailInput);
    await user.type(emailInput, 'test@example.com');
    await user.clear(passwordInput);
    await user.type(passwordInput, 'password');

    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/erro de conexão/i)).toBeInTheDocument();
    });

    // Should remain on login page
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});