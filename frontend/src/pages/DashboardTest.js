import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const DashboardTest = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [status, setStatus] = useState('Iniciando...');
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const updateDebugInfo = () => {
      const info = {
        timestamp: new Date().toLocaleTimeString(),
        user: user ? `${user.name} (${user.email})` : 'Nenhum usuário',
        isAuthenticated: isAuthenticated ? 'Sim' : 'Não',
        authLoading: authLoading ? 'Sim' : 'Não',
        token: localStorage.getItem('token') ? 'Existe' : 'Não existe',
        tokenLength: localStorage.getItem('token')?.length || 0
      };
      setDebugInfo(info);
      console.log('🔍 Debug Info:', info);
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 1000);

    return () => clearInterval(interval);
  }, [user, isAuthenticated, authLoading]);

  useEffect(() => {
    if (authLoading) {
      setStatus('Verificando autenticação...');
    } else if (!isAuthenticated) {
      setStatus('Usuário não autenticado');
    } else if (isAuthenticated && user) {
      setStatus('Usuário autenticado - Dashboard carregado!');
    } else {
      setStatus('Estado inconsistente');
    }
  }, [authLoading, isAuthenticated, user]);

  if (authLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Dashboard de Teste - Verificando Autenticação</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <div className="bg-yellow-50 p-4 rounded">
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Dashboard de Teste - Não Autenticado</h1>
        <div className="bg-red-50 p-4 rounded mb-4">
          <p>Usuário não está autenticado.</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
          >
            Ir para Login
          </button>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-bold mb-2">Informações de Debug:</h3>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎉 Dashboard de Teste - FUNCIONANDO!</h1>
      
      <div className="bg-green-50 p-4 rounded mb-4">
        <h2 className="text-lg font-semibold text-green-800">Status: {status}</h2>
        <p className="text-green-700">O dashboard carregou com sucesso!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-bold text-gray-800 mb-2">Informações do Usuário</h3>
          <p><strong>Nome:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.role}</p>
          <p><strong>Status:</strong> {user?.status}</p>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-bold text-gray-800 mb-2">Informações de Debug</h3>
          <pre className="text-sm">{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded">
        <h3 className="font-bold text-blue-800 mb-2">Próximos Passos</h3>
        <ul className="text-blue-700 space-y-1">
          <li>✅ Autenticação funcionando</li>
          <li>✅ Usuário carregado</li>
          <li>✅ Dashboard renderizado</li>
          <li>🔄 Próximo: Testar chamadas de API</li>
        </ul>
      </div>
    </div>
  );
};

export default DashboardTest;