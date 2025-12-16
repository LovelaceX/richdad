import { useAIStore } from '../../stores/aiStore'
import { ChatMessage } from './ChatMessage'

export function ActivityLog() {
  const messages = useAIStore(state => state.messages)

  return (
    <div className="p-2 space-y-1">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 text-xs py-8">
          AI activity will appear here...
        </div>
      ) : (
        messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))
      )}
    </div>
  )
}
