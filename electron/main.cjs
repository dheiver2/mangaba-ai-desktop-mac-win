const { app, BrowserWindow, Menu, Tray, nativeImage, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const ollama = require('./ollama-manager.cjs');

// Modelo base (Gemma 4 edge quantizado) e o modelo rebrandizado do Mangaba AI.
const BASE_MODEL = process.env.MANGABA_BASE_MODEL || 'gemma4:e4b';
const MANGABA_MODEL = process.env.MANGABA_MODEL || 'mangaba-gemma4:latest';

const BACKEND_PORT = 8888;
// Dev: frontend pelo Vite (5173). Produção: o backend serve o frontend (8888).
const FRONTEND_PORT = process.env.NODE_ENV === 'development' ? 5173 : BACKEND_PORT;
// Permite sobrescrever a URL via env (ex: MANGABA_URL=http://localhost:5173)
const APP_URL = process.env.MANGABA_URL || `http://127.0.0.1:${FRONTEND_PORT}`;

let mainWindow = null;
let tray = null;
let backendProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'Mangaba AI',
    icon: path.join(__dirname, 'mangaba-logo.svg'),
    backgroundColor: '#FFFCF0',
    // Barra de título nativa: evita os semáforos do macOS sobreporem a UI
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Mostra a tela de carregamento IMEDIATAMENTE (não bloqueia a abertura)
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin' && !app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'mangaba-logo.svg');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('Mangaba AI');

  const menu = Menu.buildFromTemplate([
    { label: 'Abrir Mangaba AI', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Sair', click: () => { app.isQuiting = true; app.quit(); } },
  ]);

  tray.setContextMenu(menu);
  tray.on('double-click', () => mainWindow?.show());
}

function buildAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: 'Mangaba AI',
      submenu: [
        { role: 'about', label: 'Sobre Mangaba AI' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Ocultar Mangaba AI' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Sair' },
      ],
    }] : []),
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Desfazer' },
        { role: 'redo', label: 'Refazer' },
        { type: 'separator' },
        { role: 'cut', label: 'Recortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Colar' },
        { role: 'selectAll', label: 'Selecionar Tudo' },
      ],
    },
    {
      label: 'Visualizar',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { role: 'toggleDevTools', label: 'Ferramentas de Dev' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom Padrão' },
        { role: 'zoomIn', label: 'Ampliar' },
        { role: 'zoomOut', label: 'Reduzir' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tela Cheia' },
      ],
    },
    {
      label: 'Janela',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
        ] : [
          { role: 'close', label: 'Fechar' },
        ]),
      ],
    },
    {
      label: 'Ollama',
      submenu: [
        {
          label: 'Atualizar modelo Mangaba Gemma 4',
          click: async () => {
            try {
              await ollama.pull(BASE_MODEL);
              await ollama.createModel('mangaba-gemma4', resolveModelfile());
            } catch (e) {
              console.warn('[ollama] atualização falhou:', e.message);
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Desinstalar Ollama e modelos',
          click: async () => {
            const { dialog } = require('electron');
            const r = await dialog.showMessageBox(mainWindow, {
              type: 'warning',
              buttons: ['Cancelar', 'Desinstalar'],
              defaultId: 0,
              cancelId: 0,
              message: 'Desinstalar o Ollama?',
              detail:
                'Isso remove o Ollama e TODOS os modelos baixados pelo Mangaba AI. ' +
                'O app deixará de responder até baixar tudo novamente.',
            });
            if (r.response === 1) {
              ollama.uninstall();
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                message: 'Ollama desinstalado.',
                detail: 'Reabra o Mangaba AI para reinstalar automaticamente.',
              });
            }
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function waitForBackend(retries = 30, delay = 1000) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      http.get(APP_URL, (res) => {
        resolve();
      }).on('error', () => {
        if (retries-- > 0) {
          setTimeout(attempt, delay);
        } else {
          reject(new Error('Backend não iniciou no tempo esperado'));
        }
      });
    };
    attempt();
  });
}

// Caminho do Modelfile (produção: resources; dev: raiz do projeto)
function resolveModelfile() {
  const candidates = [
    path.join(process.resourcesPath || '', 'Modelfile.mangaba'),
    path.join(__dirname, '..', 'Modelfile.mangaba'),
  ];
  return candidates.find((c) => fs.existsSync(c)) || candidates[1];
}

// Inicia o Ollama, baixa o modelo base e cria o modelo Mangaba (com a persona).
async function startOllama() {
  try {
    await ollama.start((msg) => setStatus(msg));
    const models = await ollama.listModels();

    // 1) Garante o modelo BASE (gemma4:e4b) baixado
    if (!models.some((m) => m?.startsWith(BASE_MODEL))) {
      setStatus(`Baixando modelo base (${BASE_MODEL})…`);
      await ollama.pull(BASE_MODEL).catch((e) => console.warn('[ollama] pull base falhou:', e.message));
    }

    // 2) Cria o modelo MANGABA (com a identidade sergipana) a partir do base
    const after = await ollama.listModels();
    if (!after.some((m) => m === MANGABA_MODEL || m?.startsWith('mangaba-gemma4'))) {
      setStatus('Criando a identidade Mangaba…');
      await ollama
        .createModel('mangaba-gemma4', resolveModelfile())
        .catch((e) => console.warn('[ollama] create Mangaba falhou:', e.message));
    }
  } catch (e) {
    console.warn('[ollama] indisponível:', e.message);
  }
}

