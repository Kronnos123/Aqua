let currentSection = '';
let editingIndex = null; // índice del huésped que estamos editando, null si es nuevo
let data = {
    vip: [],
    regular: [],
    restaurante: []
};

function toggleSection(section) {
    const content = document.getElementById(`${section}-content`);
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
}

function openForm(section, index = null) {
    currentSection = section;
    editingIndex = index;

    document.getElementById('form-modal').classList.remove('hidden');

    if (index === null) {
        // Nuevo huésped
        document.getElementById('form-title').textContent = 'Añadir huésped';
        clearForm();
        document.getElementById('status').value = 'pendiente';
    } else {
        // Editar huésped existente
        document.getElementById('form-title').textContent = 'Editar huésped';
        const guest = data[section][index];
        document.getElementById('name').value = guest.name;
        document.getElementById('ci').value = guest.ci;
        document.getElementById('arrival').value = guest.arrival;
        document.getElementById('people').value = guest.people;
        document.getElementById('status').value = guest.status || 'pendiente';
    }
}

function closeForm() {
    document.getElementById('form-modal').classList.add('hidden');
    clearForm();
    editingIndex = null;
}

function clearForm() {
    document.getElementById('name').value = '';
    document.getElementById('ci').value = '';
    document.getElementById('arrival').value = '';
    document.getElementById('people').value = '';
    document.getElementById('status').value = 'pendiente';
}

function saveGuest() {
    const name = document.getElementById('name').value.trim();
    const ci = document.getElementById('ci').value.trim();
    const arrival = document.getElementById('arrival').value;
    const people = document.getElementById('people').value;
    const status = document.getElementById('status').value;

    if (!name || !ci || !arrival || !people) {
        alert("Por favor completa todos los campos.");
        return;
    }

    const guest = { name, ci, arrival, people, status };

    if (editingIndex === null) {
        // Añadir nuevo
        data[currentSection].push(guest);
    } else {
        // Editar existente
        data[currentSection][editingIndex] = guest;
    }

    saveData();
    renderSection(currentSection);
    updateTotalGeneral();
    closeForm();
}

function renderSection(section) {
    const content = document.getElementById(`${section}-content`);
    content.innerHTML = '';

    let total = 0;

    data[section].forEach((guest, index) => {
        const entry = document.createElement('div');
        entry.classList.add(`guest-${guest.status || 'pendiente'}`);

        // Hacer el nombre clicable para editar
        const nameSpan = document.createElement('span');
        nameSpan.textContent = guest.name;
        nameSpan.classList.add('guest-name');
        nameSpan.onclick = () => openForm(section, index);

        // Texto con datos del huésped
        const text = document.createTextNode(` | CI: ${guest.ci} | Hora: ${guest.arrival} | Personas: ${guest.people}`);

        entry.appendChild(nameSpan);
        entry.appendChild(text);

        content.appendChild(entry);

        if (guest.status !== 'cancelado') { // Contar sólo si no está cancelado
            total += parseInt(guest.people);
        }
    });

    document.getElementById(`${section}-total`).textContent = total;
}

function updateTotalGeneral() {
    let total = 0;
    ['vip', 'regular', 'restaurante'].forEach(section => {
        data[section].forEach(guest => {
            if (guest.status !== 'cancelado') {
                total += parseInt(guest.people);
            }
        });
    });
    document.getElementById('total-general').textContent = `Total general: ${total}`;
}

function saveData() {
    localStorage.setItem('beachClubData', JSON.stringify(data));
}

function loadData() {
    const stored = localStorage.getItem('beachClubData');
    if (stored) {
        data = JSON.parse(stored);
    }
}

// Al iniciar
loadData();
renderSection('vip');
renderSection('regular');
renderSection('restaurante');
updateTotalGeneral();

function toggleOptions() {
    const menu = document.getElementById('menu-options');
    menu.classList.toggle('hidden');
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    document.documentElement.classList.toggle('dark-mode');
    saveDarkMode();
}

function saveDarkMode() {
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? '1' : '0');
}

function loadDarkMode() {
    const isDark = localStorage.getItem('darkMode');
    if (isDark === '1') {
        document.body.classList.add('dark-mode');
        document.documentElement.classList.add('dark-mode');
    }
}

// Mostrar el calendario al iniciar
function showCalendarAtStartup() {
    document.getElementById('calendar-container').scrollIntoView({ behavior: 'smooth' });
}

// Llamadas al iniciar
loadDarkMode();
showCalendarAtStartup();
