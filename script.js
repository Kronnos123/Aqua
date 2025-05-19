// ===== CONSTANTES Y VARIABLES GLOBALES =====
const sections = ['vip', 'regular', 'restaurante'];
let currentDate = new Date().toISOString().split('T')[0];
let editSection = null;
let editIndex = null;
let data = {}; // Estructura: { "2023-11-15": { vip: [], regular: [], restaurante: [] } }

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
  // Configurar calendario
  const calendar = document.getElementById('calendar');
  calendar.value = currentDate;
  
  calendar.addEventListener('change', (e) => {
    currentDate = e.target.value;
    loadDataForDate(currentDate);
  });
  
  // Inicializar acordeones
  initAccordions();
  
  // Cargar datos
  loadAllData();
  
  // Configurar eventos
  setupEventListeners();
  
  // Inicializar modo oscuro
  initDarkMode();
});

// ===== FUNCIONES DE INTERFAZ =====
function initAccordions() {
  sections.forEach(sec => {
    const btn = document.querySelector(`#${sec} > .accordion-btn`);
    const content = document.getElementById(`${sec}-content`);
    
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !expanded);
      content.classList.toggle('active');
      content.setAttribute('aria-hidden', expanded);
      document.getElementById(sec).classList.toggle('expanded');
    });
    
    // Soporte para teclado
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });
}

function setupEventListeners() {
  // Botones agregar en cada sección
  sections.forEach(sec => {
    document.querySelector(`#${sec} .add-btn`).addEventListener('click', () => openAddForm(sec));
  });
  
  // Formulario principal
  document.getElementById('form').addEventListener('submit', handleFormSubmit);
  document.querySelector('#form .close-btn').addEventListener('click', closeForm);
  
  // Menú flotante
  document.getElementById('menu-button').addEventListener('click', toggleOptions);
  document.querySelector('#menu-options button:nth-child(1)').addEventListener('click', toggleDarkMode);
  document.querySelector('#menu-options button:nth-child(2)').addEventListener('click', openSearch);
  
  // Búsqueda
  document.getElementById('search-button').addEventListener('click', searchClient);
  document.getElementById('search-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchClient();
    }
  });
  
  // Cerrar menú al hacer clic fuera
  document.addEventListener('click', (e) => {
    const menuButton = document.getElementById('menu-button');
    const menu = document.getElementById('menu-options');
    
    if (!menu.contains(e.target) && !menuButton.contains(e.target)) {
      closeMenu();
    }
  });
}

// ===== GESTIÓN DE DATOS =====
function getCurrentDateData() {
  if (!data[currentDate]) {
    data[currentDate] = {
      vip: [],
      regular: [],
      restaurante: []
    };
  }
  return data[currentDate];
}

function saveAllData() {
  localStorage.setItem('beachClubData', JSON.stringify(data));
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? '1' : '0');
}

function loadAllData() {
  const savedData = localStorage.getItem('beachClubData');
  if (savedData) {
    data = JSON.parse(savedData);
  }
  
  loadDataForDate(currentDate);
}

function loadDataForDate(date) {
  currentDate = date;
  document.getElementById('calendar').value = date;
  
  if (!data[date]) {
    data[date] = {
      vip: [],
      regular: [],
      restaurante: []
    };
  }
  
  sections.forEach(sec => renderSection(sec));
  updateTotalGeneral();
}

// ===== FORMULARIOS =====
function openAddForm(section) {
  editSection = section;
  editIndex = null;
  
  const form = document.getElementById('form');
  form.reset();
  form.querySelector('h3').textContent = `Agregar reserva en ${capitalize(section)}`;
  form.querySelector('button[type="submit"]').textContent = 'Agregar';
  
  document.getElementById('form-container').classList.add('active');
  document.getElementById('input-nombre').focus();
}

