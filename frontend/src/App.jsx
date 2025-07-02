import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [orders, setOrders] = useState([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [accessories, setAccessories] = useState([{ accessory_type: 'bolsa', quantity: 1 }]);
  const [extraAccessory, setExtraAccessory] = useState(false);
  const [selected, setSelected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [searchTerm, dateFilter]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (dateFilter) params.append('date', dateFilter);
      
      const response = await fetch(`/api/get_orders?${params}`);
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newOrder = {
      order_number: orderNumber,
      accessories: accessories,
      extra_accessory: extraAccessory,
      selected: selected,
    };

    try {
      await fetch('/api/add_order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newOrder),
      });
      setOrderNumber('');
      setAccessories([{ accessory_type: 'bolsa', quantity: 1 }]);
      setExtraAccessory(false);
      setSelected(false);
      fetchOrders();
    } catch (error) {
      console.error('Error adding order:', error);
    }
  };

  const handleCloseOrder = async (orderId, status) => {
    try {
      await fetch('/api/close_order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          accessories_added: status
        }),
      });
      fetchOrders();
    } catch (error) {
      console.error('Error closing order:', error);
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

  const exportToExcel = () => {
    window.open('/api/export_excel', '_blank');
  };

  const exportToPDF = () => {
    window.open('/api/export_pdf', '_blank');
  };

  // Check if form should be disabled (when extraAccessory is false)
  const isFormDisabled = !extraAccessory;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8 text-center">
          Gestión de Órdenes de Accesorios
        </h1>
        
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
                  disabled={isFormDisabled}
                  className={`w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                    isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''
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
                  disabled={isFormDisabled}
                  className={`w-4 h-4 text-primary bg-background border-border rounded focus:ring-ring ${
                    isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                <label htmlFor="selected" className={`text-sm font-medium text-card-foreground ${
                  isFormDisabled ? 'opacity-50' : ''
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
                  disabled={isFormDisabled}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    isFormDisabled 
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
                      disabled={isFormDisabled}
                      className={`w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                        isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''
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
                      disabled={isFormDisabled}
                      className={`w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                        isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      required
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeAccessory(index)}
                      disabled={isFormDisabled || accessories.length === 1}
                      className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
                        isFormDisabled || accessories.length === 1
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
                disabled={isFormDisabled}
                className={`px-8 py-3 rounded-md font-medium transition-colors ${
                  isFormDisabled 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                Agregar Orden
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
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            
            <div className="flex space-x-2 items-end">
              <button
                onClick={exportToExcel}
                className="flex-1 bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors font-medium"
              >
                Exportar a Excel
              </button>
              <button
                onClick={exportToPDF}
                className="flex-1 bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors font-medium"
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
                          className="px-2 py-1 border border-border rounded-md bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring"
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
            {orders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron órdenes que coincidan con los criterios de búsqueda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;


