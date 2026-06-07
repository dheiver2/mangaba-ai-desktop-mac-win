// Gestão TOTAL do Ollama pelo Mangaba AI.
// Instalação, ciclo de vida e desinstalação são controlados SOMENTE pelo app.
// O Ollama é tratado como um componente interno do Mangaba AI, não como
// dependência externa separada.
//
// Estratégia:
//   - O binário do Ollama e os modelos ficam dentro do diretório de dados do
//     app (userData/ollama). Assim, remover o app remove tudo junto.
//   - Se o binário não existir, o app baixa o Ollama oficial automaticamente.
//   - O serviço sobe ao abrir o app e é encerrado ao fechar.

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { spawn, spawnSync } = require('child_process');
const http = require('http');

const OLLAMA_PORT = 11434;
const OLLAMA_URL = `http://127.0.0.1:${OLLAMA_PORT}`;

// Tudo do Ollama vive aqui dentro — some junto com o app ao desinstalar.
function ollamaHome() {
  return path.join(app.getPath('userData'), 'ollama');
}
function modelsDir() {
  return path.join(ollamaHome(), 'models');
}
function binPath() {
  const exe = process.platform === 'win32' ? 'ollama.exe' : 'ollama';
  return path.join(ollamaHome(), 'bin', exe);
}

// URLs oficiais de download do Ollama por plataforma/arquitetura.
function downloadInfo() {
  const platform = process.platform;
  const arch = process.arch; // 'arm64' | 'x64'
  if (platform === 'darwin') {
    return {
      url: 'https://ollama.com/download/Ollama-darwin.zip',
      kind: 'zip-app', // contém Ollama.app com o binário embutido
    };
  }
  if (platform === 'win32') {
    return {
      url: 'https://ollama.com/download/OllamaSetup.exe',
      kind: 'win-installer',
    };
  }
  // Linux
  return {
    url: `https://ollama.com/download/ollama-linux-${arch === 'arm64' ? 'arm64' : 'amd64'}.tgz`,
    kind: 'tgz',
  };
}

let serveProcess = null;
let startedByUs = false;

function isUp() {
  return new Promise((resolve) => {
    http.get(`${OLLAMA_URL}/api/tags`, () => resolve(true)).on('error', () => resolve(false));
  });
}

function waitUntilUp(retries = 30, delay = 1000) {
  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (await isUp()) return resolve();
      if (retries-- > 0) setTimeout(tick, delay);
      else reject(new Error('Ollama não respondeu a tempo'));
    };
    tick();
  });
}

// Resolve o caminho do executável do Ollama: bundle do app > binário gerenciado > PATH do sistema
function resolveBinary() {
  const managed = binPath();
  if (fs.existsSync(managed)) return managed;
  // Em produção, pode vir empacotado nos resources do app
  const bundled = path.join(
    process.resourcesPath || '',
    'ollama',
    process.platform === 'win32' ? 'ollama.exe' : 'ollama'
  );
  if (fs.existsSync(bundled)) return bundled;
  // Fallback: ollama do sistema (se o usuário já tiver)
  const sys = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ollama']);
  if (sys.status === 0) return String(sys.stdout).trim().split('\n')[0];
  return null;
}

function isInstalled() {
  return resolveBinary() !== null;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download falhou: HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    req.on('error', (e) => {
      fs.unlink(dest, () => reject(e));
    });
  });
}

