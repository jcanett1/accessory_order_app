import React, { useState, useEffect } from 'react';
import './App.css';
// import DebugInfo from './components/ui/DebugInfo' // ✅ COMENTADO
import { api } from './lib/supabase' // ✅ Importar API de Supabase

function App() {
  const [orders, setOrders] = useState([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [accessories, setAccessories] = useState([{ accessory_type: 'bolsa', quantity: 1 }]);
  const [extraAccessory, setExtraAccessory] = useState(false);
  const [celda, setCelda] = useState(''); // ✅ CAMBIADO: de 'selected' a 'celda'
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [celdaFilter, setCeldaFilter] = useState(''); // ✅ NUEVO: Filtro por celda
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // ✅ NUEVO: Estados para confirmación de cierre de órdenes
  const [confirmationInputs, setConfirmationInputs] = useState({});
  const [confirmationErrors, setConfirmationErrors] = useState({});

  // ✅ NUEVO: Lista de celdas disponibles
  const availableCeldas = ['Celda 10', 'Celda 11', 'Celda 15', 'Celda 16'];

  useEffect(() => {
    fetchOrders();
  }, [searchTerm, dateFilter, celdaFilter]); // ✅ AGREGADO: celdaFilter a las dependencias

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      let data;
      if (searchTerm || dateFilter) {
        data = await api.searchOrders(searchTerm, dateFilter);
      } else {
        data = await api.getOrders();
      }
      
      // ✅ NUEVO: Filtrar por celda en el frontend
      if (celdaFilter) {
        data = data.filter(order => order.celda === celdaFilter);
      }
      
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(`Error al cargar órdenes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!orderNumber.trim()) {
      setError('El número de orden es requerido');
      return;
    }

    if (!celda) {
      setError('Debe seleccionar una celda');
      return;
    }

    const newOrder = {
      order_number: orderNumber.trim(),
      accessories: accessories,
      extra_accessory: extraAccessory,
      celda: celda, // ✅ CAMBIADO: enviar celda en lugar de selected
    };

    try {
      setLoading(true);
      setError('');
      
      await api.addOrder(newOrder);
      
      setOrderNumber('');
      setAccessories([{ accessory_type: 'bolsa', quantity: 1 }]);
      setExtraAccessory(false);
      setCelda(''); // ✅ CAMBIADO: limpiar celda
      
      await fetchOrders();
      
      console.log('✅ Orden agregada exitosamente');
    } catch (error) {
      console.error('Error adding order:', error);
      setError(`Error al agregar orden: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVO: Función para manejar cambios en input de confirmación
  const handleConfirmationInputChange = (orderId, value) => {
    setConfirmationInputs(prev => ({
      ...prev,
      [orderId]: value
    }));
    
    // Limpiar error cuando el usuario empiece a escribir
    if (confirmationErrors[orderId]) {
      setConfirmationErrors(prev => ({
        ...prev,
        [orderId]: ''
      }));
    }
  };

  // ✅ NUEVO: Función para validar y cerrar orden
  const handleConfirmCloseOrder = async (orderId, orderNumber, inputValue) => {
    // Validar que el número ingresado coincida
    if (inputValue.trim() !== orderNumber.trim()) {
      setConfirmationErrors(prev => ({
        ...prev,
        [orderId]: 'Número de orden incorrecto, verifique si está bien'
      }));
      return;
    }

    // Si coincide, cerrar la orden automáticamente
    try {
      setLoading(true);
      setError('');
      
      // Cerrar como "agregados" por defecto (puedes cambiar esto si necesitas otra lógica)
      await api.closeOrder(orderId, true);
      await fetchOrders();
      
      // Limpiar el input y errores
      setConfirmationInputs(prev => ({
        ...prev,
        [orderId]: ''
      }));
      setConfirmationErrors(prev => ({
        ...prev,
        [orderId]: ''
      }));
      
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

  // ✅ NUEVO: Función para limpiar todos los filtros
  const clearAllFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setCeldaFilter('');
  };

  // ✅ FUNCIÓN PARA EXPORTAR A EXCEL (versión dinámica robusta)
  const exportToExcel = async () => {
    try {
      console.log('📊 Iniciando exportación a Excel...');
      
      // ✅ IMPORTACIÓN DINÁMICA ROBUSTA
      let XLSX;
      try {
        const xlsxModule = await import('xlsx');
        XLSX = xlsxModule.default || xlsxModule;
      } catch (importError) {
        console.error('❌ Error importando XLSX:', importError);
        setError('Error: Librería de Excel no disponible. Recargue la página e intente nuevamente.');
        return;
      }

      // Verificar que XLSX se cargó correctamente
      if (!XLSX || !XLSX.utils || !XLSX.writeFile) {
        console.error('❌ XLSX no se cargó correctamente');
        setError('Error: Librería de Excel no se cargó correctamente.');
        return;
      }
      
      // Preparar datos para Excel
      const excelData = orders.map(order => ({
        'Número de Orden': order.order_number,
        'Accesorios': order.accessories?.map(acc => 
          `${acc.accessory_type} (x${acc.quantity})`
        ).join(', ') || '',
        'Accesorio Extra': order.extra_accessory ? 'Sí' : 'No',
        'Celda': order.celda || 'No especificada',
        'Fecha de Orden': new Date(order.order_date).toLocaleDateString('es-ES'),
        'Estado': order.is_closed ? 
          (order.accessories_added ? 'Cerrada - Agregados' : 'Cerrada - No Agregados') : 
          'Abierta'
      }));

      // Crear libro de trabajo
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Órdenes de Accesorios');

      // Ajustar ancho de columnas
      const columnWidths = [
        { wch: 15 }, // Número de Orden
        { wch: 30 }, // Accesorios
        { wch: 15 }, // Accesorio Extra
        { wch: 12 }, // Celda
        { wch: 20 }, // Fecha de Orden
        { wch: 20 }  // Estado
      ];
      worksheet['!cols'] = columnWidths;

      // ✅ NUEVO: Nombre de archivo incluye filtro de celda si está activo
      const celdaSuffix = celdaFilter ? `_${celdaFilter.replace(' ', '_')}` : '';
      const fileName = `ordenes_accesorios${celdaSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Descargar archivo
      XLSX.writeFile(workbook, fileName);
      
      console.log('✅ Archivo Excel generado exitosamente:', fileName);
    } catch (error) {
      console.error('❌ Error exportando a Excel:', error);
      setError(`Error al exportar a Excel: ${error.message}`);
    }
  };

  // ✅ FUNCIÓN PARA EXPORTAR A PDF (versión dinámica robusta)
  const exportToPDF = async () => {
    try {
      console.log('📄 Iniciando exportación a PDF...');
      
      // ✅ IMPORTACIÓN DINÁMICA ROBUSTA
      let jsPDF;
      try {
        const [jsPDFModule, autoTableModule] = await Promise.all([
          import('jspdf'),
          import('jspdf-autotable')
        ]);
        
        jsPDF = jsPDFModule.jsPDF || jsPDFModule.default?.jsPDF || jsPDFModule.default;
        // autoTable se agrega automáticamente al prototipo de jsPDF
      } catch (importError) {
        console.error('❌ Error importando librerías PDF:', importError);
        setError('Error: Librerías de PDF no disponibles. Recargue la página e intente nuevamente.');
        return;
      }

      // Verificar que jsPDF se cargó correctamente
      if (!jsPDF) {
        console.error('❌ jsPDF no se cargó correctamente');
        setError('Error: Librería de PDF no se cargó correctamente.');
        return;
      }
      
      // Crear documento PDF
      const doc = new jsPDF();
      
      // Verificar que autoTable está disponible
      if (!doc.autoTable) {
        console.error('❌ autoTable no está disponible');
        setError('Error: Plugin de tablas PDF no disponible.');
        return;
      }
      
      // ✅ NUEVO: Título incluye filtro de celda si está activo
      const titleSuffix = celdaFilter ? ` - ${celdaFilter}` : '';
      doc.setFontSize(16);
      doc.text(`Lista de Órdenes de Accesorios${titleSuffix}`, 14, 22);
      
      // Fecha de generación
      doc.setFontSize(10);
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 14, 30);
      
      // Preparar datos para la tabla
      const tableData = orders.map(order => [
        order.order_number,
        order.accessories?.map(acc => 
          `${acc.accessory_type} (x${acc.quantity})`
        ).join(', ') || '',
        order.extra_accessory ? 'Sí' : 'No',
        order.celda || 'No especificada',
        new Date(order.order_date).toLocaleDateString('es-ES'),
        order.is_closed ? 
          (order.accessories_added ? 'Cerrada - Agregados' : 'Cerrada - No Agregados') : 
          'Abierta'
      ]);

      // Configurar tabla
      doc.autoTable({
        head: [['Número de Orden', 'Accesorios', 'Extra', 'Celda', 'Fecha', 'Estado']],
        body: tableData,
        startY: 35,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Número de Orden
          1: { cellWidth: 40 }, // Accesorios
          2: { cellWidth: 15 }, // Extra
          3: { cellWidth: 20 }, // Celda
          4: { cellWidth: 25 }, // Fecha
          5: { cellWidth: 35 }  // Estado
        },
        margin: { top: 35 },
      });

      // ✅ NUEVO: Nombre de archivo incluye filtro de celda si está activo
      const celdaSuffix = celdaFilter ? `_${celdaFilter.replace(' ', '_')}` : '';
      const fileName = `ordenes_accesorios${celdaSuffix}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Descargar archivo
      doc.save(fileName);
      
      console.log('✅ Archivo PDF generado exitosamente:', fileName);
    } catch (error) {
      console.error('❌ Error exportando a PDF:', error);
      setError(`Error al exportar a PDF: ${error.message}`);
    }
  };

  const isFormDisabled = !extraAccessory;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8 text-center">
          Gestión de Órdenes de Accesorios
        </h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}
        
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
              
              {/* ✅ CAMBIADO: Select dropdown en lugar de checkbox */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground">
                  Seleccionar Celda:
                </label>
                <select
                  value={celda}
                  onChange={(e) => setCelda(e.target.value)}
                  disabled={isFormDisabled || loading}
                  className={`w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                    isFormDisabled || loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  required
                >
                  <option value="">Seleccionar Celda</option>
                  {availableCeldas.map(celdaOption => (
                    <option key={celdaOption} value={celdaOption}>{celdaOption}</option>
                  ))}
                </select>
              </div>
            </div>

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

        {/* ✅ MEJORADO: Search and Filter Section con filtro por celda */}
        <div className="bg-card rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-card-foreground mb-4">
            Buscar y Filtrar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            {/* ✅ NUEVO: Filtro por celda */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground">
                Filtrar por Celda:
              </label>
              <select
                value={celdaFilter}
                onChange={(e) => setCeldaFilter(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todas las Celdas</option>
                {availableCeldas.map(celdaOption => (
                  <option key={celdaOption} value={celdaOption}>{celdaOption}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col space-y-2">
              {/* ✅ NUEVO: Botón para limpiar filtros */}
              <button
                onClick={clearAllFilters}
                disabled={loading}
                className="w-full bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/80 transition-colors font-medium disabled:opacity-50 text-sm"
              >
                Limpiar Filtros
              </button>
              
              <div className="flex space-x-2">
                <button
                  onClick={exportToExcel}
                  disabled={loading}
                  className="flex-1 bg-secondary text-secondary-foreground px-3 py-2 rounded-md hover:bg-secondary/90 transition-colors font-medium disabled:opacity-50 text-sm"
                >
                  Excel
                </button>
                <button
                  onClick={exportToPDF}
                  disabled={loading}
                  className="flex-1 bg-secondary text-secondary-foreground px-3 py-2 rounded-md hover:bg-secondary/90 transition-colors font-medium disabled:opacity-50 text-sm"
                >
                  PDF
                </button>
              </div>
            </div>
          </div>

          {/* ✅ NUEVO: Indicador de filtros activos */}
          {(searchTerm || dateFilter || celdaFilter) && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-800">
                  <strong>Filtros activos:</strong>
                  {searchTerm && <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">Orden: {searchTerm}</span>}
                  {dateFilter && <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">Fecha: {dateFilter}</span>}
                  {celdaFilter && <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">Celda: {celdaFilter}</span>}
                </div>
                <span className="text-sm text-blue-600 font-medium">
                  {orders.length} resultado{orders.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Orders Table Section */}
        <div className="bg-card rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-card-foreground mb-4">
            Lista de Órdenes de Accesorios ({orders.length})
            {celdaFilter && <span className="text-primary"> - {celdaFilter}</span>}
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
                    Celda {/* ✅ CAMBIADO: header de tabla */}
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
                      {/* ✅ CAMBIADO: mostrar celda en lugar de selected */}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.celda || order.selected
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {order.celda || (order.selected ? 'Sí' : 'No')}
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
                        // ✅ NUEVO: Input de confirmación en lugar de dropdown
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={confirmationInputs[order.id] || ''}
                            onChange={(e) => handleConfirmationInputChange(order.id, e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleConfirmCloseOrder(order.id, order.order_number, e.target.value);
                              }
                            }}
                            placeholder="Confirmar número de orden"
                            disabled={loading}
                            className="w-full px-2 py-1 border border-border rounded-md bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                          />
                          {confirmationErrors[order.id] && (
                            <div className="text-xs text-red-600 font-medium">
                              {confirmationErrors[order.id]}
                            </div>
                          )}
                          <button
                            onClick={() => handleConfirmCloseOrder(order.id, order.order_number, confirmationInputs[order.id] || '')}
                            disabled={loading || !confirmationInputs[order.id]?.trim()}
                            className="w-full px-2 py-1 bg-primary text-primary-foreground rounded-md text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cerrar Orden
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                {(searchTerm || dateFilter || celdaFilter) ? 
                  'No se encontraron órdenes que coincidan con los filtros aplicados.' :
                  'No se encontraron órdenes.'
                }
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* ✅ COMENTADO: DebugInfo */}
      {/* <DebugInfo /> */}
    </div>
  );
}

export default App;

