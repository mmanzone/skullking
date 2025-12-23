let gameState = {
    players: [],
    rounds: [],
    mode: 'score', // 'score' or 'rounds'
    limit: 100,
    dealerIdx: 0
};

let curLang = 'fr';
const I18N = {
    fr: {
        game_mode: "Mode de Jeu",
        score_limit: "Limite Score",
        round_limit: "Limite Manches",
        players: "Joueurs",
        add_player: "+ Ajouter Joueur",
        start_game: "Commencer",
        enter_score: "Noter les points",
        home: "Accueil",
        round_res: "Résultats",
        who_dutch: "Qui a dit Dutch ?",
        validate: "Valider",
        cancel: "Annuler",
        total: "Total",
        winner: "🏆 Vainqueur : # !",
        game_over: "Partie Terminée",
        round: "Manche",
        place_score: "Max Score",
        place_round: "Max Manches"
    },
    en: {
        game_mode: "Game Mode",
        score_limit: "Score Limit",
        round_limit: "Round Limit",
        players: "Players",
        add_player: "+ Add Player",
        start_game: "Start Game",
        enter_score: "Enter Scores",
        home: "Home",
        round_res: "Results",
        who_dutch: "Anyone called Dutch?",
        validate: "Validate",
        cancel: "Cancel",
        total: "Total",
        winner: "🏆 Winner: # !",
        game_over: "Game Over",
        round: "Round",
        place_score: "Max Score",
        place_round: "Max Rounds"
    }
};

function t(key) { return I18N[curLang][key] || key; }

function toggleLang() {
    curLang = curLang === 'fr' ? 'en' : 'fr';
    document.getElementById('btn-lang').innerText = curLang === 'fr' ? '🇬🇧' : '🇫🇷';
    updateText();
}

function updateText() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.innerText = t(el.getAttribute('data-i18n'));
    });
    // Update dynamic placeholders if needed
    const limitInput = document.getElementById('limit-value');
    if (limitInput) {
        limitInput.placeholder = gameState.mode === 'score' ? t('place_score') : t('place_round');
    }
    renderTable(); // Update table headers
}

function init() {
    const saved = localStorage.getItem('dutch_state');
    if (saved) {
        gameState = JSON.parse(saved);
        if (gameState.players.length > 0) setupBoard();
        else renderSetup();
    } else {
        renderSetup();
    }
}

function renderSetup() {
    const list = document.getElementById('players-list');
    list.innerHTML = '';
    const count = Math.max(gameState.players.length || 3, 3);
    for (let i = 0; i < count; i++) {
        addPlayerInput(gameState.players[i] || '');
    }
    updateText();
}

function addPlayerInput(val = '') {
    const list = document.getElementById('players-list');
    const div = document.createElement('div');
    div.className = 'input-row';
    const idx = list.children.length;
    div.innerHTML = `
        <div class="dealer-select ${idx === 0 ? 'selected' : ''}" onclick="selectDealer(${idx})">D</div>
        <input type="text" class="p-name" value="${val}" placeholder="Player ${idx + 1}" list="player-history">
    `;
    list.appendChild(div);
}

function selectDealer(idx) {
    gameState.dealerIdx = idx;
    document.querySelectorAll('.dealer-select').forEach((el, i) => {
        el.classList.toggle('selected', i === idx);
    });
}

function setMode(m) {
    gameState.mode = m;
    document.getElementById('btn-mode-score').classList.toggle('selected', m === 'score');
    document.getElementById('btn-mode-rounds').classList.toggle('selected', m === 'rounds');

    const inp = document.getElementById('limit-value');
    if (m === 'score') {
        inp.value = 100;
        inp.placeholder = t('place_score');
    } else {
        inp.value = 10;
        inp.placeholder = t('place_round');
    }
}

function startGame() {
    const inputs = document.querySelectorAll('.p-name');
    const names = Array.from(inputs).map(i => i.value.trim()).filter(n => n);

    if (names.length < 2) return alert("Min 2 players"); // Kept simple

    gameState.players = names.map(n => n.charAt(0).toUpperCase() + n.slice(1));
    gameState.players.forEach(n => CommonGame.savePlayerName(n));
    gameState.limit = Number(document.getElementById('limit-value').value);
    gameState.rounds = [];

    saveState();
    setupBoard();
}

function setupBoard() {
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-board').style.display = 'flex';
    renderTable();
}

