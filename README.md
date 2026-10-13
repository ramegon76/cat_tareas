# Catálogo de Tareas PPI

Visor web del Catálogo de Tareas para apoyar el diseño de flujos de trabajo. La aplicación permite navegar la jerarquía **Fase → Actividad → Procedimiento → Tarea**, buscar por clave o nombre y copiar tareas.

## Estructura

```text
catalogo-tareas-repo/
├── index.html
├── README.md
├── iniciar_servidor.py
├── iniciar_servidor.bat
├── iniciar_servidor.sh
├── css/estilo.css
├── js/app.js
├── data/catalogo_tareas.json
└── scripts/
    ├── excel_a_json.py
    └── Catálogo_de_tareas.xlsx
```

## Uso rápido en Windows

1. Descomprime el repositorio.
2. Haz doble clic en `iniciar_servidor.bat`.
3. Se abrirá `http://localhost:8000` en el navegador.
4. Para detenerlo, cierra la ventana de comandos o pulsa `Ctrl+C`.

## Uso desde terminal

```bash
python iniciar_servidor.py
```

Después abre `http://localhost:8000`.

> No abras `index.html` directamente si utilizas la versión modular. Los navegadores suelen bloquear la lectura de `data/catalogo_tareas.json` desde el esquema `file://`. El servidor local evita esa restricción y no genera un EXE.

## Funcionalidades

- Árbol jerárquico del catálogo.
- Búsqueda por clave o nombre en todos los niveles.
- Expansión y contracción completa.
- Detalle de la tarea y ruta jerárquica.
- Copia de clave, nombre o ambos.
- Apertura por parámetro, por ejemplo: `http://localhost:8000/?tarea=5.2.1.1`.

## Actualizar el catálogo

1. Sustituye `scripts/Catálogo_de_tareas.xlsx` por una versión nueva con la misma estructura.
2. Ejecuta:

```bash
python scripts/excel_a_json.py
```

3. Recarga el navegador.

El conversor utiliza la hoja `Cat_Objetos`, desde la fila 4, con estas columnas:

- E–F: fase.
- G–H: actividad.
- I–J: procedimiento.
- K–L: tarea.

## Separación de responsabilidades

- `data/catalogo_tareas.json`: datos del catálogo.
- `js/app.js`: navegación, búsqueda, selección y copia.
- `css/estilo.css`: presentación visual.
- `index.html`: estructura de la interfaz.
- `scripts/excel_a_json.py`: transformación del Excel a JSON.

## Requisitos

- Navegador moderno.
- Python 3 para servir la versión modular y regenerar el JSON.
- `openpyxl` únicamente para ejecutar el conversor de Excel.

```bash
python -m pip install openpyxl
```

## Alcance

Este repositorio es un prototipo de consulta del catálogo. No ejecuta BPMN ni modifica Visio directamente. La integración con Visio se contempla como evolución posterior.
