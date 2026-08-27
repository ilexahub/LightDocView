# Просмотрщик DOCX / XLSX

Лёгкое оконное приложение Windows: открывает `.docx`, `.xlsx`, `.xls` и пытается вытащить текст из старого `.doc`. Microsoft Office не нужен. Файлы никуда не отправляются.

## Запуск

Нужны Node.js, Rust и Microsoft C++ Build Tools (стандартный набор для Tauri на Windows). Если `tauri build` ругается на `link.exe` / MSVC, поставьте [Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) с рабочей нагрузкой «Desktop development with C++».

```bat
npm install
npm run tauri dev
```

Сборка установщика NSIS и `exe` (нужен MSVC; удобный скрипт подхватывает Build Tools):

```bat
scripts\tauri-build.bat
```

или, из «Developer Command Prompt for VS»:

```bat
npm run tauri build
```

Готовые файлы:

- portable: `src-tauri/target/release/viewdocx-xlsx.exe`
- установщик: `src-tauri/target/release/bundle/nsis/`

Установщик регистрирует ассоциации `.docx` / `.xlsx` / `.xls` / `.doc`. Portable-версию можно копировать на флешку и открывать файлы через «Открыть с помощью».

Предпросмотр интерфейса в браузере без окна Tauri:

```bat
npm run dev
```

На чужой машине нужен WebView2 — он уже стоит в Windows 11 и почти везде на Windows 10.

Это просмотр, не редактор. Сложная вёрстка Word, графики Excel и макросы не воспроизводятся один в один.
