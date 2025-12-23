/**
 * Crypto Utilities for API Key Encryption
 *
 * Uses Web Crypto API to encrypt API keys at rest.
 * The encryption key is derived from a machine-specific identifier and stored in sessionStorage.
 * This provides protection against casual inspection while remaining practical for a desktop app.
 */

const ENCRYPTED_PREFIX = 'enc:v1:'
const KEY_STORAGE_NAME = 'richdad-crypto-key'

/**
 * Generate a device-specific salt based on available browser/system info
 * This makes the encryption key somewhat device-bound
 */
function getDeviceSalt(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || 'unknown'
  ]
  return components.join('|')
}

/**
 * Generate or retrieve the encryption key
 * Key is stored in sessionStorage (cleared when browser closes)
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  // Check if we have a cached key in sessionStorage
  const cachedKeyData = sessionStorage.getItem(KEY_STORAGE_NAME)

  if (cachedKeyData) {
    try {
      const keyData = JSON.parse(cachedKeyData)
      return await crypto.subtle.importKey(
        'raw',
        new Uint8Array(keyData),
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      )
    } catch {
      // Key corrupted, regenerate
      sessionStorage.removeItem(KEY_STORAGE_NAME)
    }
  }

  // Generate new key from device salt
  const salt = getDeviceSalt()
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(salt),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('richdad-api-keys'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )

  // Cache the key in sessionStorage
  const exportedKey = await crypto.subtle.exportKey('raw', key)
  sessionStorage.setItem(KEY_STORAGE_NAME, JSON.stringify(Array.from(new Uint8Array(exportedKey))))

  return key
}

/**
 * Encrypt an API key
 * @param plainKey - The plaintext API key
 * @returns Encrypted key with prefix, or original if empty
 */
export async function encryptApiKey(plainKey: string): Promise<string> {
  if (!plainKey || plainKey.trim() === '') {
    return ''
  }

  // Already encrypted
  if (plainKey.startsWith(ENCRYPTED_PREFIX)) {
    return plainKey
  }

  try {
    const key = await getEncryptionKey()
    const encoder = new TextEncoder()
    const data = encoder.encode(plainKey)

    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )

    // Combine IV + encrypted data and encode as base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)

    const base64 = btoa(String.fromCharCode(...combined))
    return ENCRYPTED_PREFIX + base64

  } catch (error) {
    console.error('[Crypto] Encryption failed:', error)
    // Return original key if encryption fails (graceful degradation)
    return plainKey
  }
}

/**
 * Decrypt an API key
 * @param encryptedKey - The encrypted API key with prefix
 * @returns Decrypted plaintext key
 */
export async function decryptApiKey(encryptedKey: string): Promise<string> {
  if (!encryptedKey || encryptedKey.trim() === '') {
    return ''
  }

  // Not encrypted (legacy key or plaintext)
  if (!encryptedKey.startsWith(ENCRYPTED_PREFIX)) {
    return encryptedKey
  }

  try {
    const key = await getEncryptionKey()

    // Remove prefix and decode base64
    const base64 = encryptedKey.slice(ENCRYPTED_PREFIX.length)
    const combined = new Uint8Array(
      atob(base64).split('').map(c => c.charCodeAt(0))
    )

    // Extract IV (first 12 bytes) and encrypted data
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)

  } catch (error) {
    console.error('[Crypto] Decryption failed:', error)
    // Return empty string if decryption fails (key may have been corrupted)
    return ''
  }
}

/**
 * Check if a key is encrypted
 */
export function isEncrypted(key: string): boolean {
  return key.startsWith(ENCRYPTED_PREFIX)
}

/**
 * Migrate a plaintext key to encrypted format
 * Returns the encrypted version, or original if already encrypted
 */
export async function migrateToEncrypted(key: string): Promise<string> {
  if (!key || key.trim() === '' || isEncrypted(key)) {
    return key
  }
  return encryptApiKey(key)
}
