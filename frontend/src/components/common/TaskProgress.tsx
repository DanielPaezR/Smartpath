// frontend/src/components/common/TaskProgress.tsx
import React from 'react';

interface TaskProgressProps {
  completed: number;
  total: number;
  timeElapsed: number;
  maxTime: number;
}

const TaskProgress: React.FC<TaskProgressProps> = ({
  completed,
  total,
  timeElapsed,
  maxTime
}) => {
  const taskPercentage = total > 0 ? (completed / total) * 100 : 0;
  const timePercentage = (timeElapsed / maxTime) * 100;
  const timeWarning = timeElapsed >= maxTime;

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
        <span>⏱️ {timeElapsed}/{maxTime} min</span>
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

      {/* Barra de progreso de tiempo */}
      <div style={{
        width: '100%',
        height: '4px',
        backgroundColor: '#e9ecef',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${Math.min(timePercentage, 100)}%`,
          height: '100%',
          backgroundColor: timeWarning ? '#dc3545' : '#ffc107',
          transition: 'width 0.3s ease',
          borderRadius: '2px'
        }} />
      </div>

      {/* Etiquetas */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#666',
        marginTop: '5px'
      }}>
        <span>Tareas: {taskPercentage.toFixed(0)}%</span>
        <span style={{ color: timeWarning ? '#dc3545' : '#666' }}>
          Tiempo: {timePercentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

export default TaskProgress;