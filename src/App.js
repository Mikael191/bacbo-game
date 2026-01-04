import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import GameTable from './components/GameTable';
import PlayerPanel from './components/PlayerPanel';
import './styles/index.css';

const socket = io('http://localhost:3001');

export default function App() {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loginForm, setLoginForm] = useState({ username: '' });
  const [betAmount, setBetAmount] = useState(10);
  const [message, setMessage] = useState('');
  
  // NOVO: Histórico local de cliques para o botão "Voltar"
  const [betHistory, setBetHistory] = useState([]); 

  useEffect(() => {
    socket.on('gameState', (state) => {
        setGameState(state);
        // Se mudou de fase para apostas, limpa o histórico de undo
        if (state.phase !== 'BETTING') {
             // Pode limpar aqui se quiser resetar o undo quando a bola rola
        }
        if (state.phase === 'BETTING' && state.timer > 14) {
            setBetHistory([]); // Nova rodada, reseta o histórico de desfazer
        }
    });
    
    socket.on('timerUpdate', (t) => setGameState(prev => prev ? ({ ...prev, timer: t }) : null));
    socket.on('loginSuccess', (userData) => setUser(userData));
    socket.on('activePlayers', (p) => setPlayers(p));
    socket.on('win', (amount) => showToast(`Você ganhou R$ ${amount.toFixed(2)}!`));

    return () => socket.off();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if(loginForm.username) socket.emit('login', loginForm);
  };

  // --- FAZER APOSTA ---
  const placeBet = (type) => {
    if (!user) return;
    if (gameState.phase !== 'BETTING') return;
    
    // 1. Envia para o servidor
    socket.emit('placeBet', { type, amount: betAmount });
    
    // 2. Salva no histórico local (para poder desfazer depois)
    setBetHistory(prev => [...prev, { type, amount: betAmount }]);
  };

  // --- DESFAZER (UNDO) ---
  const handleUndo = () => {
      if (betHistory.length === 0) return;
      if (gameState.phase !== 'BETTING') return;

      // Pega a última ação
      const lastAction = betHistory[betHistory.length - 1];
      
      // Envia valor negativo para o servidor (retirar aposta)
      socket.emit('placeBet', { type: lastAction.type, amount: -lastAction.amount });

      // Remove do histórico local
      setBetHistory(prev => prev.slice(0, -1));
  };

  // --- REPETIR (REPEAT) ---
  const handleRepeat = () => {
      if (gameState.phase !== 'BETTING') return;
      socket.emit('repeatBet');
      // Nota: Repetir não preenche o histórico de Undo por segurança/complexidade
  };

  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans text-white">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-96 border border-slate-700">
          <h1 className="text-3xl font-bold text-center mb-2 text-yellow-400">BAC BO</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              className="w-full p-3 bg-slate-700 rounded text-white outline-none focus:ring-2 ring-yellow-500"
              placeholder="Digite seu nome..."
              value={loginForm.username}
              onChange={e => setLoginForm({...loginForm, username: e.target.value})}
            />
            <button className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 p-3 rounded font-bold hover:brightness-110">
              ENTRAR
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!gameState) return <div className="text-white bg-slate-900 h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#0a1f15] text-white font-sans overflow-hidden flex flex-col relative">
      
      {message && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black font-bold px-6 py-3 rounded-full shadow-lg z-50 animate-bounce">
          {message}
        </div>
      )}

      <div className="h-16 bg-[#05110b] border-b border-white/10 flex items-center justify-between px-4">
        <div className="font-bold text-yellow-500 text-xl">BAC BO</div>
        <div className="flex space-x-1">
          {gameState.history.map((h, i) => (
            <div key={i} className={`w-6 h-6 rounded-full text-xs flex items-center justify-center 
              ${h.winner === 'player' ? 'bg-blue-600' : h.winner === 'banker' ? 'bg-red-600' : 'bg-yellow-500 text-black'}`}>
              {h.winner.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
        <div className="text-sm font-bold text-yellow-400">R$ {user.balance.toFixed(2)}</div>
      </div>

      <GameTable 
        gameState={gameState} 
        onPlaceBet={placeBet} 
        bets={gameState.bets}
        // Passamos as novas funções para a mesa
        onUndo={handleUndo}
        onRepeat={handleRepeat}
        canUndo={betHistory.length > 0}
      />

      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex space-x-4 bg-black/50 p-2 rounded-full backdrop-blur-md z-20">
             {[10, 50, 100, 200].map(val => (
                 <button key={val} onClick={() => setBetAmount(val)}
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-lg transition transform hover:scale-110
                    ${betAmount === val ? 'border-yellow-400 bg-yellow-600' : 'border-gray-500 bg-gray-800'}`}>
                    {val}
                 </button>
             ))}
      </div>

      <PlayerPanel players={players} />
    </div>
  );
}