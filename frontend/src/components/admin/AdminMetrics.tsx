// frontend/src/components/admin/AdminMetrics.tsx
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../services/api';
import { offlineStorage } from '../../services/offlineStorage';
import '../../styles/AdminMetrics.css';

interface SystemMetrics {
  // Backend
  server: {
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
    node_version: string;
    platform: string;
  };
  database: {
    size_mb: number;
    tables: Record<string, number>;
  };
  api: {
    avg_response_time: number;
    last_response_time: number;
  };
  // Frontend
  client: {
    storage: {
      indexedDB: number;
      localStorage: number;
      total: number;
    };
    connection: {
      online: boolean;
      type: string;
      downlink: number;
      rtt: number;
    };
    performance: {
      loadTime: number;
      domReady: number;
      firstPaint: number;
    };
    pendingSync: number;
  };
  timestamp: string;
}

const AdminMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [measuring, setMeasuring] = useState(false);

  useEffect(() => {
    loadAllMetrics();
  }, []);

  const loadAllMetrics = async () => {
    setMeasuring(true);
    try {
      // 1. Métricas del backend
      const backendMetrics = await loadBackendMetrics();
      
      // 2. Métricas del cliente
      const clientMetrics = await loadClientMetrics();
      
      setMetrics({
        ...backendMetrics,
        client: clientMetrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error cargando métricas:', error);
    } finally {
      setLoading(false);
      setMeasuring(false);
    }
  };

  const loadBackendMetrics = async () => {
    const token = localStorage.getItem('token');
    
    // Medir tiempo de respuesta de la API
    const startTime = performance.now();
    const response = await fetch(`${API_BASE_URL}/admin/metrics/performance`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    const data = await response.json();
    
    if (data.success) {
      return {
        server: data.metrics.server,
        database: data.metrics.database,
        api: {
          avg_response_time: responseTime,
          last_response_time: responseTime
        }
      };
    }
    
    return {
      server: { uptime: 0, memory: { rss: 0, heapTotal: 0, heapUsed: 0 }, node_version: 'N/A', platform: 'N/A' },
      database: { size_mb: 0, tables: {} },
      api: { avg_response_time: 0, last_response_time: 0 }
    };
  };

  const loadClientMetrics = async () => {
    // 1. Almacenamiento
    let indexedDBSize = 0;
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      indexedDBSize = estimate.usage || 0;
    }
    
    const localStorageSize = JSON.stringify(localStorage).length;
    const totalSize = indexedDBSize + localStorageSize;
    
    // 2. Estado de conexión
    const connection = (navigator as any).connection || (navigator as any).mozConnection;
    
    // 3. Datos pendientes de sincronizar
    const pendingPhotos = await offlineStorage.getPendingPhotos('all');
    const pendingSync = await offlineStorage.getPendingSync();
    const totalPending = (pendingPhotos?.length || 0) + (pendingSync?.length || 0);
    
    // 4. Métricas de rendimiento
    let loadTime = 0, domReady = 0, firstPaint = 0;
    
    if (window.performance && window.performance.timing) {
      loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
      domReady = window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart;
    }
    
    if (window.performance && (window.performance as any).getEntriesByType) {
      const paintEntries = (window.performance as any).getEntriesByType('paint');
      const fp = paintEntries.find((e: any) => e.name === 'first-paint');
      if (fp) firstPaint = fp.startTime;
    }
    
    return {
      storage: {
        indexedDB: indexedDBSize,
        localStorage: localStorageSize,
        total: totalSize
      },
      connection: {
        online: navigator.onLine,
        type: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 0,
        rtt: connection?.rtt || 0
      },
      performance: {
        loadTime,
        domReady,
        firstPaint
      },
      pendingSync: totalPending
    };
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="admin-metrics-loading">
        <div className="spinner"></div>
        <p>Midiendo rendimiento del sistema...</p>
      </div>
    );
  }

  return (
    <div className="admin-metrics">
      <div className="metrics-header">
        <h1>📊 Métricas de Rendimiento del Sistema</h1>
        <button onClick={loadAllMetrics} disabled={measuring} className="refresh-btn">
          {measuring ? '⏳ Midiendo...' : '🔄 Medir Ahora'}
        </button>
      </div>

      <div className="metrics-grid">
        {/* Tarjeta: Servidor */}
        <div className="metric-card">
          <div className="metric-icon">🖥️</div>
          <div className="metric-title">Servidor</div>
          <div className="metric-value">{formatUptime(metrics?.server.uptime || 0)}</div>
          <div className="metric-label">Tiempo activo</div>
          <div className="metric-details">
            <span>🔷 Node: {metrics?.server.node_version}</span>
            <span>💾 RAM: {formatBytes(metrics?.server.memory?.heapUsed || 0)}</span>
            <span>🖥️ Plataforma: {metrics?.server.platform}</span>
          </div>
        </div>

        {/* Tarjeta: Base de Datos */}
        <div className="metric-card">
          <div className="metric-icon">🗄️</div>
          <div className="metric-title">Base de Datos</div>
          <div className="metric-value">{metrics?.database.size_mb || 0} MB</div>
          <div className="metric-label">Tamaño total</div>
          <div className="metric-details">
            <span>📦 Visitas: {metrics?.database.tables?.route_stores || 0}</span>
            <span>🏪 Tiendas: {metrics?.database.tables?.stores || 0}</span>
            <span>📋 Rutas: {metrics?.database.tables?.routes || 0}</span>
          </div>
        </div>

        {/* Tarjeta: API */}
        <div className="metric-card">
          <div className="metric-icon">⚡</div>
          <div className="metric-title">API</div>
          <div className="metric-value">{formatTime(metrics?.api.avg_response_time || 0)}</div>
          <div className="metric-label">Tiempo de respuesta</div>
          <div className="metric-details">
            <span>🔄 Última: {formatTime(metrics?.api.last_response_time || 0)}</span>
            <span>✅ Estado: {metrics?.api.avg_response_time < 100 ? 'Óptimo' : metrics?.api.avg_response_time < 300 ? 'Normal' : 'Lento'}</span>
          </div>
        </div>

        {/* Tarjeta: Almacenamiento Local */}
        <div className="metric-card">
          <div className="metric-icon">💾</div>
          <div className="metric-title">Almacenamiento Local</div>
          <div className="metric-value">{formatBytes(metrics?.client.storage.total || 0)}</div>
          <div className="metric-label">Total usado</div>
          <div className="metric-details">
            <span>📀 IndexedDB: {formatBytes(metrics?.client.storage.indexedDB || 0)}</span>
            <span>📋 LocalStorage: {formatBytes(metrics?.client.storage.localStorage || 0)}</span>
          </div>
        </div>

        {/* Tarjeta: Carga del Aplicativo */}
        <div className="metric-card">
          <div className="metric-icon">🚀</div>
          <div className="metric-title">Carga del Aplicativo</div>
          <div className="metric-value">{formatTime(metrics?.client.performance.loadTime || 0)}</div>
          <div className="metric-label">Tiempo total de carga</div>
          <div className="metric-details">
            <span>📄 DOM Ready: {formatTime(metrics?.client.performance.domReady || 0)}</span>
            <span>🎨 First Paint: {formatTime(metrics?.client.performance.firstPaint || 0)}</span>
          </div>
        </div>

        {/* Tarjeta: Conexión */}
        <div className="metric-card">
          <div className="metric-icon">📡</div>
          <div className="metric-title">Conexión</div>
          <div className="metric-value">{metrics?.client.connection.online ? '🟢 Online' : '🔴 Offline'}</div>
          <div className="metric-label">Estado actual</div>
          <div className="metric-details">
            <span>📶 Tipo: {metrics?.client.connection.type || 'N/A'}</span>
            <span>⚡ Velocidad: {metrics?.client.connection.downlink || '?'} Mbps</span>
            <span>⏱️ Latencia: {metrics?.client.connection.rtt || '?'} ms</span>
          </div>
        </div>

        {/* Tarjeta: Sincronización */}
        <div className="metric-card">
          <div className="metric-icon">🔄</div>
          <div className="metric-title">Sincronización</div>
          <div className="metric-value">{metrics?.client.pendingSync || 0}</div>
          <div className="metric-label">Datos pendientes</div>
          <div className="metric-details">
            <span>⏳ Por sincronizar con servidor</span>
            <span>✅ {metrics?.client.pendingSync === 0 ? 'Todo sincronizado' : 'Revisar conexión'}</span>
          </div>
        </div>

        {/* Tarjeta: Rendimiento */}
        <div className="metric-card">
          <div className="metric-icon">🧠</div>
          <div className="metric-title">Rendimiento</div>
          <div className="metric-value">{formatBytes(metrics?.client.storage.indexedDB || 0)}</div>
          <div className="metric-label">Cache local</div>
          <div className="metric-details">
            <span>⏰ Última medición: {new Date(metrics?.timestamp || '').toLocaleTimeString()}</span>
            <span>📊 Estado: {metrics?.client.storage.indexedDB > 50 * 1024 * 1024 ? 'Alto' : 'Normal'}</span>
          </div>
        </div>
      </div>

      {/* Sección de recomendaciones */}
      <div className="recommendations-section">
        <h3>💡 Recomendaciones del Sistema</h3>
        <ul className="recommendations-list">
          {metrics?.api.avg_response_time > 500 && (
            <li>⚠️ El tiempo de respuesta de la API es alto ({formatTime(metrics.api.avg_response_time)}). Considera optimizar consultas.</li>
          )}
          {metrics?.client.storage.total > 50 * 1024 * 1024 && (
            <li>⚠️ El almacenamiento local está alto ({formatBytes(metrics.client.storage.total)}). Sugerir a asesores limpiar datos antiguos.</li>
          )}
          {metrics?.client.pendingSync > 10 && (
            <li>⚠️ Hay {metrics.client.pendingSync} operaciones pendientes de sincronizar. Verificar conexión a internet.</li>
          )}
          {metrics?.client.performance.loadTime > 3000 && (
            <li>⚠️ El tiempo de carga es alto ({formatTime(metrics.client.performance.loadTime)}). Revisar assets y optimizar.</li>
          )}
          {(!metrics?.client.connection.online) && (
            <li>⚠️ El usuario está offline. Los datos se guardarán localmente y se sincronizarán al recuperar conexión.</li>
          )}
          {(metrics?.api.avg_response_time <= 500 && metrics?.client.performance.loadTime <= 3000 && metrics?.client.pendingSync === 0) && (
            <li>✅ Todo funciona correctamente. El sistema está operando con buen rendimiento.</li>
          )}
        </ul>
      </div>

      <div className="metrics-footer">
        <small>Última medición: {new Date(metrics?.timestamp || '').toLocaleString()}</small>
      </div>
    </div>
  );
};

export default AdminMetrics;