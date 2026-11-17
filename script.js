
// ==========================================
// 1. SELECCIONAR ELEMENTOS DEL HTML
// ==========================================

const contenedor = document.getElementById("resultado");
const buscador = document.getElementById("buscador");
const spinner = document.getElementById("spinner");
const contador = document.getElementById("contador");

let pokedex = [];
let todosLosNombres = [];
let temporizador;
let solicitudActual = 0;

const nombresIniciales = [
    "bulbasaur",
    "charmander",
    "squirtle",
    "pikachu",
    "jigglypuff",
    "gengar"
];

const cachePokemon = new Map();


// ==========================================
// 2. CONTROLAR EL SPINNER
// ==========================================

function mostrarSpinner() {
    spinner.classList.remove("hidden");
}

function ocultarSpinner() {
    spinner.classList.add("hidden");
}


// ==========================================
// 3. CREAR TARJETAS
// ==========================================

function crearTarjeta(pokemon) {

    const { nombre, imagen, tipos } = pokemon;

    const articulo = document.createElement("article");

    const badges = tipos.map(function(tipo) {
        return `
            <span class="text-xs bg-slate-200 text-slate-700
                         px-2 py-1 rounded-full">
                ${tipo}
            </span>
        `;
    }).join("");

    articulo.className = `
        bg-white rounded-xl shadow p-4 text-center
        transform hover:scale-105 transition duration-200
    `;

    articulo.innerHTML = `
        <img src="${imagen}" alt="${nombre}" class="w-24 mx-auto">

        <h2 class="capitalize font-bold text-slate-800 mt-2">
            ${nombre}
        </h2>

        <div class="flex gap-1 justify-center mt-2 flex-wrap">
            ${badges}
        </div>
    `;

    return articulo;
}


// ==========================================
// 4. RENDERIZAR RESULTADOS
// ==========================================

function render(lista) {

    contenedor.innerHTML = "";

    if (lista.length === 0) {

        contenedor.innerHTML = `
            <p class="col-span-full text-center text-slate-500">
                No se encontraron Pokémon.
            </p>
        `;

        contador.textContent = "0 resultados";
        return;
    }

    lista.forEach(function(pokemon) {

        const tarjeta = crearTarjeta(pokemon);

        contenedor.appendChild(tarjeta);

    });

    contador.textContent = `${lista.length} Pokémon encontrados`;
}


// ==========================================
// 5. ADAPTAR DATOS DE LA API
// ==========================================

function adaptarPokemon(data) {

    return {

        nombre: data.name,

        imagen:
            data.sprites?.other?.["official-artwork"]?.front_default
            ?? data.sprites?.front_default
            ?? "https://via.placeholder.com/96?text=?",

        tipos: data.types.map(t => t.type.name)

    };
}


// ==========================================
// 6. OBTENER UN POKÉMON
// ==========================================

async function obtenerPokemon(nombreONumero) {

    const identificador = String(nombreONumero).toLowerCase();

    // Comprobar si ya tenemos el Pokémon guardado
    if (cachePokemon.has(identificador)) {
        return cachePokemon.get(identificador);
    }

    const respuesta = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${identificador}`
    );

    if (!respuesta.ok) {
        throw new Error("Pokémon no encontrado");
    }

    const datos = await respuesta.json();

    const pokemon = adaptarPokemon(datos);

    // Guardar en caché por nombre y número
    cachePokemon.set(pokemon.nombre, pokemon);
    cachePokemon.set(String(datos.id), pokemon);

    return pokemon;
}


// ==========================================
// 7. CARGAR TODOS LOS NOMBRES DISPONIBLES
// ==========================================

async function cargarNombres() {

    const respuesta = await fetch(
        "https://pokeapi.co/api/v2/pokemon?limit=2000"
    );

    if (!respuesta.ok) {
        throw new Error("No se pudieron cargar los nombres");
    }

    const datos = await respuesta.json();

    todosLosNombres = datos.results.map(function(pokemon) {
        return pokemon.name;
    });
}


// ==========================================
// 8. CARGAR POKÉDEX INICIAL
// ==========================================

async function cargarPokedex() {

    mostrarSpinner();

    try {

        const resultados = await Promise.all([

            Promise.all(
                nombresIniciales.map(obtenerPokemon)
            ),

            cargarNombres()

        ]);

        pokedex = resultados[0];

        // No reemplazar los resultados de una búsqueda
        if (buscador.value.trim() === "") {
            render(pokedex);
        }

    } catch (error) {

        console.error(error);

        contenedor.innerHTML = `
            <p class="col-span-full text-center text-red-500">
                No se pudo cargar la Pokédex.
                Revisa tu conexión a Internet.
            </p>
        `;

    } finally {

        ocultarSpinner();

    }
}


// ==========================================
// 9. BUSCADOR DE POKÉMON
// ==========================================

buscador.addEventListener("input", function() {

    clearTimeout(temporizador);

    const textoBuscado = buscador.value.trim().toLowerCase();

    // Generar identificador para esta búsqueda
    const numeroSolicitud = ++solicitudActual;

    // Si el campo está vacío, regresar al inicio
    if (textoBuscado === "") {

        ocultarSpinner();
        render(pokedex);
        return;
    }

    // Esperar un poco antes de buscar
    temporizador = setTimeout(async function() {

        mostrarSpinner();

        try {

            // Esperar a que termine de cargar la lista de nombres
            if (todosLosNombres.length === 0) {
                await cargarNombres();
            }

            // Verificar que siga siendo la búsqueda actual
            if (numeroSolicitud !== solicitudActual) return;

            let resultados;

            // Buscar por número
            if (/^\d+$/.test(textoBuscado)) {

                const pokemon = await obtenerPokemon(textoBuscado);

                resultados = [pokemon];

            } else {

                // Buscar coincidencias parciales por nombre
                const coincidencias = todosLosNombres.filter(
                    function(nombre) {
                        return nombre.includes(textoBuscado);
                    }
                );

                // Limitar resultados para evitar demasiadas consultas
                const primerosDoce = coincidencias.slice(0, 12);

                resultados = await Promise.all(
                    primerosDoce.map(obtenerPokemon)
                );

            }

            if (numeroSolicitud !== solicitudActual) return;

            render(resultados);

        } catch (error) {

            if (numeroSolicitud !== solicitudActual) return;

            render([]);

        } finally {

            if (numeroSolicitud === solicitudActual) {
                ocultarSpinner();
            }

        }

    }, 400);

});


// ==========================================
// 10. INICIAR APLICACIÓN
// ==========================================

cargarPokedex();
