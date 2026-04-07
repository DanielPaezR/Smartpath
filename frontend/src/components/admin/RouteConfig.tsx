// frontend/src/components/admin/RouteConfig.tsx
import React, { useState, useEffect } from 'react';
import { routeConfigService, AdvisorSchedule } from '../../services/routeConfigService';
import { advisorService, Advisor } from '../../services/advisorService';
import { API_BASE_URL } from '../../services/api';
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

interface DaySchedule {
  dayName: string;
  dayNumber: number;
  stores: any[]; // o el tipo específico de store
}

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
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

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

  const loadFromDailyRoutes = async (advisorId: number) => {
    try {
      console.log('📋 Cargando patrón desde daily_routes...');
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/advisors/${advisorId}/weekly-pattern`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        console.log('No se pudo cargar patrón semanal');
        return null;
      }
      
      const data = await response.json();
      console.log('✅ Patrón semanal cargado:', data);
      return data;
    } catch (error) {
      console.error('Error cargando desde daily_routes:', error);
      return null;
    }
  };

  // Modifica loadSchedule
  const loadSchedule = async (advisorId: number) => {
    try {
      console.log('📋 Cargando configuración para asesor:', advisorId);
      
      // 1. Intentar cargar configuración semanal existente
      let data = await routeConfigService.getAdvisorSchedule(advisorId);
      
      // 2. Verificar si hay datos en la configuración semanal
      const hasData = daysOfWeek.some(day => 
        data?.schedule?.[day.number]?.stores?.length > 0
      );
      
      if (!hasData) {
        console.log('📋 No hay configuración semanal, cargando desde daily_routes...');
        const weeklyData = await loadFromDailyRoutes(advisorId);
        if (weeklyData && weeklyData.schedule) {
          console.log('✅ Configuración cargada desde daily_routes');
          setSchedule(weeklyData);
          return;
        }
      }
      
      if (data) {
        setSchedule(data);
      } else {
        // Crear estructura vacía
        const emptySchedule: AdvisorSchedule = {
          advisor: { id: advisorId, name: '' },
          schedule: {} as Record<number, any>
        };
        
        for (let i = 1; i <= 7; i++) {
          emptySchedule.schedule[i] = {
            dayName: daysOfWeek[i-1].name,
            dayNumber: i,
            stores: []
          };
        }
        setSchedule(emptySchedule);
      }
      
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

  // 🆕 GUARDAR CAMBIOS EN LA CONFIGURACIÓN SEMANAL
  const handleSaveChanges = async () => {
    if (!selectedAdvisor) return;
    
    setSaving(true);
    try {
      // 1. Guardar en advisor_weekly_schedule (ya se hace con add/remove)
      
      // 2. Regenerar daily_routes para los próximos días
      const response = await fetch(`${API_BASE_URL}/admin/routes/generate-week`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ advisorId: selectedAdvisor })
      });
      
      const result = await response.json();
      alert(`✅ Configuración guardada. ${result.message}`);
      
    } catch (error) {
      console.error('Error guardando cambios:', error);
      alert('❌ Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  // 🆕 GENERAR RUTAS DIARIAS A PARTIR DE LA CONFIGURACIÓN SEMANAL
  const handleGenerateRoutes = async () => {
    if (!selectedAdvisor) return;
    
    if (!confirm('¿Generar rutas para hoy con la configuración actual? Esto actualizará las rutas de los asesores.')) return;
    
    setGenerating(true);
    try {
      // 🆕 Obtener la fecha actual en formato YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
      console.log('📅 Generando rutas para:', today);
      
      const response = await fetch(`${API_BASE_URL}/admin/routes/generate-daily`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: today })  // ✅ Enviar la fecha actual
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}\n📊 Rutas generadas: ${result.created} nuevas`);
        // Recargar la vista actual para mostrar los cambios
        if (selectedAdvisor) {
          loadSchedule(selectedAdvisor);
        }
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error generando rutas:', error);
      alert('❌ Error al generar las rutas');
    } finally {
      setGenerating(false);
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

  // Calcular total de tiendas asignadas al asesor
  const getTotalStoresCount = () => {
    if (!schedule) return 0;
    let total = 0;
    for (let i = 1; i <= 7; i++) {
      total += schedule.schedule[i]?.stores.length || 0;
    }
    return total;
  };

  if (loading) return <div className="loading">Cargando...</div>;

  const currentDaySchedule = schedule?.schedule[activeDay];
  const currentDayName = daysOfWeek.find(d => d.number === activeDay)?.name;
  const totalStores = getTotalStoresCount();

  return (
    <div className="route-config">
      <div className="header">
        <div>
          <h1>🗓️ Configuración de Rutas</h1>
          <p className="subtitle">Configura las rutas semanales de cada asesor</p>
        </div>
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

      {/* Barra de acciones */}
      <div className="action-bar">
        <div className="stats-info">
          <span className="stat-badge">📋 Total tiendas asignadas: {totalStores}</span>
          <span className="stat-badge">🗓️ {daysOfWeek.length} días configurados</span>
        </div>
        <div className="action-buttons">
          <button 
            className="btn-save"
            onClick={handleSaveChanges}
            disabled={saving}
          >
            {saving ? '💾 Guardando...' : '💾 Guardar Configuración'}
          </button>
          <button 
            className="btn-generate"
            onClick={handleGenerateRoutes}
            disabled={generating}
          >
            {generating ? '⚙️ Generando...' : '⚙️ Generar Rutas para Hoy'}
          </button>
        </div>
      </div>

      <div className="days-tabs">
        {daysOfWeek.map(day => {
          const dayStores = schedule?.schedule[day.number]?.stores.length || 0;
          return (
            <button
              key={day.number}
              className={`day-tab ${activeDay === day.number ? 'active' : ''}`}
              onClick={() => setActiveDay(day.number)}
            >
              {day.name}
              {dayStores > 0 && <span className="day-badge">{dayStores}</span>}
            </button>
          );
        })}
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
                <tr>
                  <th>Orden</th>
                  <th>Tienda</th>
                  <th>Dirección</th>
                  <th>Prioridad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentDaySchedule.stores.map((store, index) => (
                  <tr key={store.id}>
                    <td className="order">{index + 1}</td>
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