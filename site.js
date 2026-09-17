// Static-site helpers (dirtball Pages). Inert on the dynamic app — every
// block is feature-detected and simply does nothing when its elements are
// absent.
window.SITE_BASE = "/dirtball/";

function staticSortRows(tbody, key, dir) {
    var rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
    rows.sort(function(a, b) {
        var va = parseFloat(a.getAttribute("data-" + key)) || 0;
        var vb = parseFloat(b.getAttribute("data-" + key)) || 0;
        return dir === "desc" ? vb - va : va - vb;
    });
    rows.forEach(function(r) { tbody.appendChild(r); });
}

document.addEventListener("DOMContentLoaded", function() {
    // Standings: tabs switch between the three embedded views.
    var views = document.querySelectorAll(".standings-view");
    var tabs = document.querySelectorAll(".standings-tab");
    var activeView = "overall";
    if (views.length && tabs.length) {
        function showView(name) {
            activeView = name;
            Array.prototype.forEach.call(views, function(v) {
                v.style.display = v.getAttribute("data-view") === name ? "" : "none";
            });
            Array.prototype.forEach.call(tabs, function(t) {
                if (t.getAttribute("data-view") === name) {
                    t.classList.add("sort-active");
                } else {
                    t.classList.remove("sort-active");
                }
            });
        }
        Array.prototype.forEach.call(tabs, function(t) {
            t.addEventListener("click", function() { showView(t.getAttribute("data-view")); });
        });
        showView("overall");
    }

    // Standings: sort buttons reorder the visible table.
    var sorts = document.querySelectorAll(".standings-sort");
    if (sorts.length) {
        Array.prototype.forEach.call(sorts, function(s) {
            s.addEventListener("click", function() {
                var container = document.querySelector('.standings-view[data-view="' + activeView + '"]');
                if (!container) return;
                var tbody = container.querySelector("tbody");
                if (tbody) staticSortRows(tbody, s.getAttribute("data-sort"), s.getAttribute("data-dir"));
            });
        });
    }

    // Scores: team filter.
    var teamFilter = document.getElementById("team-filter");
    if (teamFilter) {
        teamFilter.addEventListener("change", function() {
            var v = teamFilter.value;
            Array.prototype.forEach.call(document.querySelectorAll("tr[data-teams]"), function(tr) {
                var teams = tr.getAttribute("data-teams").split("|");
                tr.style.display = (v === "All" || teams.indexOf(v) !== -1) ? "" : "none";
            });
        });
    }
});
