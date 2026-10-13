"use strict";

const DATA_URL = "data/catalogo_tareas.json";
const LEVELS = ["fase", "actividad", "procedimiento", "tarea"];

const treeEl = document.getElementById("tree");
const detailEl = document.getElementById("detail");
const searchEl = document.getElementById("search");
const statsEl = document.getElementById("stats");
const toastEl = document.getElementById("toast");
const errorBox = document.getElementById("errorBox");

let catalog = { fases: [] };
let nodes = [];
let selectedId = null;
let toastTimer;

const norm = (value) => (value || "")
  .toString()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;"
}[char]));

const quoteRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nodeId = (level, key) => `${level}:${key}`;
const nodeText = (item) => `${item.clave} ${item.nombre}`.trim();
const contains = (item, query) => norm(nodeText(item)).includes(query);

function makeNode(level, item, ancestors = []) {
  return {
    id: nodeId(level, item.clave),
    level,
    clave: item.clave,
    nombre: item.nombre,
    ancestors,
    path: [...ancestors, { level, clave: item.clave, nombre: item.nombre }]
  };
}

function indexCatalog() {
  nodes = [];

  catalog.fases.forEach((fase) => {
    const fNode = makeNode("fase", fase);
    nodes.push(fNode);

    (fase.actividades || []).forEach((actividad) => {
      const aNode = makeNode("actividad", actividad, fNode.path);
      nodes.push(aNode);

      (actividad.procedimientos || []).forEach((procedimiento) => {
        const pNode = makeNode("procedimiento", procedimiento, aNode.path);
        nodes.push(pNode);

        (procedimiento.tareas || []).forEach((tarea) => {
          nodes.push(makeNode("tarea", tarea, pNode.path));
        });
      });
    });
  });
}

function highlight(value, rawQuery) {
  if (!rawQuery) return esc(value);
  const words = rawQuery.trim().split(/\s+/).filter(Boolean).map(quoteRegExp);
  if (!words.length) return esc(value);
  return esc(value).replace(new RegExp(`(${words.join("|")})`, "gi"), "<mark>$1</mark>");
}

function procedureMatches(procedure, query) {
  return !query || contains(procedure, query) || (procedure.tareas || []).some((task) => contains(task, query));
}

function activityMatches(activity, query) {
  return !query || contains(activity, query) || (activity.procedimientos || []).some((procedure) => procedureMatches(procedure, query));
}

function phaseMatches(phase, query) {
  return !query || contains(phase, query) || (phase.actividades || []).some((activity) => activityMatches(activity, query));
}

function rowMarkup(level, item, rawQuery, expandable = false) {

  const id = nodeId(level, item.clave);
  const isActive = selectedId === id ? " active" : "";
  const label = level.charAt(0).toUpperCase() + level.slice(1);

  return `
    <div class="nodeRow${isActive}" data-node-id="${esc(id)}">

      ${
        expandable
          ? `<span class="chev" aria-hidden="true">›</span>`
          : `<span class="chev" aria-hidden="true"></span>`
      }

      <button
        class="nodeSelect"
        type="button"
        data-select-level="${esc(level)}"
        data-select-key="${esc(item.clave)}"
        aria-label="Seleccionar ${esc(label)} ${esc(item.clave)}">

        <span class="nodeLabel">
          <span class="clave">${highlight(item.clave, rawQuery)}</span>
          ${highlight(item.nombre, rawQuery)}
          <span class="levelTag">${esc(label)}</span>
        </span>

      </button>

      <button
        class="miniCopy"
        type="button"
        data-copy="${esc(nodeText(item))}"
        title="Copiar clave y nombre"
        aria-label="Copiar ${esc(label)} ${esc(item.clave)}">

        ⧉

      </button>

    </div>
  `;
}

function render() {
  const rawQuery = searchEl.value.trim();
  const query = norm(rawQuery);
  let shownTasks = 0;
  const phaseParts = [];

  catalog.fases.forEach((fase) => {
    if (!phaseMatches(fase, query)) return;
    const activityParts = [];

    (fase.actividades || []).forEach((actividad) => {
      if (!activityMatches(actividad, query)) return;
      const procedureParts = [];

      (actividad.procedimientos || []).forEach((procedimiento) => {
        if (!procedureMatches(procedimiento, query)) return;
        const tasks = (procedimiento.tareas || []).filter((tarea) =>
          !query || contains(tarea, query) || contains(procedimiento, query) || contains(actividad, query) || contains(fase, query)
        );
        shownTasks += tasks.length;

        procedureParts.push(`
          <details ${query ? "open" : ""}>
            <summary>${rowMarkup("procedimiento", procedimiento, rawQuery, true)}</summary>
            <div class="children">
              ${tasks.map((tarea) => rowMarkup("tarea", tarea, rawQuery, false)).join("")}
            </div>
          </details>`);
      });

      activityParts.push(`
        <details ${query ? "open" : ""}>
          <summary>${rowMarkup("actividad", actividad, rawQuery, true)}</summary>
          <div class="children">${procedureParts.join("")}</div>
        </details>`);
    });

    phaseParts.push(`
      <details ${query ? "open" : ""}>
        <summary>${rowMarkup("fase", fase, rawQuery, true)}</summary>
        <div class="children">${activityParts.join("")}</div>
      </details>`);
  });

  treeEl.innerHTML = phaseParts.join("") || '<div class="empty">No se encontraron coincidencias.</div>';
  const totalTasks = nodes.filter((node) => node.level === "tarea").length;
  statsEl.textContent = query ? `${shownTasks} tarea(s) encontrada(s)` : `${totalTasks} tareas`;
}

