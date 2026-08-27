import path from "path";
import { createRequire } from "module";
import { homedir } from "os";

const require = createRequire(
  path.join(process.env.TEMP || path.join(homedir(), "AppData/Local/Temp"), "vdxx-puppeteer/package.json"),
);
const puppeteer = require("puppeteer-core");

const chrome =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const root = path.resolve("samples");

async function openWithPicker(page, filePath) {
  const name = path.basename(filePath);
  const [chooser] = await Promise.all([
    page.waitForFileChooser(),
    page.click("#btn-open"),
  ]);
  await chooser.accept([filePath]);
  await page.waitForFunction(
    (expected) => document.querySelector("#file-name")?.textContent === expected,
    { timeout: 15000 },
    name,
  );
  await page.waitForFunction(
    () => document.querySelector("#status")?.hidden,
    { timeout: 15000 },
  );
  await page.waitForFunction(
    () => {
      const viewer = document.querySelector("#viewer");
      const error = document.querySelector("#error");
      return (viewer && !viewer.hidden && (viewer.textContent || "").trim().length > 0) || (error && !error.hidden);
    },
    { timeout: 15000 },
  );
}

async function snapshot(page) {
  return page.evaluate(() => ({
    fileName: document.querySelector("#file-name")?.textContent,
    empty: document.querySelector("#empty")?.hidden,
    error: document.querySelector("#error")?.hidden
      ? null
      : document.querySelector("#error")?.textContent,
    viewerHidden: document.querySelector("#viewer")?.hidden,
    viewerText: (document.querySelector("#viewer")?.innerText || "").slice(0, 400),
    sheets: [...document.querySelectorAll(".sheet-btn")].map((el) => el.textContent),
    printDisabled: document.querySelector("#btn-print")?.disabled,
  }));
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
page.on("pageerror", (err) => console.log("pageerror", err.message));
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("console", msg.text());
});
await page.goto("http://localhost:1420/", { waitUntil: "networkidle0" });
console.log("empty", JSON.stringify(await snapshot(page)));

await openWithPicker(page, path.join(root, "sample.docx"));
console.log("docx", JSON.stringify(await snapshot(page)));

await openWithPicker(page, path.join(root, "sample.xlsx"));
console.log("xlsx", JSON.stringify(await snapshot(page)));
await page.waitForFunction(
  () => [...document.querySelectorAll(".sheet-btn")].some((el) => el.textContent === "Итог"),
);
await page.evaluate(() => {
  const btn = [...document.querySelectorAll(".sheet-btn")].find((el) => el.textContent === "Итог");
  btn?.click();
});
await page.waitForFunction(
  () => (document.querySelector("#viewer")?.innerText || "").includes("42"),
);
console.log("xlsx-sheet2", JSON.stringify(await snapshot(page)));

await openWithPicker(page, path.join(root, "sample.xls"));
console.log("xls", JSON.stringify(await snapshot(page)));

const badDoc = path.join(root, "bad.doc");
await import("fs").then((fs) => fs.writeFileSync(badDoc, "not-a-word-file"));
await openWithPicker(page, badDoc);
console.log("bad-doc", JSON.stringify(await snapshot(page)));

await browser.close();
