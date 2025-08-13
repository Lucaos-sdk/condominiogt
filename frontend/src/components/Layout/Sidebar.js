import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: '📊',
      description: 'Visão geral'
    },
    { 
      name: 'Financeiro', 
      href: '/financeiro', 
      icon: '💰',
      description: 'Transações e relatórios'
    },
    { 
      name: 'Manutenção', 
      href: '/manutencao', 
      icon: '🔧',
      description: 'Solicitações e serviços'
    },
    { 
      name: 'Áreas Comuns', 
      href: '/areas-comuns', 
      icon: '🏊‍♂️',
      description: 'Piscina, salão, quadra'
    },
    { 
      name: 'Reservas', 
      href: '/reservas', 
      icon: '📅',
      description: 'Agendamentos'
    },
    { 
      name: 'Comunicados', 
      href: '/comunicados', 
      icon: '📢',
      description: 'Avisos e notícias'
    },
    { 
      name: 'Usuários', 
      href: '/usuarios', 
      icon: '👥',
      description: 'Moradores e funcionários'
    },
    { 
      name: 'Condomínios', 
      href: '/condominios', 
      icon: '🏢',
      description: 'Gestão de prédios'
    },
    { 
      name: 'Unidades', 
      href: '/unidades', 
      icon: '🏠',
      description: 'Apartamentos e casas'
    },
    { 
      name: 'Relatórios', 
      href: '/relatorios', 
      icon: '📈',
      description: 'Análises e estatísticas'
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">🏢</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">CondominioGT</h1>
          </div>
          
          {/* Close button - mobile only */}
          <button
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            onClick={onClose}
          >
            <span className="sr-only">Fechar menu</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
              onClick={() => {
                // Close mobile menu when navigation item is clicked
                if (window.innerWidth < 1024) {
                  onClose();
                }
              }}
            >
              <span className="text-lg mr-3">{item.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-gray-500 group-hover:text-gray-600">
                  {item.description}
                </div>
              </div>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-medium text-sm">👤</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'Usuário'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || 'email@exemplo.com'}
              </p>
              <p className="text-xs text-blue-600 capitalize">
                {user?.role || 'role'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="mt-3 w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors duration-200"
          >
            Sair
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;