// Configuración
const API_URL = 'https://script.google.com/macros/s/AKfycbybZvefPe9w8JQijcf1FTfuAljN8aPogy0M--W00mjPa3lw9UE-nVVc2O7wTE_Z1FZt/exec';
const sections = ['vip', 'regular', 'restaurante'];
let currentDate = new Date().toISOString().split('T')[0];
let editSection = null;
let editIndex = null;
let data = {};
let isOnline = true;
let isInitialLoad = true;
let lastSyncTime = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initAccordions();
    setupEventListeners();
    checkConnection();

    // Configurar calendario
    const calendar = document.getElementById('calendar');
    calendar.value = currentDate;
    calendar.addEventListener('change', (e) => {
        currentDate = e.target.value;
        loadDataForDate(currentDate);
    });

    // Iniciar modo oscuro si estaba activo
    if (localStorage.getItem('darkMode') === '1') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').innerHTML = '<i class="fas fa-sun"></i> Modo claro';
    }

    // Cargar datos iniciales
    loadInitialData();
});

// Función mejorada para carga inicial
async function loadInitialData() {
    try {
        showToast('Cargando datos...', 'info');

        // Primero intentar cargar desde caché para mostrar algo rápido
        const cachedData = localStorage.getItem('beachClubData');
        if (cachedData) {
            data = JSON.parse(cachedData);
            loadDataForDate(currentDate);
            showToast('Datos cargados desde caché', 'warning');
        }

        // Luego intentar cargar desde el servidor
        if (isOnline) {
            await fetchAndUpdateData();
        }

    } catch (error) {
        console.error('Error en carga inicial:', error);
        showToast('Error al cargar datos iniciales', 'error');
    } finally {
        isInitialLoad = false;
    }
}

// Función mejorada para obtener datos del servidor
async function fetchAndUpdateData() {
    try {
        showToast('Actualizando datos desde el servidor...', 'info');

        const response = await fetch(`${API_URL}?operation=getData&timestamp=${new Date().getTime()}`);
        if (!response.ok) throw new Error('Error al obtener datos');

        const serverData = await response.json();

        // Verificar si hay cambios
        if (JSON.stringify(data) !== JSON.stringify(serverData)) {
            data = serverData;
            localStorage.setItem('beachClubData', JSON.stringify(data));
            localStorage.setItem('lastSyncTime', new Date().toISOString());
            lastSyncTime = new Date();

            loadDataForDate(currentDate);
            showToast('Datos actualizados correctamente', 'success');
        } else {
            showToast('Los datos ya están actualizados', 'info');
        }

    } catch (error) {
        console.error('Error al actualizar datos:', error);
        showToast('Error al actualizar datos. Usando versión en caché', 'error');

        // Intentar cargar desde caché si falla la conexión
        const cachedData = localStorage.getItem('beachClubData');
        if (cachedData) {
            data = JSON.parse(cachedData);
            loadDataForDate(currentDate);
        }
    }
}

function initAccordions() {
    sections.forEach(section => {
        const header = document.getElementById(`${section}-header`);
        const content = document.getElementById(`${section}-content`);

        header.addEventListener('click', () => {
            const isExpanded = content.classList.toggle('active');
            header.setAttribute('aria-expanded', isExpanded);
        });
    });
}

