// frontend/src/components/admin/StoreManagement.tsx
import React, { useState, useEffect } from 'react';
import { storeService, type IStore, type StoreFormData } from '../../services/storeService';
import '../../styles/StoreManagement.css';

const StoreManagement: React.FC = () => {
  const [stores, setStores] = useState<IStore[]>([]);
  const [filteredStores, setFilteredStores] = useState<IStore[]>([]);
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
    priority: 2,
    estimated_visit_time: 40,
    category: 'supermarket',
    zone: 'Centro'
  });
  const [searchZone, setSearchZone] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchZone, searchCategory, stores]);

  const loadStores = async () => {
    try {
      setLoading(true);
      const storesData = await storeService.getStores();
      console.log('📊 Tiendas cargadas:', storesData);
      
      // Mostrar información de debug - CORREGIDO
      const zonasUnicas = Array.from(new Set(storesData.map(store => store.zone)));
      const categoriasUnicas = Array.from(new Set(storesData.map(store => store.category)));
      const prioridadesUnicas = Array.from(new Set(storesData.map(store => store.priority)));
      
      console.log('🗺️ Zonas en datos:', zonasUnicas);
      console.log('🏷️ Categorías en datos:', categoriasUnicas);
      console.log('🎯 Prioridades en datos:', prioridadesUnicas);
      
      setStores(storesData);
      setFilteredStores(storesData);
      setIsSearching(false);
    } catch (error) {
      console.error('Error cargando tiendas:', error);
      alert('Error al cargar las tiendas');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = stores;

    // Filtrar por zona - comparación exacta
    if (searchZone) {
      filtered = filtered.filter(store => {
        const storeZone = store.zone || '';
        const match = storeZone.toLowerCase() === searchZone.toLowerCase();
        console.log(`Zona: "${storeZone}" vs "${searchZone}" -> ${match}`);
        return match;
      });
    }

    // Filtrar por categoría - comparación exacta
    if (searchCategory) {
      filtered = filtered.filter(store => {
        const storeCategory = store.category || '';
        const match = storeCategory.toLowerCase() === searchCategory.toLowerCase();
        console.log(`Categoría: "${storeCategory}" vs "${searchCategory}" -> ${match}`);
        return match;
      });
    }

    setFilteredStores(filtered);
  };

  const handleSearch = async () => {
    try {
      setIsSearching(true);
      
      // Si ambos filtros están vacíos, cargar todas las tiendas
      if (!searchZone && !searchCategory) {
        await loadStores();
        return;
      }

      // Intentar búsqueda en el backend primero
      try {
        const filters: any = {};
        if (searchZone) filters.zone = searchZone;
        if (searchCategory) filters.category = searchCategory;
        
        const storesData = await storeService.searchStores(filters);
        setFilteredStores(storesData);
      } catch (error) {
        console.warn('Búsqueda backend falló, usando filtros locales:', error);
        // Fallback a filtros locales
        applyFilters();
      }
    } catch (error) {
      console.error('Error buscando tiendas:', error);
      alert('Error al buscar tiendas');
    }
  };

  const handleClearFilters = () => {
    setSearchZone('');
    setSearchCategory('');
    setIsSearching(false);
    loadStores();
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
      case 3: return '#dc3545';
      case 2: return '#ffc107';
      case 1: return '#28a745';
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

  // Obtener zonas únicas de las tiendas para los filtros - CORREGIDO
  const getUniqueZones = () => {
    const zones = Array.from(new Set(stores.map(store => store.zone).filter(Boolean))) as string[];
    console.log('Zonas disponibles para filtros:', zones);
    return zones;
  };

  // Obtener categorías únicas de las tiendas para los filtros - CORREGIDO
  const getUniqueCategories = () => {
    const categories = Array.from(new Set(stores.map(store => store.category).filter(Boolean))) as string[];
    console.log('Categorías disponibles para filtros:', categories);
    return categories;
  };

  // Determinar qué tiendas mostrar
  const storesToShow = isSearching ? filteredStores : stores;

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
            {stores.filter(s => s.zone && s.zone.includes('Norte')).length}
          </div>
          <div className="stat-label">Zona Norte</div>
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
            {getUniqueZones().map(zone => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
          
          <select 
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {getUniqueCategories().map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          
          <button className="btn-secondary" onClick={handleSearch}>
            Buscar
          </button>
          <button className="btn-outline" onClick={handleClearFilters}>
            Mostrar Todas
          </button>
        </div>
        
        {/* Indicador de búsqueda activa */}
        {(searchZone || searchCategory) && (
          <div className="search-active">
            <span>
              Filtros activos: 
              {searchZone && ` Zona: ${searchZone}`}
              {searchCategory && ` Categoría: ${searchCategory}`}
            </span>
            <span className="results-count">({storesToShow.length} resultados)</span>
          </div>
        )}
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
                    {getUniqueZones().map(zone => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    {getUniqueCategories().map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
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
        <h3>📋 Lista de Tiendas ({storesToShow.length})</h3>
        
        {storesToShow.length === 0 ? (
          <div className="empty-state">
            <h4>No se encontraron tiendas</h4>
            <p>No hay tiendas que coincidan con los filtros aplicados</p>
            <button className="btn-primary" onClick={handleClearFilters}>
              Mostrar Todas las Tiendas
            </button>
          </div>
        ) : (
          <div className="store-grid">
            {storesToShow.map(store => (
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