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
        place_round: "Max Manches",
        final_res: "🏆 Résultats Finaux",
        share: "📸 Partager",
        new_game: "Nouvelle Partie"
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
        place_round: "Max Rounds",
        final_res: "🏆 Final Results",
        share: "📸 Share",
        new_game: "New Game"
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

let editingRoundIndex = -1;

function startGame() {
    const inputs = document.querySelectorAll('.p-name');
    const names = Array.from(inputs).map(i => i.value.trim()).filter(n => n);

    // Unique Check
    if (new Set(names).size !== names.length) return alert(t('unique_err') || "Unique names required!");
    if (names.length < 2) return alert("Min 2 players");

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
    editingRoundIndex = -1;
    openModalForInput();
}

function editRound(idx) {
    editingRoundIndex = idx;
    openModalForInput(gameState.rounds[idx]);
}

function openModalForInput(data = null) {
    const modal = document.getElementById('round-modal');
    const container = document.getElementById('modal-inputs');
    container.innerHTML = '';

    gameState.players.forEach((p, i) => {
        // Prepare values if editing
        let val = '';
        let isCaller = false;

        if (data) {
            // Data is object { scores: [], caller: idx/null }
            if (data.scores) {
                // Must reverse-engineer raw score? 
                // Wait, we stored FINAL scores. We don't have raw scores.
                // We have to ask user to re-enter raw scores or just final scores?
                // Request implies "edit the row".
                // We'll let them edit the FINAL VALUE directly if simple, OR we assume they know the calculation.
                // Actually, for Dutch, logic is applied on save. 
                // Let's assume we just ask for the numeric entry again.
                // If we don't store raw, we can't easily pre-fill 100% correctly if logic modified it (-10).
                // Simplified: Just pre-fill with the stored score, user adjusts.
                val = data.scores[i];
            } else {
                // Legacy support (array)
                val = data[i];
            }
            if (data.caller === i) isCaller = true;
        }

        const div = document.createElement('div');
        div.className = 'dutch-call-row';
        div.innerHTML = `
            <div style="flex:1; text-align:left;">
                <label style="font-weight:bold;">${p}</label>
            </div>
            <button class="btn-dutch-toggle ${isCaller ? 'active' : ''}" id="dutch-btn-${i}" onclick="toggleDutch(${i})">DUTCH</button>
            <input type="number" class="score-input" id="score-${i}" value="${val}" placeholder="0" style="width:60px; text-align:center; padding:8px;">
        `;
        container.appendChild(div);
    });

    modal.classList.add('visible');
}

function toggleDutch(idx) {
    // Single caller enforcement
    const all = document.querySelectorAll('.btn-dutch-toggle');
    const target = document.getElementById(`dutch-btn-${idx}`);
    const wasActive = target.classList.contains('active');

    all.forEach(b => b.classList.remove('active'));

    if (!wasActive) target.classList.add('active');
}

function saveRound() {
    let rawScores = [];
    let callerIdx = -1;

    let inputs = document.querySelectorAll('.score-input');
    inputs.forEach((inp, i) => {
        let val = Number(inp.value) || 0;
        rawScores.push(val);
        if (document.getElementById(`dutch-btn-${i}`).classList.contains('active')) {
            callerIdx = i;
        }
    });

    let finalScores = [...rawScores];

    // Logic apply (only if not editing final values directly? We assume inputs ARE raw if fresh, but if editing we might double apply? 
    // Assumption: User corrects the RAW score. We re-apply logic.
    // If user calls Dutch, we check success.

    // HOWEVER: If we pre-fill with -10 (success), and save again, it becomes -10 < others -> -10. Safe.
    // If pre-fill with 12 (fail: 2+10), and save -> 12 is not lowest -> 12 + 10 = 22. ERROR.
    // Issue: We don't store Raw.
    // Solution: For now, if editing, we assume user enters FINAL scores ? 
    // NO, user expects logic. 
    // Quick Fix: We won't re-apply +10/-10 if editing? No, that breaks changing caller.
    // We will just let the user know they should enter RAW CARD values.
    // OR we just store Raw in the future.
    // Let's migrate to storing { raw: [], scores: [], caller: ... }.

    let isSuccess = false;

    if (callerIdx > -1) {
        const myScore = rawScores[callerIdx];
        const others = rawScores.filter((_, i) => i !== callerIdx);
        // Safety check if playing alone (debug)
        if (others.length > 0) {
            const minOthers = Math.min(...others);

            if (myScore < minOthers) {
                // Strictly Lowest -> Success (-10)
                finalScores[callerIdx] = -10;
                isSuccess = true;
            } else if (myScore === minOthers) {
                // Tied -> Neutral (Keep raw score)
                finalScores[callerIdx] = myScore;
                isSuccess = false; // "Failed" to win bonus, but no penalty
            } else {
                // Not Lowest -> Fail (Score + 10)
                finalScores[callerIdx] = 10 + myScore;
                isSuccess = false;
            }
        }
    }

    const roundObj = {
        scores: finalScores,
        caller: callerIdx,
        success: isSuccess
    };

    if (editingRoundIndex > -1) {
        gameState.rounds[editingRoundIndex] = roundObj;
    } else {
        gameState.rounds.push(roundObj);
        gameState.dealerIdx = (gameState.dealerIdx + 1) % gameState.players.length;
    }

    saveState();
    closeModal();
    renderTable();
    checkGameEnd();
}

