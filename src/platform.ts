const ALLOWED = new Set(["docx", "xlsx", "xls", "doc"]);

export type OpenedDocument = {
  name: string;
  path?: string;
  data: ArrayBuffer;
};

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function isAllowedFile(name: string): boolean {
  return ALLOWED.has(extensionOf(name));
}

export function toArrayBuffer(data: unknown): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  if (data instanceof Uint8Array) {
    return data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
  }
  if (Array.isArray(data)) {
    return new Uint8Array(data).buffer;
  }
  throw new Error("Не удалось прочитать данные файла.");
}

export async function readPath(path: string): Promise<OpenedDocument> {
  const { invoke } = await import("@tauri-apps/api/core");
  const data = toArrayBuffer(await invoke("read_document", { path }));
  const name = path.split(/[\\/]/).pop() ?? path;
  return { name, path, data };
}

export async function pickFile(): Promise<OpenedDocument | null> {
  if (!isTauri()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [
      {
        name: "Документы",
        extensions: ["docx", "xlsx", "xls", "doc"],
      },
    ],
  });
  if (!selected || Array.isArray(selected)) return null;
  return readPath(selected);
}

export async function launchPaths(): Promise<string[]> {
  if (!isTauri()) return [];
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string[]>("launch_paths");
}

export async function listenFileDrops(
  onDrop: (paths: string[]) => void,
): Promise<void> {
  if (!isTauri()) return;
  const { getCurrentWebview } = await import("@tauri-apps/api/webview");
  await getCurrentWebview().onDragDropEvent((event) => {
    if (event.payload.type === "drop") {
      onDrop(event.payload.paths);
    }
  });
}
