import React from 'react';
import { unitAPI } from '../../services/api';

// Componente de teste para isolar o problema de deleção
const UnitDeleteTest = ({ unitId, onSuccess, onError }) => {
  const handleTestDelete = async () => {
    console.group('🧪 TESTE DE DELEÇÃO');
    console.log('Unit ID para deletar:', unitId);
    console.log('Timestamp:', new Date().toISOString());
    
    try {
      console.log('🔄 Fazendo chamada DELETE...');
      const response = await unitAPI.delete(unitId);
      
      console.log('✅ Resposta recebida:', response);
      console.log('Success:', response.data?.success);
      console.log('Message:', response.data?.message);
      
      if (response.data?.success) {
        console.log('🎉 Deleção bem-sucedida!');
        onSuccess && onSuccess(unitId);
      } else {
        console.log('❌ Deleção falhou:', response.data);
        onError && onError(response.data?.message || 'Erro desconhecido');
      }
    } catch (error) {
      console.log('💥 Erro na deleção:', error);
      console.log('Status:', error.response?.status);
      console.log('Data:', error.response?.data);
      onError && onError(error.message);
    }
    
    console.groupEnd();
  };

  return (
    <button
      onClick={handleTestDelete}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      🧪 Teste Delete (Unit {unitId})
    </button>
  );
};

export default UnitDeleteTest;