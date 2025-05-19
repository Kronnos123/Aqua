// Configuración
const API_URL = 'https://script.google.com/macros/s/AKfycbyWYb4gpTiFYtIE8cFW7wz37yuRaz5wkHykI7TJYpGCZpB8FwDVcyWPEB3c5NJJMi49/exec';
const sections = ['vip', 'regular', 'restaurante'];
let currentDate = new Date().toISOString().split('T')[0];
let editSection = null;
let editIndex = null;
let data = {};
let isOnline = true;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initAccordions();
    setupEventListeners();
    checkConnection();

    const calendar = document.getElementById('calendar');
    calendar.value = currentDate;
    calendar.addEventListener('change', (e) => {
        currentDate = e.target.value;
        loadDataForDate(currentDate);
    });

    loadInitialData();
});

async function loadInitialData() {
    showToast('Cargando datos...', 'info');

    try {
        if (isOnline) {
            const success = await fetchAndUpdateData();
            if (!success) throw new Error('Falló la carga inicial');
        }

        const cachedData = localStorage.getItem('beachClubData');
        if (cachedData) {
            data = JSON.parse(cachedData);
            loadDataForDate(currentDate);
            if (!isOnline) {
                showToast('Datos cargados desde caché', 'warning');
            }
        }
    } catch (error) {
        console.error('Error en carga inicial:', error);
        showToast('Error al cargar datos', 'error');
    }
}

async function fetchAndUpdateData() {
    try {
        showToast('Actualizando datos...', 'info');
        const response = await fetch(`${API_URL}?operation=getAllReservations&timestamp=${Date.now()}`);

        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        const result = await response.json();

        // Verificación profunda de la respuesta
        if (!result || !result.success || !result.data) {
            throw new Error('Estructura de respuesta inválida');
        }

        // Normalizar datos
        const validatedData = {};
        Object.keys(result.data).forEach(date => {
            const formattedDate = date.split('T')[0];
            validatedData[formattedDate] = {};

            sections.forEach(section => {
                validatedData[formattedDate][section] = (result.data[date][section] || []).map(reserva => ({
                    nombre: reserva.nombre || '',
                    carnet: reserva.carnet || null,
                    hora: reserva.hora || '12:00',
                    personas: Math.max(1, parseInt(reserva.personas) || 1),
                    estado: reserva.estado || 'pending',
                    timestamp: reserva.timestamp || new Date().toISOString()
                }));
            });
        });

        // Actualizar estado local
        data = validatedData;
        localStorage.setItem('beachClubData', JSON.stringify(data));
        localStorage.setItem('lastSyncTime', new Date().toISOString());

        // Forzar renderizado
        loadDataForDate(currentDate);
        showToast('Datos actualizados correctamente', 'success');
        return true;

    } catch (error) {
        console.error('Error al sincronizar:', error);
        showToast('Error al actualizar datos. Usando versión en caché', 'error');
        return false;
    }
}

function loadDataForDate(date) {
    // Normalizar fecha (eliminar parte de tiempo si existe)
    const formattedDate = date.split('T')[0];
    currentDate = formattedDate;

    // Inicializar estructura si no existe
    if (!data[formattedDate]) {
        data[formattedDate] = { vip: [], regular: [], restaurante: [] };
    }

    // Ordenar reservas por hora
    sections.forEach(section => {
        if (data[formattedDate][section]) {
            data[formattedDate][section].sort((a, b) => a.hora.localeCompare(b.hora));
        }
    });

    // Actualizar UI
    renderAllSections();
    updateTotalGeneral();
}

function renderAllSections() {
    sections.forEach(section => renderSection(section));
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
    document.getElementById('total-count').textContent = total;
}

function getStatusText(status) {
    const statusMap = {
        pending: 'Pendiente',
        arrived: 'Llegó',
        cancelled: 'Cancelado'
    };
    return statusMap[status] || '';
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
    sections.forEach(section => {
        document.querySelector(`#${section} .add-btn`).addEventListener('click', () => {
            openAddForm(section);
        });
    });

    document.getElementById('form').addEventListener('submit', handleFormSubmit);
    document.querySelector('#form .close-btn').addEventListener('click', closeForm);

    document.getElementById('search-button').addEventListener('click', searchClient);
    document.querySelector('#search-form .close-btn').addEventListener('click', closeSearch);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchClient();
        }
    });

    const menuButton = document.querySelector('.menu-button');
    const menuOptions = document.querySelector('.menu-options');

    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        menuButton.classList.toggle('active');
        menuOptions.classList.toggle('active');
    });

    document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
    document.getElementById('search-toggle').addEventListener('click', openSearch);
    document.getElementById('refresh-data').addEventListener('click', handleRefreshData);

    document.addEventListener('click', () => {
        menuOptions.classList.remove('active');
        menuButton.classList.remove('active');
    });

    menuOptions.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    document.getElementById('input-nombre').addEventListener('input', showAutocomplete);
    document.addEventListener('click', (e) => {
        if (e.target.id !== 'input-nombre') {
            document.getElementById('nombre-autocomplete').style.display = 'none';
        }
    });

    setInterval(checkConnection, 30000);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
}

