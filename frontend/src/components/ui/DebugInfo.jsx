import { useState, useEffect } from 'react'
import { testConnection } from '../lib/supabase'

export default function DebugInfo() {
  const [debugInfo, setDebugInfo] = useState({
    environment: import.meta.env.MODE,
    baseUrl: import.meta.env.BASE_URL,
    currentUrl: window.location.href,
    supabaseStatus: 'testing...'
  })

  useEffect(() => {
    const test = async () => {
      const result = await testConnection()
      setDebugInfo(prev => ({
        ...prev,
        supabaseStatus: result.success ? '✅ Connected' : `❌ ${result.error}`
      }))
    }
    test()
  }, [])

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: '#1a1a1a',
      color: '#fff',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999
    }}>
      <div><strong>Environment:</strong> {debugInfo.environment}</div>
      <div><strong>Base URL:</strong> {debugInfo.baseUrl}</div>
      <div><strong>Supabase:</strong> {debugInfo.supabaseStatus}</div>
      <div><strong>URL:</strong> {debugInfo.currentUrl}</div>
    </div>
  )
}
