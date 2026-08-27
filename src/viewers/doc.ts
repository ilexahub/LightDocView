import * as XLSX from "xlsx";

const CYR_START = 0x0400;
const CYR_END = 0x04ff;

const CP1251: Record<number, string> = {};
for (let i = 0; i < 128; i += 1) {
  CP1251[i] = String.fromCharCode(i);
}
const highMap =
  "ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏђ‘’“”•–—\u02dc™љ›њќћџ\u00a0ЎўЈ¤Ґ¦§Ё©Є«¬\u00ad®Ї°±Ііґµ¶·ё№є»јЅѕїАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя";
for (let i = 0; i < 128; i += 1) {
  CP1251[128 + i] = highMap[i] ?? "";
}

function asBytes(content: unknown): Uint8Array {
  if (content instanceof Uint8Array) return content;
  if (ArrayBuffer.isView(content)) {
    const view = content as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }
  if (Array.isArray(content)) return Uint8Array.from(content);
  throw new Error("Не удалось прочитать поток документа.");
}

function isTextChar(code: number): boolean {
  return (
    code === 9 ||
    code === 10 ||
    code === 13 ||
    (code >= 32 && code <= 126) ||
    (code >= CYR_START && code <= CYR_END) ||
    code === 0xa0
  );
}

function utf16Runs(bytes: Uint8Array): string[] {
  const runs: string[] = [];
  let current = "";
  const limit = bytes.length - (bytes.length % 2);
  for (let i = 0; i < limit; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    if (isTextChar(code)) {
      current += code === 13 ? "" : code === 10 ? "\n" : String.fromCharCode(code);
    } else if (current.length >= 4) {
      runs.push(current.trim());
      current = "";
    } else {
      current = "";
    }
  }
  if (current.length >= 4) runs.push(current.trim());
  return runs.filter(Boolean);
}

function cp1251Runs(bytes: Uint8Array): string[] {
  const runs: string[] = [];
  let current = "";
  for (const byte of bytes) {
    const ch =
      byte === 13
        ? ""
        : byte === 10
          ? "\n"
          : byte === 9 || (byte >= 32 && byte !== 127)
            ? (CP1251[byte] ?? "")
            : "";
    if (ch) {
      current += ch;
    } else if (current.length >= 8) {
      runs.push(current.trim());
      current = "";
    } else {
      current = "";
    }
  }
  if (current.length >= 8) runs.push(current.trim());
  return runs.filter(Boolean);
}

function letterScore(text: string): number {
  let n = 0;
  for (const ch of text) {
    if (/[0-9A-Za-zА-Яа-яЁё]/.test(ch)) n += 1;
  }
  return n;
}

function cleanup(parts: string[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const part of parts) {
    const normalized = part.replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (normalized.length < 4 || seen.has(normalized)) continue;
    seen.add(normalized);
    lines.push(normalized);
  }
  return lines.join("\n\n").trim();
}

export function extractDocText(data: ArrayBuffer): string {
  let cfb: ReturnType<typeof XLSX.CFB.read>;
  try {
    cfb = XLSX.CFB.read(new Uint8Array(data), { type: "array" });
  } catch {
    throw new Error(
      "Это не похоже на файл Word 97–2003. Сохраните документ как .docx и откройте снова.",
    );
  }
  const word = XLSX.CFB.find(cfb, "WordDocument");
  if (!word?.content) {
    throw new Error(
      "Это не похоже на файл Word 97–2003. Сохраните документ как .docx и откройте снова.",
    );
  }

  const bytes = asBytes(word.content);
  if (bytes.length < 32) {
    throw new Error("Файл .doc повреждён или пуст.");
  }

  const magic = bytes[0] | (bytes[1] << 8);
  if (magic !== 0xa5ec && magic !== 0xa5dc) {
    throw new Error(
      "Неизвестный формат .doc. Попробуйте сохранить файл как .docx.",
    );
  }

  const flags = bytes[10] | (bytes[11] << 8);
  if (flags & 0x0100) {
    throw new Error("Документ защищён паролем — открыть его нельзя.");
  }

  const tableName = flags & 0x0200 ? "1Table" : "0Table";
  const streams = [bytes];
  const table = XLSX.CFB.find(cfb, tableName);
  if (table?.content) streams.push(asBytes(table.content));

  const unicode = cleanup(streams.flatMap(utf16Runs));
  const ansi = cleanup(streams.flatMap(cp1251Runs));
  const text =
    letterScore(unicode) >= letterScore(ansi) ? unicode : ansi;

  if (text.replace(/\s+/g, "").length < 8) {
    throw new Error(
      "Текст из .doc извлечь не удалось. Старый формат Word без Office почти не читается — сохраните файл как .docx.",
    );
  }

  return text;
}

export function renderDocText(text: string, container: HTMLElement): void {
  const banner = document.createElement("div");
  banner.className = "doc-banner";
  banner.textContent =
    "Старый формат .doc: показан извлечённый текст, без вёрстки, картинок и таблиц Word.";

  const pre = document.createElement("pre");
  pre.className = "doc-text";
  pre.textContent = text;

  container.replaceChildren(banner, pre);
}