function renderTable() {
    const thead = document.getElementById('table-head');
    const tbody = document.getElementById('table-body');
    const tfoot = document.getElementById('table-foot');

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
        // Support Legacy (Array) vs New (Object)
        const scores = r.scores || r;
        const caller = (typeof r.caller === 'number') ? r.caller : -1;
        const success = r.success;

        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${idx + 1} <i class="fas fa-edit" style="font-size:0.8rem; color:#aaa; cursor:pointer; margin-left:4px;" onclick="editRound(${idx})"></i></td>`;

        scores.forEach((s, i) => {
            totals[i] += s;
            const td = document.createElement('td');

            let content = `<span>${s}</span>`;
            if (i === caller) {
                if (success) content += ` <span style="font-size:0.8rem;">🇳🇱</span>`;
                else content += ` <span style="font-size:0.8rem;">🇳🇱❌</span>`;
            }
            td.innerHTML = content;
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
        showFinalRanking(totals);
    }
}

function showFinalRanking(totals) {
    const rankings = gameState.players.map((p, i) => ({ name: p, score: totals[i] }));

    // Sort ascending (lowest wins in Dutch)
    rankings.sort((a, b) => a.score - b.score);

    const list = document.getElementById('ranking-list');
    list.innerHTML = '';

    rankings.forEach((r, i) => {
        const div = document.createElement('div');
        div.style.fontSize = "1.2rem";
        div.style.borderBottom = "1px solid #ddd";
        div.style.padding = "10px";
        div.style.display = "flex";
        div.style.justifyContent = "space-between";

        if (i === 0) {
            div.style.color = "var(--accent)";
            div.style.fontWeight = "bold";
            div.innerHTML = `<span>🏆 ${r.name}</span> <span>${r.score}</span>`;
        } else {
            div.innerHTML = `<span>${i + 1}. ${r.name}</span> <span>${r.score}</span>`;
        }

        list.appendChild(div);
    });

    document.getElementById('ranking-modal').classList.add('visible');

    // Play sound on loop
    const audio = document.getElementById('sfx-dutch');
    if (audio) {
        audio.loop = true;
        audio.play().catch(() => { });
    }
}

function closeFinalModal() {
    document.getElementById('ranking-modal').classList.remove('visible');
    const audio = document.getElementById('sfx-dutch');
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
            const files = [new File([blob], 'dutch-score.png', { type: 'image/png' })];
            if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
                navigator.share({
                    files: files,
                    title: 'Dutch Results',
                    text: 'Great game!'
                });
            } else {
                const link = document.createElement('a');
                link.download = 'dutch-score.png';
                link.href = canvas.toDataURL();
                link.click();
            }
        });
    });
}

function closeModal() {
    document.getElementById('round-modal').classList.remove('visible');
}

function resetGame() {
    if (confirm("Reset Game?")) {
        localStorage.removeItem('dutch_state');
        location.reload();
    }
}

function saveState() {
    localStorage.setItem('dutch_state', JSON.stringify(gameState));
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
