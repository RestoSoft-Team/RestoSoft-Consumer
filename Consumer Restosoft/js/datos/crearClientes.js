const API_BASE = "http://localhost:8080/api";
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYXJpYS5wZXJlekByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMiwiZW1wcmVzYUlkIjoxLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI2ODc0MTgsImV4cCI6MTc4Mjc3MzgxOH0.xEOf-8izPT5bu64_oCsojldcaD1mcRTZSI3HJ1Xn8ZE";

let selectedFile = null;

console.log("Script crearCliente cargado correctamente"); // Mensaje para verificar en consola

// --- Lógica de Subida de Imagen ---
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('imagen');
const uploadText = document.getElementById('uploadText');
const uploadTitle = document.getElementById('uploadTitle');

if (uploadBox) {
    uploadBox.addEventListener('click', () => {
        fileInput.click();
    });
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            uploadTitle.textContent = "Imagen Cargada";
            uploadText.textContent = selectedFile.name;
        }
    });
}

// --- Lógica del Interruptor de Estado ---
const estadoSwitch = document.getElementById('estadoCliente');
const estadoTexto = document.getElementById('estadoTexto');

if (estadoSwitch) {
    estadoSwitch.addEventListener('change', () => {
        if (estadoSwitch.checked) {
            estadoTexto.textContent = 'Cliente Activo';
            estadoTexto.classList.remove('inactive');
            estadoTexto.classList.add('active');
        } else {
            estadoTexto.textContent = 'Cliente Inactivo';
            estadoTexto.classList.remove('active');
            estadoTexto.classList.add('inactive');
        }
    });
}

// --- Lógica del Botón Guardar ---
document.getElementById('btnGuardar').addEventListener('click', async () => {
    const btn = document.getElementById('btnGuardar');

    // 1. Capturar datos del formulario
    const nombres = document.getElementById('nombres').value.trim();
    const apellidos = document.getElementById('apellidos').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const fechaNacimiento = document.getElementById('fechaNacimiento').value;

    // Generamos una contraseña automáticamente 
    const generatedPassword = "Cliente" + Math.floor(Math.random() * 100000) + "!";

    // 2. Validaciones básicas
    if (!nombres || !apellidos || !email || !telefono || !fechaNacimiento) {
        showToast('Error', 'Todos los campos son obligatorios.', true);
        return;
    }

    // 3. Construir el objeto de datos
    const clienteData = {
        nombres,
        apellidos,
        email,
        telefono,
        fechaNacimiento,
        password: generatedPassword,
        eliminarImagen: false
    };

    // 4. Crear FormData
    const formData = new FormData();
    formData.append("cliente", new Blob([JSON.stringify(clienteData)], { type: "application/json" }));

    if (selectedFile) {
        formData.append("imagen", selectedFile);
    }

    // 5. Enviar a la API
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Guardando...';

    try {
        const response = await fetch(`${API_BASE}/usuarios/clientes`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${TOKEN}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(errorData || "Error al guardar en la base de datos");
        }

        showToast('Cliente registrado', 'El nuevo cliente fue creado correctamente en el sistema.');

        // Redirigir después de 2 segundos
        setTimeout(() => {
            window.location.href = 'clientes.html';
        }, 2000);

    } catch (error) {
        console.error('Error al crear cliente:', error);
        showToast('Error', error.message || 'Ocurrió un problema al guardar el cliente.', true);
        btn.disabled = false;
        btn.innerHTML = 'Guardar Cliente';
    }
});

// --- Función para mostrar notificaciones (Toast) ---
function showToast(titulo, mensaje, esError = false) {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('.toast-icon i');
    const titleEl = document.getElementById('toastTitle');
    const textEl = document.getElementById('toastText');

    titleEl.textContent = titulo;
    textEl.textContent = mensaje;

    if (esError) {
        toast.style.borderLeftColor = 'var(--danger)';
        icon.className = 'fa-solid fa-circle-xmark';
        icon.parentElement.style.background = 'rgba(187, 58, 75, 0.12)';
        icon.parentElement.style.color = 'var(--danger)';
    } else {
        toast.style.borderLeftColor = 'var(--success)';
        icon.className = 'fa-solid fa-circle-check';
        icon.parentElement.style.background = 'rgba(61, 139, 92, 0.12)';
        icon.parentElement.style.color = 'var(--success)';
    }

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}