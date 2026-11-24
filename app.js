/*
 * EcoPickup - Smart Waste Collection & Pickup Management System
 * --------------------------------------------------------------
 * Single-page app (vanilla JS). No backend / no libraries needed.
 * All data is stored in the browser's localStorage (acts as the database).
 *
 * Roles:
 *   citizen   -> request pickups, track status, rate service, view smart bins
 *   collector -> see assigned pickups in route order, start / complete them
 *   admin     -> dashboard, assign collectors (manual + auto), smart bins, users
 */
(function () {
  'use strict';

  /* ===================== CONSTANTS ===================== */
  var KEY = 'ecopickup_db_v1';
  var ZONES = ['Central', 'North', 'South', 'East', 'West'];
  var WASTE = ['Wet / Organic', 'Dry', 'Recyclable', 'E-Waste', 'Hazardous', 'Bulk / Furniture'];
  var SLOTS = ['08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '16:00 - 18:00'];
  var ACTIVE = ['Pending', 'Assigned', 'In Progress'];
  var BIN_ALERT = 80; // % fill at which a bin is considered "full"

  var NAV = {
    citizen: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { id: 'new', label: 'Request Pickup', icon: '➕' },
      { id: 'requests', label: 'My Requests', icon: '📋' },
      { id: 'bins', label: 'Smart Bins', icon: '🗑️' }
    ],
    collector: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { id: 'tasks', label: 'My Tasks', icon: '🚛' }
    ],
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'requests', label: 'All Requests', icon: '📋' },
      { id: 'bins', label: 'Smart Bins', icon: '🗑️' },
      { id: 'users', label: 'Users', icon: '👥' }
    ]
  };

  /* ===================== HELPERS ===================== */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid(p) {
    return p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  }
  function ymd(dt) {
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  }
  function today() { return ymd(new Date()); }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return ymd(d); }
  function nowISO() { return new Date().toISOString(); }
  function fmtDate(s) {
    if (!s) return '-';
    var d = new Date(s.length === 10 ? s + 'T00:00:00' : s);
    return isNaN(d) ? s : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fmtTime(s) {
    var d = new Date(s);
    return isNaN(d) ? '' : d.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  function opts(list, sel) {
    return list.map(function (x) {
      return '<option value="' + esc(x) + '"' + (x === sel ? ' selected' : '') + '>' + esc(x) + '</option>';
    }).join('');
  }

  /* ===================== DATABASE (localStorage) ===================== */
  function seed() {
    var users = [
      { id: 'u_admin', name: 'Admin', email: 'admin@demo.com', password: 'admin123', role: 'admin', phone: '', zone: 'Central' },
      { id: 'u_c1', name: 'Ramesh Kumar', email: 'driver@demo.com', password: 'driver123', role: 'collector', phone: '9876500001', zone: 'Central' },
      { id: 'u_c2', name: 'Suresh Patil', email: 'driver2@demo.com', password: 'driver123', role: 'collector', phone: '9876500002', zone: 'North' },
      { id: 'u_u1', name: 'Anita Sharma', email: 'user@demo.com', password: 'user123', role: 'citizen', phone: '9876500003', zone: 'Central' }
    ];
    var bins = [
      { id: 'B01', location: 'Main Market Gate', zone: 'Central', fill: 35, updated: nowISO(), dispatched: false },
      { id: 'B02', location: 'City Bus Stand', zone: 'Central', fill: 88, updated: nowISO(), dispatched: false },
      { id: 'B03', location: 'Green Park Entrance', zone: 'North', fill: 62, updated: nowISO(), dispatched: false },
      { id: 'B04', location: 'Railway Station Road', zone: 'North', fill: 91, updated: nowISO(), dispatched: false },
      { id: 'B05', location: 'Lake View Colony', zone: 'South', fill: 20, updated: nowISO(), dispatched: false },
      { id: 'B06', location: 'Industrial Area Gate 2', zone: 'East', fill: 74, updated: nowISO(), dispatched: false },
      { id: 'B07', location: 'University Campus Road', zone: 'West', fill: 48, updated: nowISO(), dispatched: false },
      { id: 'B08', location: 'Hospital Chowk', zone: 'West', fill: 83, updated: nowISO(), dispatched: false }
    ];
    var t = nowISO();
    var requests = [
      {
        id: 'R1001', userId: 'u_u1', type: 'Dry', quantity: '3 bags', address: '12, Rose Apartments, Main Road',
        zone: 'Central', date: addDays(1), slot: SLOTS[0], notes: 'Cartons and paper', status: 'Assigned',
        collectorId: 'u_c1', createdAt: t, history: [{ status: 'Pending', at: t }, { status: 'Assigned', at: t }],
        rating: 0, feedback: '', binId: null
      },
      {
        id: 'R1002', userId: 'u_u1', type: 'E-Waste', quantity: '1 old monitor', address: '12, Rose Apartments, Main Road',
        zone: 'Central', date: addDays(-3), slot: SLOTS[1], notes: '', status: 'Completed',
        collectorId: 'u_c1', createdAt: t,
        history: [{ status: 'Pending', at: t }, { status: 'Assigned', at: t }, { status: 'In Progress', at: t }, { status: 'Completed', at: t }],
        rating: 5, feedback: 'Quick and polite service.', binId: null
      }
    ];
    return { users: users, bins: bins, requests: requests, session: null, counter: 1002 };
  }

  var db = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.users && parsed.requests && parsed.bins) return parsed;
      }
    } catch (e) { /* ignore and re-seed */ }
    return seed();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* storage full / blocked */ }
  }

  /* ===================== DOMAIN LOGIC ===================== */
  var state = { filter: 'All' };

  function me() {
    return db.users.find(function (u) { return u.id === db.session; }) || null;
  }
  function userById(id) {
    return db.users.find(function (u) { return u.id === id; });
  }
  function userName(id) {
    var u = userById(id);
    return u ? u.name : (id === 'system' ? 'Smart Bin (auto)' : '-');
  }
  function collectors() {
    return db.users.filter(function (u) { return u.role === 'collector'; });
  }
  function setStatus(r, status) {
    r.status = status;
    r.history.push({ status: status, at: nowISO() });
  }
  function activeLoad(collectorId) {
    return db.requests.filter(function (r) {
      return r.collectorId === collectorId && (r.status === 'Assigned' || r.status === 'In Progress');
    }).length;
  }
  // Smart assignment: prefer a collector from the same zone, then the one with the lightest load.
  function pickCollector(zone) {
    var all = collectors();
    if (!all.length) return null;
    var sameZone = all.filter(function (c) { return c.zone === zone; });
    var pool = sameZone.length ? sameZone : all;
    pool = pool.slice().sort(function (a, b) { return activeLoad(a.id) - activeLoad(b.id); });
    return pool[0];
  }
  function nextId() {
    db.counter = (db.counter || 1000) + 1;
    return 'R' + db.counter;
  }
  function byRoute(a, b) { // route order: date -> time slot -> zone
    return a.date.localeCompare(b.date) ||
      SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot) ||
      a.zone.localeCompare(b.zone);
  }
  function binLevel(fill) {
    return fill >= BIN_ALERT ? 'danger' : fill >= 50 ? 'warn' : 'ok';
  }

  /* ===================== UI PIECES ===================== */
  function toast(msg, type) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'show ' + (type || '');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.className = ''; }, 2600);
  }
  function badge(s) {
    return '<span class="badge s-' + esc(s.replace(/\s/g, '').toLowerCase()) + '">' + esc(s) + '</span>';
  }
  function stat(label, value, cls) {
    return '<div class="stat ' + (cls || '') + '"><div class="v">' + esc(value) + '</div><div class="l">' + esc(label) + '</div></div>';
  }
  function bars(map, total) {
    var max = Math.max.apply(null, Object.keys(map).map(function (k) { return map[k]; }).concat([1]));
    return Object.keys(map).map(function (k) {
      var pct = Math.round((map[k] / max) * 100);
      return '<div class="bar-row"><span>' + esc(k) + '</span><div class="bar"><i style="width:' + pct + '%"></i></div><b>' + map[k] + '</b></div>';
    }).join('') || '<p class="hint">No data yet.</p>';
  }
  function timeline(r) {
    return '<details><summary>Timeline</summary><ul class="timeline">' +
      r.history.map(function (h) { return '<li>' + esc(h.status) + ' - ' + esc(fmtTime(h.at)) + '</li>'; }).join('') +
      '</ul></details>';
  }
  function stars(n) {
    return n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '';
  }

  function shell(u, page, content) {
    var items = NAV[u.role].map(function (n) {
      return '<a href="#/' + n.id + '" class="' + (n.id === page ? 'active' : '') + '">' + n.icon + ' ' + esc(n.label) + '</a>';
    }).join('');
    return '<header class="topbar"><div class="brand">♻️ EcoPickup</div>' +
      '<div class="who"><span class="name">' + esc(u.name) + '</span><span class="role">' + esc(u.role) + '</span>' +
      '<button class="btn ghost sm" data-act="logout">Logout</button></div></header>' +
      '<div class="layout"><nav class="side">' + items + '</nav><main class="main">' + content + '</main></div>';
  }

  /* ===================== AUTH VIEWS ===================== */
  function viewAuth(mode) {
    var form;
    if (mode === 'register') {
      form = '<h2>Create account</h2><p class="hint">Register as a citizen to request waste pickups.</p>' +
        '<form data-form="register" autocomplete="off">' +
        '<label>Full name</label><input name="name" required minlength="2" maxlength="60">' +
        '<label>Email</label><input name="email" type="email" required>' +
        '<div class="row"><div><label>Phone</label><input name="phone" inputmode="numeric" pattern="[0-9]{10}" title="10 digit phone number" required></div>' +
        '<div><label>Zone</label><select name="zone">' + opts(ZONES) + '</select></div></div>' +
        '<label>Password</label><input name="password" type="password" required minlength="6">' +
        '<br><button class="btn block" type="submit">Register</button></form>' +
        '<div class="switch">Already have an account? <a href="#/login">Login</a></div>';
    } else {
      form = '<h2>Welcome back</h2><p class="hint">Login to manage waste pickups.</p>' +
        '<form data-form="login">' +
        '<label>Email</label><input name="email" type="email" required>' +
        '<label>Password</label><input name="password" type="password" required>' +
        '<br><button class="btn block" type="submit">Login</button></form>' +
        '<div class="switch">New here? <a href="#/register">Create an account</a></div>' +
        '<div class="demo"><b>Demo accounts</b> (click to fill):<br>' +
        '<button data-act="fill" data-e="admin@demo.com" data-p="admin123">Admin</button> · ' +
        '<button data-act="fill" data-e="driver@demo.com" data-p="driver123">Collector</button> · ' +
        '<button data-act="fill" data-e="user@demo.com" data-p="user123">Citizen</button></div>';
    }
    return '<div class="auth"><section class="hero"><h1>♻️ Smart Waste Collection &amp; Pickup Management System</h1>' +
      '<p>A simple way for citizens, collectors and municipal admins to schedule, track and manage waste pickups.</p>' +
      '<ul><li>Schedule doorstep pickups by waste type, date and time slot</li>' +
      '<li>Live status tracking from Pending to Completed</li>' +
      '<li>Smart bins with fill-level alerts and automatic dispatch</li>' +
      '<li>Zone-based auto assignment and route-ordered task lists</li></ul></section>' +
      '<section class="panel"><div class="box">' + form + '</div></section></div>';
  }

  /* ===================== DASHBOARDS ===================== */
  function viewDashboard(u) {
    if (u.role === 'admin') return dashAdmin();
    if (u.role === 'collector') return dashCollector(u);
    return dashCitizen(u);
  }

  function dashCitizen(u) {
    var mine = db.requests.filter(function (r) { return r.userId === u.id; });
    var cnt = function (s) { return mine.filter(function (r) { return r.status === s; }).length; };
    var upcoming = mine.filter(function (r) { return ACTIVE.indexOf(r.status) >= 0; }).sort(byRoute)[0];
    var full = db.bins.filter(function (b) { return b.zone === u.zone && b.fill >= BIN_ALERT; }).length;
    return '<div class="page-head"><div><h2>Hello, ' + esc(u.name) + ' 👋</h2><p>Zone: ' + esc(u.zone) + '</p></div>' +
      '<a class="btn" href="#/new">+ Request Pickup</a></div>' +
      '<div class="stats">' + stat('Total requests', mine.length) + stat('Pending', cnt('Pending'), 'warn') +
      stat('Assigned / In progress', cnt('Assigned') + cnt('In Progress'), 'info') + stat('Completed', cnt('Completed')) + '</div>' +
      (full ? '<div class="alert">⚠️ ' + full + ' smart bin(s) in your zone are almost full. Collectors have been notified.</div>' : '') +
      '<div class="grid2"><div class="card"><h3>Next pickup</h3>' +
      (upcoming
        ? '<p><b>' + esc(upcoming.type) + '</b> (' + esc(upcoming.quantity) + ')<br>' + esc(fmtDate(upcoming.date)) + ', ' + esc(upcoming.slot) +
        '<br>' + esc(upcoming.address) + '</p>' + badge(upcoming.status) +
        (upcoming.collectorId ? '<p class="hint">Collector: ' + esc(userName(upcoming.collectorId)) + '</p>' : '')
        : '<p class="hint">No upcoming pickups. Schedule one now!</p>') + '</div>' +
      '<div class="card"><h3>Segregation tips</h3><ul class="tips">' +
      '<li>Keep wet (kitchen) and dry waste in separate bins.</li>' +
      '<li>Rinse plastic and metal containers before recycling.</li>' +
      '<li>Hand over e-waste and batteries only through the E-Waste option.</li>' +
      '<li>Never mix hazardous items (paint, chemicals) with household waste.</li></ul></div></div>';
  }

  function dashCollector(u) {
    var mine = db.requests.filter(function (r) { return r.collectorId === u.id; });
    var todo = mine.filter(function (r) { return r.status === 'Assigned' || r.status === 'In Progress'; });
    var todayTasks = todo.filter(function (r) { return r.date === today(); });
    var done = mine.filter(function (r) { return r.status === 'Completed'; });
    var rated = done.filter(function (r) { return r.rating; });
    var avg = rated.length ? (rated.reduce(function (a, r) { return a + r.rating; }, 0) / rated.length).toFixed(1) : '-';
    return '<div class="page-head"><div><h2>Hello, ' + esc(u.name) + ' 🚛</h2><p>Home zone: ' + esc(u.zone) + '</p></div>' +
      '<a class="btn" href="#/tasks">Open my tasks</a></div>' +
      '<div class="stats">' + stat('Open tasks', todo.length, 'info') + stat('Due today', todayTasks.length, 'warn') +
      stat('Completed', done.length) + stat('Avg. rating', avg) + '</div>' +
      '<div class="card"><h3>Next stops</h3>' + (todo.length
        ? '<ol>' + todo.sort(byRoute).slice(0, 4).map(function (r) {
          return '<li>' + esc(fmtDate(r.date)) + ' ' + esc(r.slot) + ' - ' + esc(r.address) + ' (' + esc(r.type) + ')</li>';
        }).join('') + '</ol>'
        : '<p class="hint">No pending tasks. Great job!</p>') + '</div>';
  }

  function dashAdmin() {
    var rs = db.requests;
    var cnt = function (s) { return rs.filter(function (r) { return r.status === s; }).length; };
    var byType = {}, byStatus = {};
    WASTE.concat(['Bin Overflow']).forEach(function (t) { byType[t] = 0; });
    ['Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled'].forEach(function (s) { byStatus[s] = 0; });
    rs.forEach(function (r) {
      byType[r.type] = (byType[r.type] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });
    Object.keys(byType).forEach(function (k) { if (!byType[k]) delete byType[k]; });
    var full = db.bins.filter(function (b) { return b.fill >= BIN_ALERT; });
    var rated = rs.filter(function (r) { return r.rating; });
    var avg = rated.length ? (rated.reduce(function (a, r) { return a + r.rating; }, 0) / rated.length).toFixed(1) : '-';
    var recent = rs.slice().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }).slice(0, 5);
    return '<div class="page-head"><div><h2>Admin Dashboard</h2><p>City-wide overview of waste operations</p></div>' +
      '<a class="btn" href="#/requests">Manage requests</a></div>' +
      '<div class="stats">' + stat('Total requests', rs.length) + stat('Pending', cnt('Pending'), 'warn') +
      stat('In progress', cnt('Assigned') + cnt('In Progress'), 'info') + stat('Completed', cnt('Completed')) +
      stat('Full bins', full.length, full.length ? 'danger' : '') + stat('Avg. rating', avg) + '</div>' +
      (full.length ? '<div class="alert">⚠️ ' + full.length + ' smart bin(s) are above ' + BIN_ALERT + '% capacity: ' +
        esc(full.map(function (b) { return b.id; }).join(', ')) + '. <a href="#/bins">Open Smart Bins</a></div>' : '') +
      '<div class="grid2"><div class="card"><h3>Requests by waste type</h3>' + bars(byType) + '</div>' +
      '<div class="card"><h3>Requests by status</h3>' + bars(byStatus) + '</div></div>' +
      '<div class="card"><h3>Recent requests</h3>' + requestTable(recent, { role: 'viewer' }) + '</div>';
  }

  /* ===================== CITIZEN: NEW REQUEST ===================== */
  function viewNew(u) {
    return '<div class="page-head"><div><h2>Request a Pickup</h2><p>Schedule a doorstep waste collection</p></div></div>' +
      '<div class="card"><form data-form="newrequest">' +
      '<div class="row"><div><label>Waste type</label><select name="type">' + opts(WASTE) + '</select></div>' +
      '<div><label>Approx. quantity</label><input name="quantity" placeholder="e.g. 3 bags / 10 kg" required maxlength="40"></div></div>' +
      '<label>Pickup address</label><input name="address" required maxlength="150" placeholder="House no., street, landmark">' +
      '<div class="row"><div><label>Zone</label><select name="zone">' + opts(ZONES, u.zone) + '</select></div>' +
      '<div><label>Preferred date</label><input name="date" type="date" min="' + today() + '" value="' + addDays(1) + '" required></div></div>' +
      '<label>Time slot</label><select name="slot">' + opts(SLOTS) + '</select>' +
      '<label>Notes (optional)</label><textarea name="notes" maxlength="200" placeholder="Any special instructions"></textarea>' +
      '<br><button class="btn" type="submit">Submit request</button></form></div>';
  }

  /* ===================== REQUEST TABLES ===================== */
  function requestTable(list, o) {
    o = o || {};
    if (!list.length) return '<div class="empty">No requests found.</div>';
    var showUser = o.role === 'admin' || o.role === 'viewer' || o.role === 'collector';
    var head = '<tr><th>ID</th>' + (showUser ? '<th>Requested by</th>' : '') +
      '<th>Waste</th><th>Pickup</th><th>Address</th><th>Status</th><th>Collector</th>' +
      (o.role === 'viewer' ? '' : '<th>Action</th>') + '</tr>';
    var rows = list.map(function (r) {
      var collectorCell;
      if (o.role === 'admin' && (r.status === 'Pending' || r.status === 'Assigned')) {
        collectorCell = '<select data-change="assign" data-id="' + esc(r.id) + '"><option value="">- Assign -</option>' +
          collectors().map(function (c) {
            return '<option value="' + esc(c.id) + '"' + (c.id === r.collectorId ? ' selected' : '') + '>' +
              esc(c.name) + ' (' + esc(c.zone) + ')</option>';
          }).join('') + '</select>';
      } else {
        collectorCell = esc(userName(r.collectorId));
      }
      var actions = '';
      if (o.role === 'citizen') {
        if (r.status === 'Pending' || r.status === 'Assigned') {
          actions += '<button class="btn danger sm" data-act="cancel" data-id="' + esc(r.id) + '">Cancel</button>';
        }
        if (r.status === 'Completed') {
          if (r.rating) {
            actions += '<span title="' + esc(r.feedback) + '">' + stars(r.rating) + '</span>';
          } else {
            actions += '<form data-form="rate" style="display:flex;gap:6px"><input type="hidden" name="id" value="' + esc(r.id) + '">' +
              '<select name="rating" style="min-width:70px">' + [5, 4, 3, 2, 1].map(function (n) { return '<option value="' + n + '">' + n + ' ★</option>'; }).join('') + '</select>' +
              '<input name="feedback" placeholder="Feedback" maxlength="100" style="min-width:110px">' +
              '<button class="btn sm" type="submit">Rate</button></form>';
          }
        }
      } else if (o.role === 'admin') {
        if (r.status === 'Pending' || r.status === 'Assigned' || r.status === 'In Progress') {
          actions += '<button class="btn danger sm" data-act="cancel" data-id="' + esc(r.id) + '">Cancel</button>';
        }
        if (r.rating) actions += '<span title="' + esc(r.feedback) + '">' + stars(r.rating) + '</span>';
      }
      return '<tr><td><b>' + esc(r.id) + '</b></td>' +
        (showUser ? '<td>' + esc(userName(r.userId)) + '</td>' : '') +
        '<td>' + esc(r.type) + '<br><span class="hint">' + esc(r.quantity) + '</span></td>' +
        '<td>' + esc(fmtDate(r.date)) + '<br><span class="hint">' + esc(r.slot) + ' · ' + esc(r.zone) + '</span></td>' +
        '<td>' + esc(r.address) + (r.notes ? '<br><span class="hint">' + esc(r.notes) + '</span>' : '') + '</td>' +
        '<td>' + badge(r.status) + timeline(r) + '</td><td>' + collectorCell + '</td>' +
        (o.role === 'viewer' ? '' : '<td><div class="actions">' + actions + '</div></td>') + '</tr>';
    }).join('');
    return '<div class="table-wrap"><table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';
  }

  function viewRequests(u) {
    if (u.role === 'admin') {
      var list = db.requests.slice().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
      if (state.filter !== 'All') list = list.filter(function (r) { return r.status === state.filter; });
      var pending = db.requests.filter(function (r) { return r.status === 'Pending'; }).length;
      return '<div class="page-head"><div><h2>All Requests</h2><p>Assign collectors or let the system auto-assign by zone and workload</p></div>' +
        '<div style="display:flex;gap:8px;align-items:center"><select data-change="filter" style="min-width:150px">' +
        opts(['All', 'Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled'], state.filter) + '</select>' +
        '<button class="btn" data-act="autoassign">⚡ Auto-assign pending (' + pending + ')</button></div></div>' +
        '<div class="card">' + requestTable(list, { role: 'admin' }) + '</div>';
    }
    var mine = db.requests.filter(function (r) { return r.userId === u.id; })
      .sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
    return '<div class="page-head"><div><h2>My Requests</h2><p>Track and manage your pickups</p></div>' +
      '<a class="btn" href="#/new">+ New request</a></div><div class="card">' + requestTable(mine, { role: 'citizen' }) + '</div>';
  }

  /* ===================== COLLECTOR: TASKS ===================== */
  function viewTasks(u) {
    var mine = db.requests.filter(function (r) { return r.collectorId === u.id; });
    var open = mine.filter(function (r) { return r.status === 'Assigned' || r.status === 'In Progress'; }).sort(byRoute);
    var done = mine.filter(function (r) { return r.status === 'Completed'; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
    var rows = open.map(function (r, i) {
      var btn = r.status === 'Assigned'
        ? '<button class="btn sm" data-act="start" data-id="' + esc(r.id) + '">Start pickup</button>'
        : '<button class="btn warn sm" data-act="complete" data-id="' + esc(r.id) + '">Mark completed</button>';
      var cu = userById(r.userId);
      return '<tr><td><b>#' + (i + 1) + '</b></td><td>' + esc(fmtDate(r.date)) + '<br><span class="hint">' + esc(r.slot) + '</span></td>' +
        '<td>' + esc(r.address) + '<br><span class="hint">Zone: ' + esc(r.zone) + '</span></td>' +
        '<td>' + esc(r.type) + '<br><span class="hint">' + esc(r.quantity) + '</span></td>' +
        '<td>' + (cu ? esc(cu.name) + '<br><span class="hint">' + esc(cu.phone) + '</span>' : 'Smart Bin') + '</td>' +
        '<td>' + badge(r.status) + '</td><td>' + btn + '</td></tr>';
    }).join('');
    return '<div class="page-head"><div><h2>My Tasks</h2><p>Stops are listed in route order (date → time slot → zone)</p></div></div>' +
      '<div class="card"><h3>Open pickups</h3>' + (open.length
        ? '<div class="table-wrap"><table><thead><tr><th>Stop</th><th>When</th><th>Address</th><th>Waste</th><th>Contact</th><th>Status</th><th>Action</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty">No open tasks right now.</div>') + '</div>' +
      '<div class="card"><h3>Completed (' + done.length + ')</h3>' + (done.length
        ? '<div class="table-wrap"><table><thead><tr><th>ID</th><th>Date</th><th>Address</th><th>Waste</th><th>Rating</th></tr></thead><tbody>' +
        done.map(function (r) {
          return '<tr><td>' + esc(r.id) + '</td><td>' + esc(fmtDate(r.date)) + '</td><td>' + esc(r.address) + '</td><td>' + esc(r.type) +
            '</td><td>' + (r.rating ? stars(r.rating) : '<span class="hint">-</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="empty">Nothing completed yet.</div>') + '</div>';
  }

  /* ===================== SMART BINS ===================== */
  function viewBins(u) {
    var isAdmin = u.role === 'admin';
    var bins = db.bins.slice();
    if (!isAdmin) bins.sort(function (a, b) { return (a.zone === u.zone ? 0 : 1) - (b.zone === u.zone ? 0 : 1); });
    var full = bins.filter(function (b) { return b.fill >= BIN_ALERT; }).length;
    var cards = bins.map(function (b) {
      var lvl = binLevel(b.fill);
      var actions = '';
      if (isAdmin) {
        if (b.fill >= BIN_ALERT && !b.dispatched) {
          actions += '<button class="btn danger sm" data-act="dispatch" data-id="' + esc(b.id) + '">🚛 Dispatch</button>';
        } else if (b.dispatched) {
          actions += '<span class="badge s-assigned">Collector dispatched</span>';
        }
        actions += '<button class="btn ghost sm" data-act="empty" data-id="' + esc(b.id) + '">Mark emptied</button>';
      }
      return '<div class="bin ' + lvl + '"><div class="bin-h"><b>' + esc(b.id) + '</b><span class="hint">' + esc(b.zone) + '</span></div>' +
        '<div class="loc">📍 ' + esc(b.location) + '</div>' +
        '<div class="meter"><i style="width:' + b.fill + '%"></i></div>' +
        '<div class="pct"><b>' + b.fill + '%</b> full · updated ' + esc(fmtTime(b.updated)) + '</div>' +
        '<div class="actions">' + actions + '</div></div>';
    }).join('');
    return '<div class="page-head"><div><h2>Smart Bins</h2><p>Sensor-based fill levels. Bins above ' + BIN_ALERT + '% need collection.</p></div>' +
      (isAdmin ? '<button class="btn" data-act="simulate">📡 Simulate sensor update</button>' : '') + '</div>' +
      (full ? '<div class="alert">⚠️ ' + full + ' bin(s) are almost full.</div>' : '') +
      '<div class="bins">' + cards + '</div>' +
      (isAdmin ? '<p class="hint" style="margin-top:14px">In a real deployment, IoT ultrasonic sensors would push the fill level to the server. Here the update is simulated with random values.</p>' : '');
  }

  /* ===================== ADMIN: USERS ===================== */
  function viewUsers() {
    var rows = db.users.map(function (u) {
      return '<tr><td>' + esc(u.name) + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.phone || '-') + '</td><td>' + esc(u.zone) +
        '</td><td><span class="role" style="background:var(--green-light);color:var(--green-dark)">' + esc(u.role) + '</span></td></tr>';
    }).join('');
    return '<div class="page-head"><div><h2>Users</h2><p>Add collectors and review registered users</p></div>' +
      '<button class="btn ghost" data-act="resetdemo">Reset demo data</button></div>' +
      '<div class="grid2"><div class="card"><h3>Add collector</h3><form data-form="addcollector">' +
      '<label>Name</label><input name="name" required minlength="2" maxlength="60">' +
      '<label>Email</label><input name="email" type="email" required>' +
      '<div class="row"><div><label>Phone</label><input name="phone" pattern="[0-9]{10}" title="10 digit phone number" required></div>' +
      '<div><label>Zone</label><select name="zone">' + opts(ZONES) + '</select></div></div>' +
      '<label>Password</label><input name="password" type="password" required minlength="6"><br>' +
      '<button class="btn" type="submit">Add collector</button></form></div>' +
      '<div class="card"><h3>Summary</h3>' +
      '<p>Citizens: <b>' + db.users.filter(function (u) { return u.role === 'citizen'; }).length + '</b></p>' +
      '<p>Collectors: <b>' + collectors().length + '</b></p>' +
      '<p>Admins: <b>' + db.users.filter(function (u) { return u.role === 'admin'; }).length + '</b></p></div></div>' +
      '<div class="card"><h3>All users</h3><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Zone</th><th>Role</th></tr></thead><tbody>' +
      rows + '</tbody></table></div></div>';
  }

  /* ===================== ROUTER / RENDER ===================== */
  var app = document.getElementById('app');

  function render() {
    var u = me();
    var page = (location.hash || '#/').slice(2);
    if (!u) {
      app.innerHTML = viewAuth(page === 'register' ? 'register' : 'login');
      return;
    }
    var allowed = NAV[u.role].map(function (n) { return n.id; });
    if (allowed.indexOf(page) < 0) page = 'dashboard';
    var views = {
      dashboard: viewDashboard,
      new: viewNew,
      requests: viewRequests,
      tasks: viewTasks,
      bins: viewBins,
      users: viewUsers
    };
    app.innerHTML = shell(u, page, views[page](u));
    window.scrollTo(0, 0);
  }

  function go(hash) {
    if (location.hash === hash) render(); else location.hash = hash;
  }

  /* ===================== FORM HANDLERS ===================== */
  function formData(form) {
    var o = {};
    new FormData(form).forEach(function (v, k) { o[k] = typeof v === 'string' ? v.trim() : v; });
    return o;
  }

  var forms = {
    login: function (d) {
      var email = (d.email || '').toLowerCase();
      var u = db.users.find(function (x) { return x.email.toLowerCase() === email && x.password === d.password; });
      if (!u) return toast('Invalid email or password', 'err');
      db.session = u.id; save();
      toast('Welcome, ' + u.name, 'ok');
      go('#/dashboard');
    },
    register: function (d) {
      var email = (d.email || '').toLowerCase();
      if (db.users.some(function (x) { return x.email.toLowerCase() === email; })) return toast('Email already registered', 'err');
      var u = { id: uid('u_'), name: d.name, email: email, password: d.password, role: 'citizen', phone: d.phone, zone: d.zone };
      db.users.push(u); db.session = u.id; save();
      toast('Account created', 'ok');
      go('#/dashboard');
    },
    newrequest: function (d) {
      var u = me();
      if (!d.date || d.date < today()) return toast('Choose a valid date (today or later)', 'err');
      var t = nowISO();
      var r = {
        id: nextId(), userId: u.id, type: d.type, quantity: d.quantity, address: d.address, zone: d.zone,
        date: d.date, slot: d.slot, notes: d.notes || '', status: 'Pending', collectorId: null,
        createdAt: t, history: [{ status: 'Pending', at: t }], rating: 0, feedback: '', binId: null
      };
      db.requests.push(r); save();
      toast('Pickup requested! ID ' + r.id, 'ok');
      go('#/requests');
    },
    rate: function (d) {
      var r = db.requests.find(function (x) { return x.id === d.id; });
      var u = me();
      if (!r || r.userId !== u.id || r.status !== 'Completed') return;
      r.rating = Math.min(5, Math.max(1, parseInt(d.rating, 10) || 5));
      r.feedback = d.feedback || '';
      save(); toast('Thanks for your feedback!', 'ok'); render();
    },
    addcollector: function (d) {
      var email = (d.email || '').toLowerCase();
      if (db.users.some(function (x) { return x.email.toLowerCase() === email; })) return toast('Email already registered', 'err');
      db.users.push({ id: uid('u_'), name: d.name, email: email, password: d.password, role: 'collector', phone: d.phone, zone: d.zone });
      save(); toast('Collector added', 'ok'); render();
    }
  };

  /* ===================== ACTION HANDLERS ===================== */
  function reqById(id) {
    return db.requests.find(function (r) { return r.id === id; });
  }
  function binById(id) {
    return db.bins.find(function (b) { return b.id === id; });
  }

  var actions = {
    logout: function () {
      db.session = null; save(); go('#/login');
    },
    fill: function (el) {
      var f = document.querySelector('form[data-form="login"]');
      if (!f) return;
      f.elements.email.value = el.dataset.e;
      f.elements.password.value = el.dataset.p;
    },
    cancel: function (el) {
      var u = me(), r = reqById(el.dataset.id);
      if (!r) return;
      var ownerOk = u.role === 'admin' || (u.role === 'citizen' && r.userId === u.id && (r.status === 'Pending' || r.status === 'Assigned'));
      if (!ownerOk || r.status === 'Completed' || r.status === 'Cancelled') return;
      if (!confirm('Cancel request ' + r.id + '?')) return;
      setStatus(r, 'Cancelled');
      if (r.binId) { var b = binById(r.binId); if (b) b.dispatched = false; }
      save(); toast('Request cancelled', 'ok'); render();
    },
    start: function (el) {
      var u = me(), r = reqById(el.dataset.id);
      if (!r || r.collectorId !== u.id || r.status !== 'Assigned') return;
      setStatus(r, 'In Progress'); save(); toast('Pickup started', 'ok'); render();
    },
    complete: function (el) {
      var u = me(), r = reqById(el.dataset.id);
      if (!r || r.collectorId !== u.id || r.status !== 'In Progress') return;
      setStatus(r, 'Completed');
      if (r.binId) { // emptying the bin resets its sensor reading
        var b = binById(r.binId);
        if (b) { b.fill = 5; b.dispatched = false; b.updated = nowISO(); }
      }
      save(); toast('Pickup completed', 'ok'); render();
    },
    autoassign: function () {
      var n = 0;
      db.requests.forEach(function (r) {
        if (r.status !== 'Pending') return;
        var c = pickCollector(r.zone);
        if (!c) return;
        r.collectorId = c.id; setStatus(r, 'Assigned'); n++;
      });
      save();
      toast(n ? n + ' request(s) auto-assigned' : 'Nothing to assign (no pending requests or no collectors)', n ? 'ok' : '');
      render();
    },
    simulate: function () {
      db.bins.forEach(function (b) {
        b.fill = Math.min(100, b.fill + Math.floor(Math.random() * 21) + 3);
        b.updated = nowISO();
      });
      save(); toast('Sensor readings updated', 'ok'); render();
    },
    empty: function (el) {
      var b = binById(el.dataset.id);
      if (!b) return;
      b.fill = 5; b.dispatched = false; b.updated = nowISO();
      db.requests.forEach(function (r) { // close any open dispatch for this bin
        if (r.binId === b.id && ACTIVE.indexOf(r.status) >= 0) setStatus(r, 'Completed');
      });
      save(); toast('Bin ' + b.id + ' marked as emptied', 'ok'); render();
    },
    dispatch: function (el) {
      var b = binById(el.dataset.id);
      if (!b || b.dispatched) return;
      var t = nowISO();
      var c = pickCollector(b.zone);
      var r = {
        id: nextId(), userId: 'system', type: 'Bin Overflow', quantity: 'Bin ' + b.id + ' (' + b.fill + '% full)',
        address: b.location, zone: b.zone, date: today(), slot: SLOTS[0], notes: 'Auto-generated from smart bin alert',
        status: 'Pending', collectorId: null, createdAt: t, history: [{ status: 'Pending', at: t }],
        rating: 0, feedback: '', binId: b.id
      };
      if (c) { r.collectorId = c.id; setStatus(r, 'Assigned'); }
      db.requests.push(r);
      b.dispatched = true;
      save();
      toast(c ? 'Collector ' + c.name + ' dispatched to ' + b.id : 'Request created, but no collector available', c ? 'ok' : 'err');
      render();
    },
    resetdemo: function () {
      if (!confirm('This will erase ALL data and restore the demo data. Continue?')) return;
      db = seed(); save(); toast('Demo data restored', 'ok'); go('#/login');
    }
  };

  var changes = {
    assign: function (el) {
      var u = me();
      if (u.role !== 'admin') return;
      var r = reqById(el.dataset.id);
      if (!r || (r.status !== 'Pending' && r.status !== 'Assigned')) return;
      if (!el.value) {
        r.collectorId = null;
        if (r.status === 'Assigned') setStatus(r, 'Pending');
      } else {
        r.collectorId = el.value;
        if (r.status === 'Pending') setStatus(r, 'Assigned');
      }
      save(); toast('Assignment updated', 'ok'); render();
    },
    filter: function (el) {
      state.filter = el.value; render();
    }
  };

  /* ===================== EVENT WIRING ===================== */
  document.addEventListener('submit', function (e) {
    var name = e.target && e.target.dataset ? e.target.dataset.form : null;
    if (!name || !forms[name]) return;
    e.preventDefault();
    forms[name](formData(e.target));
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el || !actions[el.dataset.act]) return;
    actions[el.dataset.act](el);
  });
  document.addEventListener('change', function (e) {
    var el = e.target.closest ? e.target.closest('[data-change]') : null;
    if (!el || !changes[el.dataset.change]) return;
    changes[el.dataset.change](el);
  });
  window.addEventListener('hashchange', render);

  render();
})();
