import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock do AuthContext para testes
const mockAuthContext = {
  user: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
  },
  token: 'mock-token',
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
  selectedCondominium: {
    id: 1,
    name: 'Test Condominium',
  },
  setSelectedCondominium: jest.fn(),
};

// Mock do WebSocketContext para testes
const mockWebSocketContext = {
  socket: null,
  connected: false,
  notifications: [],
  unreadCount: 0,
  onlineUsers: [],
  markAsRead: jest.fn(),
  filterNotifications: jest.fn(() => []),
};

// Mock contexts
const AuthContext = React.createContext();
const WebSocketContext = React.createContext();

// Provider customizado para testes
const TestProviders = ({ children, authValue, webSocketValue }) => {
  return (
    <BrowserRouter>
      <AuthContext.Provider value={authValue || mockAuthContext}>
        <WebSocketContext.Provider value={webSocketValue || mockWebSocketContext}>
          {children}
        </WebSocketContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

// Função de render customizada para testes
const customRender = (ui, options = {}) => {
  const {
    authValue,
    webSocketValue,
    ...renderOptions
  } = options;

  const Wrapper = ({ children }) => (
    <TestProviders authValue={authValue} webSocketValue={webSocketValue}>
      {children}
    </TestProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock dados para testes
export const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  condominiums: [
    { id: 1, name: 'Test Condominium' },
  ],
};

export const mockCondominium = {
  id: 1,
  name: 'Test Condominium',
  cnpj: '12.345.678/0001-90',
  email: 'test@condominio.com',
  phone: '(11) 99999-9999',
  address: 'Test Address',
  total_units: 100,
  status: 'active',
};

export const mockTransaction = {
  id: 1,
  description: 'Test Transaction',
  amount: 1000.00,
  type: 'income',
  category: 'condominium_fee',
  status: 'paid',
  due_date: '2025-07-30',
  condominium_id: 1,
};

export const mockNotification = {
  id: 1,
  type: 'communication_created',
  data: {
    title: 'Test Notification',
    message: 'Test message',
    priority: 'medium',
  },
  read: false,
  created_at: new Date().toISOString(),
};

// Função para criar mock de API responses
export const createMockApiResponse = (data, status = 200) => ({
  data: {
    success: true,
    data,
    ...data,
  },
  status,
  statusText: 'OK',
  headers: {},
  config: {},
});

// Função para criar mock de erro de API
export const createMockApiError = (message = 'API Error', status = 500) => ({
  response: {
    data: {
      success: false,
      message,
    },
    status,
    statusText: 'Internal Server Error',
  },
  message,
});

// Helpers para aguardar elementos assíncronos
export const waitForElementToBeRemoved = async (element) => {
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (!document.contains(element)) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render };
export { TestProviders };
export { mockAuthContext, mockWebSocketContext };