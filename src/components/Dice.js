import React from 'react';

const Dice = ({ value, color, rolling }) => {
  return (
    <div className={`w-16 h-16 rounded-xl shadow-lg border-2 border-white/20 flex flex-wrap content-between p-2 
      ${color === 'blue' ? 'bg-blue-600' : 'bg-red-600'} 
      ${rolling ? 'animate-shake' : 'transition-all duration-500 ease-out transform hover:scale-105'}`}>
      
      {/* Gera os pontos do dado dinamicamente */}
       {Array.from({ length: value }).map((_, i) => (
         <div key={i} className="w-3 h-3 bg-white rounded-full shadow-sm mx-auto"></div>
       ))}
    </div>
  );
};

export default Dice;