import type { ElevenLabsVoice } from '../types'

export const TTS_MODELS = [
  { id: 'eleven_multilingual_v2', label: 'Multilingual v2', sub: 'Best for Swedish & other languages' },
  { id: 'eleven_turbo_v2', label: 'Turbo v2', sub: 'Fast · English only' },
  { id: 'eleven_monolingual_v1', label: 'Classic v1', sub: 'Original · English only' }
] as const

export const TTS_BUILTIN_VOICES: (ElevenLabsVoice & { langHint?: string })[] = [
  { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', category: 'premade', langHint: 'Swedish ★' },
  { voice_id: 'jsCqWAovK2LkecY7zXl4', name: 'Freya', category: 'premade', langHint: 'Swedish ★' },
  { voice_id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', category: 'premade', langHint: 'Multilingual' },
  { voice_id: 'oWAxZDx7w5VEj9dCyTzz', name: 'Grace', category: 'premade', langHint: 'Multilingual' },
  { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', category: 'premade', langHint: 'Multilingual' },
  { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', category: 'premade', langHint: 'Multilingual' },
  { voice_id: 'GBv7mTt0atIp3Br8iCZE', name: 'Thomas', category: 'premade', langHint: 'Multilingual' },
  { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', category: 'premade', langHint: 'Multilingual' },
  { voice_id: 'jBpfuIE2acCO8z3wKNLl', name: 'Callum', category: 'premade', langHint: 'Multilingual' },
  { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', category: 'premade' },
  { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', category: 'premade' },
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade' },
  { voice_id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', category: 'premade' },
  { voice_id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', category: 'premade' },
  { voice_id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', category: 'premade' },
  { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', category: 'premade' },
  { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', category: 'premade' },
  { voice_id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', category: 'premade' },
  { voice_id: 'flq6f7yk4E4fJM5XTYuZ', name: 'Michael', category: 'premade' },
]

export const TTS_CUSTOM_VOICES_KEY = 'ttsCustomVoices'
export const TTS_PREVIEW_TEXT = 'Hej! Det här är ett röstexempel på svenska.'
export const TTS_DEFAULT_MODEL = 'eleven_multilingual_v2'