function setupEventListeners() {
    // Botones agregar
    sections.forEach(section => {
        document.querySelector(`#${section} .add-btn`).addEventListener('click', () => {
            openAddForm(section);
        });
    });

    // Formulario
    document.getElementById('form').addEventListener('submit', handleFormSubmit);
    document.querySelector('#form .close-btn').addEventListener('click', closeForm);

    // Búsqueda
    document.getElementById('search-button').addEventListener('click', searchClient);
    document.querySelector('#search-form .close-btn').addEventListener('click', closeSearch);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchClient();
        }
    });

    // Menú flotante
    const menuButton = document.querySelector('.menu-button');
    const menuOptions = document.querySelector('.menu-options');

    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        menuButton.classList.toggle('active');
        menuOptions.classList.toggle('active');
    });

    // Opciones del menú
    document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
    document.getElementById('search-toggle').addEventListener('click', openSearch);
    document.getElementById('refresh-data').addEventListener('click', () => {
        fetchAndUpdateData();
        document.querySelector('.menu-button').classList.remove('active');
        document.querySelector('.menu-options').classList.remove('active');
    });

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', () => {
        menuOptions.classList.remove('active');
        document.querySelector('.menu-button').classList.remove('active');
    });

    // Evitar que el menú se cierre al hacer clic dentro
    menuOptions.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Autocompletado
    document.getElementById('input-nombre').addEventListener('input', showAutocomplete);
    document.addEventListener('click', (e) => {
        if (e.target.id !== 'input-nombre') {
            document.getElementById('nombre-autocomplete').style.display = 'none';
        }
    });

    // Verificar conexión periódicamente
    setInterval(checkConnection, 30000);

    // Manejar cambios de conexión
    window.addEventListener('online', () => {
        isOnline = true;
        showToast('Conexión restablecida. Sincronizando datos...', 'success');
        syncLocalChanges();
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        showToast('Estás trabajando sin conexión. Los cambios se sincronizarán cuando vuelvas a estar en línea.', 'error');
    });
}

function checkConnection() {
    isOnline = navigator.onLine;
    if (!isOnline) {
        showToast('Estás trabajando sin conexión. Los cambios se sincronizarán cuando vuelvas a estar en línea.', 'error');
    }
}

async function syncLocalChanges() {
    try {
        const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges') || '[]');
        if (pendingChanges.length === 0) return;

        showToast('Sincronizando cambios locales...', 'info');

        for (const change of pendingChanges) {
            const response = await fetch(`${API_URL}?${new URLSearchParams(change)}`);
            if (!response.ok) throw new Error('Error al sincronizar');
        }

        // Limpiar cambios pendientes después de sincronizar
        localStorage.removeItem('pendingChanges');
        showToast('Cambios sincronizados correctamente', 'success');
        await fetchAndUpdateData(); // Recargar datos actualizados

    } catch (error) {
        console.error('Error al sincronizar:', error);
        showToast('Error al sincronizar cambios. Reintentando más tarde...', 'error');
    }
}

function loadDataForDate(date) {
    currentDate = date;
    if (!data[date]) {
        data[date] = { vip: [], regular: [], restaurante: [] };
    }

    // Ordenar reservas por hora
    sections.forEach(section => {
        if (data[date][section]) {
            data[date][section].sort((a, b) => {
                return a.hora.localeCompare(b.hora);
            });
        }
    });

    sections.forEach(section => renderSection(section));
    updateTotalGeneral();
}

function renderSection(section) {
    const tbody = document.querySelector(`#${section} tbody`);
    tbody.innerHTML = '';

    const sectionData = data[currentDate]?.[section] || [];

    sectionData.forEach((reserva, index) => {
        const tr = document.createElement('tr');
        tr.className = reserva.estado;
        tr.innerHTML = `
            <td>${reserva.nombre}</td>
            <td>${reserva.carnet || ''}</td>
            <td>${reserva.hora}</td>
            <td>${reserva.personas}</td>
            <td>${getStatusText(reserva.estado)}</td>
        `;
        tr.addEventListener('click', () => openEditForm(section, index));
        tbody.appendChild(tr);
    });

    document.getElementById(`${section}-count`).textContent = sectionData.length;
}

function updateTotalGeneral() {
    let total = 0;
    sections.forEach(section => {
        (data[currentDate]?.[section] || []).forEach(reserva => {
            if (reserva.estado !== 'cancelled') {
                total += Number(reserva.personas);
            }
        });
    });
    document.getElementById('total-general').textContent =
        `Total general de personas (sin reservas canceladas): ${total}`;
}

function getStatusText(status) {
    const statusMap = {
        pending: 'Pendiente',
        arrived: 'Llegó',
        cancelled: 'Cancelado'
    };
    return statusMap[status] || '';
}

// Funciones de formulario
function openAddForm(section) {
    editSection = section;
    editIndex = null;

    const form = document.getElementById('form');
    form.reset();
    document.getElementById('form-title').textContent = `Agregar reserva en ${capitalize(section)}`;
    document.querySelector('#form button[type="submit"]').textContent = 'Agregar';

    // Establecer hora actual como predeterminada
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('input-hora').value = `${hours}:${minutes}`;

    document.getElementById('form-container').classList.add('active');
    document.getElementById('input-nombre').focus();
}

