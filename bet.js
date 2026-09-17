// Bet slip logic for bet.html (served from Pages and locally by bet_slip.rb).
// Data: relative fetch of api/games.json (works on Pages at /<repo>/ and on
// the local server at /). Writes: POST to the local backend's /place_bet,
// token-guarded. No history is displayed.
(function() {
    'use strict';

    var backendInput = document.getElementById('backend-input');
    var tokenInput = document.getElementById('token-input');
    var backend = localStorage.getItem('betBackend') || 'http://localhost:4567';
    var token = localStorage.getItem('betToken') || '';
    backendInput.value = backend;
    tokenInput.value = token;
    backendInput.addEventListener('change', function() {
        backend = backendInput.value.trim();
        localStorage.setItem('betBackend', backend);
        refreshQueue();
    });
    tokenInput.addEventListener('change', function() {
        token = tokenInput.value.trim();
        localStorage.setItem('betToken', token);
    });

    var games = [];           // all fetched rows
    var upcoming = [];        // bettable window subset
    var checked = {};         // gameId -> true
    var sel = {};             // gameId -> 'home' | 'away'

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function lastSundayOfMonth(y, m) {
        var d = new Date(Date.UTC(y, m, 0));
        d.setUTCDate(d.getUTCDate() - d.getUTCDay());
        return d.getTime();
    }

    function cetOffsetMs(date) {
        var y = date.getUTCFullYear();
        var start = lastSundayOfMonth(y, 3);
        var end = lastSundayOfMonth(y, 10);
        var t = date.getTime();
        return (t >= start && t < end) ? 2 * 3600000 : 3600000;
    }

    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function formatCET(iso) {
        var d = new Date(iso);
        var c = new Date(d.getTime() + cetOffsetMs(d));
        return pad(c.getUTCDate()) + ' ' + MONTHS[c.getUTCMonth()] + ' ' +
               pad(c.getUTCHours()) + ':' + pad(c.getUTCMinutes());
    }

    function flash(msg, category) {
        var area = document.getElementById('flash-area');
        var div = document.createElement('div');
        div.className = 'flash flash-' + (category || 'info');
        div.textContent = msg;
        area.appendChild(div);
        setTimeout(function() {
            div.style.transition = 'opacity 0.5s';
            div.style.opacity = '0';
            setTimeout(function() { div.remove(); }, 500);
        }, 6000);
    }

    function isStarted(g) {
        return new Date(g.commence_time).getTime() <= Date.now();
    }

    function renderFixtures() {
        var container = document.getElementById('fixtures');
        if (!upcoming.length) {
            container.innerHTML = '<div class="empty-state"><p>No upcoming games in the next 72 hours.</p></div>';
            return;
        }
        var html = '<table class="games-table"><thead><tr><th></th><th>Date (CET)</th><th>Home</th><th>Away</th><th>Home Odds</th><th>Away Odds</th><th>Pick</th></tr></thead><tbody>';
        var lastDay = '';
        upcoming.forEach(function(g) {
            var day = formatCET(g.commence_time).slice(0, 6);
            if (day !== lastDay) {
                lastDay = day;
                html += '<tr class="day-header-row"><td colspan="7"><strong>' + day + '</strong></td></tr>';
            }
            var started = isStarted(g);
            var ho = g.home_odds ? g.home_odds.toFixed(2) : '&mdash;';
            var ao = g.away_odds ? g.away_odds.toFixed(2) : '&mdash;';
            var id = g.id.replace(/"/g, '');
            var homeChecked = (sel[id] || 'home') === 'home' ? ' checked' : '';
            var awayChecked = sel[id] === 'away' ? ' checked' : '';
            html += '<tr class="' + (started ? 'finished' : '') + '">';
            html += '<td>' + (started ? '' : '<input type="checkbox" class="game-checkbox" data-id="' + id + '">') + '</td>';
            html += '<td>' + formatCET(g.commence_time) + (started ? ' <span class="live-badge">STARTED</span>' : '') + '</td>';
            html += '<td><strong>' + g.home_team + '</strong></td>';
            html += '<td><strong>' + g.away_team + '</strong></td>';
            html += '<td>' + ho + '</td><td>' + ao + '</td>';
            html += '<td>' +
                '<label class="bet-radio"><input type="radio" name="sel-' + id + '" value="home"' + homeChecked + (started ? ' disabled' : '') + '> H</label> ' +
                '<label class="bet-radio"><input type="radio" name="sel-' + id + '" value="away"' + awayChecked + (started ? ' disabled' : '') + '> A</label>' +
                '</td>';
            html += '</tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;

        Array.prototype.forEach.call(container.querySelectorAll('.game-checkbox'), function(cb) {
            cb.checked = !!checked[cb.getAttribute('data-id')];
            cb.addEventListener('change', function() {
                var id = cb.getAttribute('data-id');
                if (cb.checked) { checked[id] = true; } else { delete checked[id]; }
                updateSlip();
            });
        });
        Array.prototype.forEach.call(container.querySelectorAll('input[type="radio"]'), function(r) {
            r.addEventListener('change', function() {
                sel[r.name.slice(4)] = r.value;
                updateSlip();
            });
        });
    }

    function updateSlip() {
        var slip = document.getElementById('bet-slip');
        var items = document.getElementById('bet-slip-items');
        var summary = document.getElementById('bet-summary');
        var stake = parseFloat(document.getElementById('stake').value) || 10;

        var chosen = upcoming.filter(function(g) { return checked[g.id] && !isStarted(g); });
        var slipHTML = '';
        var combined = 1.0;
        chosen.forEach(function(g) {
            var pick = sel[g.id] || 'home';
            var odds = pick === 'home' ? g.home_odds : g.away_odds;
            slipHTML += '<div class="slip-item">';
            slipHTML += '<span class="slip-matchup">' + g.away_team + ' @ ' + g.home_team + '</span>';
            slipHTML += '<span class="slip-date">' + formatCET(g.commence_time) + '</span>';
            slipHTML += '<span class="slip-pick">' + pick + ' @ ' + (odds ? odds.toFixed(2) : '&mdash;') + '</span>';
            slipHTML += '</div>';
            if (odds) combined *= odds;
        });

        if (chosen.length) {
            slip.style.display = 'block';
            items.innerHTML = slipHTML;
            var net = stake * (combined - 1);
            summary.innerHTML = '<div class="summary-row"><span>Combined Odds:</span> <strong>' + combined.toFixed(2) + '</strong></div>' +
                '<div class="summary-row"><span>Net Profit:</span> <strong>$' + net.toFixed(2) + '</strong></div>' +
                '<div class="summary-row"><span>Total Return:</span> <strong>$' + (stake + net).toFixed(2) + '</strong></div>';
        } else {
            slip.style.display = 'none';
            items.innerHTML = '';
            summary.innerHTML = '';
        }
    }

    document.getElementById('stake').addEventListener('input', updateSlip);

    document.getElementById('place-btn').addEventListener('click', function() {
        var chosen = upcoming.filter(function(g) { return checked[g.id]; });
        var started = chosen.filter(isStarted);
        if (started.length) {
            flash(started.length + ' checked game(s) have already started — unchecked them.', 'error');
            started.forEach(function(g) { delete checked[g.id]; });
            renderFixtures();
            updateSlip();
            return;
        }
        if (!chosen.length) {
            flash('No games selected.', 'error');
            return;
        }
        if (!token) {
            flash('Enter the token from bet_slip.rb first.', 'error');
            return;
        }
        var stake = parseFloat(document.getElementById('stake').value) || 0;
        if (stake <= 0) {
            flash('Stake must be positive.', 'error');
            return;
        }
        var selections = chosen.map(function(g) {
            var pick = sel[g.id] || 'home';
            return { game_id: g.id, selection: pick, odds: pick === 'home' ? g.home_odds : g.away_odds };
        });
        var body = {
            selections: selections,
            stake: stake,
            note: document.getElementById('note').value
        };
        fetch(backend + '/place_bet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bet-Token': token },
            body: JSON.stringify(body)
        }).then(function(resp) {
            if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
            return resp.json();
        }).then(function(data) {
            flash('Queued ' + data.queued + ' bet(s) locally — commit & push data/pending_bets.json.', 'success');
            chosen.forEach(function(g) { delete checked[g.id]; });
            renderFixtures();
            updateSlip();
            refreshQueue();
        }).catch(function(err) {
            flash('Could not reach ' + backend + ' — is bet_slip.rb running? (' + err.message + ')', 'error');
        });
    });

    function refreshQueue() {
        var section = document.getElementById('queue-section');
        var list = document.getElementById('queue-list');
        fetch(backend + '/queue')
            .then(function(resp) {
                if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
                return resp.json();
            })
            .then(function(rows) {
                if (!rows.length) {
                    section.style.display = 'none';
                    return;
                }
                var byGame = {};
                games.forEach(function(g) { byGame[g.id] = g; });
                var html = '';
                rows.forEach(function(b) {
                    var g = byGame[b.game_id];
                    var match = g ? (g.away_team + ' @ ' + g.home_team + ' · ' + formatCET(g.commence_time)) : b.game_id;
                    html += '<div class="ticket-card ticket-pending">' +
                        '<div class="ticket-leg">' + match + ' &mdash; ' + b.selection + ' @ ' + b.odds + '</div>' +
                        '<div class="ticket-footer"><span>Stake: <strong>$' + b.stake + '</strong></span>' +
                        '<span>Queued: <strong>' + formatCET(b.placed_at) + '</strong></span></div>' +
                        '</div>';
                });
                list.innerHTML = html;
                section.style.display = 'block';
            })
            .catch(function() {
                section.style.display = 'none';
            });
    }

    fetch('api/games.json')
        .then(function(resp) {
            if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
            return resp.json();
        })
        .then(function(data) {
            games = data;
            var now = Date.now();
            upcoming = games.filter(function(g) {
                if (g.result) return false;
                var t = new Date(g.commence_time).getTime();
                return t > now - 3600000 && t < now + 72 * 3600000;
            }).sort(function(a, b) {
                return new Date(a.commence_time) - new Date(b.commence_time);
            });
            renderFixtures();
            refreshQueue();
        })
        .catch(function(err) {
            document.getElementById('fixtures').innerHTML =
                '<div class="empty-state"><p>Could not load fixtures (' + err.message + ').</p></div>';
        });
})();
