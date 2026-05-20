import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  load: (): Promise<unknown> => ipcRenderer.invoke('db:load'),
  save: (data: unknown): Promise<unknown> => ipcRenderer.invoke('db:save', data),
  getPath: (): Promise<string> => ipcRenderer.invoke('db:get-path'),
  openAudioDialog: (): Promise<string | null> => ipcRenderer.invoke('audio:open-dialog'),
  getAudioDataUrl: (filename: string): Promise<string | null> => ipcRenderer.invoke('audio:get-data-url', filename),
  deleteAudio: (filename: string): Promise<void> => ipcRenderer.invoke('audio:delete', filename),
  openCsvDialog: (): Promise<string | null> => ipcRenderer.invoke('csv:open-dialog'),
  settingsGet: (key: string): Promise<string | null> => ipcRenderer.invoke('settings:get', key),
  settingsSet: (key: string, value: string): Promise<void> => ipcRenderer.invoke('settings:set', key, value),
  elevenLabsGetVoices: (apiKey: string) => ipcRenderer.invoke('elevenlabs:get-voices', apiKey),
  elevenLabsGenerate: (params: { text: string; voiceId: string; apiKey: string; modelId: string }) =>
    ipcRenderer.invoke('elevenlabs:generate', params),
  elevenLabsPreview: (params: { text: string; voiceId: string; apiKey: string; modelId: string }) =>
    ipcRenderer.invoke('elevenlabs:preview', params)
})

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  close: (): Promise<void> => ipcRenderer.invoke('window:close')
})
