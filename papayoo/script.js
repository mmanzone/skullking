const MAX_POINTS = 250;

let gameState = {
    players: [],
    rounds: [],
    dealerIdx: 0,
    activePapayooColor: null
};

let curLang = 'fr';
const I18N = {
    fr: {
        who_plays: "Qui joue ?",
        add_player: "+ Ajouter Joueur",
        start_game: "Commencer la partie !",
        total: "Tot.",
        enter_score: "Noter les points",
        home: "Accueil",
        round_res: "Résultats Manche",
        auto_complete: "Compléter Auto",
        validate: "Valider",
        cancel: "Annuler",
        final_res: "🏆 Résultats Finaux",
        share: "📸 Partager",
        new_game: "Nouvelle Partie",
        close: "Fermer",
        show_final: "Voir Scores Finaux",
        dice_label: "Papayoo (M #)",
        btn_papayoo: "7 # Papayoo !!",
        warn_dice: "Pas de couleur Papayoo sélectionnée !",
        warn_players: "Il faut au moins 3 joueurs !",
        warn_auto: "Il doit y avoir exactement un champ vide pour utiliser le calcul automatique !",
        warn_math: "Le total est de # (attendu 250).",
        confirm_reset: "Tout effacer ?",
        rules: `
            <p><strong>But :</strong> Faire le MOINS de points possible.</p>
            <p><strong>Papayoo :</strong> Le 7 de la couleur du dé vaut 40 points.</p>
            <p><strong>Les Payoo :</strong> Les cartes Payoo (1-20) valent leur propre valeur.</p>
            
            <table style='width:100%; border-collapse:collapse; margin-top:10px; font-size:0.9rem;'>
                <tr style='border-bottom:1px solid #aaa;'>
                    <th style='text-align:left; padding:5px;'>Joueurs</th>
                    <th style='text-align:center;'>Distribuées</th>
                    <th style='text-align:center;'>Écart (Gauche)</th>
                </tr>
                <tr><td>3 Joueurs</td><td style='text-align:center;'>20</td><td style='text-align:center;'>5</td></tr>
                <tr><td>4 Joueurs</td><td style='text-align:center;'>15</td><td style='text-align:center;'>5</td></tr>
                <tr><td>5 Joueurs</td><td style='text-align:center;'>12</td><td style='text-align:center;'>4</td></tr>
                <tr><td>6 Joueurs</td><td style='text-align:center;'>10</td><td style='text-align:center;'>3</td></tr>
            </table>
        `
    },
    en: {
        who_plays: "Who's playing?",
        add_player: "+ Add Player",
        start_game: "Start Game!",
        total: "Tot.",
        enter_score: "Enter Scores",
        home: "Home",
        round_res: "Round Results",
        auto_complete: "Auto Complete",
        validate: "Validate",
        cancel: "Cancel",
        final_res: "🏆 Final Results",
        share: "📸 Share",
        new_game: "New Game",
        close: "Close",
        show_final: "Show Final Scores",
        dice_label: "Papayoo (Round #)",
        btn_papayoo: "7 # Papayoo !!",
        warn_dice: "No Papayoo color selected!",
        warn_players: "Need at least 3 players!",
        warn_auto: "There must be exactly one empty field to use auto-calc!",
        warn_math: "Total is # (Expected 250).",
        confirm_reset: "Reset everything?",
        rules: `
            <p><strong>Goal:</strong> Get the LOWEST score.</p>
            <p><strong>Papayoo:</strong> The 7 of the dice suit is worth 40 points.</p>
            <p><strong>The Payoos:</strong> Payoo cards (1-20) are worth their face value.</p>
            
            <table style='width:100%; border-collapse:collapse; margin-top:10px; font-size:0.9rem;'>
                <tr style='border-bottom:1px solid #aaa;'>
                    <th style='text-align:left; padding:5px;'>Players</th>
                    <th style='text-align:center;'>Dealt</th>
                    <th style='text-align:center;'>Pass (Left)</th>
                </tr>
                <tr><td>3 Players</td><td style='text-align:center;'>20</td><td style='text-align:center;'>5</td></tr>
                <tr><td>4 Players</td><td style='text-align:center;'>15</td><td style='text-align:center;'>5</td></tr>
                <tr><td>5 Players</td><td style='text-align:center;'>12</td><td style='text-align:center;'>4</td></tr>
                <tr><td>6 Players</td><td style='text-align:center;'>10</td><td style='text-align:center;'>3</td></tr>
            </table>
        `
    }
};

