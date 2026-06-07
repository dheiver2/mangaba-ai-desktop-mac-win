<div align="center">
  <img src="static/mangaba-logo.svg" alt="Mangaba AI" width="120" />

  # Mangaba AI — Desktop

  **Assistente de IA 100% local para Mac e Windows.**
  Chat com modelos de linguagem rodando na sua máquina, sem nuvem, sem enviar dados para fora.

  <sub>Construído sobre o <a href="https://github.com/open-webui/open-webui">Open WebUI</a> · Motor de IA: <a href="https://ollama.com">Ollama</a> + Gemma 4</sub>
</div>

---

## ✨ Visão geral

O **Mangaba AI** é um aplicativo desktop nativo (Electron / Tauri) que oferece uma
interface de chat com IA totalmente offline. Toda a inferência roda localmente via
**Ollama**, usando o modelo **Gemma 4 edge** (quantizado, otimizado para rodar on-device).

- 🔒 **Privacidade total** — nenhum dado sai da máquina, nenhuma conexão externa
- 🥭 **Identidade Mangaba** — logo e tema visual aplicados em todas as telas
- 🇧🇷 **Português do Brasil** como idioma padrão
- 💻 **Mac e Windows** — instaladores `.dmg` e `.exe`
- 🧠 **Somente Ollama** — OpenAI e conexões externas desabilitadas por padrão

---

## 🚀 Início rápido (macOS)

```bash
# 1. Instalar o Ollama (motor de IA local)
brew install ollama

# 2. Iniciar tudo com um comando só
#    (sobe Ollama, baixa o Gemma 4, backend, frontend e abre a janela desktop)
./start-desktop.sh
```

O script `start-desktop.sh` cuida de todo o ciclo:

| Etapa | O que faz |
|-------|-----------|
| 0 | Inicia o serviço Ollama e baixa `gemma4:e4b` (só na 1ª vez) |
| 1 | Sobe o backend (FastAPI) na porta **8888** |
| 2 | Sobe o frontend (SvelteKit/Vite) na porta **5173** |
| 3 | Abre a janela desktop (Electron) |
| ⏹ | Ao fechar a janela, encerra backend e frontend |

---

## 🧠 Motor de IA — somente Gemma 4

A inferência é **exclusivamente local** via Ollama. Para usar apenas o Gemma 4,
basta baixar somente esse modelo:

```bash
ollama pull gemma4:e4b
```

### Variantes disponíveis

Edite `MANGABA_MODEL` em [`start-desktop.sh`](start-desktop.sh) para trocar:

| Modelo          | Tamanho | Indicação                    |
|-----------------|---------|------------------------------|
| `gemma4:e2b`    | 7.2 GB  | Máquinas mais leves          |
| `gemma4:e4b` ✅ | 9.6 GB  | **Padrão — edge, equilíbrio** |
| `gemma4:12b`    | 7.6 GB  | Mais qualidade               |
| `gemma4:26b`    | 18 GB   | MoE, alta qualidade          |

Como o OpenAI está desativado, **apenas os modelos baixados no Ollama aparecem** no app.

---

## 🏗️ Estrutura do projeto

```
mangaba-ai-desktop-mac-win/
├── electron/              # Wrapper desktop (Electron)
│   ├── main.cjs           #   processo principal + menu PT-BR + tray
│   └── preload.cjs        #   bridge segura renderer-main
├── src-tauri/             # Wrapper desktop alternativo (Tauri — requer Rust)
│   ├── tauri.conf.json
│   ├── Cargo.toml
│   └── src/{main,lib}.rs
├── scripts/
│   └── gen-logos.js       # Gera todos os PNGs do logo a partir do SVG
├── src/                   # Frontend SvelteKit (rebrandizado)
├── backend/               # Backend FastAPI (open_webui) — Ollama-only
├── static/                # Assets do frontend (logo, favicons, splash)
│   ├── mangaba-logo.svg   #   logo oficial
│   └── themes/mangaba.css #   tema de cores Mangaba
├── start-desktop.sh       # Inicia tudo com um comando
└── DESKTOP_SETUP.md       # Guia detalhado de build e instaladores
```

---

## 📦 Gerar instaladores

### Electron (recomendado — funciona sem Rust)

```bash
npm install --save-dev electron@29 electron-builder@24 --force

npm run electron:build:mac    # -> dist-electron/*.dmg
npm run electron:build:win    # -> dist-electron/*.exe
npm run electron:build:linux  # -> dist-electron/*.AppImage
```

### Tauri (bundle menor — requer Rust)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
npm install --save-dev @tauri-apps/cli@latest
npm run tauri build
```

Detalhes completos em [DESKTOP_SETUP.md](DESKTOP_SETUP.md).

---

## 🎨 Identidade visual

| Token               | Cor       | Uso              |
|---------------------|-----------|------------------|
| `--mangaba-primary` | `#FF7A1A` | Botões, destaques |
| `--mangaba-accent`  | `#E94A12` | Hover, alertas   |
| `--mangaba-green`   | `#689924` | Sucesso, tags    |
| `--mangaba-cream`   | `#FFFCF0` | Fundo claro      |
| `--mangaba-dark`    | `#403731` | Texto principal  |

Para regenerar os logos após editar o SVG:

```bash
node scripts/gen-logos.js
```

---

## 🛠️ Pré-requisitos

- **Node.js** 18–22
- **Python** 3.11
- **Ollama** (com `gemma4:e4b`)

---

## 📄 Licença

Baseado no [Open WebUI](https://github.com/open-webui/open-webui) (licença original mantida em [LICENSE](LICENSE)).
Rebranding e adaptação desktop por Mangaba AI.
