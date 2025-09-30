import mongoose, { Document, Schema } from 'mongoose';

// ✅ INTERFAZ PARA TAREAS DETALLADAS
export interface ITask {
  key: string;
  label: string;
  completed: boolean;
  photos?: string[];
  timestamp?: Date;
  additionalData?: any;
}

export interface IStoreVisit {
  _id?: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  plannedArrival: Date;
  actualArrival?: Date;
  actualDeparture?: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  
  // ✅ REEMPLAZAR la estructura simple de tasks por una detallada
  tasks: ITask[];
  visitDuration: number; // ✅ Cambiar de 'duration' a 'visitDuration' para claridad
  startedAt?: Date;
  completedAt?: Date;
  skipReason?: string; // ✅ AGREGAR razón para saltar tienda
  notes?: string;
}

export interface IRoute extends Document {
  advisorId: mongoose.Types.ObjectId;
  date: Date;
  stores: IStoreVisit[];
  optimizedPath: Array<{
    storeId: mongoose.Types.ObjectId;
    order: number;
    distanceFromPrevious: number;
    estimatedTravelTime: number;
  }>;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  totalDistance: number;
  totalEstimatedTime: number;
  startedAt?: Date;
  completedAt?: Date;
}

// ✅ SCHEMA PARA TAREAS
const taskSchema = new Schema({
  key: { 
    type: String, 
    required: true,
    enum: [
      'evidenceBefore', 
      'identifySold', 
      'picking', 
      'restocking', 
      'organization', 
      'pricing', 
      'evidenceAfter', 
      'damageCheck', 
      'signature'
    ]
  },
  label: { type: String, required: true },
  completed: { type: Boolean, default: false },
  photos: [{ type: String }],
  timestamp: { type: Date },
  additionalData: { type: Schema.Types.Mixed } // Para datos específicos de cada tarea
});

// ✅ SCHEMA ACTUALIZADO PARA STORE VISIT
const storeVisitSchema = new Schema<IStoreVisit>({
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  plannedArrival: { type: Date, required: true },
  actualArrival: { type: Date },
  actualDeparture: { type: Date },
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'completed', 'skipped'], 
    default: 'pending' 
  },
  
  // ✅ ESTRUCTURA DETALLADA DE TAREAS
  tasks: [taskSchema],
  
  visitDuration: { type: Number, default: 0 }, // Duración en minutos
  startedAt: { type: Date },
  completedAt: { type: Date },
  skipReason: { type: String }, // Razón por la que se saltó la tienda
  notes: { type: String }
}, {
  _id: true
});

// ✅ SCHEMA PARA RUTA (se mantiene igual)
const routeSchema = new Schema<IRoute>({
  advisorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  stores: [storeVisitSchema],
  optimizedPath: [{
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    order: { type: Number, required: true },
    distanceFromPrevious: { type: Number, default: 0 },
    estimatedTravelTime: { type: Number, default: 0 } // en minutos
  }],
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  totalDistance: { type: Number, default: 0 },
  totalEstimatedTime: { type: Number, default: 0 }, // en minutos
  startedAt: { type: Date },
  completedAt: { type: Date }
}, {
  timestamps: true
});

// ✅ MIDDLEWARE para calcular duración automáticamente
storeVisitSchema.pre('save', function(next) {
  if (this.actualArrival && this.actualDeparture) {
    const durationMs = this.actualDeparture.getTime() - this.actualArrival.getTime();
    this.visitDuration = Math.round(durationMs / (1000 * 60)); // Convertir a minutos
  }
  next();
});

// ✅ MÉTODO PARA INICIAR VISITA
storeVisitSchema.methods.startVisit = function() {
  this.status = 'in-progress';
  this.startedAt = new Date();
  this.actualArrival = new Date();
  
  // ✅ INICIALIZAR TAREAS SI NO EXISTEN
  if (!this.tasks || this.tasks.length === 0) {
    this.tasks = [
      { key: 'evidenceBefore', label: 'Evidencia fotográfica del como se encontró el lugar', completed: false },
      { key: 'identifySold', label: 'Identificar productos vendidos para reponer', completed: false },
      { key: 'picking', label: 'Ir a bodega y hacer picking de productos', completed: false },
      { key: 'restocking', label: 'Realizar bajada de productos y limpieza', completed: false },
      { key: 'organization', label: 'Volver productos a su sitio dejando los que ya estaban al frente', completed: false },
      { key: 'pricing', label: 'Realizar segmentación de precios', completed: false },
      { key: 'evidenceAfter', label: 'Tomar fotografía del después', completed: false },
      { key: 'damageCheck', label: 'Revisar en bodega las averías (evidencia fotográfica y escaneo)', completed: false },
      { key: 'signature', label: 'Recoger firma y sello de seguridad del almacén', completed: false }
    ];
  }
};

// ✅ MÉTODO PARA COMPLETAR VISITA
storeVisitSchema.methods.completeVisit = function(visitData?: any) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.actualDeparture = new Date();
  
  if (visitData) {
    this.tasks = visitData.tasks || this.tasks;
    this.visitDuration = visitData.duration || this.visitDuration;
    this.notes = visitData.notes || this.notes;
  }
};

// ✅ MÉTODO PARA SALTAR VISITA
storeVisitSchema.methods.skipVisit = function(reason?: string) {
  this.status = 'skipped';
  this.completedAt = new Date();
  this.skipReason = reason || 'Sin razón especificada';
};

export const Route = mongoose.model<IRoute>('Route', routeSchema);