// frontend/src/components/admin/StoreForm.tsx
import React, { useState, useEffect } from 'react';
import { storeService, Store, CreateStoreData, UpdateStoreData } from '../../services/storeService';
import '../../styles/StoreForm.css';

interface StoreFormProps {
  store?: Store | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const StoreForm: React.FC<StoreFormProps> = ({ store, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateStoreData | UpdateStoreData>({
    name: '',
    address: '',
    lat: 0,
    lng: 0,
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    priority: 3,
    estimated_visit_time: 40
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar datos de la tienda si estamos editando
  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name,
        address: store.address,
        lat: store.lat,
        lng: store.lng,
        contact_name: store.contact_name,
        contact_phone: store.contact_phone,
        contact_email: store.contact_email || '',
        priority: store.priority === 'high' ? 1 : store.priority === 'medium' ? 2 : 3,
        estimated_visit_time: store.estimated_visit_time
      });
    } else {
      // Reset form for new store
      setFormData({
        name: '',
        address: '',
        lat: 0,
        lng: 0,
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        priority: 3,
        estimated_visit_time: 40
      });
    }
    setErrors({});
  }, [store, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'lat' || name === 'lng' || name === 'priority' || name === 'estimated_visit_time' 
        ? parseFloat(value) || 0 
        : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.address?.trim()) newErrors.address = 'La dirección es requerida';
    if (!formData.contact_name?.trim()) newErrors.contact_name = 'El nombre de contacto es requerido';
    if (!formData.contact_phone?.trim()) newErrors.contact_phone = 'El teléfono es requerido';
    
    if (formData.lat === 0 || formData.lng === 0) {
      newErrors.lat = 'Las coordenadas son requeridas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (store) {
        // Actualizar tienda existente
        await storeService.updateStore(store.id, formData);
      } else {
        // Crear nueva tienda
        await storeService.createStore(formData as CreateStoreData);
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving store:', error);
      alert('Error al guardar la tienda');
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            lat: parseFloat(position.coords.latitude.toFixed(6)),
            lng: parseFloat(position.coords.longitude.toFixed(6))
          }));
        },
        (error) => {
          alert('No se pudo obtener la ubicación actual: ' + error.message);
        }
      );
    } else {
      alert('La geolocalización no es soportada por este navegador');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="store-form-overlay">
      <div 
        className="store-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Modal */}
        <div className="store-form-header">
          <div className="store-form-header-content">
            <h2 className="store-form-title">
              {store ? '✏️ Editar Tienda' : '🏪 Nueva Tienda'}
            </h2>
            <p className="store-form-subtitle">
              {store ? 'Actualiza la información de la tienda' : 'Completa la información para agregar una nueva tienda'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="store-form-close-btn"
          >
            <svg className="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="store-form-content">
          {/* Sección 1: Información Básica */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-number">1</div>
              <h3 className="section-title">Información Básica</h3>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Nombre de la Tienda *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`form-input ${errors.name ? 'input-error' : ''}`}
                  placeholder="Ej: Supermercado Central"
                />
                {errors.name && <p className="error-message">
                  <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.name}
                </p>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Prioridad de Visita
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value={1}>🟢 1 - Muy Baja</option>
                  <option value={2}>🟡 2 - Baja</option>
                  <option value={3}>🟠 3 - Media</option>
                  <option value={4}>🔴 4 - Alta</option>
                  <option value={5}>🚨 5 - Muy Alta</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección 2: Ubicación */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-number section-number-2">2</div>
              <h3 className="section-title">Ubicación</h3>
            </div>
            
            <div className="form-space-y">
              <div className="form-group">
                <label className="form-label">
                  Dirección Completa *
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className={`form-textarea ${errors.address ? 'input-error' : ''}`}
                  placeholder="Ingresa la dirección completa incluyendo ciudad y referencia..."
                />
                {errors.address && <p className="error-message">
                  <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.address}
                </p>}
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">
                    Latitud *
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="lat"
                    value={formData.lat}
                    onChange={handleChange}
                    className={`form-input ${errors.lat ? 'input-error' : ''}`}
                    placeholder="Ej: 4.609710"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Longitud *
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="lng"
                    value={formData.lng}
                    onChange={handleChange}
                    className={`form-input ${errors.lng ? 'input-error' : ''}`}
                    placeholder="Ej: -74.081750"
                  />
                </div>

                <div className="form-group location-btn-container">
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    className="location-btn"
                  >
                    <svg className="location-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Ubicación Actual
                  </button>
                </div>
              </div>
              {(errors.lat || errors.lng) && (
                <p className="error-message">
                  <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Las coordenadas son requeridas
                </p>
              )}
            </div>
          </div>

          {/* Sección 3: Contacto */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-number section-number-3">3</div>
              <h3 className="section-title">Información de Contacto</h3>
            </div>
            
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">
                  Nombre de Contacto *
                </label>
                <input
                  type="text"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  className={`form-input ${errors.contact_name ? 'input-error' : ''}`}
                  placeholder="Ej: Juan Pérez"
                />
                {errors.contact_name && <p className="error-message">
                  <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.contact_name}
                </p>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  className={`form-input ${errors.contact_phone ? 'input-error' : ''}`}
                  placeholder="Ej: 3001234567"
                />
                {errors.contact_phone && <p className="error-message">
                  <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.contact_phone}
                </p>}
              </div>

              <div className="form-group full-width">
                <label className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>
          </div>

          {/* Sección 4: Configuración */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-number section-number-4">4</div>
              <h3 className="section-title">Configuración</h3>
            </div>
            
            <div className="form-group">
              <label className="form-label">
                Tiempo Estimado de Visita (minutos)
              </label>
              <input
                type="number"
                name="estimated_visit_time"
                value={formData.estimated_visit_time}
                onChange={handleChange}
                min="5"
                max="180"
                className="form-input"
              />
              <p className="form-help-text">
                Tiempo promedio estimado para completar una visita a esta tienda
              </p>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {store ? 'Actualizar Tienda' : 'Crear Tienda'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoreForm;