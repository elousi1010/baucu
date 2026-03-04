// ===== Main Application =====
let map;
let markers = [];
let allLocations = [];
let activeMarker = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    createParticles();
    await loadLocations();
    initMap();
    renderLocationCards(allLocations);
    setupSearch();
    setupFilters();
    setupSmoothScroll();
});

// ===== Particle Effect =====
function createParticles() {
    const container = document.getElementById('particles');
    const count = 30;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${6 + Math.random() * 10}s`;
        particle.style.animationDelay = `${Math.random() * 8}s`;
        particle.style.width = `${2 + Math.random() * 4}px`;
        particle.style.height = particle.style.width;
        particle.style.background = Math.random() > 0.5
            ? `rgba(230, 57, 70, ${0.2 + Math.random() * 0.3})`
            : `rgba(247, 127, 0, ${0.2 + Math.random() * 0.3})`;
        container.appendChild(particle);
    }
}

// ===== Load Data =====
async function loadLocations() {
    try {
        const response = await fetch('/data/voting-locations.json');
        allLocations = await response.json();
    } catch (error) {
        console.error('Failed to load voting locations:', error);
        allLocations = [];
    }
}

// ===== Initialize Map =====
function initMap() {
    // Center on Xã Đông Thạnh, Hóc Môn, HCM
    const center = [10.886, 106.611];

    map = L.map('map', {
        center: center,
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: true
    });

    // Use CartoDB Dark Matter tileset for dark theme
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Add markers
    addMarkers(allLocations);
}

// ===== Add Markers =====
function addMarkers(locations) {
    // Clear existing markers
    clearMarkers();

    locations.forEach((location) => {
        // Create custom numbered marker
        const markerIcon = L.divIcon({
            className: 'custom-marker-wrapper',
            html: `<div class="custom-marker" data-id="${location.id}">${location.id}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            popupAnchor: [0, -22]
        });

        const marker = L.marker([location.lat, location.lng], { icon: markerIcon })
            .addTo(map);

        // Create popup content
        const popupContent = createPopupContent(location);

        marker.bindPopup(popupContent, {
            maxWidth: 320,
            minWidth: 300,
            closeButton: true,
            className: 'custom-popup'
        });

        // Event listeners
        marker.on('click', () => {
            setActiveMarker(location.id);
            scrollToCard(location.id);
        });

        marker.on('popupclose', () => {
            clearActiveMarker();
        });

        marker.locationData = location;
        markers.push(marker);
    });
}

// ===== Create Popup Content =====
function createPopupContent(location) {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;

    return `
    <div class="popup-content">
      <img 
        class="popup-image" 
        src="${location.image}" 
        alt="${location.name}"
        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22><rect fill=%22%23111640%22 width=%22400%22 height=%22200%22/><text fill=%22%236b7394%22 font-size=%2216%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22>🏛️ Điểm bầu cử ${location.id}</text></svg>'"
      />
      <div class="popup-body">
        <div class="popup-number">${location.id}</div>
        <div class="popup-name">${location.name}</div>
        <div class="popup-address">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>${location.address}</span>
        </div>
        <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="popup-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          Chỉ đường trên Google Maps
        </a>
      </div>
    </div>
  `;
}

// ===== Marker State Management =====
function setActiveMarker(id) {
    clearActiveMarker();

    const markerEl = document.querySelector(`.custom-marker[data-id="${id}"]`);
    if (markerEl) {
        markerEl.classList.add('active');
        activeMarker = id;
    }

    // Highlight card
    document.querySelectorAll('.location-card').forEach(card => {
        card.classList.toggle('active', parseInt(card.dataset.id) === id);
    });
}

function clearActiveMarker() {
    document.querySelectorAll('.custom-marker.active').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelectorAll('.location-card.active').forEach(el => {
        el.classList.remove('active');
    });
    activeMarker = null;
}

function clearMarkers() {
    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers = [];
}

// ===== Render Location Cards =====
function renderLocationCards(locations) {
    const grid = document.getElementById('locationsGrid');

    if (locations.length === 0) {
        grid.innerHTML = `
      <div class="no-results">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          <path d="M8 11h6"/>
        </svg>
        <p>Không tìm thấy điểm bầu cử</p>
      </div>
    `;
        return;
    }

    grid.innerHTML = locations.map((loc, index) => `
    <div class="location-card" data-id="${loc.id}" style="animation-delay: ${index * 0.03}s">
      <div class="card-number">${loc.id}</div>
      <div class="card-info">
        <div class="card-name">${loc.name}</div>
        <div class="card-address">${loc.address}</div>
      </div>
      <div class="card-arrow">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </div>
  `).join('');

    // Add click handlers
    grid.querySelectorAll('.location-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const marker = markers.find(m => m.locationData.id === id);
            if (marker) {
                map.setView(marker.getLatLng(), 17, { animate: true });
                marker.openPopup();
                setActiveMarker(id);
            }
        });
    });
}

// ===== Search =====
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            filterAndRender();
        }, 250);
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
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const activeFilter = document.querySelector('.chip.active')?.dataset.filter || 'all';

    let filtered = allLocations;

    // Apply search
    if (searchTerm) {
        filtered = filtered.filter(loc =>
            loc.name.toLowerCase().includes(searchTerm) ||
            loc.address.toLowerCase().includes(searchTerm) ||
            loc.id.toString().includes(searchTerm)
        );
    }

    // Apply filter
    if (activeFilter !== 'all') {
        filtered = filtered.filter(loc => loc.address.includes(activeFilter));
    }

    // Update map markers
    addMarkers(filtered);

    // Update cards
    renderLocationCards(filtered);

    // Fit bounds if there are markers
    if (filtered.length > 0 && markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// ===== Scroll to Card =====
function scrollToCard(id) {
    const card = document.querySelector(`.location-card[data-id="${id}"]`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ===== Smooth Scroll =====
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}
