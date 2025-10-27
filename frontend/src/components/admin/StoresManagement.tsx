// frontend/src/components/admin/StoresManagement.tsx
import React, { useState, useEffect } from 'react';
import { storeService, Store } from '../../services/storeService';
import StoreForm from './StoreForm';

const StoresManagement: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  // Cargar tiendas al montar el componente
  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      setError(null);
      const storesData = await storeService.getStores();
      setStores(storesData);
    } catch (err) {
      setError('Error al cargar las tiendas');
      console.error('Error loading stores:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para desactivar tienda
  const handleDeactivateStore = async (storeId: number) => {
    if (window.confirm('¿Estás seguro de que quieres desactivar esta tienda?')) {
      try {
        await storeService.deactivateStore(storeId);
        // Recargar la lista
        await loadStores();
      } catch (err) {
        console.error('Error desactivando tienda:', err);
        alert('Error al desactivar la tienda');
      }
    }
  };

  // Función para asignar tienda
  const handleAssignStore = async (storeId: number) => {
    const advisorId = prompt('Ingresa el ID del asesor:');
    if (advisorId && !isNaN(parseInt(advisorId))) {
      try {
        await storeService.assignStore(storeId, parseInt(advisorId));
        await loadStores();
        alert('Tienda asignada exitosamente');
      } catch (err) {
        console.error('Error asignando tienda:', err);
        alert('Error al asignar la tienda');
      }
    }
  };

  // 🆕 Función para abrir el formulario de creación
  const handleCreateStore = () => {
    setEditingStore(null);
    setIsFormOpen(true);
  };

  // 🆕 Función para abrir el formulario de edición
  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    setIsFormOpen(true);
  };

  // 🆕 Función cuando el formulario se cierra exitosamente
  const handleFormSuccess = () => {
    loadStores(); // Recargar la lista
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-lg">Cargando tiendas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>Error: </strong> {error}
        <button 
          onClick={loadStores}
          className="ml-4 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Tiendas</h1>
        <button 
          onClick={handleCreateStore}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nueva Tienda
        </button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Tiendas</h3>
          <p className="text-2xl font-bold text-blue-600">{stores.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Asignadas</h3>
          <p className="text-2xl font-bold text-green-600">
            {stores.filter(store => store.assigned_advisor_id).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Sin Asignar</h3>
          <p className="text-2xl font-bold text-orange-600">
            {stores.filter(store => !store.assigned_advisor_id).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Prioridad Alta</h3>
          <p className="text-2xl font-bold text-red-600">
            {stores.filter(store => store.priority >= 4).length}
          </p>
        </div>
      </div>

      {/* Tabla de tiendas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dirección
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contacto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prioridad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Asesor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stores.map((store) => (
              <tr key={store.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{store.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500 max-w-xs truncate">{store.address}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{store.contact_name}</div>
                  <div className="text-sm text-gray-500">{store.contact_phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    store.priority >= 4 ? 'bg-red-100 text-red-800' :
                    store.priority >= 3 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {store.priority}/5
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm ${
                    store.assigned_advisor_id ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {store.assigned_advisor_id ? `Asesor #${store.assigned_advisor_id}` : 'Sin asignar'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleAssignStore(store.id)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Asignar
                  </button>
                  <button
                    onClick={() => handleEditStore(store)}
                    className="text-green-600 hover:text-green-900 mr-3"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeactivateStore(store.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Desactivar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {stores.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay tiendas registradas
          </div>
        )}
      </div>

      {/* 🆕 Formulario de tienda */}
      <StoreForm
        store={editingStore}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default StoresManagement;