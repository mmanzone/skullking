let gameState = {
    players: [], // { name: 'Bob', scores: [], total: 0 }
    mode: 'score', // 'score' or 'rounds'
    limit: 100,
    round: 0,
    dealerIdx: 0,
    dutchCallerIdx: -1 // -1 if nobody called
};

function init() {
    const saved = localStorage.getItem('dutch_state');
    if (saved) {
        gameState = JSON.parse(saved);
        if (gameState.players.length > 0) {
            setupBoard();
        } else {
            renderSetup();
        }
    } else {
        renderSetup();
    }
}

function setMode(m) {
    gameState.mode = m;
    document.getElementById('btn-mode-score').classList.toggle('selected', m === 'score');
    document.getElementById('btn-mode-rounds').classList.toggle('selected', m === 'rounds');
    document.getElementById('game-limit').value = (m === 'score') ? 100 : 10;
}

function renderSetup() {
    const pList = document.getElementById('players-list');
    pList.innerHTML = '';
    const num = Math.max(gameState.players.length, 2);
    for (let i = 0; i < num; i++) {
        addPlayerInput(gameState.players[i]?.name || '');
    }
}

function addPlayerInput(val = '') {
    const pList = document.getElementById('players-list');
    const div = document.createElement('div');
    div.className = 'input-row';
    const idx = pList.children.length;
    div.innerHTML = `
        <div style="cursor:pointer; padding:5px; border:2px solid #000; background:${idx === 0 ? 'var(--accent-blue)' : '#fff'}" onclick="selectDealer(${idx}, this)" class="shop-dealer-dot">D</div>
        <input type="text" class="p-name" value="${val}" placeholder="PLAYER ${idx + 1}" list="player-history">
    `;
    pList.appendChild(div);
}

function selectDealer(idx, el) {
    gameState.dealerIdx = idx;
    document.querySelectorAll('.shop-dealer-dot').forEach(d => d.style.background = '#fff');
    el.style.background = 'var(--accent-blue)';
}

function startGame() {
    const inputs = document.querySelectorAll('.p-name');
    const names = Array.from(inputs).map(i => i.value.trim()).filter(n => n);
    if (names.length < 2) { alert("Need 2+ Players!"); return; }

    gameState.players = names.map(n => ({ name: n, scores: [], total: 0 }));
    names.forEach(n => CommonGame.savePlayerName(n));
    gameState.limit = parseInt(document.getElementById('game-limit').value) || 100;
    gameState.round = 0;
    gameState.dutchCallerIdx = -1;

    saveState();
    setupBoard();
}

function setupBoard() {
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-board').style.display = 'flex';
    renderScoreTable();
    renderDutchToggles();
}

function renderDutchToggles() {
    const div = document.getElementById('dutch-toggles');
    div.innerHTML = '';
    gameState.players.forEach((p, i) => {
        const btn = document.createElement('div');
        btn.className = 'dutch-toggle';
        if (gameState.dutchCallerIdx === i) btn.classList.add('active');
        btn.innerText = p.name;
        btn.onclick = () => toggleDutch(i);
        div.appendChild(btn);
    });
}

function toggleDutch(idx) {
    if (gameState.dutchCallerIdx === idx) gameState.dutchCallerIdx = -1;
    else gameState.dutchCallerIdx = idx;
    renderDutchToggles();
    saveState();
}

function openRoundInput() {
    const modal = document.getElementById('round-modal');
    const container = document.getElementById('modal-inputs');
    container.innerHTML = '';

    gameState.players.forEach((p, i) => {
        const row = document.createElement('div');
        row.style.marginBottom = "10px";
        row.innerHTML = `
            <span style="font-family:'Press Start 2P'; font-size:0.7rem; display:inline-block; width:100px;">${p.name} ${gameState.dutchCallerIdx === i ? '⚡' : ''}</span>
            <input type="number" class="score-input" data-idx="${i}" placeholder="0">
        `;
        container.appendChild(row);
    });

    modal.classList.add('visible');
}

