import { create } from 'zustand'
import {
  getProfile,
  updateProfile as dbUpdateProfile,
  type UserProfile,
  DEFAULT_PROFILE
} from '../lib/db'

interface ProfileState {
  profile: UserProfile
  loading: boolean
  loadProfile: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  addPlatform: (platform: string) => Promise<void>
  removePlatform: (platform: string) => Promise<void>
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: DEFAULT_PROFILE,
  loading: false,

  loadProfile: async () => {
    set({ loading: true })
    try {
      const profile = await getProfile()
      set({ profile, loading: false })
    } catch (err) {
      console.error('Failed to load profile:', err)
      set({ loading: false })
    }
  },

  updateProfile: async (updates) => {
    try {
      await dbUpdateProfile(updates)
      set(state => ({
        profile: { ...state.profile, ...updates }
      }))
    } catch (err) {
      console.error('Failed to update profile:', err)
    }
  },

  addPlatform: async (platform) => {
    const { profile, updateProfile } = get()
    if (!profile.tradingPlatforms.includes(platform)) {
      const newPlatforms = [...profile.tradingPlatforms, platform]
      await updateProfile({ tradingPlatforms: newPlatforms })
    }
  },

  removePlatform: async (platform) => {
    const { profile, updateProfile } = get()
    const newPlatforms = profile.tradingPlatforms.filter(p => p !== platform)
    await updateProfile({ tradingPlatforms: newPlatforms })
  }
}))
