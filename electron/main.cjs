const { app, BrowserWindow, Menu, Tray, nativeImage, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const BACKEND_PORT = 8888;
const FRONTEND_PORT = process.env.NODE_ENV === 'development' ? 5173 : 8080;
// Permite sobrescrever a URL via env (ex: MANGABA_URL=http://localhost:5173)
const APP_URL = process.env.MANGABA_URL || `http://localhost:${FRONTEND_PORT}`;

let mainWindow = null;
let tray = null;
let backendProcess = null;
let ollamaProcess = null;
let ollamaStartedByUs = false; // só encerramos o Ollama se fomos nós que o iniciamos

const OLLAMA_PORT = 11434;
const OLLAMA_URL = `http://127.0.0.1:${OLLAMA_PORT}`;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'Mangaba AI',
    icon: path.join(__dirname, '../static/mangaba-logo.svg'),
    backgroundColor: '#1a0f0a',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(APP_URL);

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
  const iconPath = path.join(__dirname, '../static/mangaba-logo.svg');
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

// Verifica se o Ollama já está respondendo
function isOllamaUp() {
  return new Promise((resolve) => {
    http
      .get(`${OLLAMA_URL}/api/tags`, () => resolve(true))
      .on('error', () => resolve(false));
  });
}

// Aguarda o Ollama subir (até retries tentativas)
function waitForOllama(retries = 30, delay = 1000) {
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      if (await isOllamaUp()) return resolve();
      if (retries-- > 0) setTimeout(attempt, delay);
      else reject(new Error('Ollama não iniciou no tempo esperado'));
    };
    attempt();
  });
}

// Inicia o Ollama caso ainda não esteja rodando — o app passa a ser o dono dele
async function startOllama() {
  if (await isOllamaUp()) {
    console.log('[ollama] já estava rodando — não será encerrado ao sair');
    return;
  }
  try {
    ollamaProcess = spawn('ollama', ['serve'], {
      env: { ...process.env },
      detached: false,
    });
    ollamaStartedByUs = true;
    ollamaProcess.stdout?.on('data', (d) => process.stdout.write(`[ollama] ${d}`));
    ollamaProcess.stderr?.on('data', (d) => process.stderr.write(`[ollama] ${d}`));
    ollamaProcess.on('error', (e) =>
      console.warn('[ollama] não foi possível iniciar (instalado?):', e.message)
    );
    await waitForOllama();
    console.log('[ollama] iniciado pelo Mangaba AI');
  } catch (e) {
    console.warn('[ollama] indisponível:', e.message);
  }
}

// Encerra o Ollama apenas se fomos nós que o iniciamos
function stopOllama() {
  if (ollamaStartedByUs && ollamaProcess) {
    console.log('[ollama] encerrando (iniciado pelo Mangaba AI)...');
    try {
      ollamaProcess.kill('SIGTERM');
    } catch (_) {
      /* ignore */
    }
    ollamaProcess = null;
    ollamaStartedByUs = false;
  }
}

function startBackend() {
  const backendDir = path.join(__dirname, '../backend');
  if (!fs.existsSync(backendDir)) return Promise.resolve();

  backendProcess = spawn('python3', ['-m', 'uvicorn', 'open_webui.main:app', '--host', '0.0.0.0', '--port', String(BACKEND_PORT)], {
    cwd: backendDir,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  });

  backendProcess.stdout?.on('data', (d) => process.stdout.write(`[backend] ${d}`));
  backendProcess.stderr?.on('data', (d) => process.stderr.write(`[backend] ${d}`));

  return waitForBackend();
}

app.whenReady().then(async () => {
  buildAppMenu();

  // O software de chat comanda o Ollama: liga ao abrir
  await startOllama();

  if (process.env.NODE_ENV !== 'development') {
    try {
      await startBackend();
    } catch (e) {
      console.warn('Backend não disponível, tentando continuar...', e.message);
    }
  }

  createWindow();
  createTray();

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
