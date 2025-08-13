import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock dos contextos para evitar importações complexas
jest.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: () => ({
    user: null,
    loading: false,
    isAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock('../contexts/WebSocketContext', () => ({
  WebSocketProvider: ({ children }) => <div data-testid="websocket-provider">{children}</div>,
  useWebSocket: () => ({
    socket: null,
    connected: false,
    notifications: [],
    unreadCount: 0,
  }),
}));

// Mock do React Router
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div data-testid="router">{children}</div>,
  Routes: ({ children }) => <div data-testid="routes">{children}</div>,
  Route: ({ children }) => <div data-testid="route">{children}</div>,
  Navigate: () => <div data-testid="navigate">Redirecting...</div>,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
}));

// Mock do react-toastify
jest.mock('react-toastify', () => ({
  ToastContainer: () => <div data-testid="toast-container">Toast Container</div>,
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

import App from '../App';

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />);
    
    // Verifica se os providers estão presentes
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
    expect(screen.getByTestId('router')).toBeInTheDocument();
    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
  });

  test('has proper component structure', () => {
    render(<App />);
    
    // Verifica a estrutura básica da aplicação
    const authProvider = screen.getByTestId('auth-provider');
    const webSocketProvider = screen.getByTestId('websocket-provider');
    const router = screen.getByTestId('router');
    
    expect(authProvider).toBeInTheDocument();
    expect(webSocketProvider).toBeInTheDocument();
    expect(router).toBeInTheDocument();
  });

  test('includes ToastContainer for notifications', () => {
    render(<App />);
    
    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
  });
});