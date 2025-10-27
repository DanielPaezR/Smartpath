import React from 'react';
import { AdvisorLiveStatus } from '../../services/adminService';
import './AdvisorsList.css';

interface AdvisorsListProps {
  advisors: AdvisorLiveStatus[];
  selectedAdvisor: AdvisorLiveStatus | null;
  onAdvisorSelect: (advisor: AdvisorLiveStatus) => void;
}

const AdvisorsList: React.FC<AdvisorsListProps> = ({ 
  advisors, 
  selectedAdvisor, 
  onAdvisorSelect 
}) => {
  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { label: string; className: string } } = {
      traveling: { label: '🚗 En Viaje', className: 'status-traveling' },
      at_store: { label: '🏪 En Tienda', className: 'status-at-store' },
      break: { label: '☕ En Descanso', className: 'status-break' },
      offline: { label: '⚫ Offline', className: 'status-offline' }
    };

    const config = statusConfig[status] || statusConfig.offline;
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  return (
    <div className="advisors-list">
      <div className="advisors-grid">
        {advisors.map((advisor) => (
          <div 
            key={advisor.id}
            className={`advisor-card ${selectedAdvisor?.id === advisor.id ? 'selected' : ''}`}
            onClick={() => onAdvisorSelect(advisor)}
          >
            <div className="advisor-header">
              <div className="advisor-info">
                <h3>{advisor.name}</h3>
                <p className="advisor-email">{advisor.email}</p>
              </div>
              {getStatusBadge(advisor.activity_status)}
            </div>
            
            <div className="advisor-details">
              <div className="detail-item">
                <span className="label">Vehículo:</span>
                <span className="value">{advisor.vehicle_type}</span>
              </div>
              <div className="detail-item">
                <span className="label">Ubicación:</span>
                <span className="value">{advisor.current_store_name || 'En tránsito'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Actualización:</span>
                <span className="value">
                  {new Date(advisor.last_update).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="progress-section">
              <div className="progress-header">
                <span>Progreso del día</span>
                <span>{advisor.completed_stores}/{advisor.total_stores_today}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${getProgressPercentage(advisor.completed_stores, advisor.total_stores_today)}%` 
                  }}
                />
              </div>
            </div>

            <div className="advisor-metrics">
              <div className="metric">
                <span className="metric-label">Batería</span>
                <span className={`metric-value ${advisor.battery_level < 20 ? 'low-battery' : ''}`}>
                  {advisor.battery_level}%
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Completadas</span>
                <span className="metric-value">{advisor.completed_stores}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {advisors.length === 0 && (
        <div className="no-advisors">
          <p>No hay asesores activos en este momento</p>
        </div>
      )}
    </div>
  );
};

export default AdvisorsList;