async function handleRefreshData() {
    showToast('Actualizando datos...', 'info');
    await fetchAndUpdateData();
    document.querySelector('.menu-button').classList.remove('active');
    document.querySelector('.menu-options').classList.remove('active');
}

function handleOnlineStatus() {
    isOnline = true;
    showToast('Conexión restablecida. Sincronizando datos...', 'success');
    setTimeout(async () => {
        await syncLocalChanges();
        await fetchAndUpdateData();
    }, 2000);
}

function handleOfflineStatus() {
    isOnline = false;
    showToast('Estás trabajando sin conexión. Los cambios se sincronizarán cuando vuelvas a estar en línea.', 'error');
}

function checkConnection() {
    isOnline = navigator.onLine;
}

async function syncLocalChanges() {
    try {
        const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges') || []);
        if (pendingChanges.length === 0) return;

        showToast('Sincronizando cambios locales...', 'info');
        const successes = [];

        for (const change of pendingChanges) {
            try {
                const response = await fetch(`${API_URL}?${new URLSearchParams(change.params)}`);
                if (!response.ok) throw new Error('Error al sincronizar');
                successes.push(change);
            } catch (error) {
                console.error('Error en cambio específico:', error);
            }
        }

        const remainingChanges = pendingChanges.filter(change =>
            !successes.some(success => JSON.stringify(success) === JSON.stringify(change))
        );

        localStorage.setItem('pendingChanges', JSON.stringify(remainingChanges));

        if (successes.length > 0) {
            showToast(`${successes.length} cambios sincronizados correctamente`, 'success');
            await fetchAndUpdateData();
        }

        if (remainingChanges.length > 0) {
            showToast(`${remainingChanges.length} cambios pendientes por errores`, 'warning');
        }

    } catch (error) {
        console.error('Error general en sincronización:', error);
        showToast('Error al sincronizar algunos cambios', 'error');
    }
}

function openAddForm(section) {
    editSection = section;
    editIndex = null;

    const form = document.getElementById('form');
    form.reset();
    document.getElementById('form-title').textContent = `Agregar reserva en ${capitalize(section)}`;
    document.querySelector('#form button[type="submit"]').textContent = 'Agregar';

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

    form.nombre.value = reserva.nombre || '';
    form.carnet.value = reserva.carnet || '';
    form.hora.value = reserva.hora || '12:00';
    form.personas.value = reserva.personas || 1;
    form.estado.value = reserva.estado || 'pending';

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
        personas: Math.max(1, Math.floor(Number(form.personas.value)) || 1),
        estado: form.estado.value,
        timestamp: editIndex !== null ? data[currentDate][editSection][editIndex].timestamp : new Date().toISOString()
    };

    if (reserva.nombre.length < 3) {
        showToast('Nombre debe tener al menos 3 caracteres', 'error');
        return;
    }
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(reserva.hora)) {
        showToast('Hora debe estar en formato 24h (ej: 14:30)', 'error');
        return;
    }

    try {
        const operation = editIndex !== null ? 'updateReservation' : 'addReservation';
        const params = new URLSearchParams({
            operation,
            reservationDate: currentDate,
            section: editSection,
            reservation: JSON.stringify(reserva)
        });

        if (operation === 'updateReservation') {
            params.append('index', editIndex);
        }

        if (isOnline) {
            const response = await fetch(`${API_URL}?${params}`);
            if (!response.ok) throw new Error('Error al guardar en servidor');
        } else {
            const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges') || []);
            pendingChanges.push({
                url: API_URL,
                params: Object.fromEntries(params)
            });
            localStorage.setItem('pendingChanges', JSON.stringify(pendingChanges));
        }

        if (!data[currentDate]) {
            data[currentDate] = { vip: [], regular: [], restaurante: [] };
        }

        if (editIndex !== null) {
            data[currentDate][editSection][editIndex] = reserva;
        } else {
            data[currentDate][editSection].push(reserva);
        }

        data[currentDate][editSection].sort((a, b) => a.hora.localeCompare(b.hora));

        renderSection(editSection);
        updateTotalGeneral();
        localStorage.setItem('beachClubData', JSON.stringify(data));

        showToast(
            editIndex !== null ? 'Reserva actualizada' : 'Reserva agregada',
            'success'
        );

        closeForm();

        if (!isOnline) {
            showToast('Los cambios se sincronizarán cuando recuperes conexión', 'info');
        }
    } catch (error) {
        console.error('Error al guardar:', error);
        showToast('Error al guardar la reserva', 'error');
    }
}

function closeForm() {
    document.getElementById('form-container').classList.remove('active');
    editSection = null;
    editIndex = null;
}

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

function showAutocomplete() {
    const input = document.getElementById('input-nombre').value.trim();
    const autocompleteList = document.getElementById('nombre-autocomplete');
    autocompleteList.innerHTML = '';

    if (input.length < 2) {
        autocompleteList.style.display = 'none';
        return;
    }

    const names = new Set();

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

    names.forEach(name => {
        const item = document.createElement('div');
        item.textContent = name;
        item.addEventListener('click', () => {
            document.getElementById('input-nombre').value = name;
            autocompleteList.style.display = 'none';

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

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function capitalizeFirstLetter(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}