function openEditForm(section, index) {
    editSection = section;
    editIndex = index;

    const reserva = data[currentDate][section][index];
    const form = document.getElementById('form');

    document.getElementById('form-title').textContent = `Editar reserva en ${capitalize(section)}`;
    document.querySelector('#form button[type="submit"]').textContent = 'Guardar cambios';

    form.nombre.value = reserva.nombre;
    form.carnet.value = reserva.carnet || '';
    form.hora.value = reserva.hora;
    form.personas.value = reserva.personas;
    form.estado.value = reserva.estado;

    document.getElementById('form-container').classList.add('active');
    form.nombre.focus();
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const reserva = {
        nombre: form.nombre.value.trim(),
        carnet: form.carnet.value.trim() || null,
        hora: form.hora.value,
        personas: Number(form.personas.value),
        estado: form.estado.value,
        timestamp: new Date().toISOString() // Agregar marca de tiempo
    };

    // Validación
    if (reserva.nombre.length < 3) {
        showToast('El nombre debe tener al menos 3 caracteres', 'error');
        return;
    }
    if (reserva.personas < 1 || reserva.personas > 20) {
        showToast('Número de personas inválido (1-20)', 'error');
        return;
    }

    // Verificar duplicados (solo para nuevas reservas)
    if (editIndex === null) {
        const hasDuplicate = checkDuplicateReservation(reserva);
        if (hasDuplicate) {
            showToast('Esta persona ya tiene una reserva para esta fecha y sección', 'error');
            return;
        }
    }

    try {
        // Guardar en Google Sheets si hay conexión
        if (isOnline) {
            const operation = editIndex !== null ? 'updateReservation' : 'addReservation';
            const params = {
                operation,
                date: currentDate,
                section: editSection,
                reservation: JSON.stringify(reserva)
            };

            if (operation === 'updateReservation') {
                params.index = editIndex;
            }

            // Agregar parámetro único para evitar caché
            params.timestamp = new Date().getTime();

            const response = await fetch(`${API_URL}?${new URLSearchParams(params)}`);
            if (!response.ok) throw new Error('Error al guardar');

            // Forzar actualización de datos después de guardar
            await fetchAndUpdateData();
        } else {
            // Guardar cambio pendiente para sincronizar luego
            const operation = editIndex !== null ? 'updateReservation' : 'addReservation';
            const change = {
                operation,
                date: currentDate,
                section: editSection,
                reservation: JSON.stringify(reserva),
                timestamp: new Date().getTime()
            };

            if (operation === 'updateReservation') {
                change.index = editIndex;
            }

            const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges') || '[]');
            pendingChanges.push(change);
            localStorage.setItem('pendingChanges', JSON.stringify(pendingChanges));
        }

        // Actualizar datos locales inmediatamente
        if (!data[currentDate]) data[currentDate] = { vip: [], regular: [], restaurante: [] };

        if (editIndex !== null) {
            data[currentDate][editSection][editIndex] = reserva;
            showToast('Reserva actualizada correctamente', 'success');
        } else {
            data[currentDate][editSection].push(reserva);
            showToast('Reserva agregada correctamente', 'success');
        }

        // Actualizar UI
        renderSection(editSection);
        updateTotalGeneral();
        closeForm();

        // Guardar en localStorage
        localStorage.setItem('beachClubData', JSON.stringify(data));

        // Si estaba sin conexión, informar al usuario
        if (!isOnline) {
            showToast('Reserva guardada localmente. Se sincronizará cuando haya conexión.', 'success');
        }

    } catch (error) {
        console.error('Error:', error);
        showToast('Error al guardar la reserva. Por favor intenta nuevamente.', 'error');
    }
}

function checkDuplicateReservation(newReserva) {
    const sectionData = data[currentDate]?.[editSection] || [];
    return sectionData.some((reserva, index) =>
        reserva.nombre.toLowerCase() === newReserva.nombre.toLowerCase() &&
        reserva.estado !== 'cancelled' &&
        (editIndex === null || index !== editIndex)
    );
}

function closeForm() {
    document.getElementById('form-container').classList.remove('active');
    editSection = null;
    editIndex = null;
}