function submitScores() {
    const inputs = document.querySelectorAll('.score-input');
    let rawScores = [];
    inputs.forEach(inp => rawScores.push(parseInt(inp.value) || 0));

    let roundScores = [...rawScores];

    // Logic for Dutch
    if (gameState.dutchCallerIdx !== -1) {
        const callerIdx = gameState.dutchCallerIdx;
        const callerScore = rawScores[callerIdx];

        // Find lowest score
        let minScore = Math.min(...rawScores);

        // Check if caller is strictly lowest (no tie)
        const isStrictLow = rawScores.filter(s => s === minScore).length === 1 && callerScore === minScore;
        const isTieLow = rawScores.filter(s => s === minScore).length > 1 && callerScore === minScore;

        if (isStrictLow) {
            // SUCCESS: -10
            roundScores[callerIdx] = -10;
        } else if (isTieLow) {
            // VOID: Score is hand points (no change)
            // But prompt implies: "If a player calls 'dutch' but has the same amount of point as another player, the 'dutch' is void and both players wills core the number of points in their hands"
            // So do nothing special, just raw scores.
        } else {
            // FAIL: Hand + 10
            roundScores[callerIdx] += 10;
        }
    }

    // Apply scores
    gameState.players.forEach((p, i) => {
        p.scores.push(roundScores[i]);
        p.total += roundScores[i];
    });

    gameState.round++;
    gameState.dutchCallerIdx = -1;
    gameState.dealerIdx = (gameState.dealerIdx + 1) % gameState.players.length;

    saveState();
    closeModal();
    renderScoreTable();
    checkEndGame();
    renderDutchToggles(); // Reset logic
}

function checkEndGame() {
    let ended = false;
    let title = "GAME OVER";

    if (gameState.mode === 'rounds' && gameState.round >= gameState.limit) {
        ended = true;
    } else if (gameState.mode === 'score') {
        const bust = gameState.players.some(p => p.total >= gameState.limit);
        if (bust) ended = true;
    }

    if (ended) {
        // Sort by total ascending
        const sorted = [...gameState.players].sort((a, b) => a.total - b.total);
        let msg = `WINNER:\n${sorted[0].name} (${sorted[0].total})\n\n`;
        sorted.slice(1).forEach((p, i) => msg += `${i + 2}. ${p.name}: ${p.total}\n`);

        setTimeout(() => {
            if (confirm(msg + "\nPlay Again?")) {
                resetGame();
            }
        }, 500);
    }
}

function renderScoreTable() {
    const thead = document.getElementById('table-head');
    const tbody = document.getElementById('table-body');
    const tfoot = document.getElementById('table-foot');

    thead.innerHTML = '<th>#</th>';
    gameState.players.forEach((p, i) => {
        const th = document.createElement('th');
        th.innerText = p.name;
        if (i === gameState.dealerIdx) th.style.color = "var(--accent-blue)";
        thead.appendChild(th);
    });

    tbody.innerHTML = '';
    // We assume all players have same score length
    const rounds = gameState.players[0].scores.length;

    for (let r = 0; r < rounds; r++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r + 1}</td>`;
        gameState.players.forEach(p => {
            const score = p.scores[r];
            // Check if it was a strict dutch win (-10) to add icon? 
            // Logic is computed, hard to backtrack exactly without storing metadata. 
            // We'll just show score.
            let display = score;
            // Add Dutch icon if score was modified? -10 is obvious.

            tr.innerHTML += `<td>${display}</td>`;
        });
        tbody.appendChild(tr);
    }

    tfoot.innerHTML = `<td>=</td>`;
    gameState.players.forEach(p => {
        tfoot.innerHTML += `<td>${p.total}</td>`;
    });
}

function closeModal() { document.getElementById('round-modal').classList.remove('visible'); }
function showRules() { document.getElementById('rules-modal').classList.add('visible'); }
function resetGame() { if (confirm("RESET GAME?")) { localStorage.removeItem('dutch_state'); location.reload(); } }
function saveState() { localStorage.setItem('dutch_state', JSON.stringify(gameState)); }

document.addEventListener('DOMContentLoaded', () => {
    const history = CommonGame.getStoredPlayers();
    const dl = document.createElement('datalist');
    dl.id = 'player-history';
    history.forEach(n => {
        const op = document.createElement('option');
        op.value = n;
        dl.appendChild(op);
    });
    document.body.appendChild(dl);
    init();
});
