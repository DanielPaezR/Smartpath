import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeWindow {
  start: string; // formato "HH:MM"
  end: string;
  priority: number; // 1-10, donde 10 es más prioritario
}

export interface IStore extends Document {
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  contact: {
    name: string;
    phone: string;
    email?: string;
  };
  optimalVisitWindows: ITimeWindow[];
  assignedAdvisor?: mongoose.Types.ObjectId;
  priority: number; // 1-5, donde 5 es más prioritario
  estimatedVisitTime: number; // minutos
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const timeWindowSchema = new Schema<ITimeWindow>({
  start: { type: String, required: true },
  end: { type: String, required: true },
  priority: { type: Number, min: 1, max: 10, default: 5 }
});

const storeSchema = new Schema<IStore>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  contact: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String
  },
  optimalVisitWindows: [timeWindowSchema],
  assignedAdvisor: { type: Schema.Types.ObjectId, ref: 'User' },
  priority: { type: Number, min: 1, max: 5, default: 3 },
  estimatedVisitTime: { type: Number, default: 40 }, // 40 minutos por defecto
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

export const Store = mongoose.model<IStore>('Store', storeSchema);