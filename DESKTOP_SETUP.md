# Mangaba AI — Desktop App (Mac & Windows)

Interface de chat com IA baseada no Mangaba AI, com identidade visual Mangaba AI.

## Opção 1: Electron (recomendado — funciona agora)

### Pré-requisitos
- Node.js 18+
- Python 3.11+

### Instalar dependências desktop

```bash
npm install --save-dev electron electron-builder
```

### Rodar em modo desenvolvimento

```bash
# Terminal 1 — inicia o backend Python
cd backend
pip install -r requirements.txt -U
uvicorn open_webui.main:app --host 0.0.0.0 --port 8080

# Terminal 2 — inicia o frontend SvelteKit
npm install
npm run dev

# Terminal 3 — abre a janela Electron
npm run electron:dev
```

### Gerar instalador

```bash
npm install --save-dev electron electron-builder

# macOS (.dmg universal — Intel + Apple Silicon)
npm run electron:build:mac

# Windows (.exe instalador NSIS)
npm run electron:build:win

# Linux (.AppImage)
npm run electron:build:linux
```

Os instaladores ficam em `dist-electron/`.

---

## Opção 2: Tauri (bundle menor — requer Rust)

### Instalar Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Instalar Tauri CLI

```bash
npm install --save-dev @tauri-apps/cli@latest
```

### Rodar em modo desenvolvimento

```bash
npm run tauri dev
```

### Gerar instalador

```bash
npm run tauri build
# macOS: src-tauri/target/release/bundle/dmg/
# Windows: src-tauri/target/release/bundle/nsis/
```

---

## Identidade Visual

| Token            | Valor     | Uso                        |
|------------------|-----------|----------------------------|
| `--mangaba-primary` | `#FF7A1A` | Botões, destaques          |
| `--mangaba-accent`  | `#E94A12` | Hover, alertas             |
| `--mangaba-green`   | `#689924` | Sucesso, tags              |
| `--mangaba-cream`   | `#FFFCF0` | Fundo claro                |
| `--mangaba-dark`    | `#403731` | Texto principal            |

Tema disponível em `static/themes/mangaba.css`.

---

## Estrutura adicionada

```
mangaba-ai/
├── electron/
│   ├── main.js          # processo principal Electron
│   └── preload.js       # bridge segura renderer↔main
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── main.rs
│       └── lib.rs
└── static/
    ├── mangaba-logo.svg  # logo oficial
    └── themes/
        └── mangaba.css   # tema de cores
```
