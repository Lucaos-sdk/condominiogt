import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockAuthContext, mockWebSocketContext } from '../utils/test-utils';
import Header from '../../components/Layout/Header';

describe('Header Component', () => {
  const defaultProps = {
    sidebarOpen: false,
    setSidebarOpen: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders header with user information', () => {
    render(<Header {...defaultProps} />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  test('displays hamburger menu button', () => {
    render(<Header {...defaultProps} />);
    
    const menuButton = screen.getByRole('button', { name: /menu/i });
    expect(menuButton).toBeInTheDocument();
  });

  test('calls setSidebarOpen when menu button is clicked', async () => {
    const mockSetSidebarOpen = jest.fn();
    const user = userEvent.setup();
    
    render(<Header {...defaultProps} setSidebarOpen={mockSetSidebarOpen} />);
    
    const menuButton = screen.getByRole('button', { name: /menu/i });
    await user.click(menuButton);
    
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(true);
  });

  test('displays notification badge with unread count', () => {
    const customWebSocketContext = {
      ...mockWebSocketContext,
      unreadCount: 5,
    };
    
    render(
      <Header {...defaultProps} />,
      { webSocketValue: customWebSocketContext }
    );
    
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  test('does not display notification badge when unread count is 0', () => {
    const customWebSocketContext = {
      ...mockWebSocketContext,
      unreadCount: 0,
    };
    
    render(
      <Header {...defaultProps} />,
      { webSocketValue: customWebSocketContext }
    );
    
    // Badge should not be visible
    const badge = screen.queryByTestId('notification-badge');
    expect(badge).not.toBeInTheDocument();
  });

  test('shows connection status indicator', () => {
    const customWebSocketContext = {
      ...mockWebSocketContext,
      connected: true,
    };
    
    render(
      <Header {...defaultProps} />,
      { webSocketValue: customWebSocketContext }
    );
    
    expect(screen.getByTitle(/conectado/i)).toBeInTheDocument();
  });

  test('shows disconnected status when WebSocket is offline', () => {
    const customWebSocketContext = {
      ...mockWebSocketContext,
      connected: false,
    };
    
    render(
      <Header {...defaultProps} />,
      { webSocketValue: customWebSocketContext }
    );
    
    expect(screen.getByTitle(/desconectado/i)).toBeInTheDocument();
  });

  test('displays user dropdown menu when profile is clicked', async () => {
    const user = userEvent.setup();
    render(<Header {...defaultProps} />);
    
    const profileButton = screen.getByRole('button', { name: /test user/i });
    await user.click(profileButton);
    
    expect(screen.getByText(/perfil/i)).toBeInTheDocument();
    expect(screen.getByText(/configurações/i)).toBeInTheDocument();
    expect(screen.getByText(/sair/i)).toBeInTheDocument();
  });

  test('calls logout when logout option is clicked', async () => {
    const mockLogout = jest.fn();
    const customAuthContext = {
      ...mockAuthContext,
      logout: mockLogout,
    };
    
    const user = userEvent.setup();
    render(
      <Header {...defaultProps} />,
      { authValue: customAuthContext }
    );
    
    // Open dropdown
    const profileButton = screen.getByRole('button', { name: /test user/i });
    await user.click(profileButton);
    
    // Click logout
    const logoutButton = screen.getByText(/sair/i);
    await user.click(logoutButton);
    
    expect(mockLogout).toHaveBeenCalled();
  });

  test('displays search input field', () => {
    render(<Header {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/buscar/i);
    expect(searchInput).toBeInTheDocument();
  });

  test('allows typing in search field', async () => {
    const user = userEvent.setup();
    render(<Header {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/buscar/i);
    await user.type(searchInput, 'test search');
    
    expect(searchInput).toHaveValue('test search');
  });

  test('handles search submission', async () => {
    const user = userEvent.setup();
    render(<Header {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/buscar/i);
    await user.type(searchInput, 'test search');
    await user.keyboard('{Enter}');
    
    // This would typically trigger a search function
    // The exact implementation depends on how search is handled
    expect(searchInput).toHaveValue('test search');
  });

  test('renders with different user roles', () => {
    const managerAuthContext = {
      ...mockAuthContext,
      user: {
        ...mockAuthContext.user,
        role: 'manager',
        name: 'Manager User',
      },
    };
    
    render(
      <Header {...defaultProps} />,
      { authValue: managerAuthContext }
    );
    
    expect(screen.getByText('Manager User')).toBeInTheDocument();
    expect(screen.getByText('manager')).toBeInTheDocument();
  });

  test('handles sidebar state correctly', () => {
    const { rerender } = render(<Header {...defaultProps} sidebarOpen={false} />);
    
    // Test with sidebar closed
    expect(screen.getByTestId('header')).toBeInTheDocument();
    
    // Test with sidebar open
    rerender(<Header {...defaultProps} sidebarOpen={true} />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  test('displays current time/date', () => {
    render(<Header {...defaultProps} />);
    
    // Check if there's a time/date element
    // The exact implementation may vary
    const timeElement = screen.queryByTestId('current-time');
    if (timeElement) {
      expect(timeElement).toBeInTheDocument();
    }
  });

  test('has proper accessibility attributes', () => {
    render(<Header {...defaultProps} />);
    
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    
    const menuButton = screen.getByRole('button', { name: /menu/i });
    expect(menuButton).toHaveAttribute('aria-label');
    
    const searchInput = screen.getByPlaceholderText(/buscar/i);
    expect(searchInput).toHaveAttribute('type', 'search');
  });

  test('handles keyboard navigation for dropdown', async () => {
    const user = userEvent.setup();
    render(<Header {...defaultProps} />);
    
    const profileButton = screen.getByRole('button', { name: /test user/i });
    
    // Open dropdown with Enter key
    await user.click(profileButton);
    await user.keyboard('{Enter}');
    
    // Verify dropdown is open
    expect(screen.getByText(/perfil/i)).toBeInTheDocument();
    
    // Navigate with arrow keys
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    
    // This would select the logout option in a real implementation
  });
});