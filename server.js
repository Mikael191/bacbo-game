const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'build')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const DB_FILE = 'db.json';
let users = {};

// --- PERSISTÊNCIA ---
if (fs.existsSync(DB_FILE)) {
    try { users = JSON.parse(fs.readFileSync(DB_FILE)); } 
    catch (e) { console.error("Erro ao ler DB", e); }
}
function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2)); }

const GAME_STATES = { BETTING: 'BETTING', ROLLING: 'ROLLING', RESULT: 'RESULT' };

let gameState = {
    phase: GAME_STATES.BETTING,
    timer: 15,
    dice: { p1: 1, p2: 1, b1: 1, b2: 1 },
    history: [],
    bets: {}, 
    tieMultiplier: 8,
    winner: null
};

// --- LOOP DO JOGO ---
setInterval(() => {
    gameState.timer--;

    if (gameState.timer <= 0) {
        if (gameState.phase === GAME_STATES.BETTING) {
            gameState.phase = GAME_STATES.ROLLING;
            gameState.timer = 4;
            const multipliers = [4, 6, 10, 25, 50, 88];
            gameState.tieMultiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
            io.emit('gameState', gameState);

        } else if (gameState.phase === GAME_STATES.ROLLING) {
            gameState.phase = GAME_STATES.RESULT;
            gameState.timer = 6;
            
            // Rolar dados
            gameState.dice = {
                p1: Math.ceil(Math.random() * 6), p2: Math.ceil(Math.random() * 6),
                b1: Math.ceil(Math.random() * 6), b2: Math.ceil(Math.random() * 6)
            };
            const pSum = gameState.dice.p1 + gameState.dice.p2;
            const bSum = gameState.dice.b1 + gameState.dice.b2;

            if (pSum > bSum) gameState.winner = 'player';
            else if (bSum > pSum) gameState.winner = 'banker';
            else gameState.winner = 'tie';

            gameState.history.unshift({ winner: gameState.winner, pSum, bSum });
            if (gameState.history.length > 10) gameState.history.pop();

            processPayouts();
            io.emit('gameState', gameState);

        } else if (gameState.phase === GAME_STATES.RESULT) {
            // FIM DA RODADA: Salvar apostas atuais como "Últimas Apostas" para cada usuário
            for (const [socketId, betData] of Object.entries(gameState.bets)) {
                const userKey = getUserKeyBySocket(socketId);
                if (userKey && users[userKey]) {
                    // Salva cópia das apostas para função REPETIR
                    users[userKey].lastRoundBets = { ...betData };
                    // Remove campos desnecessários do histórico
                    delete users[userKey].lastRoundBets.username;
                    delete users[userKey].lastRoundBets.avatar;
                }
            }

            gameState.phase = GAME_STATES.BETTING;
            gameState.timer = 15;
            gameState.bets = {};
            gameState.winner = null;
            io.emit('gameState', gameState);
        }
    } else {
        io.emit('timerUpdate', gameState.timer);
    }
}, 1000);

function processPayouts() {
    for (const [socketId, userBets] of Object.entries(gameState.bets)) {
        const userKey = getUserKeyBySocket(socketId);
        if (!userKey || !users[userKey]) continue;

        let totalWin = 0;
        if (userBets.player > 0) {
            if (gameState.winner === 'player') totalWin += userBets.player * 2;
            else if (gameState.winner === 'tie') totalWin += userBets.player; 
        }
        if (userBets.banker > 0) {
            if (gameState.winner === 'banker') totalWin += userBets.banker * 1.95;
            else if (gameState.winner === 'tie') totalWin += userBets.banker;
        }
        if (userBets.tie > 0 && gameState.winner === 'tie') {
            totalWin += userBets.tie * gameState.tieMultiplier;
        }

        if (totalWin > 0) {
            users[userKey].balance += totalWin;
            io.to(socketId).emit('win', totalWin);
        }
    }
    saveDB();
    broadcastUsers();
}

function getUserKeyBySocket(socketId) {
    for (let u in users) if (users[u].socketId === socketId) return u;
    return null;
}

io.on('connection', (socket) => {
    socket.emit('gameState', gameState);

    socket.on('login', ({ username }) => {
        const key = username;
        if (!users[key]) users[key] = { username, balance: 500, avatar: Math.floor(Math.random()*5), lastRoundBets: null };
        users[key].socketId = socket.id;
        socket.userData = users[key];
        saveDB();
        socket.emit('loginSuccess', users[key]);
        broadcastUsers();
    });

    // --- APOSTAR (E DESFAZER) ---
    socket.on('placeBet', ({ type, amount }) => {
        if (gameState.phase !== GAME_STATES.BETTING || !socket.userData) return;
        const user = users[socket.userData.username];

        // Se amount for negativo, é um UNDO.
        // Se for positivo, é APOSTA.
        
        // Verificação para Undo: Não deixar saldo da aposta ficar negativo
        if (amount < 0) {
             if (!gameState.bets[socket.id] || (gameState.bets[socket.id][type] + amount < 0)) return;
             // Devolve dinheiro para o saldo
             user.balance -= amount; // Menos com menos dá mais (aumenta saldo)
             gameState.bets[socket.id][type] += amount; // Diminui a aposta
        } else {
             // Verificação para Aposta normal
             if (user.balance >= amount) {
                 user.balance -= amount;
                 if (!gameState.bets[socket.id]) {
                     gameState.bets[socket.id] = { player: 0, banker: 0, tie: 0, username: user.username, avatar: user.avatar };
                 }
                 gameState.bets[socket.id][type] += amount;
             } else {
                 return; // Saldo insuficiente
             }
        }

        saveDB();
        broadcastUsers();
        io.emit('gameState', gameState);
    });

    // --- REPETIR APOSTA ---
    socket.on('repeatBet', () => {
        if (gameState.phase !== GAME_STATES.BETTING || !socket.userData) return;
        const user = users[socket.userData.username];
        const lastBets = user.lastRoundBets;

        if (!lastBets) return;

        // Calcular total necessário
        const totalNeeded = (lastBets.player || 0) + (lastBets.banker || 0) + (lastBets.tie || 0);

        if (totalNeeded > 0 && user.balance >= totalNeeded) {
            user.balance -= totalNeeded;

            if (!gameState.bets[socket.id]) {
                gameState.bets[socket.id] = { player: 0, banker: 0, tie: 0, username: user.username, avatar: user.avatar };
            }

            // Aplica as apostas
            if (lastBets.player) gameState.bets[socket.id].player += lastBets.player;
            if (lastBets.banker) gameState.bets[socket.id].banker += lastBets.banker;
            if (lastBets.tie) gameState.bets[socket.id].tie += lastBets.tie;

            saveDB();
            broadcastUsers();
            io.emit('gameState', gameState);
        }
    });

    socket.on('disconnect', () => broadcastUsers());
});

function broadcastUsers() {
    const active = [];
    for (const [id, socket] of io.sockets.sockets) {
        if (socket.userData) {
            const u = users[socket.userData.username];
            active.push({
                username: u.username,
                balance: u.balance,
                avatar: u.avatar,
                currentBets: gameState.bets[id] || { player: 0, banker: 0, tie: 0 }
            });
        }
    }
    io.emit('activePlayers', active);
}

server.listen(3001, () => console.log(`Server rodando na porta 3001`));