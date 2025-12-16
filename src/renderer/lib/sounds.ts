import { getSettings, updateSettings } from './db'

// MP3 Sound Files
const SOUND_FILES: Record<string, string> = {
  'bongo': '/Bongo.mp3',
  'buy-now-male': '/Buy Now (Male).mp3',
  'hold-fort-male': '/Hold the Fort (Male).mp3',
  'kaching': '/Kaching.mp3',
  'kim-possible': '/Kim Possible.mp3',
  'messenger': '/Messenger.mp3',
  'purchase-success': '/Purchase Success.mp3',
  'sell-it-male': '/Sell It (Male).mp3',
  'none': '',
}

// Friendly display names (for Settings UI)
export const SOUND_DISPLAY_NAMES: Record<string, string> = {
  'bongo': 'Bongo',
  'buy-now-male': 'Buy Now (Male)',
  'hold-fort-male': 'Hold the Fort (Male)',
  'kaching': 'Kaching',
  'kim-possible': 'Kim Possible',
  'messenger': 'Messenger',
  'purchase-success': 'Purchase Success',
  'sell-it-male': 'Sell It (Male)',
  'none': 'None (Silent)',
}

export type SoundAction = 'buy' | 'sell' | 'hold' | 'alert' | 'analysis' | 'tradeExecuted' | 'breakingNews'

/**
 * Play notification sound with trigger checks
 */
export async function playSound(action: SoundAction, confidence?: number): Promise<void> {
  try {
    const settings = await getSettings()

    // Check if sounds enabled globally
    if (!settings.soundEnabled) return

    // Check confidence threshold
    if (confidence !== undefined && confidence < settings.soundMinConfidence) {
      console.log(`Sound skipped: confidence ${confidence}% < threshold ${settings.soundMinConfidence}%`)
      return
    }

    // Check alert type filter
    if (action === 'buy' && !settings.soundOnBuy) return
    if (action === 'sell' && !settings.soundOnSell) return
    if (action === 'hold' && !settings.soundOnHold) return
    if (action === 'analysis' && !settings.soundOnAnalysis) return

    // Check cooldown period
    const now = Date.now()
    if (settings.soundCooldown > 0) {
      const timeSinceLastSound = now - (settings.lastSoundPlayed || 0)
      if (timeSinceLastSound < settings.soundCooldown) {
        console.log(`Sound skipped: cooldown (${Math.round(timeSinceLastSound / 1000)}s / ${settings.soundCooldown / 1000}s)`)
        return
      }
    }

    // Get sound file path
    const soundKey = settings.sounds[action]
    const soundPath = SOUND_FILES[soundKey]

    if (!soundPath) {
      console.warn(`No sound file for action: ${action}`)
      return
    }

    // Play the MP3 file
    const audio = new Audio(soundPath)
    audio.volume = settings.soundVolume / 100
    await audio.play()

    // Update last played timestamp
    await updateSettings({ lastSoundPlayed: now })

    console.log(`Played sound: ${soundKey} for action: ${action}`)
  } catch (err) {
    console.error('Failed to play sound:', err)
  }
}

/**
 * Preview a sound (used in Settings)
 */
export async function previewSound(soundKey: string, volume: number): Promise<void> {
  try {
    const soundPath = SOUND_FILES[soundKey]
    if (!soundPath) return

    const audio = new Audio(soundPath)
    audio.volume = volume / 100
    await audio.play()
  } catch (err) {
    console.error('Failed to preview sound:', err)
  }
}
