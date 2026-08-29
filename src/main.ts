import "./styles.css";
import {
  extensionOf,
  isAllowedFile,
  isTauri,
  launchPaths,
  listenFileDrops,
  pickFile,
  readPath,
  type OpenedDocument,
} from "./platform";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

const fileNameEl = document.querySelector("#file-name") as HTMLElement;
const statusEl = document.querySelector("#status") as HTMLElement;
const sheetsEl = document.querySelector("#sheets") as HTMLElement;
const stageEl = document.querySelector("#stage") as HTMLElement;
const emptyEl = document.querySelector("#empty") as HTMLElement;
const viewerEl = document.querySelector("#viewer") as HTMLElement;
const errorEl = document.querySelector("#error") as HTMLElement;
const fileInput = document.querySelector("#file-input") as HTMLInputElement;
const btnOpen = document.querySelector("#btn-open") as HTMLButtonElement;
const btnPrint = document.querySelector("#btn-print") as HTMLButtonElement;
const btnZoomIn = document.querySelector("#btn-zoom-in") as HTMLButtonElement;
const btnZoomOut = document.querySelector("#btn-zoom-out") as HTMLButtonElement;
const zoomLabel = document.querySelector("#zoom-label") as HTMLElement;

let zoom = 1;
let hasDocument = false;

function setStatus(text: string | null): void {
  if (!text) {
    statusEl.hidden = true;
    statusEl.textContent = "";
    return;
  }
  statusEl.hidden = false;
  statusEl.textContent = text;
}

function setZoom(next: number): void {
  zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next * 10) / 10));
  viewerEl.style.zoom = String(zoom);
  zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  btnZoomIn.disabled = !hasDocument || zoom >= ZOOM_MAX;
  btnZoomOut.disabled = !hasDocument || zoom <= ZOOM_MIN;
}

function showEmpty(): void {
  emptyEl.hidden = false;
  viewerEl.hidden = true;
  errorEl.hidden = true;
  sheetsEl.hidden = true;
  sheetsEl.replaceChildren();
}

function showError(message: string): void {
  emptyEl.hidden = true;
  viewerEl.hidden = true;
  viewerEl.replaceChildren();
  sheetsEl.hidden = true;
  sheetsEl.replaceChildren();
  errorEl.hidden = false;
  errorEl.textContent = message;
  hasDocument = false;
  btnPrint.disabled = true;
  setZoom(1);
}

function showViewer(mode: "docx" | "xlsx" | "doc"): void {
  emptyEl.hidden = true;
  errorEl.hidden = true;
  viewerEl.hidden = false;
  viewerEl.className = `viewer ${mode}-view`;
  hasDocument = true;
  btnPrint.disabled = false;
  setZoom(1);
}

async function openDocument(doc: OpenedDocument): Promise<void> {
  const ext = extensionOf(doc.name);
  if (!isAllowedFile(doc.name)) {
    showError(
      "Формат не поддерживается. Откройте файл .docx, .xlsx, .xls или .doc.",
    );
    return;
  }

  fileNameEl.textContent = doc.name;
  setStatus("Открываю…");
  sheetsEl.hidden = true;
  sheetsEl.replaceChildren();
  viewerEl.replaceChildren();
  errorEl.hidden = true;

  try {
    if (ext === "docx") {
      const { renderDocx } = await import("./viewers/docx");
      showViewer("docx");
      await renderDocx(doc.data, viewerEl);
    } else if (ext === "xlsx" || ext === "xls") {
      const { openWorkbook } = await import("./viewers/xlsx");
      const book = openWorkbook(doc.data);
      showViewer("xlsx");
      sheetsEl.hidden = false;
      const paint = (name: string) => {
        sheetsEl.querySelectorAll(".sheet-btn").forEach((btn) => {
          btn.classList.toggle("active", btn.textContent === name);
        });
        book.renderSheet(name, viewerEl);
      };
      for (const name of book.names) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sheet-btn";
        btn.textContent = name;
        btn.addEventListener("click", () => paint(name));
        sheetsEl.append(btn);
      }
      paint(book.names[0]);
    } else {
      const { extractDocText, renderDocText } = await import("./viewers/doc");
      const text = extractDocText(doc.data);
      showViewer("doc");
      renderDocText(text, viewerEl);
    }
    setStatus(null);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось открыть файл.";
    showError(message);
    setStatus(null);
  }
}

async function openFromPath(path: string): Promise<void> {
  if (!isAllowedFile(path)) {
    showError(
      "Формат не поддерживается. Откройте файл .docx, .xlsx, .xls или .doc.",
    );
    return;
  }
  const doc = await readPath(path);
  await openDocument(doc);
}

async function onOpenClick(): Promise<void> {
  try {
    if (isTauri()) {
      const picked = await pickFile();
      if (picked) await openDocument(picked);
      return;
    }
    fileInput.click();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось открыть файл.";
    showError(message);
  }
}

btnOpen.addEventListener("click", () => {
  void onOpenClick();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (!file) return;
  void file.arrayBuffer().then((data) =>
    openDocument({ name: file.name, data }),
  );
});

btnPrint.addEventListener("click", () => window.print());
btnZoomIn.addEventListener("click", () => setZoom(zoom + ZOOM_STEP));
btnZoomOut.addEventListener("click", () => setZoom(zoom - ZOOM_STEP));

window.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.code === "KeyO") {
    event.preventDefault();
    void onOpenClick();
  }
  if (event.ctrlKey && (event.key === "+" || event.key === "=")) {
    event.preventDefault();
    setZoom(zoom + ZOOM_STEP);
  }
  if (event.ctrlKey && event.key === "-") {
    event.preventDefault();
    setZoom(zoom - ZOOM_STEP);
  }
  if (event.ctrlKey && event.key === "0") {
    event.preventDefault();
    setZoom(1);
  }
});

stageEl.addEventListener("dragover", (event) => {
  event.preventDefault();
  stageEl.classList.add("dragover");
});
stageEl.addEventListener("dragleave", () => {
  stageEl.classList.remove("dragover");
});
stageEl.addEventListener("drop", (event) => {
  event.preventDefault();
  stageEl.classList.remove("dragover");
  const file = event.dataTransfer?.files[0];
  if (!file) return;
  void file.arrayBuffer().then((data) =>
    openDocument({ name: file.name, data }),
  );
});

void listenFileDrops((paths) => {
  const path = paths.find(isAllowedFile) ?? paths[0];
  if (path) void openFromPath(path);
});

void (async () => {
  try {
    const paths = await launchPaths();
    const path = paths.find(isAllowedFile) ?? paths[0];
    if (path) await openFromPath(path);
  } catch {
    // Browser preview has no launch paths.
  }
})();

showEmpty();
setZoom(1);