function openEditForm(section, index) {
  editSection = section;
  editIndex = index;
  
  const currentData = getCurrentDateData();
  const item = currentData[section][index];
  const form = document.getElementById('form');
  
  form.querySelector('h3').textContent = `Editar reserva en ${capitalize(section)}`;
  form.querySelector('button[type="submit"]').textContent = 'Guardar cambios';
  
  form['nombre'].value = item.nombre;
  form['carnet'].value = item.carnet || '';
  form['hora'].value = item.hora;
  form['personas'].value = item.personas;
  form['estado'].value = item.estado;
  
  document.getElementById('form-container').classList.add('active');
  document.getElementById('input-nombre').focus();
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const newReserva = {
    nombre: form.nombre.value.trim(),
    carnet: form.carnet.value.trim() || null,
    hora: form.hora.value,
    personas: Number(form.personas.value),
    estado: form.estado.value
  };

  // Validación básica
  if (!newReserva.nombre || newReserva.nombre.length < 3) {
    alert("El nombre debe tener al menos 3 caracteres");
    return;
  }
  
  if (newReserva.personas < 1 || newReserva.personas > 20) {
    alert("Número de personas inválido (1-20)");
    return;
  }

  const currentData = getCurrentDateData();

  if (editIndex !== null) {
    // Editar reserva existente
    currentData[editSection][editIndex] = newReserva;
  } else {
    // Agregar nueva reserva
    currentData[editSection].push(newReserva);
  }

  renderSection(editSection);
  updateTotalGeneral();
  saveAllData();
  closeForm();
}

function closeForm() {
  document.getElementById('form-container').classList.remove('active');
  editSection = null;
  editIndex = null;
  document.getElementById('form').reset();
  document.getElementById('nombre-autocomplete').innerHTML = '';
}

