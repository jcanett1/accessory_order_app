import { createClient } from '@supabase/supabase-js'

// Tu configuración de Supabase
const supabaseUrl = 'https://ujibmyclnhouogevzxcl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaWJteWNsbmhvdW9nZXZ6eGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTMyODksImV4cCI6MjA2NzA2OTI4OX0.GrKEUV6HOSmBauj1lHu3z_l8rqmfWZuSVi1mIREB22I'

// Crear cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false // Para GitHub Pages
  }
})

// Test de conexión
export const testConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    const { data, error } = await supabase
      .from('orders')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Supabase error:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Supabase connected successfully')
    return { success: true, data }
  } catch (error) {
    console.error('❌ Connection error:', error)
    return { success: false, error: error.message }
  }
}

// API con mejor manejo de errores
export const api = {
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
        console.error('❌ Database error:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      console.log('✅ Orders fetched:', orders.length)

      return orders.map(order => ({
        ...order,
        accessories: order.order_accessories || []
      }))
    } catch (error) {
      console.error('❌ Error in getOrders:', error)
      throw error
    }
  },

  async addOrder(orderData) {
    try {
      const { order_number, extra_accessory, selected, accessories } = orderData

      // Verificar si existe
      const { data: existing, error: checkError } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', order_number)
        .maybeSingle()

      if (checkError) throw new Error(`Check error: ${checkError.message}`)
      if (existing) throw new Error('El número de orden ya existe')

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

      if (orderError) throw new Error(`Insert error: ${orderError.message}`)

      // Insertar accesorios
      if (accessories && accessories.length > 0) {
        const accessoriesData = accessories.map(acc => ({
          order_id: newOrder.id,
          accessory_type: acc.type,
          quantity: acc.quantity,
        }))

        const { error: accessoriesError } = await supabase
          .from('order_accessories')
          .insert(accessoriesData)

        if (accessoriesError) throw new Error(`Accessories error: ${accessoriesError.message}`)
      }

      return { message: 'Orden agregada exitosamente', order_id: newOrder.id }
    } catch (error) {
      console.error('❌ Error in addOrder:', error)
      throw error
    }
  }
}

// Ejecutar test al cargar
testConnection()

export default api
