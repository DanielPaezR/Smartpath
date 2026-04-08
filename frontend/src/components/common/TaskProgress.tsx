// frontend/src/components/common/TaskProgress.tsx
import React from 'react';

interface TaskProgressProps {
  completed: number;
  total: number;
  timeElapsed: number;
  maxTime?: number;
}

const TaskProgress: React.FC<TaskProgressProps> = ({
  completed,
  total,
  timeElapsed,
  maxTime
}) => {
  const taskPercentage = total > 0 ? (completed / total) * 100 : 0;
  
  // Función manual para formatear tiempo (mm:ss)
  const formatTime = (minutes: number): string => {
    const mins = Math.floor(minutes);
    const secs = Math.floor((minutes % 1) * 60);
    const padZero = (num: number): string => num < 10 ? '0' + num : num.toString();
    return `${padZero(mins)}:${padZero(secs)}`;
  };
  
  const hasTimeLimit = maxTime !== undefined && maxTime > 0;
  const timePercentage = hasTimeLimit ? (timeElapsed / maxTime) * 100 : 0;
  const timeWarning = hasTimeLimit && timeElapsed >= maxTime;

  return (
    <div style={{ marginTop: '15px' }}>
      {/* Información de progreso */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        color: '#555'
      }}>
        <span>⏱️ Tiempo: {formatTime(timeElapsed)}</span>
        <span>📊 {completed}/{total} tareas</span>
      </div>

      {/* Barra de progreso de tareas */}
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        marginBottom: '5px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${taskPercentage}%`,
          height: '100%',
          backgroundColor: taskPercentage === 100 ? '#28a745' : '#007bff',
          transition: 'width 0.3s ease',
          borderRadius: '4px'
        }} />
      </div>

      {/* Si no hay límite, solo mostrar porcentaje de tareas */}
      {!hasTimeLimit && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          fontSize: '12px',
          color: '#666',
          marginTop: '5px'
        }}>
          <span>Tareas: {taskPercentage.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
};

export default TaskProgress;