// ===== RENDERIZADO =====
function renderSection(section) {
  const tbody = document.querySelector(`#${section} tbody`);
  tbody.innerHTML = '';

  const currentData = getCurrentDateData();
  const sectionData = currentData[section] || [];

  sectionData.forEach((reserva, i) => {
    const tr = document.createElement('tr');
    tr.tabIndex = 0;
    tr.className = reserva.estado;
    tr.setAttribute('role', 'row');
    tr.setAttribute('aria-label', `${reserva.nombre}, ${reserva.carnet || 'Sin carnet'}, ${reserva.hora}, ${reserva.personas} personas, estado: ${estadoTexto(reserva.estado)}`);
    
    tr.addEventListener('click', () => openEditForm(section, i));
    tr.addEventListener('keypress', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        openEditForm(section, i);
      }
    });
    
    tr.innerHTML = `
      <td>${reserva.nombre}</td>
      <td>${reserva.carnet || ''}</td>
      <td>${reserva.hora}</td>
      <td>${reserva.personas}</td>
      <td>${estadoTexto(reserva.estado)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Actualizar contador
  document.getElementById(`${section}-count`).textContent = sectionData.length;
}

function updateTotalGeneral() {
  let total = 0;
  const currentData = getCurrentDateData();
  
  sections.forEach(sec => {
    (currentData[sec] || []).forEach(reserva => {
      if (reserva.estado !== 'cancelled') {
        total += Number(reserva.personas);
      }
    });
  });
  
  document.getElementById('total-general').textContent = `Total general de personas (sin reservas canceladas): ${total}`;
}

// ===== BÚSQUEDA =====
function openSearch() {
  document.getElementById('search-container').classList.add('active');
  document.getElementById('search-input').focus();
  closeMenu();
}

function closeSearch() {
  document.getElementById('search-container').classList.remove('active');
  document.getElementById('search-results').innerHTML = '';
}

function searchClient() {
  const searchTerm = document.getElementById('search-input').value.trim().toLowerCase();
  if (!searchTerm) return;

  const resultsContainer = document.getElementById('search-results');
  resultsContainer.innerHTML = '';

  // Buscar en todas las fechas
  let foundClients = {};
  
  for (const date in data) {
    sections.forEach(section => {
      const reservations = data[date][section] || [];
      
      reservations.forEach(reservation => {
        if (reservation.nombre.toLowerCase().includes(searchTerm)) {
          if (!foundClients[reservation.nombre]) {
            foundClients[reservation.nombre] = {
              carnet: reservation.carnet,
              reservations: []
            };
          }
          
          foundClients[reservation.nombre].reservations.push({
            date,
            section,
            hora: reservation.hora,
            personas: reservation.personas,
            estado: reservation.estado
          });
        }
      });
    });
  }

  // Mostrar resultados
  if (Object.keys(foundClients).length === 0) {
    resultsContainer.innerHTML = '<p>No se encontraron clientes con ese nombre.</p>';
    return;
  }

  for (const nombre in foundClients) {
    const client = foundClients[nombre];
    const clientElement = document.createElement('div');
    clientElement.className = 'search-result-item';
    
    let html = `
      <div class="search-result-header">
        <span>${nombre}</span>
        ${client.carnet ? `<span>Carnet: ${client.carnet}</span>` : ''}
      </div>
      <div class="search-result-details">
    `;
    
    // Ordenar reservas por fecha (más reciente primero)
    client.reservations.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    client.reservations.forEach(res => {
      const fechaFormateada = new Date(res.date).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      html += `
        <div>
          <strong>${fechaFormateada}</strong> - 
          ${capitalize(res.section)} | 
          ${res.hora} | 
          ${res.personas} persona${res.personas > 1 ? 's' : ''} | 
          Estado: ${estadoTexto(res.estado)}
        </div>
      `;
    });
    
    html += `</div>`;
    clientElement.innerHTML = html;
    resultsContainer.appendChild(clientElement);
  }
}

// ===== AUTCOMPLETADO =====
document.getElementById('input-nombre').addEventListener('input', function() {
  const input = this.value.trim();
  const autocompleteList = document.getElementById('nombre-autocomplete');
  autocompleteList.innerHTML = '';

  if (input.length < 2) return;

  // Buscar nombres similares en todas las reservas
  const names = new Set();
  
  for (const date in data) {
    sections.forEach(section => {
      const reservations = data[date][section] || [];
      reservations.forEach(reservation => {
        if (reservation.nombre.toLowerCase().includes(input.toLowerCase())) {
          names.add(reservation.nombre);
        }
      });
    });
  }

  if (names.size === 0) return;

  // Mostrar sugerencias
  names.forEach(name => {
    const item = document.createElement('div');
    item.textContent = name;
    item.addEventListener('click', function() {
      document.getElementById('input-nombre').value = name;
      
      // Buscar el carnet más reciente para este nombre
      let latestReservation = null;
      for (const date in data) {
        sections.forEach(section => {
          const reservations = data[date][section] || [];
          reservations.forEach(reservation => {
            if (reservation.nombre === name && reservation.carnet) {
              if (!latestReservation || new Date(date) > new Date(latestReservation.date)) {
                latestReservation = reservation;
              }
            }
          });
        });
      }
      
      if (latestReservation) {
        document.getElementById('input-carnet').value = latestReservation.carnet;
      }
      
      autocompleteList.innerHTML = '';
    });
    autocompleteList.appendChild(item);
  });
});

// ===== MENÚ Y MODO OSCURO =====
function toggleOptions() {
  const menuButton = document.getElementById('menu-button');
  const menu = document.getElementById('menu-options');
  
  menuButton.classList.toggle('active');
  menu.classList.toggle('active');
  
  if (menu.classList.contains('active')) {
    menu.style.transform = 'translateY(0)';
    menu.style.opacity = '1';
    menu.style.visibility = 'visible';
  } else {
    menu.style.transform = 'translateY(-20px)';
    menu.style.opacity = '0';
    menu.style.visibility = 'hidden';
  }
}

function closeMenu() {
  const menuButton = document.getElementById('menu-button');
  const menu = document.getElementById('menu-options');
  
  menuButton.classList.remove('active');
  menu.classList.remove('active');
  menu.style.transform = 'translateY(-20px)';
  menu.style.opacity = '0';
  menu.style.visibility = 'hidden';
}

function initDarkMode() {
  if (localStorage.getItem('darkMode') === '1') {
    document.body.classList.add('dark-mode');
  }
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  saveAllData();
  closeMenu();
}

// ===== FUNCIONES UTILITARIAS =====
function estadoTexto(estado) {
  switch (estado) {
    case 'pending': return 'Pendiente';
    case 'arrived': return 'Llegó';
    case 'cancelled': return 'Cancelado';
    default: return '';
  }
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}