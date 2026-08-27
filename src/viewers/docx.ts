import { renderAsync } from "docx-preview";

export async function renderDocx(
  data: ArrayBuffer,
  container: HTMLElement,
): Promise<void> {
  container.replaceChildren();
  await renderAsync(data, container, undefined, {
    className: "docx",
    inWrapper: true,
    ignoreWidth: false,
    ignoreHeight: false,
    breakPages: true,
    experimental: true,
    useBase64URL: true,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    renderEndnotes: true,
  });
}
