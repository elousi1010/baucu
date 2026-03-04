// ===== Main Application =====
let map;
let markers = [];
let allLocations = [];
let activeMarker = null;
let currentLocation = null;

// DOM elements
const modalOverlay = document.getElementById('modalOverlay');
const modalImage = document.getElementById('modalImage');
const modalNumber = document.getElementById('modalNumber');
const modalName = document.getElementById('modalName');
const modalAps = document.getElementById('modalAps');
const modalAddressText = document.getElementById('modalAddressText');
const modalGoogleMaps = document.getElementById('modalGoogleMaps');
const modalClose = document.getElementById('modalClose');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    createParticles();
    await loadLocations();
    initMap();
    initApFilter();
    renderLocationCards(allLocations);
    setupSearch();
    setupSmoothScroll();
    setupModal();
    setupFAB();
    setupMapResize();
});

// ===== Particle Effect =====
function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        p.style.left = `${Math.random() * 100}%`;
        p.style.animationDuration = `${8 + Math.random() * 12}s`;
        p.style.animationDelay = `${Math.random() * 8}s`;
        const size = `${2 + Math.random() * 3}px`;
        p.style.width = size;
        p.style.height = size;
        container.appendChild(p);
    }
}

// ===== Load Data =====
async function loadLocations() {
    try {
        const res = await fetch('/data/voting-locations.json');
        allLocations = await res.json();
    } catch (e) {
        console.error('Failed to load:', e);
        allLocations = [];
    }
}

// ===== Tom Select Ấp Filter =====
let tomSelect = null;

function initApFilter() {
    // Collect all unique ấp from data, sorted
    const apSet = new Set();
    allLocations.forEach(loc => {
        if (Array.isArray(loc.aps)) loc.aps.forEach(ap => apSet.add(ap));
        else if (loc.ap) apSet.add(loc.ap);
    });
    const sorted = [...apSet].sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA !== numB ? numA - numB : a.localeCompare(b, 'vi');
    });

    // Populate <select>
    const select = document.getElementById('apFilter');
    sorted.forEach(ap => {
        const opt = document.createElement('option');
        opt.value = ap;
        opt.textContent = ap;
        select.appendChild(opt);
    });

    // Init Tom Select
    tomSelect = new TomSelect('#apFilter', {
        maxOptions: null,
        placeholder: 'Lọc theo ấp...',
        allowEmptyOption: false,
        searchField: ['text'],
        onChange(value) {
            filterAndRender();
        },
    });
}

