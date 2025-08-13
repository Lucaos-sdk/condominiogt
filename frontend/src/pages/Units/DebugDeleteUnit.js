import React, { useState } from 'react';
import { unitAPI } from '../../services/api';

const DebugDeleteUnit = ({ unitId, unitNumber, onComplete }) => {
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  
  const addLog = (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, data };
    console.log(`[${timestamp}] ${message}`, data);
    setDebugLog(prev => [...prev, logEntry]);
  };

  const debugDelete = async () => {
    setIsDebugging(true);
    setDebugLog([]);
    
    addLog('🔍 INÍCIO DO DEBUG DE DELEÇÃO', { unitId, unitNumber });
    
    try {
      // Use the new backend debug endpoint
      addLog('🗑️ Usando endpoint de debug do backend...');
      const debugResponse = await unitAPI.debugDelete(unitId);
      
      addLog('📡 Resposta do debug backend:', debugResponse.data);
      
      if (debugResponse.data.success) {
        const { data } = debugResponse.data;
        
        addLog('📊 Resultados do debug:', {
          unidadesAntes: data.beforeCount,
          unidadesDepois: data.afterCount,
          unidadesFinal: data.finalCount,
          diferençaImediata: data.difference,
          diferençaFinal: data.finalDifference,
          novasUnidadesCriadas: data.newUnitsCreated,
          unidadeDeletada: data.deletedUnit
        });
        
        if (data.finalDifference > data.difference) {
          addLog('🚨 PROBLEMA CONFIRMADO: Unidades sendo criadas APÓS a deleção!', {
            unidadesCriadasApos: data.finalDifference - data.difference
          });
        } else if (data.difference === 0) {
          addLog('⚠️ PROBLEMA: Unidade não foi deletada');
        } else if (data.difference < 0) {
          addLog('✅ Deleção funcionou corretamente');
        } else {
          addLog('🔍 Comportamento incomum detectado');
        }
      }
      
      // Also do the frontend checks
      addLog('🔄 Verificação adicional pelo frontend...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalList = await unitAPI.getAll();
      const finalUnits = finalList.data?.data?.units || finalList.data?.units || [];
      
      addLog('📋 Estado final das unidades:', {
        totalUnits: finalUnits.length,
        últimas5: finalUnits.slice(-5).map(u => ({ id: u.id, number: u.number }))
      });
      
    } catch (error) {
      addLog('❌ Erro durante debug:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    } finally {
      setIsDebugging(false);
      addLog('🏁 DEBUG FINALIZADO');
      
      // Callback para atualizar a lista principal
      if (onComplete) {
        onComplete();
      }
    }
  };

  return (
    <div className="border-2 border-red-500 p-4 m-4 rounded-lg bg-red-50">
      <h3 className="text-lg font-bold text-red-800 mb-2">
        🔍 Debug: Deletar Unidade {unitNumber} (ID: {unitId})
      </h3>
      
      <button
        onClick={debugDelete}
        disabled={isDebugging}
        className={`px-4 py-2 rounded font-medium ${
          isDebugging 
            ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
            : 'bg-red-600 text-white hover:bg-red-700'
        }`}
      >
        {isDebugging ? '🔄 Debugando...' : '🗑️ Debug Delete'}
      </button>
      
      {debugLog.length > 0 && (
        <div className="mt-4 bg-white p-3 rounded border max-h-96 overflow-y-auto">
          <h4 className="font-medium mb-2">Log do Debug:</h4>
          {debugLog.map((entry, index) => (
            <div key={index} className="text-xs mb-2 font-mono">
              <div className="text-blue-600">[{entry.timestamp.split('T')[1].split('.')[0]}]</div>
              <div className="text-gray-800">{entry.message}</div>
              {entry.data && (
                <pre className="text-gray-600 bg-gray-100 p-1 rounded mt-1">
                  {JSON.stringify(entry.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DebugDeleteUnit;