import React from 'react';

const PlayerPanel = ({ players }) => {
  return (
    <div className="h-20 bg-[#05110b] border-t border-white/10 flex items-center px-4 overflow-x-auto space-x-6 w-full">
        <div className="text-xs text-gray-500 uppercase font-bold mr-2 whitespace-nowrap">Na Mesa:</div>
        
        {players.map((p, idx) => (
            <div key={idx} className="flex items-center space-x-2 min-w-max bg-white/5 px-3 py-1 rounded-full border border-white/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-500 flex items-center justify-center text-lg">
                    {['👤','🦁','🐯','🐼','🦊','🤖'][p.avatar] || '👤'}
                </div>
                <div className="flex flex-col mr-2">
                    <span className="text-xs font-bold text-gray-300">{p.username}</span>
                    <span className="text-xs text-yellow-600">R$ {p.balance.toFixed(0)}</span>
                </div>
                
                {/* Mostra bolinhas com as apostas atuais */}
                <div className="flex space-x-1">
                    {p.currentBets.player > 0 && (
                        <div className="w-6 h-6 rounded bg-blue-900 text-blue-200 text-[10px] flex items-center justify-center font-bold border border-blue-500">
                           {p.currentBets.player}
                        </div>
                    )}
                    {p.currentBets.tie > 0 && (
                        <div className="w-6 h-6 rounded bg-yellow-900 text-yellow-200 text-[10px] flex items-center justify-center font-bold border border-yellow-500">
                           {p.currentBets.tie}
                        </div>
                    )}
                    {p.currentBets.banker > 0 && (
                        <div className="w-6 h-6 rounded bg-red-900 text-red-200 text-[10px] flex items-center justify-center font-bold border border-red-500">
                           {p.currentBets.banker}
                        </div>
                    )}
                </div>
            </div>
        ))}
    </div>
  );
};

export default PlayerPanel;