function t(key) { return I18N[curLang][key] || key; }

function toggleLang() {
    curLang = curLang === 'fr' ? 'en' : 'fr';
    document.getElementById('btn-lang').innerText = curLang === 'fr' ? '🇬🇧' : '🇫🇷';
    updateUIText();
}

function updateUIText() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerText = t(key);
    });

    // Dice label dynamic update
    updateDiceLabel();

    // Rules
    document.getElementById('rules-text').innerHTML = t('rules');
}

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
    updateUIText();

    // Global ESC listener for modal
    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape") {
            closeFinalModal();
            closeModal(); // round input
            document.getElementById('rules-modal').classList.remove('visible');
            document.getElementById('warning-modal').classList.remove('visible');
        }
    });
}

function showWarnUI(msg) {
    document.getElementById('warning-msg').innerText = msg;
    document.getElementById('warning-modal').classList.add('visible');
}

function renderSetup() {
    const list = document.getElementById('players-list');
    list.innerHTML = '';
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
        <input type="text" class="p-name" value="${val}" placeholder="Player ${idx + 1}" list="player-history">
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
        showWarnUI(t('warn_players'));
        return;
    }

    // Capitalize handled in savePlayerName
    const capNames = names.map(n => n.charAt(0).toUpperCase() + n.slice(1));

    // Unique Check
    if (new Set(capNames).size !== capNames.length) return showWarnUI("Duplicate names!");

    gameState.players = capNames;
    capNames.forEach(n => CommonGame.savePlayerName(n));
    gameState.rounds = [];

    saveState();
    setupBoard();
}

function setupBoard() {
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-board').style.display = 'flex';

    renderScoreTable();
    updateDiceUI();
    checkEndGameBtn();
}

function setPapayooColor(suit) {
    gameState.activePapayooColor = suit;
    updateDiceUI();
    saveState();
}

function updateDiceLabel() {
    const roundNum = (editingRoundIdx > -1) ? (editingRoundIdx + 1) : (gameState.rounds.length + 1);
    let label = t('dice_label').replace('#', roundNum);
    document.getElementById('dice-label').innerText = label;

    let btnText = "Papayoo !";
    if (gameState.activePapayooColor) {
        btnText = t('btn_papayoo').replace('#', gameState.activePapayooColor);
    }
    document.getElementById('btn-papayou-action').innerText = btnText;
}

function updateDiceUI() {
    const btns = document.querySelectorAll('.suit-btn');
    btns.forEach(b => {
        if (b.innerText === gameState.activePapayooColor) b.classList.add('selected');
        else b.classList.remove('selected');
    });
    updateDiceLabel();
}

function playPapayouSound() {
    const audio = document.getElementById('sfx-papayou');
    audio.loop = false;
    audio.onerror = () => { console.warn("Audio file missing"); };
    audio.play().catch(e => console.log(e));
}

let editingRoundIdx = -1;

function openRoundInput() {
    editingRoundIdx = -1;
    // Validate dice selection (only for new rounds)
    if (!gameState.activePapayooColor) {
        showWarnUI(t('warn_dice'));
        return;
    }
    _openModal();
}

function editRound(idx) {
    editingRoundIdx = idx;
    // Load data
    const r = gameState.rounds[idx];
    // We don't change dice color in edit mode (simplification), or stored color?
    // r.color is stored.
    _openModal(r.scores);
}

