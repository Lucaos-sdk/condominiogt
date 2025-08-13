import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockAuthContext } from '../utils/test-utils';
import Login from '../../pages/Login';

// Mock do hook useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form with all required fields', () => {
    render(<Login />);
    
    expect(screen.getByRole('heading', { name: /condominiogt/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /lembrar-me/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  test('has default values in form fields', () => {
    render(<Login />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    
    expect(emailInput).toHaveValue('admin@condominiogt.com');
    expect(passwordInput).toHaveValue('123456');
  });

  test('allows user to type in email and password fields', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    
    await user.clear(emailInput);
    await user.type(emailInput, 'test@example.com');
    expect(emailInput).toHaveValue('test@example.com');
    
    await user.clear(passwordInput);
    await user.type(passwordInput, 'newpassword');
    expect(passwordInput).toHaveValue('newpassword');
  });

  test('toggles remember me checkbox', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const rememberCheckbox = screen.getByRole('checkbox', { name: /lembrar-me/i });
    
    expect(rememberCheckbox).not.toBeChecked();
    
    await user.click(rememberCheckbox);
    expect(rememberCheckbox).toBeChecked();
    
    await user.click(rememberCheckbox);
    expect(rememberCheckbox).not.toBeChecked();
  });

  test('shows loading state during login attempt', async () => {
    const mockLogin = jest.fn(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );
    
    const customAuthContext = {
      ...mockAuthContext,
      login: mockLogin,
    };
    
    const user = userEvent.setup();
    render(<Login />, { authValue: customAuthContext });
    
    const submitButton = screen.getByRole('button', { name: /entrar/i });
    
    await user.click(submitButton);
    
    expect(screen.getByText(/entrando/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.queryByText(/entrando/i)).not.toBeInTheDocument();
    });
  });

  test('handles successful login', async () => {
    const mockLogin = jest.fn(() => Promise.resolve({ success: true }));
    
    const customAuthContext = {
      ...mockAuthContext,
      login: mockLogin,
    };
    
    const user = userEvent.setup();
    render(<Login />, { authValue: customAuthContext });
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });
    
    await user.clear(emailInput);
    await user.type(emailInput, 'test@example.com');
    await user.clear(passwordInput);
    await user.type(passwordInput, 'password123');
    
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('handles login failure and shows error message', async () => {
    const mockLogin = jest.fn(() => 
      Promise.resolve({ success: false, message: 'Credenciais inválidas' })
    );
    
    const customAuthContext = {
      ...mockAuthContext,
      login: mockLogin,
    };
    
    const user = userEvent.setup();
    render(<Login />, { authValue: customAuthContext });
    
    const submitButton = screen.getByRole('button', { name: /entrar/i });
    
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test('handles login exception and shows generic error', async () => {
    const mockLogin = jest.fn(() => Promise.reject(new Error('Network error')));
    
    const customAuthContext = {
      ...mockAuthContext,
      login: mockLogin,
    };
    
    const user = userEvent.setup();
    render(<Login />, { authValue: customAuthContext });
    
    const submitButton = screen.getByRole('button', { name: /entrar/i });
    
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Erro inesperado. Tente novamente.')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test('prevents form submission when already loading', async () => {
    const mockLogin = jest.fn(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 200))
    );
    
    const customAuthContext = {
      ...mockAuthContext,
      login: mockLogin,
    };
    
    const user = userEvent.setup();
    render(<Login />, { authValue: customAuthContext });
    
    const submitButton = screen.getByRole('button', { name: /entrar/i });
    
    // Primeiro clique
    await user.click(submitButton);
    expect(submitButton).toBeDisabled();
    
    // Segundo clique (deve ser ignorado)
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
  });

  test('clears error message when form data changes', async () => {
    const mockLogin = jest.fn(() => 
      Promise.resolve({ success: false, message: 'Erro de teste' })
    );
    
    const customAuthContext = {
      ...mockAuthContext,
      login: mockLogin,
    };
    
    const user = userEvent.setup();
    render(<Login />, { authValue: customAuthContext });
    
    // Primeiro, causa um erro
    const submitButton = screen.getByRole('button', { name: /entrar/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Erro de teste')).toBeInTheDocument();
    });
    
    // Agora, modifica o campo de email
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'a');
    
    // O erro deve desaparecer
    expect(screen.queryByText('Erro de teste')).not.toBeInTheDocument();
  });

  test('has proper form accessibility attributes', () => {
    render(<Login />);
    
    const form = screen.getByRole('form');
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });
    
    expect(form).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
    expect(submitButton).toHaveAttribute('type', 'submit');
  });
});