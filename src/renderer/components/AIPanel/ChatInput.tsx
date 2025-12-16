import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { useAIStore } from '../../stores/aiStore'

export function ChatInput() {
  const [input, setInput] = useState('')
  const { sendMessage, isAnalyzing } = useAIStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isAnalyzing) return

    const message = input.trim()
    setInput('')
    await sendMessage(message)
  }

  return (
    <div className="border-t border-terminal-border p-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your AI co-pilot..."
          disabled={isAnalyzing}
          className="flex-1 bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-terminal-amber/50 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isAnalyzing}
          className="bg-terminal-amber text-black px-4 py-2 rounded text-sm font-medium hover:bg-terminal-amber/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  )
}
