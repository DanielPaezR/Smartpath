// frontend/src/components/admin/PhotoGallery.tsx
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../services/api';
import '../../styles/PhotoGallery.css';

interface Photo {
  visit_id: number;
  store_name: string;
  advisor_name: string;
  date: string;
  type: string;
  photo_url?: string;
  damage_photos?: string[];
  damage_product?: string;
}

const PhotoGallery: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filters, setFilters] = useState({
    type: 'all',
    advisorId: '',
    storeId: '',
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [advisors, setAdvisors] = useState<{id: number; name: string}[]>([]);
  const [stores, setStores] = useState<{id: number; name: string}[]>([]);

  useEffect(() => {
    loadFilters();
    loadPhotos();
  }, []);

  const loadFilters = async () => {
    const token = localStorage.getItem('token');
    
    // Cargar asesores
    const advisorsRes = await fetch(`${API_BASE_URL}/admin/advisors`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const advisorsData = await advisorsRes.json();
    if (advisorsData.success) {
      setAdvisors(advisorsData.advisors);
    }
    
    // Cargar tiendas
    const storesRes = await fetch(`${API_BASE_URL}/admin/stores/simple`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const storesData = await storesRes.json();
    if (storesData.success) {
      setStores(storesData.stores);
    }
  };

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.advisorId) params.append('advisorId', filters.advisorId);
      if (filters.storeId) params.append('storeId', filters.storeId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await fetch(`${API_BASE_URL}/admin/photos?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPhotos(data.photos);
      }
    } catch (error) {
      console.error('Error cargando fotos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const applyFilters = () => {
    loadPhotos();
  };

  return (
    <div className="photo-gallery">
      <h1>📸 Galería de Fotos</h1>
      
      <div className="filters-bar">
        <select value={filters.type} onChange={(e) => handleFilterChange('type', e.target.value)}>
          <option value="all">Todos los tipos</option>
          <option value="before">Antes</option>
          <option value="after">Después</option>
          <option value="damage">Daños</option>
        </select>
        
        <select value={filters.advisorId} onChange={(e) => handleFilterChange('advisorId', e.target.value)}>
          <option value="">Todos los asesores</option>
          {advisors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        
        <select value={filters.storeId} onChange={(e) => handleFilterChange('storeId', e.target.value)}>
          <option value="">Todas las tiendas</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        
        <input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} placeholder="Fecha inicio" />
        <input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} placeholder="Fecha fin" />
        
        <button onClick={applyFilters} className="btn-primary">Buscar</button>
      </div>

      {loading ? (
        <div className="loading">Cargando fotos...</div>
      ) : photos.length === 0 ? (
        <div className="empty">No hay fotos que coincidan con los filtros</div>
      ) : (
        <div className="photos-grid">
          {photos.map((photo, idx) => (
            <div key={idx} className="photo-card" onClick={() => setSelectedPhoto(photo.photo_url || photo.damage_photos?.[0] || null)}>
              <div className="photo-type">{photo.type === 'before' ? '📸 Antes' : photo.type === 'after' ? '📷 Después' : '⚠️ Daño'}</div>
              <div className="photo-thumb">
                {photo.damage_photos && photo.damage_photos.length > 0 ? (
                  <img src={photo.damage_photos[0]} alt={photo.damage_product} />
                ) : photo.photo_url ? (
                  <img src={photo.photo_url} alt={photo.store_name} />
                ) : (
                  <div className="no-photo">Sin imagen</div>
                )}
              </div>
              <div className="photo-info">
                <div className="store-name">{photo.store_name}</div>
                <div className="advisor-name">{photo.advisor_name}</div>
                <div className="photo-date">{new Date(photo.date).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <div className="modal-overlay" onClick={() => setSelectedPhoto(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto} alt="Vista completa" />
            <button className="close-btn" onClick={() => setSelectedPhoto(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;