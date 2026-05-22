import { app, shell, BrowserWindow, ipcMain, dialog, net } from 'electron'
import { join, extname } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, unlinkSync } from 'fs'

const DATA_FILE_NAME = 'minne-data.json'
const SETTINGS_FILE_NAME = 'minne-settings.json'

function getDataPath(): string {
  return join(app.getPath('userData'), DATA_FILE_NAME)
}

function migrateFromFlashflow(): void {
  const newDataPath = getDataPath()
  if (existsSync(newDataPath)) return

  const appData = app.getPath('appData')
  const oldDataPath = join(appData, 'flashflow', 'flashflow-data.json')
  const oldSettingsPath = join(appData, 'flashflow', 'flashflow-settings.json')
  const newDir = app.getPath('userData')

  if (!existsSync(newDir)) mkdirSync(newDir, { recursive: true })

  if (existsSync(oldDataPath)) {
    try { copyFileSync(oldDataPath, newDataPath) } catch { /* ignore */ }
  }

  const newSettingsPath = join(newDir, SETTINGS_FILE_NAME)
  if (!existsSync(newSettingsPath) && existsSync(oldSettingsPath)) {
    try { copyFileSync(oldSettingsPath, newSettingsPath) } catch { /* ignore */ }
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('db:load', () => {
  const dataPath = getDataPath()
  if (!existsSync(dataPath)) {
    return { decks: [], cards: [], streak: 0, lastStudyDate: '' }
  }
  try {
    const raw = readFileSync(dataPath, 'utf-8')
    const parsed = JSON.parse(raw)
    return {
      decks: parsed.decks || [],
      cards: parsed.cards || [],
      streak: parsed.streak || 0,
      lastStudyDate: parsed.lastStudyDate || '',
      languages: parsed.languages || []
    }
  } catch {
    return { decks: [], cards: [], streak: 0, lastStudyDate: '', languages: [] }
  }
})

ipcMain.handle('db:save', (_event, data: unknown) => {
  const dataPath = getDataPath()
  try {
    writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true }
  } catch (err) {
    console.error('Failed to save data:', err)
    return { success: false }
  }
})

ipcMain.handle('db:get-path', () => {
  return app.getPath('userData')
})

function getAudioDir(): string {
  const dir = join(app.getPath('userData'), 'audio')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

ipcMain.handle('audio:open-dialog', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const result = await dialog.showOpenDialog(win!, {
    title: 'Choose Audio File',
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'] }],
    properties: ['openFile']
  })
  if (result.canceled || !result.filePaths.length) return null
  const src = result.filePaths[0]
  const ext = extname(src).toLowerCase()
  const filename = `${crypto.randomUUID()}${ext}`
  copyFileSync(src, join(getAudioDir(), filename))
  return filename
})

ipcMain.handle('audio:get-data-url', (_event, filename: string) => {
  const filePath = join(getAudioDir(), filename)
  if (!existsSync(filePath)) return null
  const ext = extname(filename).slice(1).toLowerCase()
  const mimeMap: Record<string, string> = {
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
    m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac'
  }
  const mime = mimeMap[ext] || 'audio/mpeg'
  const buffer = readFileSync(filePath)
  return `data:${mime};base64,${buffer.toString('base64')}`
})

ipcMain.handle('audio:delete', (_event, filename: string) => {
  try {
    unlinkSync(join(getAudioDir(), filename))
  } catch { /* file may already be gone */ }
})

ipcMain.handle('csv:open-dialog', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const result = await dialog.showOpenDialog(win!, {
    title: 'Import Cards from CSV',
    filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }],
    properties: ['openFile']
  })
  if (result.canceled || !result.filePaths.length) return null
  return readFileSync(result.filePaths[0], 'utf-8')
})

// ─── Settings ────────────────────────────────────────────────────────────────

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'minne-settings.json')
}

function loadSettings(): Record<string, string> {
  try {
    if (existsSync(getSettingsPath())) {
      return JSON.parse(readFileSync(getSettingsPath(), 'utf-8')) as Record<string, string>
    }
  } catch {}
  return {}
}

ipcMain.handle('settings:get', (_event, key: string) => {
  return loadSettings()[key] ?? null
})

ipcMain.handle('settings:set', (_event, key: string, value: string) => {
  const settings = loadSettings()
  settings[key] = value
  writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
})

// ─── ElevenLabs ───────────────────────────────────────────────────────────────

ipcMain.handle('elevenlabs:get-voices', async (_event, apiKey: string) => {
  try {
    const res = await net.fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey }
    })
    if (!res.ok) return { error: `API error ${res.status}: ${await res.text()}` }
    const data = await res.json() as { voices: Array<{ voice_id: string; name: string; category: string }> }
    return { voices: data.voices }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Network error' }
  }
})

ipcMain.handle('elevenlabs:generate', async (_event, { text, voiceId, apiKey, modelId }: {
  text: string; voiceId: string; apiKey: string; modelId: string
}) => {
  try {
    const res = await net.fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    })
    if (!res.ok) return { error: `API error ${res.status}: ${await res.text()}` }
    const buffer = Buffer.from(await res.arrayBuffer())
    const filename = `${crypto.randomUUID()}.mp3`
    writeFileSync(join(getAudioDir(), filename), buffer)
    return { filename }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Network error' }
  }
})

ipcMain.handle('elevenlabs:preview', async (_event, { text, voiceId, apiKey, modelId }: {
  text: string; voiceId: string; apiKey: string; modelId: string
}) => {
  try {
    const res = await net.fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    })
    if (!res.ok) return { error: `API error ${res.status}: ${await res.text()}` }
    const buffer = Buffer.from(await res.arrayBuffer())
    return { dataUrl: `data:audio/mpeg;base64,${buffer.toString('base64')}` }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Network error' }
  }
})

ipcMain.handle('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize()
})

ipcMain.handle('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close()
})

app.whenReady().then(() => {
  migrateFromFlashflow()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
