// Configuración de Supabase CORREGIDA para usar columna 'celda'
// Este archivo debe REEMPLAZAR tu frontend/src/lib/supabase.js

import { createClient } from '@supabase/supabase-js'

// Tu configuración de Supabase
const supabaseUrl = 'https://ujibmyclnhouogevzxcl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaWJteWNsbmhvdW9nZXZ6eGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTMyODksImV4cCI6MjA2NzA2OTI4OX0.GrKEUV6HOSmBauj1lHu3z_l8rqmfWZuSVi1mIREB22I'

// Verificar configuración
console.log('🔧 Supabase Configuration:')
console.log('- URL:', supabaseUrl)
console.log('- Key length:', supabaseAnonKey.length)
console.log('- Environment:', import.meta.env.MODE)

// Crear cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false // Para GitHub Pages, no necesitamos persistir sesiones
  }
})

// ✅ FUNCIÓN REQUERIDA POR DEBUGINFO
export const testConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    // Probar conexión básica
    const { data, error } = await supabase
      .from('orders')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Supabase connection error:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Supabase connection successful')
    return { success: true, data }
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return { success: false, error: error.message }
  }
}

// ✅ API CORREGIDA para usar estructura de tabla actualizada
export const api = {
  // Obtener todas las órdenes
  async getOrders() {
    try {
      console.log('📥 Fetching orders...')
      
      // ✅ CORREGIDO: Obtener directamente de la tabla orders (sin joins)
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('order_date', { ascending: false })

      if (error) {
        console.error('❌ Error fetching orders:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      console.log('✅ Orders fetched successfully:', orders.length, 'orders')

      // ✅ NUEVO: Agrupar por order_number para compatibilidad con frontend
      const groupedOrders = {}
      
      orders.forEach(order => {
        const orderNum = order.order_number
        
        if (!groupedOrders[orderNum]) {
          groupedOrders[orderNum] = {
            id: order.id,
            order_number: orderNum,
            extra_accessory: order.extra_accessory,
            celda: order.celda, // ✅ USAR CELDA en lugar de selected
            order_date: order.order_date,
            is_closed: order.is_closed,
            accessories_added: order.accessories_added,
            accessories: []
          }
        }
        
        // Agregar accesorio a la lista
        groupedOrders[orderNum].accessories.push({
          accessory_type: order.accessory_type,
          quantity: order.quantity
        })
      })

      return Object.values(groupedOrders)
    } catch (error) {
      console.error('❌ Error in getOrders:', error)
      throw error
    }
  },

  // ✅ CORREGIDO: Agregar nueva orden usando 'celda'
  async addOrder(orderData) {
    try {
      console.log('📤 Adding order:', orderData)
      
      const { order_number, extra_accessory, celda, accessories } = orderData

      // ✅ VALIDAR: Que celda sea una opción válida
      const validCeldas = ['Celda 10', 'Celda 11', 'Celda 15', 'Celda 16']
      if (!validCeldas.includes(celda)) {
        throw new Error(`Celda inválida. Opciones válidas: ${validCeldas.join(', ')}`)
      }

      // ✅ CORREGIDO: Insertar cada accesorio como fila separada
      const ordersToInsert = []
      
      for (const accessory of accessories) {
        ordersToInsert.push({
          order_number,
          accessory_type: accessory.accessory_type,
          quantity: accessory.quantity,
          extra_accessory: extra_accessory || false,
          celda: celda, // ✅ USAR CELDA en lugar de selected
          order_date: new Date().toISOString(),
          is_closed: false,
          accessories_added: false
        })
      }

      // Insertar todas las filas
      const { data: newOrders, error: orderError } = await supabase
        .from('orders')
        .insert(ordersToInsert)
        .select()

      if (orderError) {
        console.error('❌ Error inserting order:', orderError)
        throw new Error(`Insert error: ${orderError.message}`)
      }

      console.log('✅ Order inserted:', newOrders)
      return { message: 'Orden agregada exitosamente', orders: newOrders }
    } catch (error) {
      console.error('❌ Error in addOrder:', error)
      throw error
    }
  },

  // ✅ CORREGIDO: Cerrar orden por order_number
  async closeOrder(orderId, accessoriesAdded) {
    try {
      console.log('🔒 Closing order:', orderId)
      
      // Obtener order_number del ID proporcionado
      const { data: orderInfo, error: getError } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', orderId)
        .single()

      if (getError) {
        console.error('❌ Error getting order info:', getError)
        throw new Error(`Get error: ${getError.message}`)
      }

      // Actualizar todas las filas con el mismo order_number
      const { data, error } = await supabase
        .from('orders')
        .update({
          is_closed: true,
          accessories_added: accessoriesAdded || false,
        })
        .eq('order_number', orderInfo.order_number)
        .select()

      if (error) {
        console.error('❌ Error closing order:', error)
        throw new Error(`Update error: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('Orden no encontrada')
      }

      console.log('✅ Order closed successfully')
      return { message: 'Orden cerrada exitosamente' }
    } catch (error) {
      console.error('❌ Error in closeOrder:', error)
      throw error
    }
  },

  // ✅ CORREGIDO: Buscar órdenes incluyendo celda
  async searchOrders(query, date) {
    try {
      console.log('🔍 Searching orders:', { query, date })
      
      let queryBuilder = supabase
        .from('orders')
        .select('*')

      // Aplicar filtros
      if (query) {
        queryBuilder = queryBuilder.or(`order_number.ilike.%${query}%,accessory_type.ilike.%${query}%,celda.ilike.%${query}%`)
      }

      if (date) {
        queryBuilder = queryBuilder
          .gte('order_date', `${date}T00:00:00`)
          .lt('order_date', `${date}T23:59:59`)
      }

      const { data: orders, error } = await queryBuilder
        .order('order_date', { ascending: false })

      if (error) {
        console.error('❌ Error searching orders:', error)
        throw new Error(`Search error: ${error.message}`)
      }

      console.log('✅ Search completed:', orders.length, 'orders found')

      // ✅ AGRUPAR: Misma lógica que getOrders
      const groupedOrders = {}
      
      orders.forEach(order => {
        const orderNum = order.order_number
        
        if (!groupedOrders[orderNum]) {
          groupedOrders[orderNum] = {
            id: order.id,
            order_number: orderNum,
            extra_accessory: order.extra_accessory,
            celda: order.celda, // ✅ USAR CELDA
            order_date: order.order_date,
            is_closed: order.is_closed,
            accessories_added: order.accessories_added,
            accessories: []
          }
        }
        
        groupedOrders[orderNum].accessories.push({
          accessory_type: order.accessory_type,
          quantity: order.quantity
        })
      })

      return Object.values(groupedOrders)
    } catch (error) {
      console.error('❌ Error in searchOrders:', error)
      throw error
    }
  }
}

// Ejecutar test de conexión al cargar (solo en desarrollo)
if (import.meta.env.DEV) {
  testConnection()
}

export default api

