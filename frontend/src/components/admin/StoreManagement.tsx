import React, { useState, useEffect } from 'react';
import { storeService, type IStore } from '../../services/storeService';

const StoreManagement: React.FC = () => {
  const [stores, setStores] = useState<IStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const storesData = await storeService.getStores();
      setStores(storesData || []); // ✅ Asegurar que siempre sea un array
    } catch (error) {
      console.error('Error cargando tiendas:', error);
      setStores([]); // ✅ En caso de error, establecer array vacío
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando tiendas...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Gestión de Tiendas</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button style={{ padding: '10px 20px' }}>
          + Agregar Nueva Tienda
        </button>
      </div>

      {/* ✅ Verificación segura con optional chaining */}
      <div style={{ display: 'grid', gap: '15px' }}>
        {stores?.map(store => {
          // ✅ Verificar que store existe
          if (!store) return null;
          
          return (
            <div key={store._id || store.id} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              backgroundColor: '#796f6fff'
            }}>
              <h3 style={{ margin: '0 0 10px 0' }}>
                {store.name || 'Nombre no disponible'}
              </h3>
              <p style={{ margin: '5px 0' }}>
                📍 {store.address || 'Dirección no disponible'}
              </p>
              <p style={{ margin: '5px 0' }}>
                📞 {store.contact?.name || 'Contacto no disponible'} - {store.contact?.phone || 'Sin teléfono'}
              </p>
              <p style={{ margin: '5px 0' }}>
                ⭐ Prioridad: {store.priority || 0}/5
              </p>
              <p style={{ margin: '5px 0' }}>
                👤 Asesor: {store.assignedAdvisor?.name || 'Sin asignar'}
              </p>
              <div style={{ marginTop: '10px' }}>
                <button style={{ marginRight: '10px', padding: '5px 10px' }}>
                  Editar
                </button>
                <button style={{ padding: '5px 10px' }}>
                  {store.assignedAdvisor ? 'Reasignar' : 'Asignar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ✅ Mostrar mensaje si no hay tiendas */}
      {(!stores || stores.length === 0) && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#666',
          border: '1px dashed #ddd',
          borderRadius: '8px'
        }}>
          <h3>No hay tiendas registradas</h3>
          <p>Comienza agregando tu primera tienda</p>
        </div>
      )}
    </div>
  );
};

export default StoreManagement;