// Configuración de Supabase para GitHub Pages
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

// API con mejor manejo de errores
export const api = {
  // Obtener todas las órdenes
  async getOrders() {
    try {
      console.log('📥 Fetching orders...')
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_accessories (
            accessory_type,
            quantity
          )
        `)
        .order('order_date', { ascending: false })

      if (error) {
        console.error('❌ Error fetching orders:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      console.log('✅ Orders fetched successfully:', orders.length, 'orders')

      // Transformar para compatibilidad con tu frontend
      const transformedOrders = orders.map(order => ({
        ...order,
        accessories: order.order_accessories || []
      }))

      return transformedOrders
    } catch (error) {
      console.error('❌ Error in getOrders:', error)
      throw error
    }
  },

  // Agregar nueva orden
  async addOrder(orderData) {
    try {
      console.log('📤 Adding order:', orderData)
      
      const { order_number, extra_accessory, selected, accessories } = orderData

      // Verificar si ya existe
      const { data: existing, error: checkError } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', order_number)
        .maybeSingle() // Usar maybeSingle en lugar de single para evitar errores si no existe

      if (checkError) {
        console.error('❌ Error checking existing order:', checkError)
        throw new Error(`Check error: ${checkError.message}`)
      }

      if (existing) {
        throw new Error('El número de orden ya existe')
      }

      // Insertar orden
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number,
          extra_accessory: extra_accessory || false,
          selected: selected || false,
          order_date: new Date().toISOString(),
        })
        .select()
        .single()

      if (orderError) {
        console.error('❌ Error inserting order:', orderError)
        throw new Error(`Insert error: ${orderError.message}`)
      }

      console.log('✅ Order inserted:', newOrder)

      // Insertar accesorios si existen
      if (accessories && accessories.length > 0) {
        const accessoriesData = accessories.map(accessory => ({
          order_id: newOrder.id,
          accessory_type: accessory.type || accessory.accessory_type,
          quantity: accessory.quantity,
        }))

        const { error: accessoriesError } = await supabase
          .from('order_accessories')
          .insert(accessoriesData)

        if (accessoriesError) {
          console.error('❌ Error inserting accessories:', accessoriesError)
          throw new Error(`Accessories error: ${accessoriesError.message}`)
        }

        console.log('✅ Accessories inserted:', accessoriesData.length)
      }

      return { message: 'Orden agregada exitosamente', order_id: newOrder.id }
    } catch (error) {
      console.error('❌ Error in addOrder:', error)
      throw error
    }
  },

  // Cerrar orden
  async closeOrder(orderId, accessoriesAdded) {
    try {
      console.log('🔒 Closing order:', orderId)
      
      const { data, error } = await supabase
        .from('orders')
        .update({
          is_closed: true,
          accessories_added: accessoriesAdded || false,
        })
        .eq('id', orderId)
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

  // Buscar órdenes
  async searchOrders(query, date) {
    try {
      console.log('🔍 Searching orders:', { query, date })
      
      let queryBuilder = supabase
        .from('orders')
        .select(`
          *,
          order_accessories (
            accessory_type,
            quantity
          )
        `)

      // Aplicar filtros
      if (query) {
        queryBuilder = queryBuilder.ilike('order_number', `%${query}%`)
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

      // Transformar datos
      const transformedOrders = orders.map(order => ({
        ...order,
        accessories: order.order_accessories || []
      }))

      return transformedOrders
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

