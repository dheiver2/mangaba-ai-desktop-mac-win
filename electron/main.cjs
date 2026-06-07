const { app, BrowserWindow, Menu, Tray, nativeImage, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const ollama = require('./ollama-manager.cjs');

// Modelo padrão do Mangaba AI (Gemma 4 edge quantizado)
const MANGABA_MODEL = process.env.MANGABA_MODEL || 'gemma4:e4b';

const BACKEND_PORT = 8888;
const FRONTEND_PORT = process.env.NODE_ENV === 'development' ? 5173 : 8080;
// Permite sobrescrever a URL via env (ex: MANGABA_URL=http://localhost:5173)
const APP_URL = process.env.MANGABA_URL || `http://localhost:${FRONTEND_PORT}`;

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
    {
      label: 'Ollama',
      submenu: [
        {
          label: `Baixar/atualizar modelo (${MANGABA_MODEL})`,
          click: async () => {
            try {
              await ollama.pull(MANGABA_MODEL);
            } catch (e) {
              console.warn('[ollama] pull falhou:', e.message);
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

// Inicia o Ollama gerenciado pelo app (instala na 1ª vez) e garante o modelo.
async function startOllama() {
  try {
    await ollama.start((msg) => console.log('[ollama]', msg));
    // Garante que o modelo padrão está disponível
    const hasModel = await new Promise((resolve) => {
      http
        .get(`${ollama.OLLAMA_URL}/api/tags`, (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              const tags = JSON.parse(data);
              resolve((tags.models || []).some((m) => m.name?.startsWith(MANGABA_MODEL)));
            } catch (_) {
              resolve(false);
            }
          });
        })
        .on('error', () => resolve(false));
    });
    if (!hasModel) {
      console.log(`[ollama] baixando modelo ${MANGABA_MODEL}...`);
      await ollama.pull(MANGABA_MODEL).catch((e) => console.warn('[ollama] pull falhou:', e.message));
    }
  } catch (e) {
    console.warn('[ollama] indisponível:', e.message);
  }
}

const stopOllama = () => ollama.stop();

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