// ===== Initialize Map =====
function initMap() {
    const center = [10.886, 106.611];

    map = L.map('map', {
        center: center,
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: true,
        tap: true,
        tapTolerance: 16,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(map);

    if (window.innerWidth <= 768) {
        map.zoomControl.setPosition('bottomright');
    }

    addMarkers(allLocations);
}

// ===== Add Markers =====
function addMarkers(locations) {
    clearMarkers();

    locations.forEach((loc) => {
        const icon = L.divIcon({
            className: 'custom-marker-wrapper',
            html: `<div class="custom-marker" data-id="${loc.id}">${loc.id}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });

        const marker = L.marker([loc.lat, loc.lng], { icon: icon }).addTo(map);

        marker.on('click', () => {
            openModal(loc);
            setActiveMarker(loc.id);
        });

        marker.locationData = loc;
        markers.push(marker);
    });
}

// ===== Modal =====
function setupModal() {
    modalClose.addEventListener('click', closeModal);

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    setupSwipeToClose();

    const shareBtn = document.getElementById('modalShare');
    if (shareBtn) shareBtn.addEventListener('click', handleShare);
}

function setupSwipeToClose() {
    const card = document.querySelector('.modal-card');
    if (!card) return;

    let startY = 0, isDragging = false;

    card.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = false;
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
        const dy = e.touches[0].clientY - startY;
        if (dy > 0 && window.innerWidth <= 768) {
            isDragging = true;
            card.style.transform = `translateY(${dy}px)`;
            card.style.transition = 'none';
        }
    }, { passive: true });

    card.addEventListener('touchend', (e) => {
        const dy = e.changedTouches[0].clientY - startY;
        card.style.transition = '';
        card.style.transform = '';
        if (dy > 80 && isDragging) closeModal();
    }, { passive: true });
}

async function handleShare() {
    if (!currentLocation) return;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${currentLocation.lat},${currentLocation.lng}`;
    const apsText = getAps(currentLocation).join(', ');
    const shareText = `📍 ${currentLocation.name}\n${apsText} — Xã Đông Thạnh, TP.HCM\n\n🗺️ Chỉ đường: ${googleMapsUrl}`;

    if (navigator.share) {
        try {
            await navigator.share({ title: currentLocation.name, text: shareText, url: googleMapsUrl });
        } catch (e) { /* cancelled */ }
    } else {
        try {
            await navigator.clipboard.writeText(shareText);
            showToast('📋 Đã copy thông tin!');
        } catch (e) { showToast('Không thể chia sẻ'); }
    }
}

function getAps(loc) {
    if (Array.isArray(loc.aps) && loc.aps.length > 0) return loc.aps;
    if (loc.ap) return [loc.ap];
    return [];
}

function openModal(location) {
    currentLocation = location;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
    const fallbackSvg = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='533'><rect fill='%23f0f4ff' width='400' height='533'/><text fill='%238896a6' font-size='18' font-family='sans-serif' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'>🏛️ Điểm bầu cử ${location.id}</text></svg>`;

    modalImage.src = location.image;
    modalImage.alt = location.name;
    modalImage.onerror = function () { this.src = fallbackSvg; };
    modalNumber.textContent = location.id;
    modalName.textContent = location.name;
    modalAddressText.textContent = location.address || 'Xã Đông Thạnh, TP.HCM';
    modalGoogleMaps.href = googleMapsUrl;

    // Render ấp tags
    const aps = getAps(location);
    modalAps.innerHTML = aps.map(ap => `<span class="modal-ap-tag">${ap}</span>`).join('');

    modalOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.classList.remove('visible');
    document.body.style.overflow = '';
    clearActiveMarker();
    currentLocation = null;
}

function showToast(message) {
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'toast-msg';
    el.textContent = message;
    el.style.cssText = `
        position:fixed;bottom:calc(80px + env(safe-area-inset-bottom,0px));left:50%;
        transform:translateX(-50%) translateY(10px);
        background:rgba(0,0,0,0.78);color:#fff;padding:10px 20px;
        border-radius:50px;font-size:0.88rem;z-index:99999;
        opacity:0;transition:all 0.3s;pointer-events:none;
        white-space:nowrap;font-family:'Inter',sans-serif;
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)'; });
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2000);
}

// ===== Marker State =====
function setActiveMarker(id) {
    clearActiveMarker();
    const el = document.querySelector(`.custom-marker[data-id="${id}"]`);
    if (el) { el.classList.add('active'); activeMarker = id; }
    document.querySelectorAll('.location-card').forEach(card => {
        card.classList.toggle('active', parseInt(card.dataset.id) === id);
    });
}

function clearActiveMarker() {
    document.querySelectorAll('.custom-marker.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.location-card.active').forEach(el => el.classList.remove('active'));
    activeMarker = null;
}

function clearMarkers() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
}

// ===== Render Cards =====
function renderLocationCards(locations) {
    const grid = document.getElementById('locationsGrid');
    const countEl = document.getElementById('locationCount');
    const resultEl = document.getElementById('resultCount');
    const n = locations.length;
    countEl.textContent = n;
    if (resultEl) resultEl.textContent = `${n} điểm`;

    if (n === 0) {
        grid.innerHTML = `
      <div class="no-results">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M8 11h6"/>
        </svg>
        <p>Không tìm thấy điểm bầu cử</p>
      </div>`;
        return;
    }

    grid.innerHTML = locations.map((loc, i) => {
        const aps = getAps(loc);
        const apTags = aps.map(ap => `<span class="card-ap-tag">${ap}</span>`).join('');
        return `
    <div class="location-card" data-id="${loc.id}" style="animation-delay:${i * 0.015}s">
      <div class="card-number">${loc.id}</div>
      <div class="card-info">
        <div class="card-name">${loc.name}</div>
        ${apTags ? `<div class="card-aps">${apTags}</div>` : ''}
      </div>
      <div class="card-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </div>`;
    }).join('');

    grid.querySelectorAll('.location-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const marker = markers.find(m => m.locationData.id === id);
            if (marker) {
                if (window.innerWidth <= 768) {
                    document.getElementById('map-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setTimeout(() => {
                        map.setView(marker.getLatLng(), 17, { animate: true });
                        openModal(marker.locationData);
                        setActiveMarker(id);
                    }, 350);
                } else {
                    map.setView(marker.getLatLng(), 17, { animate: true });
                    openModal(marker.locationData);
                    setActiveMarker(id);
                }
            }
        });
    });
}