function findNode(level, key) {
  return nodes.find((node) => node.level === level && String(node.clave) === String(key));
}

function deepLink(node) {
  const url = new URL(window.location.href);
  LEVELS.forEach((level) => url.searchParams.delete(level));
  url.searchParams.set(node.level, node.clave);
  url.hash = "";
  return url.toString();
}

function selectNode(level, key, options = {}) {
  const item = findNode(level, key);
  if (!item) return false;

  selectedId = item.id;
  const both = `${item.clave} ${item.nombre}`;
  const path = item.path.map((part) => `${part.clave} ${part.nombre}`).join(" › ");
  const link = deepLink(item);
  const label = item.level.charAt(0).toUpperCase() + item.level.slice(1);

  detailEl.classList.remove("emptyDetail");
  detailEl.innerHTML = `
    <div class="eyebrow">${esc(label)}</div>
    <div id="detailKey">${esc(item.clave)}</div>
    <p id="detailName">${esc(item.nombre)}</p>
    <div id="breadcrumb">${esc(path)}</div>
    <div class="copyGrid">
      <button class="btn" type="button" data-copy="${esc(item.clave)}">Copiar clave</button>
      <button class="btn" type="button" data-copy="${esc(item.nombre)}">Copiar nombre</button>
      <button class="btn primary" type="button" data-copy="${esc(both)}">Copiar clave + nombre</button>
      <button class="btn secondary" type="button" data-copy="${esc(link)}">Copiar enlace</button>
    </div>
    <div class="deepLink"><strong>Enlace directo:</strong><br>${esc(link)}</div>`;

  if (options.updateUrl !== false) {
    const nextUrl = new URL(window.location.href);
    LEVELS.forEach((name) => nextUrl.searchParams.delete(name));
    nextUrl.searchParams.set(item.level, item.clave);
    history.replaceState(null, "", nextUrl);
  }

  if (options.setSearch) searchEl.value = item.clave;
  render();
  return true;
}

async function copyText(text) {
  let copied = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch (_) {}

  if (!copied) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    try { copied = document.execCommand("copy"); } catch (_) {}
    textArea.remove();
  }

  showToast(copied ? "Copiado al portapapeles" : "No se pudo copiar automáticamente");
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1700);
}

function selectFromUrl() {
  const params = new URLSearchParams(window.location.search);
  for (const level of [...LEVELS].reverse()) {
    const key = params.get(level);
    if (key && selectNode(level, key, { updateUrl: false, setSearch: true })) return;
  }
}

async function init() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    catalog = await response.json();
    indexCatalog();
    render();
    selectFromUrl();
  } catch (error) {
    treeEl.innerHTML = '<div class="empty">No se pudo cargar el catálogo.</div>';
    errorBox.classList.remove("hidden");
    errorBox.innerHTML = `<strong>No se pudo leer <code>${esc(DATA_URL)}</code>.</strong><br>Comprueba que el archivo exista y que GitHub Pages haya terminado de publicar los cambios.<br><small>Detalle: ${esc(error.message)}</small>`;
  }
}

document.addEventListener("click", (event) => {
  const copyButton = event.target.closest("[data-copy]");
  if (copyButton) {
    event.preventDefault();
    event.stopPropagation();
    copyText(copyButton.dataset.copy);
    return;
  }

  const selectButton = event.target.closest("[data-select-level][data-select-key]");
  if (selectButton) {
    event.preventDefault();
    event.stopPropagation();
    selectNode(selectButton.dataset.selectLevel, selectButton.dataset.selectKey);
  }
});

searchEl.addEventListener("input", render);
document.getElementById("expandAll").addEventListener("click", () => document.querySelectorAll("#tree details").forEach((detail) => { detail.open = true; }));
document.getElementById("collapseAll").addEventListener("click", () => document.querySelectorAll("#tree details").forEach((detail) => { detail.open = false; }));

init();
