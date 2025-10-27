// frontend/src/components/admin/StoreManagement.tsx
import React, { useState, useEffect } from 'react';
import { storeService, type IStore, type StoreFormData } from '../../services/storeService';
import '../../styles/StoreManagement.css';

const StoreManagement: React.FC = () => {
  const [stores, setStores] = useState<IStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<IStore | null>(null);
  const [formData, setFormData] = useState<StoreFormData>({
    name: '',
    address: '',
    lat: 4.6097,
    lng: -74.0817,
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    priority: 2, // medium por defecto
    estimated_visit_time: 40,
    category: 'supermarket',
    zone: 'Centro'
  });
  const [searchZone, setSearchZone] = useState('');
  const [searchCategory, setSearchCategory] = useState('');

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      const storesData = await storeService.getStores();
      setStores(storesData);
    } catch (error) {
      console.error('Error cargando tiendas:', error);
      alert('Error al cargar las tiendas');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (searchZone) filters.zone = searchZone;
      if (searchCategory) filters.category = searchCategory;
      
      const storesData = await storeService.searchStores(filters);
      setStores(storesData);
    } catch (error) {
      console.error('Error buscando tiendas:', error);
      alert('Error al buscar tiendas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStore) {
        await storeService.updateStore(editingStore.id, formData);
      } else {
        await storeService.createStore(formData);
      }
      
      await loadStores();
      resetForm();
      alert(`Tienda ${editingStore ? 'actualizada' : 'creada'} exitosamente`);
    } catch (error) {
      console.error('Error guardando tienda:', error);
      alert('Error al guardar la tienda');
    }
  };

  const handleEdit = (store: IStore) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      address: store.address,
      lat: store.coordinates.lat,
      lng: store.coordinates.lng,
      contact_name: store.contact_name,
      contact_phone: store.contact_phone,
      contact_email: store.contact_email || '',
      priority: store.priority,
      estimated_visit_time: store.estimated_visit_time,
      category: store.category,
      zone: store.zone
    });
    setShowForm(true);
  };

  const handleDelete = async (storeId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta tienda?')) {
      try {
        await storeService.deleteStore(storeId);
        await loadStores();
        alert('Tienda eliminada exitosamente');
      } catch (error) {
        console.error('Error eliminando tienda:', error);
        alert('Error al eliminar la tienda');
      }
    }
  };

  // ✅ AGREGADO: Función para asignar tienda a asesor
  const handleAssignStore = async (storeId: number) => {
    const advisorId = prompt('Ingresa el ID del asesor:');
    if (advisorId && !isNaN(parseInt(advisorId))) {
      try {
        await storeService.assignStore(storeId, parseInt(advisorId));
        await loadStores();
        alert('Tienda asignada exitosamente');
      } catch (error) {
        console.error('Error asignando tienda:', error);
        alert('Error al asignar la tienda');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      lat: 4.6097,
      lng: -74.0817,
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      priority: 2,
      estimated_visit_time: 40,
      category: 'supermarket',
      zone: 'Centro'
    });
    setEditingStore(null);
    setShowForm(false);
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3: return '#dc3545'; // high
      case 2: return '#ffc107'; // medium
      case 1: return '#28a745'; // low
      default: return '#6c757d';
    }
  };

  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 3: return 'Alta';
      case 2: return 'Media';
      case 1: return 'Baja';
      default: return 'No definida';
    }
  };

  if (loading) {
    return (
      <div className="store-management">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando tiendas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="store-management">
      {/* Header */}
      <div className="store-header">
        <h1>🏪 Gestión de Tiendas</h1>
        <div className="header-actions">
          <button 
            className="btn-primary"
            onClick={() => setShowForm(true)}
          >
            + Agregar Nueva Tienda
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="store-stats">
        <div className="stat-card">
          <div className="stat-value">{stores.length}</div>
          <div className="stat-label">Total Tiendas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {stores.filter(s => s.priority === 3).length}
          </div>
          <div className="stat-label">Prioridad Alta</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {stores.filter(s => s.zone === 'Centro').length}
          </div>
          <div className="stat-label">Zona Centro</div>
        </div>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="search-section">
        <h3>🔍 Buscar Tiendas</h3>
        <div className="search-filters">
          <select 
            value={searchZone}
            onChange={(e) => setSearchZone(e.target.value)}
          >
            <option value="">Todas las zonas</option>
            <option value="Centro">Centro</option>
            <option value="Norte">Norte</option>
            <option value="Sur">Sur</option>
            <option value="Oriente">Oriente</option>
            <option value="Occidente">Occidente</option>
          </select>
          
          <select 
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            <option value="supermarket">Supermercado</option>
            <option value="minimarket">Minimarket</option>
            <option value="wholesale">Mayorista</option>
            <option value="convenience">Tienda de Barrio</option>
          </select>
          
          <button className="btn-secondary" onClick={handleSearch}>
            Buscar
          </button>
          <button className="btn-outline" onClick={loadStores}>
            Mostrar Todas
          </button>
        </div>
      </div>

      {/* Formulario de tienda */}
      {showForm && (
        <div className="form-modal">
          <div className="form-container">
            <h2>{editingStore ? 'Editar Tienda' : 'Nueva Tienda'}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre de la Tienda *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="Ej: Vitamarket Centro"
                  />
                </div>

                <div className="form-group">
                  <label>Dirección *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    required
                    placeholder="Ej: Calle 45 # 26-10"
                  />
                </div>

                <div className="form-group">
                  <label>Zona</label>
                  <select
                    value={formData.zone}
                    onChange={(e) => setFormData({...formData, zone: e.target.value})}
                  >
                    <option value="Centro">Centro</option>
                    <option value="Norte">Norte</option>
                    <option value="Sur">Sur</option>
                    <option value="Oriente">Oriente</option>
                    <option value="Occidente">Occidente</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="supermarket">Supermercado</option>
                    <option value="minimarket">Minimarket</option>
                    <option value="wholesale">Mayorista</option>
                    <option value="convenience">Tienda de Barrio</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Prioridad</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                  >
                    <option value={1}>Baja</option>
                    <option value={2}>Media</option>
                    <option value={3}>Alta</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tiempo Estimado de Visita (minutos)</label>
                  <input
                    type="number"
                    value={formData.estimated_visit_time}
                    onChange={(e) => setFormData({...formData, estimated_visit_time: parseInt(e.target.value)})}
                    min="10"
                    max="120"
                  />
                </div>

                <div className="form-group">
                  <label>Latitud</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => setFormData({...formData, lat: parseFloat(e.target.value)})}
                    placeholder="4.6097"
                  />
                </div>

                <div className="form-group">
                  <label>Longitud</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lng}
                    onChange={(e) => setFormData({...formData, lng: parseFloat(e.target.value)})}
                    placeholder="-74.0817"
                  />
                </div>

                <div className="form-group">
                  <label>Nombre de Contacto</label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                    placeholder="Ej: María González"
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono de Contacto</label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                    placeholder="Ej: 3001234567"
                  />
                </div>

                <div className="form-group">
                  <label>Email de Contacto</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                    placeholder="Ej: contacto@tienda.com"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingStore ? 'Actualizar Tienda' : 'Crear Tienda'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de tiendas */}
      <div className="store-list">
        <h3>📋 Lista de Tiendas ({stores.length})</h3>
        
        {stores.length === 0 ? (
          <div className="empty-state">
            <h4>No hay tiendas registradas</h4>
            <p>Comienza agregando tu primera tienda</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + Agregar Primera Tienda
            </button>
          </div>
        ) : (
          <div className="store-grid">
            {stores.map(store => (
              <div key={store.id} className="store-card">
                <div className="store-card-header">
                  <h4>{store.name}</h4>
                  <span 
                    className="priority-badge"
                    style={{ backgroundColor: getPriorityColor(store.priority) }}
                  >
                    {getPriorityText(store.priority)}
                  </span>
                </div>
                
                <div className="store-card-details">
                  <p className="store-address">📍 {store.address}</p>
                  <p className="store-zone">🏙️ Zona: {store.zone}</p>
                  <p className="store-category">📦 Categoría: {store.category}</p>
                  <p className="store-time">⏱️ Tiempo estimado: {store.estimated_visit_time} min</p>
                  
                  {store.contact_name && (
                    <p className="store-contact">👤 Contacto: {store.contact_name}</p>
                  )}
                  {store.contact_phone && (
                    <p className="store-phone">📞 {store.contact_phone}</p>
                  )}
                  {store.contact_email && (
                    <p className="store-email">📧 {store.contact_email}</p>
                  )}
                </div>

                <div className="store-card-actions">
                  {/* ✅ AGREGADO: Botón de Asignar */}
                  <button 
                    className="btn-assign"
                    onClick={() => handleAssignStore(store.id)}
                  >
                    👤 Asignar
                  </button>
                  <button 
                    className="btn-edit"
                    onClick={() => handleEdit(store)}
                  >
                    ✏️ Editar
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDelete(store.id)}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreManagement;