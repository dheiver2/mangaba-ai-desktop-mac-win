#!/bin/bash
# Publica o release do Mangaba AI no GitHub: atualiza descrição (PT-BR) e
# anexa o instalador .dmg. Usa a SUA própria credencial do git (keychain).
#
# Uso:  ./publicar-release.sh
set -e

REPO="dheiver2/mangaba-ai-desktop-mac-win"
TAG="v0.9.6"
DMG="$HOME/Desktop/Mangaba AI.dmg"
API="https://api.github.com/repos/$REPO"
UPLOADS="https://uploads.github.com/repos/$REPO"

echo "🥭 Publicando Mangaba AI $TAG no GitHub..."

# 1) Pega o token do git (sua credencial local do GitHub)
TOKEN=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null | sed -n 's/^password=//p')
if [ -z "$TOKEN" ]; then
  echo "✗ Não encontrei sua credencial do GitHub no keychain."
  echo "  Faça um 'git push' uma vez para salvá-la, ou rode: gh auth login"
  exit 1
fi
AUTH="Authorization: token $TOKEN"

# 2) Verifica o .dmg
if [ ! -f "$DMG" ]; then
  echo "✗ Instalador não encontrado em: $DMG"
  exit 1
fi
echo "→ Instalador: $(du -h "$DMG" | cut -f1)"

# 3) Descrição do release em PT-BR
read -r -d '' BODY <<'EOF' || true
## Mangaba AI 0.9.6 — Desktop (macOS Apple Silicon)

Assistente de IA 100% local. Baixe, cadastre e use — simples, prático e privado.

### Como usar
1. Baixe o **Mangaba AI.dmg** abaixo
2. Abra o .dmg e arraste o **Mangaba AI** para a pasta Aplicativos
3. Abra o app (na 1ª vez: clique com o botão direito → Abrir)
4. Crie sua conta (cadastro local) e comece a conversar

### O que vem incluído
- ✅ Tudo embutido — não precisa instalar Python nem Ollama
- ✅ Na 1ª execução, baixa o modelo Gemma 4 automaticamente (~9.6 GB)
- ✅ IA roda 100% offline na sua máquina, sem enviar dados para fora
- ✅ Interface em português do Brasil

> Requer macOS Apple Silicon (M1/M2/M3). Download de ~1,2 GB.
EOF

# 4) Pega o ID do release pela tag
echo "→ Buscando release $TAG..."
RELEASE_ID=$(curl -s -H "$AUTH" "$API/releases/tags/$TAG" | sed -n 's/^  "id": \([0-9]*\),/\1/p' | head -1)
if [ -z "$RELEASE_ID" ]; then
  echo "✗ Release $TAG não encontrado."
  exit 1
fi
echo "  release id: $RELEASE_ID"

# 5) Atualiza nome + descrição (PT-BR)
echo "→ Atualizando descrição (PT-BR)..."
python3 - "$RELEASE_ID" "$BODY" <<PYEOF
import json, sys, urllib.request
rid, body = sys.argv[1], sys.argv[2]
data = json.dumps({"name": "Mangaba AI 0.9.6", "body": body, "draft": False, "prerelease": False}).encode()
req = urllib.request.Request("$API/releases/" + rid, data=data, method="PATCH",
    headers={"Authorization": "token $TOKEN", "Accept": "application/vnd.github+json"})
urllib.request.urlopen(req)
print("  ✓ descrição atualizada")
PYEOF

# 6) Remove anexo antigo com o mesmo nome (se houver)
ASSET_NAME="Mangaba-AI-0.9.6-arm64.dmg"
OLD=$(curl -s -H "$AUTH" "$API/releases/$RELEASE_ID/assets" | sed -n "s/.*\"id\": \([0-9]*\),.*/\1/p" | head -1)
EXISTING=$(curl -s -H "$AUTH" "$API/releases/$RELEASE_ID/assets" | grep -c "$ASSET_NAME" || true)
if [ "${EXISTING:-0}" -gt 0 ] && [ -n "$OLD" ]; then
  echo "→ Removendo anexo antigo..."
  curl -s -X DELETE -H "$AUTH" "$API/releases/assets/$OLD" >/dev/null || true
fi

# 7) Sobe o .dmg (1,2 GB — pode demorar)
echo "→ Enviando instalador (1,2 GB, aguarde)..."
curl --progress-bar -X POST \
  -H "$AUTH" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @"$DMG" \
  "$UPLOADS/releases/$RELEASE_ID/assets?name=$ASSET_NAME" -o /tmp/upload-result.json

if grep -q '"state": "uploaded"' /tmp/upload-result.json 2>/dev/null || grep -q "browser_download_url" /tmp/upload-result.json 2>/dev/null; then
  echo ""
  echo "✅ Publicado com sucesso!"
  echo "   Download: https://github.com/$REPO/releases/download/$TAG/$ASSET_NAME"
  echo "   Release:  https://github.com/$REPO/releases/tag/$TAG"
else
  echo "✗ Falha no upload. Resposta:"; cat /tmp/upload-result.json
  exit 1
fi
