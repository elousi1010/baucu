// ===== Main Application =====
let map;
let markers = [];
let allLocations = [];
let activeMarker = null;
let currentLocation = null; // track what's open in modal

// DOM elements
const modalOverlay = document.getElementById('modalOverlay');
const modalImage = document.getElementById('modalImage');
const modalNumber = document.getElementById('modalNumber');
const modalName = document.getElementById('modalName');
const modalAddressText = document.getElementById('modalAddressText');
const modalGoogleMaps = document.getElementById('modalGoogleMaps');
const modalClose = document.getElementById('modalClose');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    createParticles();
    await loadLocations();
    initMap();
    renderLocationCards(allLocations);
    setupSearch();
    setupFilters();
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

// ===== Initialize Map =====
function initMap() {
    const center = [10.886, 106.611];

    map = L.map('map', {
        center: center,
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: true,
        // Better mobile touch
        tap: true,
        tapTolerance: 16,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(map);

    // Move zoom control to bottom-right on mobile
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
    // Close on X button
    modalClose.addEventListener('click', closeModal);

    // Close on overlay click (outside card on desktop)
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Touch swipe down to close (mobile bottom sheet)
    setupSwipeToClose();

    // Share button
    const shareBtn = document.getElementById('modalShare');
    if (shareBtn) {
        shareBtn.addEventListener('click', handleShare);
    }
}

function setupSwipeToClose() {
    const card = document.querySelector('.modal-card');
    if (!card) return;

    let startY = 0;
    let isDragging = false;

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
    const shareText = `📍 ${currentLocation.name}\n${currentLocation.address}\n\n🗺️ Chỉ đường: ${googleMapsUrl}`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: currentLocation.name,
                text: shareText,
                url: googleMapsUrl,
            });
        } catch (e) { /* cancelled */ }
    } else {
        // Fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(shareText);
            showToast('📋 Đã copy thông tin!');
        } catch (e) {
            showToast('Không thể chia sẻ');
        }
    }
}

function showToast(message) {
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'toast-msg';
    el.textContent = message;
    el.style.cssText = `
        position: fixed; bottom: calc(80px + env(safe-area-inset-bottom,0px)); left: 50%;
        transform: translateX(-50%) translateY(10px);
        background: rgba(0,0,0,0.78); color: #fff; padding: 10px 20px;
        border-radius: 50px; font-size: 0.88rem; z-index: 99999;
        opacity: 0; transition: all 0.3s; pointer-events: none;
        white-space: nowrap; font-family: 'Inter', sans-serif;
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    }, 2000);
}

function openModal(location) {
    currentLocation = location;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
    const fallbackSvg = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='460' height='220'><rect fill='%23f0f4ff' width='460' height='220'/><text fill='%238896a6' font-size='18' font-family='sans-serif' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'>🏛️ Điểm bầu cử ${location.id}</text></svg>`;

    modalImage.src = location.image;
    modalImage.alt = location.name;
    modalImage.onerror = function () { this.src = fallbackSvg; };
    modalNumber.textContent = location.id;
    modalName.textContent = location.name;
    modalAddressText.textContent = location.address;
    modalGoogleMaps.href = googleMapsUrl;

    modalOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.classList.remove('visible');
    document.body.style.overflow = '';
    clearActiveMarker();
    currentLocation = null;
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
    countEl.textContent = locations.length;

    if (locations.length === 0) {
        grid.innerHTML = `
      <div class="no-results">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M8 11h6"/>
        </svg>
        <p>Không tìm thấy điểm bầu cử</p>
      </div>`;
        return;
    }

    grid.innerHTML = locations.map((loc, i) => `
    <div class="location-card" data-id="${loc.id}" style="animation-delay: ${i * 0.018}s">
      <div class="card-number">${loc.id}</div>
      <div class="card-info">
        <div class="card-name">${loc.name}</div>
        <div class="card-address">${loc.address}</div>
      </div>
      <div class="card-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </div>
  `).join('');

    grid.querySelectorAll('.location-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const marker = markers.find(m => m.locationData.id === id);
            if (marker) {
                // Scroll map into view on mobile before flying
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

// ===== Filter =====
function setupFilters() {
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            filterAndRender();
        });
    });
}

function filterAndRender() {
    const term = document.getElementById('searchInput').value.toLowerCase().trim();
    const filter = document.querySelector('.chip.active')?.dataset.filter || 'all';

    let filtered = allLocations;

    if (term) {
        filtered = filtered.filter(loc =>
            loc.name.toLowerCase().includes(term) ||
            loc.address.toLowerCase().includes(term) ||
            loc.id.toString().includes(term)
        );
    }

    if (filter !== 'all') {
        filtered = filtered.filter(loc => loc.address.includes(filter));
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

// ===== Floating Back-to-Top Button =====
function setupFAB() {
    const fab = document.getElementById('fabTop');
    if (!fab) return;

    window.addEventListener('scroll', () => {
        fab.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });

    fab.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ===== Map Resize Handle (mobile only) =====
function setupMapResize() {
    const handle = document.getElementById('mapResizeHandle');
    const mapEl = document.getElementById('map');
    if (!handle || !mapEl) return;

    let startY = 0;
    let startHeight = 0;
    let isDragging = false;

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
