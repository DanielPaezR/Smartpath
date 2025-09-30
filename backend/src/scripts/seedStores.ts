import mongoose from 'mongoose';
import { Store } from '../models/Store';
import { User } from '../models/User';
import * as dotenv from 'dotenv';

dotenv.config();

const sampleStores = [
  {
    name: 'Supermercado Central',
    address: 'Calle 100 #25-30, Bogotá',
    coordinates: { lat: 4.681, lng: -74.048 },
    contact: {
      name: 'Carlos Rodríguez',
      phone: '3001234567'
    },
    optimalVisitWindows: [
      { start: '08:00', end: '10:00', priority: 8 },
      { start: '14:00', end: '16:00', priority: 6 }
    ],
    priority: 5,
    estimatedVisitTime: 45
  },
  {
    name: 'MiniMarket Express',
    address: 'Av. 68 #45-12, Bogotá',
    coordinates: { lat: 4.675, lng: -74.102 },
    contact: {
      name: 'María González',
      phone: '3102345678'
    },
    optimalVisitWindows: [
      { start: '09:00', end: '11:00', priority: 7 }
    ],
    priority: 4,
    estimatedVisitTime: 35
  },
  {
    name: 'Almacén La Economía',
    address: 'Carrera 50 #80-45, Bogotá',
    coordinates: { lat: 4.698, lng: -74.125 },
    contact: {
      name: 'José Pérez',
      phone: '3203456789'
    },
    optimalVisitWindows: [
      { start: '10:00', end: '12:00', priority: 9 },
      { start: '15:00', end: '17:00', priority: 7 }
    ],
    priority: 3,
    estimatedVisitTime: 40
  }
];

const seedStores = async () => {
  await mongoose.connect(process.env.MONGODB_URI!);

  // Obtener el asesor para asignar algunas tiendas
  const advisor = await User.findOne({ email: 'asesor@vitamarket.com' });

  // Asignar el asesor a las primeras 2 tiendas
  const storesWithAdvisor = sampleStores.map((store, index) => ({
    ...store,
    assignedAdvisor: index < 2 ? advisor?._id : undefined
  }));

  await Store.deleteMany({});
  await Store.insertMany(storesWithAdvisor);

  console.log('✅ Tiendas de prueba creadas:');
  const stores = await Store.find().populate('assignedAdvisor');
  stores.forEach(store => {
    console.log(`🏪 ${store.name} - ${store.address}`);
  });

  mongoose.connection.close();
};

seedStores().catch(console.error);