// Configuración CORREGIDA para GitHub Pages
const getApiBaseUrl = () => {
  // Detectar si estamos en desarrollo local
  const isLocalDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1'
  
  if (isLocalDevelopment) {
    // En desarrollo local, usar localhost
    return 'http://localhost:5000'
  } else {
    // En GitHub Pages, usar backend desplegado
    // ⚠️ REEMPLAZA CON TU URL REAL DESPUÉS DE DESPLEGAR
    return 'https://tu-backend.onrender.com'
  }
}

const API_BASE_URL = getApiBaseUrl()

// Función helper para hacer peticiones HTTP
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  
  console.log(`🌐 API Request: ${url}`) // Para debugging
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  }
  
  const config = { ...defaultOptions, ...options }
  
  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Backend no encontrado. Verifica que esté desplegado.')
      } else if (response.status === 0) {
        throw new Error('No se puede conectar al backend. Verifica la URL.')
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const contentType = response.headers.get('content-type')
    if (contentType && (contentType.includes('application/vnd.openxmlformats') || contentType.includes('application/pdf'))) {
      return response.blob()
    }
    
    return await response.json()
  } catch (error) {
    console.error('❌ API Request Error:', error)
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('No se puede conectar al backend. Asegúrate de que esté desplegado.')
    }
    
    throw error
  }
}

// API endpoints
export const api = {
  healthCheck: () => apiRequest('/health'),
  getOrders: () => apiRequest('/api/orders'),
  addOrder: (orderData) => apiRequest('/api/add_order', {
    method: 'POST',
    body: JSON.stringify(orderData)
  }),
  closeOrder: (orderId, accessoriesAdded) => apiRequest(`/api/orders/${orderId}/close`, {
    method: 'PUT',
    body: JSON.stringify({ accessories_added: accessoriesAdded })
  }),
  searchOrders: (query, date) => {
    const params = new URLSearchParams()
    if (query) params.append('q', query)
    if (date) params.append('date', date)
    return apiRequest(`/api/orders/search?${params.toString()}`)
  },
  exportExcel: async () => await apiRequest('/api/export/excel'),
  exportPdf: async () => await apiRequest('/api/export/pdf')
}

// Mostrar configuración en consola
console.log('🔧 API Configuration:')
console.log('- Environment:', import.meta.env.MODE)
console.log('- API Base URL:', API_BASE_URL)
console.log('- Current Host:', window.location.hostname)

export default api
