import React, { useState, useEffect } from 'react';
import './App.css';
import DebugInfo from './components/ui/DebugInfo' // ✅ RUTA CORREGIDA
import { api } from './lib/supabase' // ✅ Importar API de Supabase

function App() {
  const [orders, setOrders] = useState([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [accessories, setAccessories] = useState([{ accessory_type: 'bolsa', quantity: 1 }]);
  const [extraAccessory, setExtraAccessory] = useState(false);
  const [selected, setSelected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(false); // ✅ Estado de carga
  const [error, setError] = useState(''); // ✅ Estado de error

  useEffect(() => {
    fetchOrders();
  }, [searchTerm, dateFilter]);

  // ✅ ACTUALIZADO: Usar Supabase en lugar de /api/
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      let data;
      if (searchTerm || dateFilter) {
        // Usar búsqueda con filtros
        data = await api.searchOrders(searchTerm, dateFilter);
      } else {
        // Obtener todas las órdenes
        data = await api.getOrders();
      }
      
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(`Error al cargar órdenes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ACTUALIZADO: Usar Supabase en lugar de /api/
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!orderNumber.trim()) {
      setError('El número de orden es requerido');
      return;
    }

    const newOrder = {
      order_number: orderNumber.trim(),
      accessories: accessories,
      extra_accessory: extraAccessory,
      selected: selected,
    };

    try {
      setLoading(true);
      setError('');
      
      await api.addOrder(newOrder);
      
      // Limpiar formulario
      setOrderNumber('');
      setAccessories([{ accessory_type: 'bolsa', quantity: 1 }]);
      setExtraAccessory(false);
      setSelected(false);
      
      // Recargar órdenes
      await fetchOrders();
      
      console.log('✅ Orden agregada exitosamente');
    } catch (error) {
      console.error('Error adding order:', error);
      setError(`Error al agregar orden: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ACTUALIZADO: Usar Supabase en lugar de /api/
  const handleCloseOrder = async (orderId, status) => {
    try {
      setLoading(true);
      setError('');
      
      await api.closeOrder(orderId, status);
      await fetchOrders(); // Recargar órdenes
      
      console.log('✅ Orden cerrada exitosamente');
    } catch (error) {
      console.error('Error closing order:', error);
      setError(`Error al cerrar orden: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addAccessory = () => {
    setAccessories([...accessories, { accessory_type: 'bolsa', quantity: 1 }]);
  };

  const removeAccessory = (index) => {
    if (accessories.length > 1) {
      setAccessories(accessories.filter((_, i) => i !== index));
    }
  };

  const updateAccessory = (index, field, value) => {
    const updatedAccessories = accessories.map((acc, i) => 
      i === index ? { ...acc, [field]: value } : acc
    );
    setAccessories(updatedAccessories);
  };

  // ✅ ACTUALIZADO: Funciones de exportación (por ahora mostrar mensaje)
  const exportToExcel = () => {
    alert('Función de exportación a Excel en desarrollo para Supabase');
    console.log('📊 Export to Excel - Orders:', orders);
  };

  const exportToPDF = () => {
    alert('Función de exportación a PDF en desarrollo para Supabase');
    console.log('📄 Export to PDF - Orders:', orders);
  };

  // Check if form should be disabled (when extraAccessory is false)
  const isFormDisabled = !extraAccessory;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8 text-center">
          Gestión de Órdenes de Accesorios
        </h1>
        
        {/* ✅ MOSTRAR ERRORES */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {/* ✅ MOSTRAR ESTADO DE CARGA */}
        {loading && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
            <strong>Cargando...</strong> Por favor espere.
          </div>
        )}
        
        {/* Form Section */}
        <div className="bg-card rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-card-foreground mb-4">
            Agregar Nueva Orden
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Order Number and Checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground">
                  Número de Orden:
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  disabled={isFormDisabled || loading}
                  className={`w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                    isFormDisabled || loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="extraAccessory"
                  checked={extraAccessory}
                  onChange={(e) => setExtraAccessory(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-ring"
                />
                <label htmlFor="extraAccessory" className="text-sm font-medium text-card-foreground">
                  Accesorio Extra (Sí/No)
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="selected"
                  checked={selected}
                  onChange={(e) => setSelected(e.target.checked)}
                  disabled={isFormDisabled || loading}
                  className={`w-4 h-4 text-primary bg-background border-border rounded focus:ring-ring ${
                    isFormDisabled || loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                <label htmlFor="selected" className={`text-sm font-medium text-card-foreground ${
                  isFormDisabled || loading ? 'opacity-50' : ''
                }`}>
                  Seleccionar
                </label>
              </div>
            </div>

            {/* Accessories Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-card-foreground">
                  Accesorios
                </h3>
                <button
                  type="button"
                  onClick={addAccessory}
                  disabled={isFormDisabled || loading}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    isFormDisabled || loading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                  }`}
                >
                  + Agregar Accesorio
                </button>
              </div>

              {accessories.map((accessory, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-border rounded-md bg-muted/20">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-card-foreground">
                      Tipo de Accesorio:
                    </label>
                    <select
                      value={accessory.accessory_type}
                      onChange={(e) => updateAccessory(index, 'accessory_type', e.target.value)}
                      disabled={isFormDisabled || loading}
                      className={`w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                        isFormDisabled || loading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="bolsa">Bolsa</option>
                      <option value="pelota">Pelota</option>
                      <option value="gorra">Gorra</option>
                      <option value="guantes">Guantes</option>
                      <option value="kit">Kit</option>
                      <option value="accesorio pequeño">Accesorio Pequeño</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-card-foreground">
                      Cantidad:
                    </label>
                    <input
                      type="number"
                      value={accessory.quantity}
                      onChange={(e) => updateAccessory(index, 'quantity', parseInt(e.target.value))}
                      min="1"
                      disabled={isFormDisabled || loading}
                      className={`w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                        isFormDisabled || loading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      required
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeAccessory(index)}
                      disabled={isFormDisabled || loading || accessories.length === 1}
                      className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
                        isFormDisabled || loading || accessories.length === 1
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      }`}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isFormDisabled || loading}
                className={`px-8 py-3 rounded-md font-medium transition-colors ${
                  isFormDisabled || loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {loading ? 'Agregando...' : 'Agregar Orden'}
              </button>
            </div>
          </form>
          {isFormDisabled && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-md">
              <p className="text-sm text-yellow-800">
                ⚠️ Debe seleccionar "Accesorio Extra" para habilitar el formulario y poder agregar órdenes.
              </p>
            </div>
          )}
        </div>

        {/* Search and Filter Section */}
        <div className="bg-card rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-card-foreground mb-4">
            Buscar y Filtrar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground">
                Buscar por Número de Orden:
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ingrese número de orden..."
                disabled={loading}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground">
                Filtrar por Fecha:
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            
            <div className="flex space-x-2 items-end">
              <button
                onClick={exportToExcel}
                disabled={loading}
                className="flex-1 bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors font-medium disabled:opacity-50"
              >
                Exportar a Excel
              </button>
              <button
                onClick={exportToPDF}
                disabled={loading}
                className="flex-1 bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors font-medium disabled:opacity-50"
              >
                Exportar a PDF
              </button>
            </div>
          </div>
        </div>

        {/* Orders Table Section */}
        <div className="bg-card rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-card-foreground mb-4">
            Lista de Órdenes de Accesorios ({orders.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-card-foreground">
                    Número de Orden
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-card-foreground">
                    Accesorios
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-card-foreground">
                    Accesorio Extra
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-card-foreground">
                    Seleccionado
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-card-foreground">
                    Fecha de Orden
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-card-foreground">
                    Cerrar Orden
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className={`border-b border-border hover:bg-muted/50 transition-colors ${
                    order.is_closed ? 'bg-green-50 dark:bg-green-900/20' : ''
                  }`}>
                    <td className="py-3 px-4 text-card-foreground">{order.order_number}</td>
                    <td className="py-3 px-4 text-card-foreground">
                      <div className="space-y-1">
                        {order.accessories && order.accessories.map((acc, index) => (
                          <div key={index} className="text-sm">
                            <span className="capitalize font-medium">{acc.accessory_type}</span>
                            <span className="text-muted-foreground"> (x{acc.quantity})</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-card-foreground">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.extra_accessory 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {order.extra_accessory ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-card-foreground">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.selected 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {order.selected ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-card-foreground text-sm">
                      {new Date(order.order_date).toLocaleString('es-ES')}
                    </td>
                    <td className="py-3 px-4">
                      {order.is_closed ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          order.accessories_added 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {order.accessories_added ? 'Agregados' : 'No Agregados'}
                        </span>
                      ) : (
                        <select
                          onChange={(e) => {
                            if (e.target.value !== '') {
                              handleCloseOrder(order.id, e.target.value === 'agregados');
                            }
                          }}
                          disabled={loading}
                          className="px-2 py-1 border border-border rounded-md bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                          defaultValue=""
                        >
                          <option value="">Accesorios...</option>
                          <option value="agregados">Agregados</option>
                          <option value="no_agregados">No Agregados</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron órdenes que coincidan con los criterios de búsqueda.
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* ✅ AGREGAR COMPONENTE DEBUG INFO CON RUTA CORRECTA */}
      <DebugInfo />
    </div>
  );
}

export default App;