// Búsqueda
function openSearch() {
    document.getElementById('search-container').classList.add('active');
    document.getElementById('search-input').focus();
    document.querySelector('.menu-button').classList.remove('active');
    document.querySelector('.menu-options').classList.remove('active');
}

function closeSearch() {
    document.getElementById('search-container').classList.remove('active');
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-input').value = '';
}

function searchClient() {
    const searchTerm = document.getElementById('search-input').value.trim().toLowerCase();
    if (!searchTerm) {
        showToast('Por favor ingresa un nombre para buscar', 'error');
        return;
    }

    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';

    const foundClients = {};

    // Buscar en todas las fechas y secciones
    for (const date in data) {
        sections.forEach(section => {
            (data[date][section] || []).forEach(reserva => {
                if (reserva.nombre.toLowerCase().includes(searchTerm)) {
                    if (!foundClients[reserva.nombre]) {
                        foundClients[reserva.nombre] = {
                            carnet: reserva.carnet,
                            reservations: []
                        };
                    }
                    foundClients[reserva.nombre].reservations.push({
                        date, section,
                        hora: reserva.hora,
                        personas: reserva.personas,
                        estado: reserva.estado
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

        // Ordenar por fecha (más reciente primero)
        client.reservations.sort((a, b) => new Date(b.date) - new Date(a.date));

        client.reservations.forEach(res => {
            const fecha = new Date(res.date).toLocaleDateString('es-ES', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            html += `
                <div>
                    <strong>${capitalizeFirstLetter(fecha)}</strong> - ${capitalize(res.section)} |
                    ${res.hora} | ${res.personas} persona${res.personas > 1 ? 's' : ''} |
                    ${getStatusText(res.estado)}
                </div>
            `;
        });

        html += '</div>';
        clientElement.innerHTML = html;
        resultsContainer.appendChild(clientElement);
    }
}

// Autocompletado
function showAutocomplete() {
    const input = document.getElementById('input-nombre').value.trim();
    const autocompleteList = document.getElementById('nombre-autocomplete');
    autocompleteList.innerHTML = '';

    if (input.length < 2) {
        autocompleteList.style.display = 'none';
        return;
    }

    const names = new Set();

    // Buscar nombres similares
    for (const date in data) {
        sections.forEach(section => {
            (data[date][section] || []).forEach(reserva => {
                if (reserva.nombre.toLowerCase().includes(input.toLowerCase())) {
                    names.add(reserva.nombre);
                }
            });
        });
    }

    if (names.size === 0) {
        autocompleteList.style.display = 'none';
        return;
    }

    // Mostrar sugerencias
    names.forEach(name => {
        const item = document.createElement('div');
        item.textContent = name;
        item.addEventListener('click', () => {
            document.getElementById('input-nombre').value = name;
            autocompleteList.style.display = 'none';

            // Buscar el carnet más reciente para este nombre
            let latestReservation = null;
            for (const date in data) {
                sections.forEach(section => {
                    (data[date][section] || []).forEach(reserva => {
                        if (reserva.nombre === name && reserva.carnet) {
                            if (!latestReservation || new Date(date) > new Date(latestReservation.date)) {
                                latestReservation = reserva;
                            }
                        }
                    });
                });
            }

            if (latestReservation) {
                document.getElementById('input-carnet').value = latestReservation.carnet;
            }
        });
        autocompleteList.appendChild(item);
    });

    autocompleteList.style.display = 'block';
}

// Modo oscuro
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const darkModeBtn = document.getElementById('dark-mode-toggle');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', '1');
        darkModeBtn.innerHTML = '<i class="fas fa-sun"></i> Modo claro';
    } else {
        localStorage.setItem('darkMode', '0');
        darkModeBtn.innerHTML = '<i class="fas fa-moon"></i> Modo oscuro';
    }
    document.querySelector('.menu-button').classList.remove('active');
    document.querySelector('.menu-options').classList.remove('active');
}

// Notificaciones toast
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.innerHTML = '';

    let icon = '';
    if (type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';
    if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
    if (type === 'info') icon = '<i class="fas fa-info-circle"></i>';
    if (type === 'warning') icon = '<i class="fas fa-exclamation-triangle"></i>';

    toast.innerHTML = `${icon} ${message}`;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

// Utilidades
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function capitalizeFirstLetter(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}