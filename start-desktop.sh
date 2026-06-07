#!/bin/bash
# Mangaba AI — Inicia backend + Vite (frontend rebrandizado) + janela desktop
set -e

PROJ="/Users/dheiver/Projetos/mangaba-ai-desktop-mac-win"
NODE_BIN="/Users/dheiver/.nvm/versions/node/v20.20.2/bin"
PYENV="$HOME/.pyenv/bin/pyenv"
export PATH="$NODE_BIN:$PATH"

# Modelo padrão: Gemma 4 edge quantizado (on-device) via Ollama
# Variantes: gemma4:e2b (7.2GB, mais leve) | gemma4:e4b (9.6GB, equilíbrio)
MANGABA_MODEL="gemma4:e4b"

cd "$PROJ"

echo "🥭 Mangaba AI — iniciando..."

# Libera portas se ocupadas (8888 = backend Mangaba, 5173 = frontend)
lsof -ti:8888 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# 0) Ollama — garante apenas que o modelo está baixado.
# O CICLO DE VIDA do Ollama (ligar ao abrir / desligar ao fechar) é controlado
# pelo PRÓPRIO app de chat (electron/main.cjs). Por isso aqui NÃO deixamos um
# 'ollama serve' rodando: se precisarmos baixar o modelo, subimos um serve
# TEMPORÁRIO e o encerramos em seguida, deixando o app ser o dono do Ollama.
if command -v ollama >/dev/null 2>&1; then
  if ! ollama list 2>/dev/null | grep -q "$MANGABA_MODEL"; then
    echo "→ Modelo $MANGABA_MODEL ausente. Baixando (só na 1ª vez)..."
    TEMP_OLLAMA=""
    if ! curl -s -o /dev/null http://127.0.0.1:11434/api/tags 2>/dev/null; then
      ollama serve > /tmp/mangaba-ollama.log 2>&1 &
      TEMP_OLLAMA=$!
      until curl -s -o /dev/null http://127.0.0.1:11434/api/tags 2>/dev/null; do sleep 1; done
    fi
    ollama pull "$MANGABA_MODEL"
    # Encerra o serve temporário — o app vai iniciar o seu próprio
    [ -n "$TEMP_OLLAMA" ] && kill "$TEMP_OLLAMA" 2>/dev/null || true
  fi
  echo "✓ Modelo $MANGABA_MODEL disponível (o app gerencia o Ollama)"
else
  echo "⚠️  Ollama não instalado. Instale com: brew install ollama"
  echo "    Depois rode: ollama pull $MANGABA_MODEL"
fi

# 1) Backend (API) — porta 8888, rodando NOSSO backend rebrandizado
# (PYTHONPATH=backend garante que importa o nosso open_webui, não o do pip)
echo "→ Iniciando backend Mangaba AI (porta 8888)..."
cd "$PROJ/backend"
WEBUI_SECRET_KEY=mangaba-secret-key-2024 \
WEBUI_NAME="Mangaba AI" \
RAG_EMBEDDING_ENGINE=ollama \
CORS_ALLOW_ORIGIN="*" \
ENABLE_OLLAMA_API=true \
ENABLE_OPENAI_API=false \
ENABLE_DIRECT_CONNECTIONS=false \
OLLAMA_BASE_URL="http://127.0.0.1:11434" \
DEFAULT_MODELS="$MANGABA_MODEL" \
PYTHONPATH="$PROJ/backend" \
PYENV_VERSION=3.11.9 "$PYENV" exec python -m uvicorn open_webui.main:app --host 0.0.0.0 --port 8888 > /tmp/mangaba-backend.log 2>&1 &
BACKEND_PID=$!
cd "$PROJ"

# 2) Frontend Vite (com a identidade Mangaba AI)
echo "→ Iniciando frontend Mangaba AI (porta 5173)..."
./node_modules/.bin/vite dev --port 5173 --host > /tmp/mangaba-frontend.log 2>&1 &
FRONTEND_PID=$!

# Encerra tudo ao sair
trap "echo '🛑 Encerrando...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT

# Aguarda backend
echo "→ Aguardando backend..."
until curl -s -o /dev/null http://localhost:8888/health 2>/dev/null; do sleep 1; done
echo "✓ Backend pronto!"

# Aguarda frontend
echo "→ Aguardando frontend..."
until curl -s -o /dev/null http://localhost:5173 2>/dev/null; do sleep 1; done
echo "✓ Frontend pronto!"

# 3) Janela desktop apontando para o frontend rebrandizado
# Usa 127.0.0.1 (IPv4) para o location.hostname casar com o backend IPv4
echo "→ Abrindo janela desktop Mangaba AI..."
MANGABA_URL="http://127.0.0.1:5173" NODE_ENV=development ./node_modules/.bin/electron electron/main.cjs
