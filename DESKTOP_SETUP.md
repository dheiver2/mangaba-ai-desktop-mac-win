# Mangaba AI — Desktop App (Mac & Windows)

Interface de chat com IA baseada no Mangaba AI, com identidade visual Mangaba AI.

## Motor de IA: Ollama + Gemma 4 edge (quantizado) — gestão TOTAL pelo app

O Mangaba AI roda **100% local** usando o Ollama com o modelo **`gemma4:e4b`**
(Gemma 4 edge, otimizado e quantizado para rodar on-device — ~9.6 GB). Não há
conexões externas; todos os dados ficam na máquina.

**O Ollama é um componente interno do Mangaba AI** — instalação, ciclo de vida
e desinstalação são controlados SOMENTE pelo app de chat
([`electron/ollama-manager.cjs`](electron/ollama-manager.cjs)):

| Evento | O que o app faz |
|--------|-----------------|
| 1ª execução | Baixa e instala o Ollama dentro de `userData/ollama` (sem instalador de sistema) |
| Abrir o app | Inicia o serviço Ollama e garante o modelo `gemma4:e4b` baixado |
| Fechar o app | Encerra o Ollama (se foi o app quem iniciou) |
| Menu **Ollama → Desinstalar** | Remove o binário e TODOS os modelos |
| Desinstalar o app | Como tudo vive em `userData/ollama`, some junto |

> Os modelos ficam em `userData/ollama/models` (via `OLLAMA_MODELS`), então
> não poluem uma instalação de Ollama que você já tenha no sistema, e são
> removidos junto com o app.

Não é necessário instalar o Ollama manualmente — o app cuida de tudo.

### Variantes do Gemma 4 (edite `MANGABA_MODEL` no start-desktop.sh)

| Modelo          | Tamanho | Uso                        |
|-----------------|---------|----------------------------|
| `gemma4:e2b`    | 7.2 GB  | Máquinas mais leves        |
| `gemma4:e4b` ✅ | 9.6 GB  | **Padrão — edge equilíbrio** |
| `gemma4:12b`    | 7.6 GB  | Mais qualidade             |
| `gemma4:26b`    | 18 GB   | MoE, alta qualidade        |

### Pré-requisitos
- Node.js 18+
- Python 3.11+
- Ollama (com `gemma4:e4b`)

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
| `--mangaba-primary` | `#FF9C24` | Botões, destaques          |
| `--mangaba-accent`  | `#F97518` | Hover, alertas             |
| `--mangaba-green`   | `#689924` | Sucesso, tags              |
| `--mangaba-cream`   | `#FFF8F5` | Fundo claro                |
| `--mangaba-dark`    | `#1E0D01` | Texto principal            |

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