// ===== Search =====
function setupSearch() {
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClear');

    let timer;
    input.addEventListener('input', () => {
        clearTimeout(timer);
        clearBtn.classList.toggle('visible', input.value.length > 0);
        timer = setTimeout(filterAndRender, 200);
    });

    clearBtn?.addEventListener('click', () => {
        input.value = '';
        clearBtn.classList.remove('visible');
        input.focus();
        filterAndRender();
    });
}

// ===== Ấp Filter - handled by Tom Select =====
function setupApFilter() { }

function filterAndRender() {
    const term = document.getElementById('searchInput').value.toLowerCase().trim();
    const apFilter = (tomSelect && tomSelect.getValue()) ? tomSelect.getValue() : 'all';

    let filtered = allLocations;

    if (term) {
        filtered = filtered.filter(loc =>
            loc.name.toLowerCase().includes(term) ||
            (loc.address || '').toLowerCase().includes(term) ||
            loc.id.toString().includes(term) ||
            getAps(loc).some(ap => ap.toLowerCase().includes(term))
        );
    }

    if (apFilter !== 'all') {
        filtered = filtered.filter(loc => getAps(loc).includes(apFilter));
    }

    addMarkers(filtered);
    renderLocationCards(filtered);

    if (filtered.length > 0 && markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// ===== Smooth Scroll =====
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if (href === '#') return;
            e.preventDefault();
            const t = document.querySelector(href);
            if (t) t.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ===== Floating Back-to-Top =====
function setupFAB() {
    const fab = document.getElementById('fabTop');
    if (!fab) return;
    window.addEventListener('scroll', () => {
        fab.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });
    fab.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ===== Map Resize Handle =====
function setupMapResize() {
    const handle = document.getElementById('mapResizeHandle');
    const mapEl = document.getElementById('map');
    if (!handle || !mapEl) return;

    let startY = 0, startHeight = 0, isDragging = false;

    function onStart(e) {
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        startHeight = mapEl.offsetHeight;
        isDragging = true;
        document.body.style.userSelect = 'none';
        handle.style.background = 'var(--surface)';
    }

    function onMove(e) {
        if (!isDragging) return;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        const dy = y - startY;
        const newH = Math.max(200, Math.min(window.innerHeight * 0.9, startHeight + dy));
        mapEl.style.height = newH + 'px';
        map.invalidateSize();
    }

    function onEnd() {
        isDragging = false;
        document.body.style.userSelect = '';
        handle.style.background = '';
    }

    handle.addEventListener('touchstart', onStart, { passive: true });
    handle.addEventListener('touchmove', onMove, { passive: true });
    handle.addEventListener('touchend', onEnd, { passive: true });
    handle.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
}
