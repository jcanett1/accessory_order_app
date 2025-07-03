// Componente de debugging robusto para GitHub Pages + Supabase
// Este archivo debe REEMPLAZAR tu frontend/src/components/ui/DebugInfo.jsx

import { useState, useEffect } from 'react'

export default function DebugInfo() {
  const [debugInfo, setDebugInfo] = useState({
    environment: 'loading...',
    baseUrl: 'loading...',
    supabaseStatus: 'testing...',
    currentUrl: 'loading...',
    errors: []
  })

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const gatherDebugInfo = async () => {
      const info = {
        environment: import.meta.env.MODE,
        baseUrl: import.meta.env.BASE_URL,
        currentUrl: window.location.href,
        hostname: window.location.hostname,
        pathname: window.location.pathname,
        errors: []
      }

      // Test Supabase connection con manejo robusto de errores
      try {
        // Intentar importar dinámicamente para evitar errores si no existe
        const supabaseModule = await import('../../lib/supabase')
        
        // Verificar si existe la función testConnection
        if (supabaseModule.testConnection) {
          const connectionTest = await supabaseModule.testConnection()
          info.supabaseStatus = connectionTest.success ? '✅ Connected' : `❌ ${connectionTest.error}`
        } else if (supabaseModule.supabase) {
          // Si no hay testConnection, hacer una prueba básica
          try {
            const { data, error } = await supabaseModule.supabase
              .from('orders')
              .select('count')
              .limit(1)
            
            if (error) {
              info.supabaseStatus = `❌ Query error: ${error.message}`
            } else {
              info.supabaseStatus = '✅ Connected (basic test)'
            }
          } catch (queryError) {
            info.supabaseStatus = `❌ Query failed: ${queryError.message}`
          }
        } else {
          info.supabaseStatus = '❌ No supabase client found'
          info.errors.push('Supabase client not properly exported')
        }
      } catch (importError) {
        info.supabaseStatus = `❌ Import error: ${importError.message}`
        info.errors.push(`Supabase import failed: ${importError.message}`)
      }

      // Check for common issues
      if (info.hostname === 'localhost') {
        info.errors.push('Running on localhost - GitHub Pages issues may not be visible')
      }

      if (info.baseUrl === '/') {
        info.errors.push('Base URL is "/" - may cause 404s on GitHub Pages')
      }

      // Check if we're on GitHub Pages
      if (info.hostname.includes('github.io')) {
        info.errors.push('Running on GitHub Pages - check console for any 404 errors')
      }

      // Check for missing dependencies
      try {
        await import('@supabase/supabase-js')
      } catch (depError) {
        info.errors.push('Missing @supabase/supabase-js dependency')
      }

      setDebugInfo(info)
    }

    gatherDebugInfo()
  }, [])

  // Solo mostrar en desarrollo o si hay errores
  const shouldShow = import.meta.env.DEV || debugInfo.errors.length > 0 || debugInfo.supabaseStatus.includes('❌')

  if (!shouldShow && !isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: '#333',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          fontSize: '16px',
          cursor: 'pointer',
          zIndex: 9999
        }}
        title="Show debug info"
      >
        🔧
      </button>
    )
  }

  if (!shouldShow && !isVisible) {
    return null
  }

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
      maxWidth: '400px',
      zIndex: 9999,
      border: '1px solid #333',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '10px' 
      }}>
        <div style={{ fontWeight: 'bold', color: '#4ade80' }}>
          🔧 Debug Info
        </div>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Environment:</strong> {debugInfo.environment}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Base URL:</strong> {debugInfo.baseUrl}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Current URL:</strong> {debugInfo.currentUrl}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Hostname:</strong> {debugInfo.hostname}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Supabase:</strong> {debugInfo.supabaseStatus}
      </div>

      {debugInfo.errors.length > 0 && (
        <div style={{ marginTop: '10px', padding: '8px', background: '#dc2626', borderRadius: '4px' }}>
          <strong>⚠️ Issues Found:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '15px' }}>
            {debugInfo.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '10px', color: '#888' }}>
        Press F12 → Console for detailed logs
      </div>
      
      <div style={{ marginTop: '8px', fontSize: '10px', color: '#888' }}>
        Build: {new Date().toLocaleString()}
      </div>
    </div>
  )
}

