export type CardMode = 'flip' | 'type' | 'choice'

export interface Language {
  id: string
  name: string
  emoji: string
  color: string
  createdAt: number
  defaultTtsVoiceId?: string
  defaultTtsVoiceName?: string
  defaultTtsModelId?: string
}

export interface Deck {
  id: string
  name: string
  description: string
  color: string
  emoji: string
  mode: CardMode
  createdAt: number
  languageId?: string
}

export interface Card {
  id: string
  deckId: string
  front: string
  back: string
  audioFront?: string
  audioBack?: string
  createdAt: number
  interval: number
  repetitions: number
  easeFactor: number
  dueDate: number
  lapses: number
}

export interface AppData {
  decks: Deck[]
  cards: Card[]
  streak: number
  lastStudyDate: string
  languages: Language[]
}

export interface ElevenLabsVoice {
  voice_id: string
  name: string
  category: string
}

declare global {
  interface Window {
    api: {
      load: () => Promise<AppData>
      save: (data: AppData) => Promise<{ success: boolean }>
      getPath: () => Promise<string>
      openAudioDialog: () => Promise<string | null>
      getAudioDataUrl: (filename: string) => Promise<string | null>
      deleteAudio: (filename: string) => Promise<void>
      openCsvDialog: () => Promise<string | null>
      settingsGet: (key: string) => Promise<string | null>
      settingsSet: (key: string, value: string) => Promise<void>
      elevenLabsGetVoices: (apiKey: string) => Promise<{ voices?: ElevenLabsVoice[]; error?: string }>
      elevenLabsGenerate: (params: { text: string; voiceId: string; apiKey: string; modelId: string }) => Promise<{ filename?: string; error?: string }>
      elevenLabsPreview: (params: { text: string; voiceId: string; apiKey: string; modelId: string }) => Promise<{ dataUrl?: string; error?: string }>
    }
    electronAPI: {
      minimize: () => Promise<void>
      close: () => Promise<void>
    }
  }
}