function _openModal(scores = null) {
    const modal = document.getElementById('round-modal');
    const container = document.getElementById('modal-inputs');
    document.getElementById('modal-round-num').innerText = (editingRoundIdx > -1) ? (editingRoundIdx + 1) : (gameState.rounds.length + 1);

    container.innerHTML = '';
    gameState.players.forEach((p, i) => {
        const val = scores ? scores[i] : '';
        const div = document.createElement('div');
        div.className = 'score-input-row';
        div.innerHTML = `
            <label>${p}</label>
            <input type="number" class="score-input" data-idx="${i}" value="${val}" oninput="updateHud()">
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
        showWarnUI(t('warn_auto'));
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
        showWarnUI(t('warn_math').replace('#', sum));
        return;
    }

    if (editingRoundIdx > -1) {
        // preserve existing color
        gameState.rounds[editingRoundIdx].scores = scores;
        // if user wants to edit color, it's not supported here.
    } else {
        gameState.rounds.push({
            scores: scores,
            color: gameState.activePapayooColor
        });
        gameState.dealerIdx = (gameState.dealerIdx + 1) % gameState.players.length;
        // Reset Dice
        gameState.activePapayooColor = null;
    }

    saveState();
    closeModal();
    renderScoreTable();
    updateDiceUI();
    checkEndGameBtn();
}

function checkEndGameBtn() {
    const btn = document.getElementById('btn-final-score');
    if (gameState.rounds.length >= gameState.players.length) {
        btn.style.display = 'block';
    } else {
        btn.style.display = 'none';
    }
}

function renderScoreTable() {
    const thead = document.getElementById('table-head-row');
    const tbody = document.getElementById('table-body');
    const tfoot = document.getElementById('total-row');

    thead.innerHTML = '<th>M.</th>';
    gameState.players.forEach((p, i) => {
        const th = document.createElement('th');
        th.innerText = p;
        if (i === gameState.dealerIdx) th.style.borderTop = "4px solid var(--accent-orange)";
        thead.appendChild(th);
    });

    tbody.innerHTML = '';
    let totals = new Array(gameState.players.length).fill(0);

    gameState.rounds.forEach((r, rIdx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><span style="color:#aaa">${rIdx + 1}</span> <span style="font-size:0.8rem">${r.color}</span> <i class="fas fa-edit" onclick="editRound(${rIdx})" style="cursor:pointer; color:#888; margin-left:5px; font-size:0.8rem;"></i></td>`;

        r.scores.forEach((s, pIdx) => {
            totals[pIdx] += s;
            const td = document.createElement('td');
            td.innerText = s;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    tfoot.innerHTML = `<td>${t('total')}</td>`;
    totals.forEach(t => {
        const td = document.createElement('td');
        td.innerText = t;
        tfoot.appendChild(td);
    });
    return totals;
}

function showFinalRanking() {
    const totals = renderScoreTable(); // get fresh totals
    const rankings = gameState.players.map((p, i) => ({ name: p, score: totals[i] }));

    // Sort ascending
    rankings.sort((a, b) => a.score - b.score);

    const list = document.getElementById('ranking-list');
    list.innerHTML = '';

    rankings.forEach((r, i) => {
        const div = document.createElement('div');
        div.style.fontSize = "1.5rem";
        div.style.borderBottom = "1px solid #444";
        div.style.padding = "10px";
        div.style.display = "flex";
        div.style.justifyContent = "space-between";

        // Winner styling
        if (i === 0) {
            div.style.color = "var(--accent-yellow)";
            div.style.fontWeight = "bold";
            div.innerHTML = `<span>🏆 ${r.name}</span> <span>${r.score}</span>`;
        } else {
            div.innerHTML = `<span>${i + 1}. ${r.name}</span> <span>${r.score}</span>`;
        }

        list.appendChild(div);
    });

    document.getElementById('ranking-modal').classList.add('visible');

    // Play sound on loop
    const audio = document.getElementById('sfx-papayou');
    if (audio) {
        audio.loop = true;
        audio.play().catch(() => { });
    }
}

function closeFinalModal() {
    document.getElementById('ranking-modal').classList.remove('visible');
    const audio = document.getElementById('sfx-papayou');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.loop = false;
    }
}


function shareResults() {
    const area = document.getElementById('rank-capture-area');
    html2canvas(area).then(canvas => {
        canvas.toBlob(blob => {
            const files = [new File([blob], 'papayoo-score.png', { type: 'image/png' })];
            if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
                navigator.share({
                    files: files,
                    title: 'Papayoo Results',
                    text: 'What a game!'
                });
            } else {
                // Fallback download
                const link = document.createElement('a');
                link.download = 'papayoo-score.png';
                link.href = canvas.toDataURL();
                link.click();
            }
        });
    });
}


function closeModal() {
    document.getElementById('round-modal').classList.remove('visible');
}

function showRules() {
    document.getElementById('rules-modal').classList.add('visible');
}

function resetGame() {
    if (confirm(t('confirm_reset'))) {
        localStorage.removeItem('papayoo_state');
        location.reload();
    }
}

function saveState() {
    localStorage.setItem('papayoo_state', JSON.stringify(gameState));
}

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
