import mongoose from 'mongoose';

const dailyRouteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  routeDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  totalStores: {
    type: Number,
    default: 0
  },
  completedStores: {
    type: Number,
    default: 0
  },
  totalDistance: {
    type: Number, // en kilómetros
    default: 0
  },
  estimatedTotalTime: {
    type: Number, // en minutos
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  stores: [{
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    },
    visitOrder: {
      type: Number,
      required: true
    },
    estimatedArrivalTime: String,
    actualArrivalTime: Date,
    actualDepartureTime: Date,
    visitStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped'],
      default: 'pending'
    },
    visitDuration: {
      type: Number, // en minutos
      default: 0
    },
    skipReason: String
  }]
}, {
  timestamps: true
});

// Índices para mejor performance
dailyRouteSchema.index({ userId: 1, routeDate: 1 });
dailyRouteSchema.index({ routeDate: 1 });

export const DailyRoute = mongoose.model('DailyRoute', dailyRouteSchema);