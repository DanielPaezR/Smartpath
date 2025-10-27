// frontend/src/services/trackingService.ts - CORREGIDO
import api from './api';

export interface TrackingData {
  latitude: number;
  longitude: number;
  currentStoreId?: string;
  activityStatus: string;
  batteryLevel: number;
}

export const trackingService = {
  // Actualizar ubicación
  async updateLocation(
    latitude: number, 
    longitude: number, 
    currentStoreId?: string, 
    activityStatus: string = 'traveling',
    batteryLevel: number = 100
  ): Promise<{ message: string; timestamp: string }> {
    const response = await api.post('/tracking/update-location', {
      latitude,
      longitude,
      currentStoreId,
      activityStatus,
      batteryLevel
    });
    return response.data;
  },

  // Obtener historial de ubicaciones
  async getLocationHistory(advisorId: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/tracking/history/${advisorId}?${params}`);
    return response.data;
  },

  // Iniciar tracking automático - CORREGIDO
  startAutoTracking(intervalMs: number = 120000): number {
    return window.setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.updateLocation(
              position.coords.latitude,
              position.coords.longitude,
              undefined, // currentStoreId
              'traveling', // activityStatus
              100 // batteryLevel
            ).then(() => {
              console.log('📍 Ubicación actualizada automáticamente');
            }).catch((error) => {
              console.warn('Error en tracking automático:', error);
            });
          },
          (error) => {
            console.warn('No se pudo obtener ubicación para tracking:', error);
          },
          { 
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000 
          }
        );
      }
    }, intervalMs);
  },

  // Detener tracking automático - CORREGIDO
  stopAutoTracking(intervalId: number): void {
    clearInterval(intervalId);
    console.log('🛑 Tracking automático detenido');
  }
};