import * as XLSX from "xlsx";

const INITIAL_ROWS = 4000;
const MORE_ROWS = 2000;

function colLabel(index: number): string {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toLocaleString("ru-RU");
  }
  return String(value);
}

export type WorkbookView = {
  names: string[];
  renderSheet: (name: string, root: HTMLElement) => void;
};

export function openWorkbook(data: ArrayBuffer): WorkbookView {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, {
      type: "array",
      cellDates: true,
    });
  } catch {
    throw new Error("Не удалось разобрать таблицу. Файл повреждён или это не Excel.");
  }
  const names = workbook.SheetNames;
  if (!names.length) {
    throw new Error("В книге нет листов.");
  }

  return {
    names,
    renderSheet(name, root) {
      const sheet = workbook.Sheets[name];
      if (!sheet) {
        throw new Error(`Лист «${name}» не найден.`);
      }
      const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(
        sheet,
        {
          header: 1,
          defval: "",
          raw: false,
          blankrows: true,
        },
      ) as unknown[][];
      renderGrid(root, rows);
    },
  };
}

function renderGrid(root: HTMLElement, rows: unknown[][]): void {
  root.replaceChildren();
  const wrap = document.createElement("div");
  wrap.className = "xlsx-wrap";
  root.append(wrap);

  let shown = Math.min(INITIAL_ROWS, rows.length);
  const table = document.createElement("table");
  table.className = "xlsx-table";
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  table.append(thead, tbody);
  wrap.append(table);

  const more = document.createElement("button");
  more.type = "button";
  more.className = "btn more-rows";

  const paint = () => {
    const slice = rows.slice(0, shown);
    const width = slice.reduce(
      (max, row) => Math.max(max, Array.isArray(row) ? row.length : 0),
      1,
    );

    const headRow = document.createElement("tr");
    const corner = document.createElement("th");
    corner.className = "row-head";
    headRow.append(corner);
    for (let c = 0; c < width; c += 1) {
      const th = document.createElement("th");
      th.textContent = colLabel(c);
      headRow.append(th);
    }
    thead.replaceChildren(headRow);

    const body = document.createDocumentFragment();
    slice.forEach((row, index) => {
      const tr = document.createElement("tr");
      const rh = document.createElement("th");
      rh.className = "row-head";
      rh.textContent = String(index + 1);
      tr.append(rh);
      const cells = Array.isArray(row) ? row : [];
      for (let c = 0; c < width; c += 1) {
        const td = document.createElement("td");
        td.textContent = cellText(cells[c]);
        tr.append(td);
      }
      body.append(tr);
    });
    tbody.replaceChildren(body);

    if (shown < rows.length) {
      more.textContent = `Показать ещё (${shown} из ${rows.length} строк)`;
      more.hidden = false;
      if (!more.isConnected) wrap.append(more);
    } else {
      more.hidden = true;
    }
  };

  more.addEventListener("click", () => {
    shown = Math.min(rows.length, shown + MORE_ROWS);
    paint();
  });

  paint();
}
