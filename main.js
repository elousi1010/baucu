// ===== Main Application =====
let map;
let markers = [];
let allLocations = [];
let activeMarker = null;

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
});

// ===== Particle Effect =====
function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 20; i++) {
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
        scrollWheelZoom: true
    });

    // Light theme tile layer - OpenStreetMap standard
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(map);

    addMarkers(allLocations);
}

// ===== Add Markers =====
function addMarkers(locations) {
    clearMarkers();

    locations.forEach((loc) => {
        const icon = L.divIcon({
            className: 'custom-marker-wrapper',
            html: `<div class="custom-marker" data-id="${loc.id}">${loc.id}</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
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

    // Close on overlay click (outside card)
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function openModal(location) {
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
}

// ===== Marker State =====
function setActiveMarker(id) {
    clearActiveMarker();
    const el = document.querySelector(`.custom-marker[data-id="${id}"]`);
    if (el) {
        el.classList.add('active');
        activeMarker = id;
    }
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
    <div class="location-card" data-id="${loc.id}" style="animation-delay: ${i * 0.02}s">
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

    // Click → fly to marker & open modal
    grid.querySelectorAll('.location-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const marker = markers.find(m => m.locationData.id === id);
            if (marker) {
                map.setView(marker.getLatLng(), 17, { animate: true });
                openModal(marker.locationData);
                setActiveMarker(id);
            }
        });
    });
}

// ===== Search =====
function setupSearch() {
    const input = document.getElementById('searchInput');
    let timer;
    input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(filterAndRender, 200);
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
            e.preventDefault();
            const t = document.querySelector(a.getAttribute('href'));
            if (t) t.scrollIntoView({ behavior: 'smooth' });
        });
    });
}
