import React from 'react';
import Dice from './Dice';

const GameTable = ({ gameState, onPlaceBet, bets, onUndo, onRepeat, canUndo }) => {
  const playerSum = gameState.dice.p1 + gameState.dice.p2;
  const bankerSum = gameState.dice.b1 + gameState.dice.b2;

  const countBets = (type) => {
      if (!bets) return 0;
      return Object.values(bets).reduce((acc, bet) => acc + (bet[type] > 0 ? 1 : 0), 0);
  };

  const pCount = countBets('player');
  const bCount = countBets('banker');
  const tCount = countBets('tie');

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative bg-[url('https://www.transparenttextures.com/patterns/felt.png')] w-full">
      
      {/* BOTÕES DE CONTROLE (UNDO / REPEAT) - POSICIONADOS NO CANTO DIREITO */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 z-30">
          <button 
            onClick={onUndo}
            disabled={!canUndo || gameState.phase !== 'BETTING'}
            className={`w-12 h-12 rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center text-xl transition hover:bg-gray-600
            ${(!canUndo || gameState.phase !== 'BETTING') ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Desfazer">
            ↩️
          </button>
          
          <button 
            onClick={onRepeat}
            disabled={gameState.phase !== 'BETTING'}
            className={`w-12 h-12 rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center text-xl transition hover:bg-gray-600
            ${gameState.phase !== 'BETTING' ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Repetir">
            🔁
          </button>
      </div>

      {/* TIMER */}
      <div className="mb-6 text-center">
           <div className={`text-4xl font-black transition-all ${gameState.timer <= 3 ? 'text-red-500 scale-110' : 'text-white'}`}>
               {gameState.timer}s
           </div>
           <div className="text-sm uppercase tracking-widest text-gray-400">{gameState.phase}</div>
      </div>

      {/* TIE MULTIPLIER */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 px-4 py-1 rounded-full border border-yellow-500/30">
          <span className="text-gray-300 text-xs">TIE PAYS</span>
          <span className="ml-2 text-yellow-400 font-bold text-lg animate-pulse">{gameState.tieMultiplier}x</span>
      </div>

      {/* DADOS */}
      <div className="flex space-x-8 md:space-x-12 mb-10">
          <div className={`p-4 md:p-6 rounded-3xl border-4 bg-blue-900/30 backdrop-blur-sm transition-all duration-500
              ${gameState.winner === 'player' ? 'border-blue-400 shadow-[0_0_50px_rgba(59,130,246,0.6)] scale-105' : 'border-blue-900/50'}`}>
              <div className="text-blue-400 font-bold mb-4 text-center tracking-widest">PLAYER</div>
              <div className="flex space-x-2 md:space-x-4">
                  <Dice value={gameState.dice.p1} color="blue" rolling={gameState.phase === 'ROLLING'} />
                  <Dice value={gameState.dice.p2} color="blue" rolling={gameState.phase === 'ROLLING'} />
              </div>
              <div className="text-center text-3xl font-bold mt-4 text-white drop-shadow-md">
                  {gameState.phase !== 'BETTING' ? playerSum : '?'}
              </div>
          </div>

          <div className={`p-4 md:p-6 rounded-3xl border-4 bg-red-900/30 backdrop-blur-sm transition-all duration-500
              ${gameState.winner === 'banker' ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.6)] scale-105' : 'border-red-900/50'}`}>
              <div className="text-red-400 font-bold mb-4 text-center tracking-widest">BANKER</div>
              <div className="flex space-x-2 md:space-x-4">
                  <Dice value={gameState.dice.b1} color="red" rolling={gameState.phase === 'ROLLING'} />
                  <Dice value={gameState.dice.b2} color="red" rolling={gameState.phase === 'ROLLING'} />
              </div>
              <div className="text-center text-3xl font-bold mt-4 text-white drop-shadow-md">
                   {gameState.phase !== 'BETTING' ? bankerSum : '?'}
              </div>
          </div>
      </div>

      {/* BOTÕES DE APOSTA */}
      <div className="w-full max-w-4xl px-4 grid grid-cols-3 gap-4 mb-4 relative z-10">
          <button 
              disabled={gameState.phase !== 'BETTING'}
              onClick={() => onPlaceBet('player')}
              className={`h-24 md:h-32 rounded-xl flex flex-col items-center justify-center border-2 border-blue-600/50 bg-gradient-to-b from-blue-900/80 to-blue-950/90 hover:from-blue-800 hover:to-blue-900 transition active:scale-95 relative
              ${gameState.phase !== 'BETTING' ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <span className="text-xl md:text-2xl font-bold text-white z-10">PLAYER</span>
              <span className="text-sm text-blue-300 z-10">1:1</span>
              {pCount > 0 && <div className="absolute top-2 right-2 bg-white text-blue-900 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shadow-lg">{pCount}</div>}
          </button>

          <button 
              disabled={gameState.phase !== 'BETTING'}
              onClick={() => onPlaceBet('tie')}
              className={`h-24 md:h-32 rounded-xl flex flex-col items-center justify-center border-2 border-yellow-600/50 bg-gradient-to-b from-yellow-900/80 to-yellow-950/90 hover:from-yellow-800 hover:to-yellow-900 transition active:scale-95 relative
               ${gameState.phase !== 'BETTING' ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <span className="text-xl md:text-2xl font-bold text-yellow-400">TIE</span>
              <span className="text-sm text-yellow-200">4x - 88x</span>
              {tCount > 0 && <div className="absolute top-2 right-2 bg-white text-yellow-900 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shadow-lg">{tCount}</div>}
          </button>

          <button 
              disabled={gameState.phase !== 'BETTING'}
              onClick={() => onPlaceBet('banker')}
              className={`h-24 md:h-32 rounded-xl flex flex-col items-center justify-center border-2 border-red-600/50 bg-gradient-to-b from-red-900/80 to-red-950/90 hover:from-red-800 hover:to-red-900 transition active:scale-95 relative
               ${gameState.phase !== 'BETTING' ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <span className="text-xl md:text-2xl font-bold text-white">BANKER</span>
              <span className="text-sm text-red-300">0.95:1</span>
              {bCount > 0 && <div className="absolute top-2 right-2 bg-white text-red-900 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shadow-lg">{bCount}</div>}
          </button>
      </div>
    </div>
  );
};

export default GameTable;