// Instala o Ollama dentro do diretório do app (sem instalador de sistema).
async function install(onProgress = () => {}) {
  const info = downloadInfo();
  const tmp = path.join(os.tmpdir(), `mangaba-ollama-${process.pid}`);
  fs.mkdirSync(tmp, { recursive: true });
  onProgress('Baixando Ollama...');
  const binDir = path.join(ollamaHome(), 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  if (info.kind === 'zip-app') {
    const zip = path.join(tmp, 'Ollama.zip');
    await download(info.url, zip);
    onProgress('Extraindo...');
    spawnSync('unzip', ['-o', zip, '-d', tmp]);
    // O binário 'ollama' fica em Resources/ junto com as bibliotecas
    // (libggml-*.dylib/.so) e subpastas (ex.: mlx_metal_v3) das quais ele
    // DEPENDE. Copiamos a árvore inteira de Resources para bin/ (recursivo).
    const resources = path.join(tmp, 'Ollama.app', 'Contents', 'Resources');
    if (fs.existsSync(path.join(resources, 'ollama'))) {
      for (const item of fs.readdirSync(resources)) {
        if (item === 'icon.icns') continue; // ícone é dispensável
        fs.cpSync(path.join(resources, item), path.join(binDir, item), {
          recursive: true,
        });
      }
      fs.chmodSync(binPath(), 0o755);
    } else {
      throw new Error('Binário do Ollama não encontrado no pacote baixado');
    }
  } else if (info.kind === 'tgz') {
    const tgz = path.join(tmp, 'ollama.tgz');
    await download(info.url, tgz);
    onProgress('Extraindo...');
    spawnSync('tar', ['-xzf', tgz, '-C', binDir]);
    if (fs.existsSync(binPath())) fs.chmodSync(binPath(), 0o755);
  } else {
    // win-installer: baixa o instalador e executa em modo silencioso
    const setup = path.join(tmp, 'OllamaSetup.exe');
    await download(info.url, setup);
    onProgress('Instalando...');
    spawnSync(setup, ['/SILENT'], { stdio: 'ignore' });
  }

  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch (_) {}
  onProgress('Ollama instalado.');
}

// Inicia o serviço Ollama. O app passa a ser o dono do processo.
async function start(onProgress = () => {}) {
  if (await isUp()) {
    startedByUs = false; // já estava rodando — não encerramos ao sair
    return;
  }
  if (!isInstalled()) {
    onProgress('Instalando Ollama (primeira execução)...');
    await install(onProgress);
  }
  const bin = resolveBinary();
  if (!bin) throw new Error('Ollama indisponível após tentativa de instalação');

  fs.mkdirSync(modelsDir(), { recursive: true });
  serveProcess = spawn(bin, ['serve'], {
    env: {
      ...process.env,
      OLLAMA_HOST: `127.0.0.1:${OLLAMA_PORT}`,
      OLLAMA_MODELS: modelsDir(), // modelos dentro do app → removidos junto
    },
  });
  startedByUs = true;
  serveProcess.stdout?.on('data', (d) => process.stdout.write(`[ollama] ${d}`));
  serveProcess.stderr?.on('data', (d) => process.stderr.write(`[ollama] ${d}`));
  serveProcess.on('error', (e) => console.warn('[ollama] erro:', e.message));
  await waitUntilUp();
  onProgress('Ollama pronto.');
}

// Baixa um modelo (ex.: gemma4:e4b) usando o binário gerenciado.
function pull(model) {
  return new Promise((resolve, reject) => {
    const bin = resolveBinary();
    if (!bin) return reject(new Error('Ollama não instalado'));
    const p = spawn(bin, ['pull', model], {
      env: { ...process.env, OLLAMA_HOST: `127.0.0.1:${OLLAMA_PORT}`, OLLAMA_MODELS: modelsDir() },
    });
    p.stdout?.on('data', (d) => process.stdout.write(`[ollama pull] ${d}`));
    p.stderr?.on('data', (d) => process.stderr.write(`[ollama pull] ${d}`));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`pull saiu com código ${code}`))));
  });
}

// Encerra o serviço — apenas se fomos nós que o iniciamos.
function stop() {
  if (startedByUs && serveProcess) {
    try {
      serveProcess.kill('SIGTERM');
    } catch (_) {}
    serveProcess = null;
    startedByUs = false;
  }
}

// Desinstala COMPLETAMENTE o Ollama gerenciado pelo app (binário + modelos).
// Usado quando o usuário desinstala o Mangaba AI ou pede limpeza total.
function uninstall() {
  stop();
  try {
    fs.rmSync(ollamaHome(), { recursive: true, force: true });
    return true;
  } catch (e) {
    console.warn('[ollama] falha ao desinstalar:', e.message);
    return false;
  }
}

module.exports = {
  OLLAMA_URL,
  isUp,
  isInstalled,
  install,
  start,
  stop,
  pull,
  uninstall,
  ollamaHome,
};
