// frontend/src/components/admin/RouteConfig.tsx
import React, { useState, useEffect } from 'react';
import { routeConfigService, AdvisorSchedule } from '../../services/routeConfigService';
import { advisorService, Advisor } from '../../services/advisorService';
import '../../styles/RouteConfig.css';

const daysOfWeek = [
  { number: 1, name: 'Lunes' },
  { number: 2, name: 'Martes' },
  { number: 3, name: 'Miércoles' },
  { number: 4, name: 'Jueves' },
  { number: 5, name: 'Viernes' },
  { number: 6, name: 'Sábado' },
  { number: 7, name: 'Domingo' }
];

interface StoreSimple {
  id: number;
  name: string;
  address: string;
  priority: string;
}

const RouteConfig: React.FC = () => {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [selectedAdvisor, setSelectedAdvisor] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<AdvisorSchedule | null>(null);
  const [stores, setStores] = useState<StoreSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [activeDay, setActiveDay] = useState<number>(1);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadAdvisors();
    loadStores();
  }, []);

  useEffect(() => {
    if (selectedAdvisor) {
      loadSchedule(selectedAdvisor);
    }
  }, [selectedAdvisor]);

  const loadAdvisors = async () => {
    try {
      const data = await advisorService.getAllAdvisors();
      setAdvisors(data);
      if (data.length > 0) {
        setSelectedAdvisor(data[0].id);
      }
    } catch (error) {
      console.error('Error cargando asesores:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const data = await routeConfigService.getAllStoresSimple();
      setStores(data);
    } catch (error) {
      console.error('Error cargando tiendas:', error);
    }
  };

  const loadSchedule = async (advisorId: number) => {
    try {
      const data = await routeConfigService.getAdvisorSchedule(advisorId);
      setSchedule(data);
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const handleAddStore = async () => {
    if (!selectedAdvisor || !selectedStore) return;
    
    try {
      await routeConfigService.addStoreToSchedule(selectedAdvisor, selectedDay, selectedStore);
      setShowAddModal(false);
      setSelectedStore(null);
      loadSchedule(selectedAdvisor);
    } catch (error) {
      console.error('Error agregando tienda:', error);
      alert('Error al agregar tienda');
    }
  };

  const handleRemoveStore = async (scheduleId: number) => {
    if (!selectedAdvisor) return;
    
    if (confirm('¿Eliminar esta tienda de la ruta?')) {
      try {
        await routeConfigService.removeStoreFromSchedule(selectedAdvisor, scheduleId);
        loadSchedule(selectedAdvisor);
      } catch (error) {
        console.error('Error eliminando tienda:', error);
      }
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case 'high': return '🔴 Alta';
      case 'medium': return '🟡 Media';
      case 'low': return '🟢 Baja';
      default: return '⚪ Normal';
    }
  };

  if (loading) return <div className="loading">Cargando...</div>;

  const currentDaySchedule = schedule?.schedule[activeDay];
  const currentDayName = daysOfWeek.find(d => d.number === activeDay)?.name;

  return (
    <div className="route-config">
      <div className="header">
        <h1>🗓️ Configuración de Rutas</h1>
        <select
          value={selectedAdvisor || ''}
          onChange={(e) => setSelectedAdvisor(parseInt(e.target.value))}
          className="advisor-select"
        >
          {advisors.map(advisor => (
            <option key={advisor.id} value={advisor.id}>{advisor.name}</option>
          ))}
        </select>
      </div>

      <div className="days-tabs">
        {daysOfWeek.map(day => (
          <button
            key={day.number}
            className={`day-tab ${activeDay === day.number ? 'active' : ''}`}
            onClick={() => setActiveDay(day.number)}
          >
            {day.name}
          </button>
        ))}
      </div>

      <div className="schedule-content">
        <div className="stores-list-header">
          <h2>Tiendas para {currentDayName}</h2>
          <button className="btn-add" onClick={() => {
            setSelectedDay(activeDay);
            setShowAddModal(true);
          }}>
            + Agregar Tienda
          </button>
        </div>

        {!currentDaySchedule || currentDaySchedule.stores.length === 0 ? (
          <div className="empty-state">
            <p>📭 No hay tiendas asignadas para este día</p>
            <p>Haz clic en "Agregar Tienda" para empezar</p>
          </div>
        ) : isMobile ? (
          // Vista de tarjetas para móvil
          <div className="stores-cards">
            {currentDaySchedule.stores.map((store, index) => (
              <div key={store.id} className="store-card">
                <div className="store-card-header">
                  <span className="store-order">#{index + 1}</span>
                  <span className="priority-badge">{getPriorityBadge(store.priority)}</span>
                </div>
                <div className="store-card-name">{store.store_name}</div>
                <div className="store-card-address">{store.address || 'Dirección no disponible'}</div>
                <button
                  className="btn-remove"
                  onClick={() => handleRemoveStore(store.id)}
                >
                  🗑️ Eliminar
                </button>
              </div>
            ))}
          </div>
        ) : (
          // Vista de tabla para desktop
          <div className="stores-table-container">
            <table className="stores-table">
              <thead>
                <thead>
                  <th>Orden</th>
                  <th>Tienda</th>
                  <th>Dirección</th>
                  <th>Prioridad</th>
                  <th>Acciones</th>
                </thead>
              </thead>
              <tbody>
                {currentDaySchedule.stores.map((store, index) => (
                  <tr key={store.id}>
                    <td className="order">{index + 1} </td>
                    <td className="store-name">{store.store_name}</td>
                    <td className="address">{store.address || '-'}</td>
                    <td className="priority">{getPriorityBadge(store.priority)}</td>
                    <td className="actions">
                      <button
                        className="btn-remove"
                        onClick={() => handleRemoveStore(store.id)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal responsivo */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className={`modal-content ${isMobile ? 'mobile-modal' : ''}`} onClick={e => e.stopPropagation()}>
            <h2>Agregar Tienda - {daysOfWeek.find(d => d.number === selectedDay)?.name}</h2>
            <div className="form-group">
              <label>Seleccionar Tienda</label>
              <select
                value={selectedStore || ''}
                onChange={(e) => setSelectedStore(parseInt(e.target.value))}
                className="store-select"
              >
                <option value="">-- Seleccionar --</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name} - {store.priority}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleAddStore} disabled={!selectedStore}>
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteConfig;