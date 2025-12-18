import { useState } from 'react'
import { Loader2, CheckCircle2, XCircle, Wifi } from 'lucide-react'
import { testPolygonKey } from '../../../services/polygonValidator'
import { testTwelveDataConnection } from '../../../services/twelveDataService'

interface ApiKeyInputProps {
  provider: 'twelvedata' | 'polygon'
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

type ValidationStatus = 'idle' | 'testing' | 'valid' | 'invalid'

export function ApiKeyInput({
  provider,
  value,
  onChange,
  placeholder = 'Paste your API key here',
}: ApiKeyInputProps) {
  const [status, setStatus] = useState<ValidationStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleTest = async () => {
    if (!value.trim()) {
      setStatus('invalid')
      setErrorMessage('Please enter an API key')
      return
    }

    setStatus('testing')
    setErrorMessage('')

    try {
      let result: { valid?: boolean; success?: boolean; message: string }

      if (provider === 'polygon') {
        result = await testPolygonKey(value)
      } else {
        // TwelveData returns { success, message } instead of { valid, message }
        const twelveResult = await testTwelveDataConnection(value)
        result = { valid: twelveResult.success, message: twelveResult.message }
      }

      if (result.valid) {
        setStatus('valid')
      } else {
        setStatus('invalid')
        setErrorMessage(result.message || 'Invalid API key')
      }
    } catch (error) {
      setStatus('invalid')
      setErrorMessage('Connection failed. Please try again.')
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'testing':
        return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      case 'valid':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'invalid':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getBorderColor = () => {
    switch (status) {
      case 'valid':
        return 'border-green-500'
      case 'invalid':
        return 'border-red-500'
      default:
        return 'border-terminal-border'
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-gray-400 text-xs block">API Key</label>

      <div className="flex gap-2">
        <div className={`flex-1 relative border ${getBorderColor()} rounded overflow-hidden`}>
          <input
            type="password"
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              setStatus('idle')
              setErrorMessage('')
            }}
            placeholder={placeholder}
            className="w-full bg-terminal-bg px-3 py-2 text-sm text-white placeholder:text-gray-600 font-mono focus:outline-none"
          />
          {status !== 'idle' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getStatusIcon()}
            </div>
          )}
        </div>

        <button
          onClick={handleTest}
          disabled={!value.trim() || status === 'testing'}
          className="px-4 py-2 bg-terminal-bg border border-terminal-border rounded text-white hover:border-terminal-amber transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {status === 'testing' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wifi className="w-4 h-4" />
          )}
          <span className="text-sm">
            {status === 'testing' ? 'Testing...' : 'Test'}
          </span>
        </button>
      </div>

      {/* Status Message */}
      {status === 'valid' && (
        <p className="text-green-500 text-xs">
          Connection successful! API key is valid.
        </p>
      )}
      {status === 'invalid' && errorMessage && (
        <p className="text-red-500 text-xs">{errorMessage}</p>
      )}
    </div>
  )
}
