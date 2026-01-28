// Shared JavaScript for ArtHeart Dashboard
let socket, isConnected = false;

function connectSocket() {
    socket = io({ reconnection: true, reconnectionDelay: 1000 });
    socket.on('connect', () => { isConnected = true; updateConnectionUI(true); });
    socket.on('disconnect', () => { isConnected = false; updateConnectionUI(false); });
    socket.on('connect_error', () => { isConnected = false; updateConnectionUI(false); });
    socket.on('emergency_stop', () => alert('Emergency stop activated!'));
}

function updateConnectionUI(connected) {
    const dot = document.getElementById('connectionDot');
    const text = document.getElementById('connectionText');
    if (dot) dot.classList.toggle('connected', connected);
    if (text) text.textContent = connected ? 'Connected' : 'Offline';
}

function sendEmergencyStop() {
    if (socket && isConnected) socket.emit('control', { target: 'system', action: 'emergency_stop', params: {} });
    fetch('/api/control/emergency-stop', { method: 'POST' }).catch(() => { });
}

function setupMenu() {
    const sidebar = document.getElementById('sidebar');
    const menuOpen = document.getElementById('menuOpen');
    const menuClose = document.getElementById('menuClose');
    const overlay = document.getElementById('sidebarOverlay');
    if (menuOpen) menuOpen.onclick = () => sidebar?.classList.add('open');
    if (menuClose) menuClose.onclick = () => sidebar?.classList.remove('open');
    if (overlay) overlay.onclick = () => sidebar?.classList.remove('open');
    const emergency = document.getElementById('btnEmergency');
    if (emergency) emergency.onclick = sendEmergencyStop;
}

function updateTime() {
    const el = document.getElementById('currentTime');
    if (el) el.textContent = new Date().toLocaleTimeString();
}

// Auto-connect on load
if (typeof io !== 'undefined') connectSocket();