function openRoundInput() {
    const modal = document.getElementById('round-modal');
    const container = document.getElementById('modal-inputs');
    container.innerHTML = '';

    gameState.players.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'dutch-call-row';
        div.innerHTML = `
            <div style="flex:1; text-align:left;">
                <label style="font-weight:bold;">${p}</label>
            </div>
            <button class="btn-dutch-toggle" id="dutch-btn-${i}" onclick="toggleDutch(${i})">DUTCH</button>
            <input type="number" class="score-input" id="score-${i}" placeholder="0" style="width:60px; text-align:center; padding:8px;">
        `;
        container.appendChild(div);
    });

    modal.classList.add('visible');
}

function toggleDutch(idx) {
    const btn = document.getElementById(`dutch-btn-${idx}`);
    btn.classList.toggle('active');
}

function saveRound() {
    let scores = [];
    let inputs = document.querySelectorAll('.score-input');

    // Logic:
    // If Dutch Active:
    //   - If Valid (Score=0? Or user enters result?). 
    //   - Usually Dutch = Call before round. If score is lowest (0 usually?), score = -10. Else +10.
    //   - Simplified here: If button active, we assume user is indicating "This player called Dutch". 
    //   - The user MUST enter the raw score from cards. We calculate the result.
    //   - WAIT. A "Dutch" call means you think you'll have lowest. 
    //   - If you succeed (lowest score), you get -10 (or 0?). Rules vary.
    //   - Let's stick to simple: Access card score.
    //   - If Toggle Active: Logic = IF score_input <= all_others THEN score = -10 ELSE score = score_input + 10.

    // First gather raw inputs
    let rawScores = [];
    let dutchCallers = []; // indices

    inputs.forEach((inp, i) => {
        let val = Number(inp.value) || 0;
        rawScores.push(val);
        if (document.getElementById(`dutch-btn-${i}`).classList.contains('active')) {
            dutchCallers.push(i);
        }
    });

    let finalScores = [...rawScores];

    // Apply Dutch logic
    dutchCallers.forEach(idx => {
        const myScore = rawScores[idx];
        // Check if I am strictly lowest (or tied lowest?) usually strictly or tied is fine.
        const others = rawScores.filter((_, i) => i !== idx);
        const minOthers = Math.min(...others);

        if (myScore < minOthers) {
            // Success
            finalScores[idx] = -10;
        } else {
            // Fail
            finalScores[idx] = 10 + myScore; // Penalty + Face value usually
        }
    });

    gameState.rounds.push(finalScores);
    gameState.dealerIdx = (gameState.dealerIdx + 1) % gameState.players.length;
    saveState();
    closeModal();
    renderTable();
    checkGameEnd();
}

function renderTable() {
    const thead = document.getElementById('table-head'); // TR
    const tbody = document.getElementById('table-body');
    const tfoot = document.getElementById('table-foot'); // TR

    thead.innerHTML = '<th>#</th>';
    gameState.players.forEach((p, i) => {
        const th = document.createElement('th');
        th.innerText = p;
        if (i === gameState.dealerIdx) th.style.color = 'var(--secondary)';
        thead.appendChild(th);
    });

    tbody.innerHTML = '';
    let totals = new Array(gameState.players.length).fill(0);

    gameState.rounds.forEach((r, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${idx + 1}</td>`;
        r.forEach((s, i) => {
            totals[i] += s;
            const td = document.createElement('td');
            td.innerText = s;
            // Highlight Dutch success/fail if we tracked it? 
            // For now just show numbers.
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    tfoot.innerHTML = `<td>${t('total')}</td>`;
    totals.forEach(tot => {
        const td = document.createElement('td');
        td.innerText = tot;
        tfoot.appendChild(td);
    });

    document.getElementById('round-info').innerText = `${t('round')} ${gameState.rounds.length + 1}`;

    return totals;
}

function checkGameEnd() {
    const totals = renderTable();
    let ended = false;

    if (gameState.mode === 'score') {
        if (totals.some(t => t >= gameState.limit)) ended = true;
    } else {
        if (gameState.rounds.length >= gameState.limit) ended = true;
    }

    if (ended) {
        // Find winner (lowest score)
        let minScore = Math.min(...totals);
        let winnerIdx = totals.indexOf(minScore);
        alert(t('winner').replace('#', gameState.players[winnerIdx]));
        // Could replace with a modal later, but simple alert for now as per minimal change request/time
    }
}

function closeModal() {
    document.getElementById('round-modal').classList.remove('visible');
}

function saveState() {
    localStorage.setItem('dutch_state', JSON.stringify(gameState));
}

document.addEventListener('DOMContentLoaded', () => {
    // Populate datalist from shared history
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
