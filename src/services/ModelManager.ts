import { db } from '../renderer/lib/db'
import type { LocalModel } from '../renderer/lib/db'
import defaultModelsData from '../../config/defaultModels.json'

interface ModelConfig {
  modelId: string
  name: string
  type: string
  sourceUrl: string
  sizeMB: number
  checksum?: string
}

const defaultModels = defaultModelsData as ModelConfig[]

export class ModelManager {
  private modelsDir: string

  constructor() {
    // Electron: use userData/models
    // Web: use IndexedDB FileSystem API (fallback)
    this.modelsDir = this.getModelsDirectory()
  }

  private getModelsDirectory(): string {
    if (typeof window !== 'undefined' && (window as any).electron) {
      const { app } = (window as any).electron
      return `${app.getPath('userData')}/models`
    }
    return '/models' // Web fallback (virtual FS)
  }

  /**
   * Get all available models from config
   */
  async getAvailableModels(): Promise<LocalModel[]> {
    const models: LocalModel[] = []

    for (const config of defaultModels) {
      const existing = await db.localModels
        .where('modelId')
        .equals(config.modelId)
        .first()

      models.push({
        ...existing,
        modelId: config.modelId,
        name: config.name,
        type: config.type as 'llm' | 'sentiment',
        sourceUrl: config.sourceUrl,
        sizeMB: config.sizeMB,
        checksum: config.checksum,
        downloaded: existing?.downloaded || false,
        filePath: existing?.filePath
      } as LocalModel)
    }

    return models
  }

  /**
   * Download a model with progress tracking
   */
  async downloadModel(
    modelId: string,
    onProgress: (percent: number) => void
  ): Promise<void> {
    const config = defaultModels.find(m => m.modelId === modelId)
    if (!config) throw new Error(`Model ${modelId} not found in config`)

    // Check disk space
    await this.checkDiskSpace(config.sizeMB)

    // Download with progress
    const filePath = `${this.modelsDir}/${modelId}.bin`
    const response = await fetch(config.sourceUrl)

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`)
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
    const reader = response.body?.getReader()

    if (!reader) throw new Error('ReadableStream not supported')

    const chunks: Uint8Array[] = []
    let receivedLength = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      chunks.push(value)
      receivedLength += value.length

      const percent = Math.round((receivedLength / contentLength) * 100)
      onProgress(percent)
    }

    // Combine chunks
    const fileData = new Uint8Array(receivedLength)
    let position = 0
    for (const chunk of chunks) {
      fileData.set(chunk, position)
      position += chunk.length
    }

    // Validate checksum
    if (config.checksum) {
      await this.validateChecksum(fileData, config.checksum)
    }

    // Save to disk (Electron) or IndexedDB (Web)
    await this.saveModelFile(filePath, fileData)

    // Update database
    await db.localModels.put({
      modelId: config.modelId,
      name: config.name,
      type: config.type as 'llm' | 'sentiment',
      sourceUrl: config.sourceUrl,
      filePath,
      sizeMB: config.sizeMB,
      checksum: config.checksum,
      downloaded: true,
      downloadedAt: Date.now()
    } as LocalModel)
  }

  /**
   * Get path to downloaded model
   */
  async getModelPath(modelId: string): Promise<string | null> {
    const model = await db.localModels
      .where('modelId')
      .equals(modelId)
      .first()

    return model?.filePath || null
  }

  /**
   * Validate SHA256 checksum
   */
  private async validateChecksum(
    data: Uint8Array,
    expectedHash: string
  ): Promise<void> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const actualHash = `sha256-${hashHex}`

    if (actualHash !== expectedHash) {
      throw new Error('Checksum validation failed')
    }
  }

  /**
   * Check available disk space
   */
  private async checkDiskSpace(requiredMB: number): Promise<void> {
    // Electron: use fs.statfs
    // Web: use StorageManager.estimate()
    if (navigator.storage && navigator.storage.estimate) {
      const { quota, usage } = await navigator.storage.estimate()
      const availableMB = ((quota || 0) - (usage || 0)) / (1024 * 1024)

      if (availableMB < requiredMB * 1.2) { // 20% buffer
        throw new Error(`Insufficient disk space. Need ${requiredMB}MB, have ${availableMB.toFixed(0)}MB`)
      }
    }
  }

  /**
   * Save model file to disk or IndexedDB
   */
  private async saveModelFile(filePath: string, data: Uint8Array): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).electron) {
      // Electron: use fs.writeFile via IPC
      await (window as any).electron.ipcRenderer.invoke('save-model-file', filePath, data)
    } else {
      // Web: Save to IndexedDB
      // Implementation using FileSystem API or Blob storage
      // Store in IndexedDB under filePath key
      console.log('Would save model to:', filePath, 'size:', data.length)
    }
  }
}

export const modelManager = new ModelManager()
