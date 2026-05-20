import React, { useRef, useState, useEffect } from 'react'
import { Volume2, VolumeX, Loader } from 'lucide-react'

interface AudioPlayerProps {
  filename: string
  autoPlay?: boolean
  size?: 'sm' | 'md'
  label?: string
}

export default function AudioPlayer({ filename, autoPlay = false, size = 'md', label }: AudioPlayerProps): React.ReactElement {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const dataUrlRef = useRef<string | null>(null)

  async function loadAndPlay(): Promise<void> {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      return
    }
    if (!dataUrlRef.current) {
      setIsLoading(true)
      try {
        const url = await window.api.getAudioDataUrl(filename)
        if (!url) { setError(true); setIsLoading(false); return }
        dataUrlRef.current = url
      } catch {
        setError(true)
        setIsLoading(false)
        return
      }
      setIsLoading(false)
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
    }
    const audio = new Audio(dataUrlRef.current)
    audioRef.current = audio
    audio.onended = () => setIsPlaying(false)
    audio.onerror = () => { setIsPlaying(false); setError(true) }
    setIsPlaying(true)
    audio.play().catch(() => { setIsPlaying(false); setError(true) })
  }

  useEffect(() => {
    if (!autoPlay) return
    let cancelled = false

    async function autoPlayFn(): Promise<void> {
      if (!dataUrlRef.current) {
        setIsLoading(true)
        try {
          const url = await window.api.getAudioDataUrl(filename)
          if (cancelled) return
          if (!url) { setError(true); setIsLoading(false); return }
          dataUrlRef.current = url
        } catch {
          if (!cancelled) setError(true)
          setIsLoading(false)
          return
        }
        if (cancelled) return
        setIsLoading(false)
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.onended = null
        audioRef.current.onerror = null
      }
      const audio = new Audio(dataUrlRef.current!)
      audioRef.current = audio
      audio.onended = () => setIsPlaying(false)
      audio.onerror = () => { setIsPlaying(false); setError(true) }
      setIsPlaying(true)
      audio.play().catch(() => { if (!cancelled) setIsPlaying(false) })
    }

    autoPlayFn()

    return () => {
      cancelled = true
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [filename])

  const isSmall = size === 'sm'
  const btnSize = isSmall ? 'w-8 h-8' : 'w-10 h-10'
  const iconSize = isSmall ? 14 : 18

  return (
    <button
      onClick={loadAndPlay}
      title={label || 'Play audio'}
      className={`${btnSize} rounded-full flex items-center justify-center transition-all duration-150 ${
        error
          ? 'bg-[#2d1558] text-[#5c3d85] cursor-not-allowed'
          : isPlaying
          ? 'bg-[#40c4ff] text-[#0d0221] shadow-md scale-110'
          : 'bg-[#40c4ff]/15 text-[#40c4ff] hover:bg-[#40c4ff]/30'
      }`}
      disabled={error}
    >
      {isLoading ? (
        <Loader size={iconSize} className="animate-spin" />
      ) : isPlaying ? (
        <VolumeX size={iconSize} />
      ) : (
        <Volume2 size={iconSize} />
      )}
    </button>
  )
}
