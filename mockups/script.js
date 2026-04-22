let currentData = null;
let currentIndex = 0;
let currentProfile = 'advisor';

// Cargar datos según el perfil
async function loadData(profile) {
    const response = await fetch(`data/${profile}-mockups.json`);
    const data = await response.json();
    return data;
}

// Renderizar el carrusel
function renderCarousel(data) {
    const carousel = document.getElementById('carousel');
    carousel.innerHTML = '';
    
    data.mockups.forEach((mockup, index) => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        slide.innerHTML = `
            <img src="${mockup.imagen}" alt="${mockup.titulo}" loading="lazy">
        `;
        carousel.appendChild(slide);
    });
    
    // Actualizar indicadores
    updateIndicators(data.mockups.length);
    
    // Mostrar primera imagen
    updateInfo(data.mockups[0], 0);
}

// Actualizar indicadores
function updateIndicators(count) {
    const indicators = document.getElementById('indicators');
    indicators.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const indicator = document.createElement('div');
        indicator.className = 'indicator';
        if (i === currentIndex) indicator.classList.add('active');
        indicator.addEventListener('click', () => goToSlide(i));
        indicators.appendChild(indicator);
    }
}

// Actualizar panel de información
function updateInfo(mockup, index) {
    const tag = document.getElementById('infoTag');
    const title = document.getElementById('infoTitle');
    const description = document.getElementById('infoDescription');
    const metaTask = document.getElementById('metaTask');
    
    tag.textContent = `${currentData.icono} ${currentData.perfil}`;
    tag.style.background = `${currentData.color}20`;
    tag.style.color = currentData.color;
    
    title.textContent = mockup.titulo;
    description.textContent = mockup.descripcion;
    metaTask.innerHTML = `📋 ${mockup.tarea}`;
    
    currentIndex = index;
    
    // Actualizar indicadores activos
    document.querySelectorAll('.indicator').forEach((ind, i) => {
        if (i === index) ind.classList.add('active');
        else ind.classList.remove('active');
    });
}

// Ir a una diapositiva específica
function goToSlide(index) {
    if (!currentData) return;
    if (index < 0) index = 0;
    if (index >= currentData.mockups.length) index = currentData.mockups.length - 1;
    
    currentIndex = index;
    const carousel = document.getElementById('carousel');
    const slideWidth = carousel.clientWidth;
    carousel.style.transform = `translateX(-${currentIndex * 100}%)`;
    
    updateInfo(currentData.mockups[currentIndex], currentIndex);
}

// Siguiente diapositiva
function nextSlide() {
    if (!currentData) return;
    if (currentIndex < currentData.mockups.length - 1) {
        goToSlide(currentIndex + 1);
    }
}

// Anterior diapositiva
function prevSlide() {
    if (!currentData) return;
    if (currentIndex > 0) {
        goToSlide(currentIndex - 1);
    }
}

// Cambiar perfil
async function switchProfile(profile) {
    currentProfile = profile;
    currentIndex = 0;
    
    // Actualizar botones activos
    document.querySelectorAll('.profile-btn').forEach(btn => {
        if (btn.dataset.profile === profile) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Cargar nuevos datos
    currentData = await loadData(profile);
    renderCarousel(currentData);
    goToSlide(0);
}

// Event listeners
document.getElementById('prevBtn').addEventListener('click', prevSlide);
document.getElementById('nextBtn').addEventListener('click', nextSlide);

document.querySelectorAll('.profile-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchProfile(btn.dataset.profile);
    });
});

// Inicializar
async function init() {
    currentData = await loadData('advisor');
    renderCarousel(currentData);
    goToSlide(0);
}

// Ajustar carrusel al redimensionar
window.addEventListener('resize', () => {
    if (currentData) {
        const carousel = document.getElementById('carousel');
        carousel.style.transform = `translateX(-${currentIndex * 100}%)`;
    }
});

init();