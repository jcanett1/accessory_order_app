import { createClient } from '@supabase/supabase-js'

// Tu configuración de Supabase
const supabaseUrl = 'https://ujibmyclnhouogevzxcl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaWJteWNsbmhvdW9nZXZ6eGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTMyODksImV4cCI6MjA2NzA2OTI4OX0.GrKEUV6HOSmBauj1lHu3z_l8rqmfWZuSVi1mIREB22I'

// Crear cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// API simple para tu aplicación
export const api = {
  // Obtener todas las órdenes
  async getOrders() {
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

    if (error) throw error

    return orders.map(order => ({
      ...order,
      accessories: order.order_accessories || []
    }))
  },

  // Agregar nueva orden
  async addOrder(orderData) {
    const { order_number, extra_accessory, selected, accessories } = orderData

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', order_number)
      .single()

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

    if (orderError) throw orderError

    // Insertar accesorios si existen
    if (accessories && accessories.length > 0) {
      const accessoriesData = accessories.map(accessory => ({
        order_id: newOrder.id,
        accessory_type: accessory.type,
        quantity: accessory.quantity,
      }))

      const { error: accessoriesError } = await supabase
        .from('order_accessories')
        .insert(accessoriesData)

      if (accessoriesError) throw accessoriesError
    }

    return { message: 'Orden agregada exitosamente', order_id: newOrder.id }
  },

  // Cerrar orden
  async closeOrder(orderId, accessoriesAdded) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        is_closed: true,
        accessories_added: accessoriesAdded || false,
      })
      .eq('id', orderId)
      .select()

    if (error) throw error
    if (!data || data.length === 0) throw new Error('Orden no encontrada')

    return { message: 'Orden cerrada exitosamente' }
  },

  // Buscar órdenes
  async searchOrders(query, date) {
    let queryBuilder = supabase
      .from('orders')
      .select(`
        *,
        order_accessories (
          accessory_type,
          quantity
        )
      `)

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

    if (error) throw error

    return orders.map(order => ({
      ...order,
      accessories: order.order_accessories || []
    }))
  }
}

export default api
