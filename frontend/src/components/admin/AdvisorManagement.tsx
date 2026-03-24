// frontend/src/components/admin/AdvisorManagement.tsx
import React, { useState, useEffect } from 'react';
import { advisorService, Advisor } from '../../services/advisorService';
import '../../styles/AdvisorManagement.css';

const AdvisorManagement: React.FC = () => {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    vehicle_type: 'car' as 'car' | 'motorcycle' | 'bicycle',
    license_plate: '',
    assigned_zone: '',
    work_start_time: '08:00',
    work_end_time: '17:00',
    is_active: true
  });

  useEffect(() => {
    loadAdvisors();
  }, []);

  const loadAdvisors = async () => {
    try {
      setLoading(true);
      const data = await advisorService.getAllAdvisors();
      setAdvisors(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAdvisor) {
        const { password, ...updateData } = formData;
        await advisorService.updateAdvisor(editingAdvisor.id, updateData);
      } else {
        await advisorService.createAdvisor(formData);
      }
      setShowModal(false);
      setEditingAdvisor(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        vehicle_type: 'car',
        license_plate: '',
        assigned_zone: '',
        work_start_time: '08:00',
        work_end_time: '17:00',
        is_active: true
      });
      loadAdvisors();
    } catch (err: any) {
      alert('Error al guardar asesor: ' + err.message);
    }
  };

  const handleEdit = (advisor: Advisor) => {
    setEditingAdvisor(advisor);
    setFormData({
      name: advisor.name,
      email: advisor.email,
      password: '',
      vehicle_type: advisor.vehicle_type,
      license_plate: advisor.license_plate || '',
      assigned_zone: advisor.assigned_zone || '',
      work_start_time: advisor.work_start_time.substring(0, 5),
      work_end_time: advisor.work_end_time.substring(0, 5),
      is_active: advisor.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este asesor?')) {
      try {
        await advisorService.deleteAdvisor(id);
        loadAdvisors();
      } catch (err: any) {
        alert('Error al eliminar asesor: ' + err.message);
      }
    }
  };

  const getVehicleIcon = (type: string) => {
    switch(type) {
      case 'car': return '🚗';
      case 'motorcycle': return '🏍️';
      case 'bicycle': return '🚲';
      default: return '🚗';
    }
  };

  if (loading) return <div className="loading">Cargando asesores...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="advisor-management">
      <div className="header">
        <h1>👥 Gestión de Asesores</h1>
        <button className="btn-primary" onClick={() => {
          setEditingAdvisor(null);
          setFormData({
            name: '',
            email: '',
            password: '',
            vehicle_type: 'car',
            license_plate: '',
            assigned_zone: '',
            work_start_time: '08:00',
            work_end_time: '17:00',
            is_active: true
          });
          setShowModal(true);
        }}>
          + Nuevo Asesor
        </button>
      </div>

      <div className="advisors-table-container">
        <table className="advisors-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Vehículo</th>
              <th>Placa</th>
              <th>Zona</th>
              <th>Horario</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {advisors.map(advisor => (
              <tr key={advisor.id}>
                <td className="name">{advisor.name}</td>
                <td className="email">{advisor.email}</td>
                <td className="vehicle">
                  {getVehicleIcon(advisor.vehicle_type)} {advisor.vehicle_type}
                </td>
                <td>{advisor.license_plate || '-'}</td>
                <td>{advisor.assigned_zone || '-'}</td>
                <td className="schedule">
                  {advisor.work_start_time.substring(0,5)} - {advisor.work_end_time.substring(0,5)}
                </td>
                <td>
                  <span className={`status-badge ${advisor.is_active ? 'active' : 'inactive'}`}>
                    {advisor.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="actions">
                  <button className="btn-edit" onClick={() => handleEdit(advisor)}>✏️</button>
                  <button className="btn-delete" onClick={() => handleDelete(advisor.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal para crear/editar asesor */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingAdvisor ? 'Editar Asesor' : 'Nuevo Asesor'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {!editingAdvisor && (
                <div className="form-group">
                  <label>Contraseña *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingAdvisor}
                    minLength={6}
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo de Vehículo *</label>
                  <select
                    name="vehicle_type"
                    value={formData.vehicle_type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="car">🚗 Carro</option>
                    <option value="motorcycle">🏍️ Moto</option>
                    <option value="bicycle">🚲 Bicicleta</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Placa</label>
                  <input
                    type="text"
                    name="license_plate"
                    value={formData.license_plate}
                    onChange={handleInputChange}
                    placeholder="Ej: ABC123"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Zona Asignada</label>
                  <input
                    type="text"
                    name="assigned_zone"
                    value={formData.assigned_zone}
                    onChange={handleInputChange}
                    placeholder="Ej: Zona Norte"
                  />
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />
                    Activo
                  </label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Hora de Inicio</label>
                  <input
                    type="time"
                    name="work_start_time"
                    value={formData.work_start_time}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Hora de Fin</label>
                  <input
                    type="time"
                    name="work_end_time"
                    value={formData.work_end_time}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingAdvisor ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvisorManagement;