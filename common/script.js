const SHARED_HISTORY_KEY = 'skullKing_Names'; // Using the same key to keep compatibility

const CommonGame = {
    getStoredPlayers: function() {
        try {
            return JSON.parse(localStorage.getItem(SHARED_HISTORY_KEY) || '[]');
        } catch(e) {
            return [];
        }
    },

    savePlayerName: function(name) {
        if(!name) return;
        let history = this.getStoredPlayers();
        name = name.trim();
        if (name && !history.includes(name)) {
            history.push(name);
            localStorage.setItem(SHARED_HISTORY_KEY, JSON.stringify(history));
        }
    },

    goHome: function() {
        if(confirm("Confirm: return to Home? Current game progress will be lost.")) {
            // Check if we are in a subfolder
            if (window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('skullking/index.html').replace('skullking/', '')) {
                window.location.href = '../index.html'; 
            } else {
                 // Fallback
                 window.location.href = '../index.html'; 
            }
        }
    }
};
