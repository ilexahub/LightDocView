import * as XLSX from "xlsx";
import fs from "fs";

const xlsx = XLSX.read(fs.readFileSync("samples/sample.xlsx"));
console.log("xlsx sheets", xlsx.SheetNames.join(","));
console.log(
  "xlsx first",
  JSON.stringify(
    XLSX.utils.sheet_to_json(xlsx.Sheets[xlsx.SheetNames[0]], { header: 1 }),
  ),
);

const xls = XLSX.read(fs.readFileSync("samples/sample.xls"));
console.log("xls sheets", xls.SheetNames.join(","));
console.log(
  "xls first",
  JSON.stringify(
    XLSX.utils.sheet_to_json(xls.Sheets[xls.SheetNames[0]], { header: 1 }),
  ),
);

const docx = fs.readFileSync("samples/sample.docx");
console.log("docx zip", docx[0] === 0x50 && docx[1] === 0x4b, "bytes", docx.length);

const html = await fetch("http://localhost:1420/").then((r) => r.text());
const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
console.log("html title", title);
console.log("has open", html.includes("Открыть"));
console.log("has main", html.includes("src/main.ts"));
