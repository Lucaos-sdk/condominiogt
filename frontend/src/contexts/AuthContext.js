import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Configurar axios
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;

// Interceptor para adicionar token em todas as requisições
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastValidation, setLastValidation] = useState(null);

  // Verificar se usuário está logado ao carregar a aplicação
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAuthenticated(true);
          
          // Validar token com o backend
          await validateToken();
        } else {
          console.log('🔐 Nenhum token encontrado, usuário não autenticado');
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Validar token com o backend (com cache de 5 minutos)
  const validateToken = async (force = false) => {
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
    
    // Se já validou recentemente e não é forçado, pular
    if (!force && lastValidation && (now - lastValidation) < CACHE_DURATION) {
      console.log('🔄 Token já validado recentemente, pulando validação');
      return;
    }
    
    try {
      console.log('🔍 Validando token com o backend...');
      const response = await axios.get('/auth/profile');
      if (response.data.success) {
        console.log('✅ Token válido, usuário autenticado:', response.data.data);
        setUser(response.data.data.user || response.data.data);
        setIsAuthenticated(true);
        setLastValidation(now);
      } else {
        console.log('❌ Resposta inválida do backend');
        logout();
      }
    } catch (error) {
      console.error('❌ Token inválido:', error);
      logout();
    }
  };

  // Função de login
  const login = async (email, password) => {
    try {
      setLoading(true);
      
      const response = await axios.post('/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        const { token, user: userData } = response.data.data;
        
        // Salvar dados no localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Atualizar estado
        setUser(userData);
        setIsAuthenticated(true);
        
        return { success: true, user: userData };
      } else {
        return { 
          success: false, 
          message: response.data.message || 'Erro ao fazer login' 
        };
      }
    } catch (error) {
      console.error('Erro no login:', error);
      
      const message = error.response?.data?.message || 
                     error.response?.data?.error || 
                     'Erro de conexão. Tente novamente.';
      
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Função de logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Função para atualizar dados do usuário
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Função para alterar senha
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await axios.put('/auth/change-password', {
        currentPassword,
        newPassword
      });

      return {
        success: response.data.success,
        message: response.data.message
      };
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao alterar senha';
      return { success: false, message };
    }
  };

  // Função para recuperar senha
  const forgotPassword = async (email) => {
    try {
      const response = await axios.post('/auth/forgot-password', { email });
      
      return {
        success: response.data.success,
        message: response.data.message
      };
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao solicitar recuperação de senha';
      return { success: false, message };
    }
  };

  // Verificar se usuário tem permissão específica
  const hasPermission = (permission) => {
    if (!user) return false;
    
    // Admin tem todas as permissões
    if (user.role === 'admin') return true;
    
    // Verificar permissões específicas por role
    const rolePermissions = {
      manager: ['read_all', 'create', 'update', 'financial_read', 'maintenance_manage'],
      syndic: ['read_condominium', 'create', 'update_limited', 'maintenance_manage'],
      resident: ['read_own', 'create_limited']
    };
    
    return rolePermissions[user.role]?.includes(permission) || false;
  };

  // Verificar se usuário tem acesso a um condomínio específico
  const hasCondominiumAccess = (condominiumId) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    return user.condominiums?.some(c => c.id === parseInt(condominiumId)) || false;
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
    changePassword,
    forgotPassword,
    hasPermission,
    hasCondominiumAccess,
    validateToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar o contexto de autenticação
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export default AuthContext;