const stopOllama = () => ollama.stop();

// Resolve o Python embutido (produção: resources; dev: runtime/python).
function resolvePython() {
  const exe = process.platform === 'win32' ? 'python.exe' : 'bin/python3.11';
  const candidates = [
    path.join(process.resourcesPath || '', 'runtime', 'python', exe),
    path.join(__dirname, '..', 'runtime', 'python', exe),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return process.platform === 'win32' ? 'python' : 'python3'; // fallback sistema
}

// Resolve a pasta do backend e a raiz (para FRONTEND_BUILD_DIR/static).
function resolvePaths() {
  const prodBase = process.resourcesPath || '';
  const prodBackend = path.join(prodBase, 'backend');
  if (fs.existsSync(prodBackend)) {
    // Em produção o frontend buildado fica em resources/build
    return { backendDir: prodBackend, buildDir: path.join(prodBase, 'build') };
  }
  const devRoot = path.join(__dirname, '..');
  return { backendDir: path.join(devRoot, 'backend'), buildDir: path.join(devRoot, 'build') };
}

function startBackend() {
  const { backendDir, buildDir } = resolvePaths();
  if (!fs.existsSync(backendDir)) return Promise.resolve();

  // Dados graváveis no userData (o bundle do app é somente-leitura)
  const dataDir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const python = resolvePython();
  backendProcess = spawn(
    python,
    ['-m', 'uvicorn', 'open_webui.main:app', '--host', '127.0.0.1', '--port', String(BACKEND_PORT)],
    {
      cwd: backendDir,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTHONPATH: backendDir,
        DATA_DIR: dataDir,
        WEBUI_SECRET_KEY: process.env.WEBUI_SECRET_KEY || 'mangaba-ai-secret-key',
        WEBUI_NAME: 'Mangaba AI',
        FRONTEND_BUILD_DIR: buildDir,
        RAG_EMBEDDING_ENGINE: 'ollama',
        ENABLE_OPENAI_API: 'false',
        ENABLE_OLLAMA_API: 'true',
        ENABLE_DIRECT_CONNECTIONS: 'false',
        OLLAMA_BASE_URL: ollama.OLLAMA_URL,
        DEFAULT_MODELS: MANGABA_MODEL,
        CORS_ALLOW_ORIGIN: '*',
      },
    }
  );

  backendProcess.stdout?.on('data', (d) => process.stdout.write(`[backend] ${d}`));
  backendProcess.stderr?.on('data', (d) => process.stderr.write(`[backend] ${d}`));

  return waitForBackend();
}

// Envia mensagem de status para a tela de carregamento
function setStatus(msg) {
  console.log('[status]', msg);
  try {
    mainWindow?.webContents.send('mangaba-status', msg);
  } catch (_) {}
}

// Aguarda o backend responder e então carrega o app na janela.
function waitBackendAndLoad(retries = 600) {
  const tick = () => {
    http
      .get(`http://127.0.0.1:${BACKEND_PORT}/health`, () => {
        setStatus('Pronto!');
        mainWindow?.loadURL(APP_URL);
      })
      .on('error', () => {
        if (retries-- > 0) setTimeout(tick, 1000);
        else setStatus('Falha ao iniciar o servidor. Reabra o app.');
      });
  };
  tick();
}

app.whenReady().then(async () => {
  buildAppMenu();

  // 1) Abre a janela JÁ com a tela de carregamento (não trava o app)
  createWindow();
  createTray();

  // 2) Trabalho pesado em segundo plano (não bloqueia a UI)
  (async () => {
    setStatus('Preparando o motor de IA (Ollama)…');
    startOllama(); // baixa/instala/pull em background; não aguardamos aqui

    if (process.env.NODE_ENV !== 'development') {
      setStatus('Iniciando o servidor…');
      try {
        startBackend();
      } catch (e) {
        console.warn('Backend não disponível:', e.message);
      }
      waitBackendAndLoad();
    } else {
      // Em dev o frontend (Vite) já está no ar
      waitBackendAndLoad();
    }
  })();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  app.isQuiting = true;
  if (backendProcess) {
    backendProcess.kill();
  }
  // O software de chat comanda o Ollama: desliga ao fechar
  stopOllama();
});

// Garante o encerramento do Ollama mesmo em saídas inesperadas
app.on('will-quit', stopOllama);
process.on('exit', stopOllama);

ipcMain.handle('app-version', () => app.getVersion());
