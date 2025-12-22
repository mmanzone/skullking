const MAX_POINTS = 250;

let gameState = {
    players: [],
    rounds: [], // Array of objects { scores: [p1, p2...], color: '♥' }
    dealerIdx: 0,
    activePapayooColor: null
};

// Init
function init() {
    const saved = localStorage.getItem('papayoo_state');
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

function renderSetup() {
    const list = document.getElementById('players-list');
    list.innerHTML = '';

    // Add 3 default rows if empty
    const count = Math.max(gameState.players.length, 3);
    for (let i = 0; i < count; i++) {
        addPlayerInput(gameState.players[i] || '');
    }
}

function addPlayerInput(val = '') {
    const list = document.getElementById('players-list');
    const div = document.createElement('div');
    div.className = 'input-row';
    const idx = list.children.length;

    div.innerHTML = `
        <div class="dealer-select ${idx === 0 ? 'selected' : ''}" onclick="selectDealer(${idx})">D</div>
        <input type="text" class="p-name" value="${val}" placeholder="Joueur ${idx + 1}" list="player-history">
    `;
    list.appendChild(div);
}

function selectDealer(idx) {
    gameState.dealerIdx = idx;
    document.querySelectorAll('.dealer-select').forEach((el, i) => {
        if (i === idx) el.classList.add('selected');
        else el.classList.remove('selected');
    });
}

function startGame() {
    const inputs = document.querySelectorAll('.p-name');
    const names = Array.from(inputs).map(i => i.value.trim()).filter(n => n);

    if (names.length < 3) {
        alert("Il faut au moins 3 joueurs !");
        return;
    }

    gameState.players = names;
    names.forEach(n => CommonGame.savePlayerName(n));
    gameState.rounds = [];

    saveState();
    setupBoard();
}

function setupBoard() {
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-board').style.display = 'flex';

    renderScoreTable();
    updateDiceUI();
}

function setPapayooColor(suit) {
    gameState.activePapayooColor = suit;
    updateDiceUI();
    saveState();
}

function updateDiceUI() {
    const btns = document.querySelectorAll('.suit-btn');
    btns.forEach(b => {
        if (b.innerText === gameState.activePapayooColor) b.classList.add('selected');
        else b.classList.remove('selected');
    });
}

function playPapayouSound() {
    const audio = document.getElementById('sfx-papayou');
    // Fallback if file missing
    audio.onerror = () => {
        console.warn("Audio file missing");
        alert("PAPAYOO !!! 🎵");
    };
    audio.play().catch(e => console.log(e));
}

// Scoring
function openRoundInput() {
    const modal = document.getElementById('round-modal');
    const container = document.getElementById('modal-inputs');
    document.getElementById('modal-round-num').innerText = gameState.rounds.length + 1;

    container.innerHTML = '';
    gameState.players.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'score-input-row';
        div.innerHTML = `
            <label>${p}</label>
            <input type="number" class="score-input" data-idx="${i}" oninput="updateHud()">
        `;
        container.appendChild(div);
    });

    modal.classList.add('visible');
    updateHud();
}

function updateHud() {
    const inputs = document.querySelectorAll('.score-input');
    let sum = 0;
    inputs.forEach(i => sum += Number(i.value) || 0);

    const hud = document.getElementById('score-hud');
    hud.innerText = `Total: ${sum} / ${MAX_POINTS}`;

    if (sum === MAX_POINTS) {
        hud.style.color = 'var(--accent-green)';
    } else {
        hud.style.color = '#e74c3c';
    }
}

function fillMissingScore() {
    const inputs = Array.from(document.querySelectorAll('.score-input'));
    const emptyInputs = inputs.filter(i => i.value === '');

    if (emptyInputs.length !== 1) {
        alert("Il doit y avoir exactement un champ vide pour utiliser le calcul automatique !");
        return;
    }

    let currentSum = 0;
    inputs.forEach(i => {
        if (i.value !== '') currentSum += Number(i.value);
    });

    const remaining = MAX_POINTS - currentSum;
    emptyInputs[0].value = remaining;
    updateHud();
}

function saveRoundScores() {
    const inputs = document.querySelectorAll('.score-input');
    let scores = [];
    let sum = 0;

    for (let i of inputs) {
        const val = Number(i.value);
        scores.push(val);
        sum += val;
    }

    if (sum !== MAX_POINTS) {
        if (!confirm(`Le total est de ${sum} (attendu ${MAX_POINTS}). Valider quand même ?`)) return;
    }

    gameState.rounds.push({
        scores: scores,
        color: gameState.activePapayooColor || '?'
    });

    // Rotate dealer
    gameState.dealerIdx = (gameState.dealerIdx + 1) % gameState.players.length;
    // Reset Color
    gameState.activePapayooColor = null;

    saveState();
    closeModal();
    renderScoreTable();
}

function renderScoreTable() {
    const thead = document.getElementById('table-head-row');
    const tbody = document.getElementById('table-body');
    const tfoot = document.getElementById('total-row');

    // Headers
    thead.innerHTML = '<th>M.</th>';
    gameState.players.forEach((p, i) => {
        const th = document.createElement('th');
        th.innerText = p;
        if (i === gameState.dealerIdx) th.style.borderTop = "4px solid var(--accent-orange)";
        thead.appendChild(th);
    });

    // Body
    tbody.innerHTML = '';
    let totals = new Array(gameState.players.length).fill(0);

    gameState.rounds.forEach((r, rIdx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><span style="color:#aaa">${rIdx + 1}</span> <span style="font-size:0.8rem">${r.color}</span></td>`;

        r.scores.forEach((s, pIdx) => {
            totals[pIdx] += s;
            const td = document.createElement('td');
            td.innerText = s;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    // Footer
    tfoot.innerHTML = '<td>Total</td>';
    totals.forEach(t => {
        const td = document.createElement('td');
        td.innerText = t;
        tfoot.appendChild(td);
    });
}

function closeModal() {
    document.getElementById('round-modal').classList.remove('visible');
}

function showRules() {
    document.getElementById('rules-modal').classList.add('visible');
}

function resetGame() {
    if (confirm("Tout effacer ?")) {
        localStorage.removeItem('papayoo_state');
        location.reload();
    }
}

function saveState() {
    localStorage.setItem('papayoo_state', JSON.stringify(gameState));
}

// Start
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
