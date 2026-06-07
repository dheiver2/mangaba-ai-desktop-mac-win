#!/bin/bash
# Reduz o runtime Python embutido removendo pacotes não usados no build
# Ollama-only (inferência e embeddings via Ollama). Reduz de ~2.5GB para ~650MB.
#
# Uso: ./scripts/slim-runtime.sh   (após instalar as deps em runtime/python)
set -e

SP="runtime/python/lib/python3.11/site-packages"
[ -d "$SP" ] || { echo "✗ runtime não encontrado em $SP"; exit 1; }

echo "→ Tamanho antes: $(du -sh runtime/python | cut -f1)"

# Pacotes seguros de remover (não importados pelo backend em modo Ollama-only):
#  - ML/inferência local (usamos Ollama): torch, transformers, onnxruntime...
#  - processamento de mídia/dados pesados: cv2, av, pyarrow, numba, llvmlite, sklearn, scipy, sympy
#  - integrações de nuvem/deploy não usadas no desktop: kubernetes, googleapiclient, playwright
REMOVE=(
  torch torchgen functorch transformers onnxruntime tokenizers sentence_transformers
  cv2 av sympy pyarrow numba llvmlite sklearn scipy
  kubernetes googleapiclient playwright
)
for pkg in "${REMOVE[@]}"; do
  if [ -d "$SP/$pkg" ]; then rm -rf "$SP/$pkg" && echo "  removido: $pkg"; fi
done

# Limpa caches de bytecode
find runtime/python -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find runtime/python -name "*.pyc" -delete 2>/dev/null || true

echo "✓ Tamanho depois: $(du -sh runtime/python | cut -f1)"
echo "  (NÃO remova: grpc, boto3, botocore, azure — usados pelo storage/chromadb)"
