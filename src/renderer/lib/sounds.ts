import { getSettings } from './db'

// Sound presets using Web Audio API
const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

interface SoundPreset {
  frequency: number
  duration: number
  type: OscillatorType
  gain: number
}

const SOUND_PRESETS: Record<string, SoundPreset> = {
  default: { frequency: 440, duration: 0.15, type: 'sine', gain: 0.3 },
  chime: { frequency: 523, duration: 0.2, type: 'sine', gain: 0.25 },
  bell: { frequency: 659, duration: 0.25, type: 'triangle', gain: 0.3 },
  ping: { frequency: 880, duration: 0.1, type: 'sine', gain: 0.2 },
}

// Action-specific sound modifications
const ACTION_MODIFIERS: Record<string, { freqMultiplier: number; secondFreq?: number }> = {
  buy: { freqMultiplier: 1.25, secondFreq: 1.5 },    // Rising tone
  sell: { freqMultiplier: 0.8, secondFreq: 0.6 },    // Falling tone
  hold: { freqMultiplier: 1.0 },                      // Neutral
  alert: { freqMultiplier: 1.1, secondFreq: 0.9 },   // Alternating
}

function playTone(preset: SoundPreset, modifier?: { freqMultiplier: number; secondFreq?: number }, volume = 100) {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  const freq = preset.frequency * (modifier?.freqMultiplier || 1)
  oscillator.frequency.setValueAtTime(freq, audioContext.currentTime)
  oscillator.type = preset.type

  // Apply volume
  const adjustedGain = preset.gain * (volume / 100)
  gainNode.gain.setValueAtTime(adjustedGain, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + preset.duration)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + preset.duration)

  // Play second tone if defined (for buy/sell/alert effects)
  if (modifier?.secondFreq !== undefined) {
    const secondFreqMultiplier = modifier.secondFreq
    setTimeout(() => {
      const osc2 = audioContext.createOscillator()
      const gain2 = audioContext.createGain()

      osc2.connect(gain2)
      gain2.connect(audioContext.destination)

      osc2.frequency.setValueAtTime(preset.frequency * secondFreqMultiplier, audioContext.currentTime)
      osc2.type = preset.type

      gain2.gain.setValueAtTime(adjustedGain * 0.8, audioContext.currentTime)
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + preset.duration)

      osc2.start(audioContext.currentTime)
      osc2.stop(audioContext.currentTime + preset.duration)
    }, preset.duration * 500) // Slight delay for second tone
  }
}

export type SoundAction = 'buy' | 'sell' | 'hold' | 'alert'

export async function playSound(action: SoundAction): Promise<void> {
  try {
    const settings = await getSettings()

    if (!settings.soundEnabled) return

    const soundName = settings.sounds[action]
    if (soundName === 'none') return

    // Resume audio context if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    const preset = SOUND_PRESETS[soundName] || SOUND_PRESETS.default
    const modifier = ACTION_MODIFIERS[action]

    playTone(preset, modifier, settings.soundVolume)
  } catch (err) {
    console.error('Failed to play sound:', err)
  }
}

// Test sound function for settings preview
export async function testSound(soundName: string, action: SoundAction, volume: number): Promise<void> {
  try {
    if (soundName === 'none') return

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    const preset = SOUND_PRESETS[soundName] || SOUND_PRESETS.default
    const modifier = ACTION_MODIFIERS[action]

    playTone(preset, modifier, volume)
  } catch (err) {
    console.error('Failed to test sound:', err)
  }
}
