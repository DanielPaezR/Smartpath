// backend/src/scripts/seedUsers.js
import { User } from '../models/User.js';

const seedUsers = async () => {
  try {
    // Usuario admin
    await User.create({
      email: 'admin@vitamarket.com',
      password: 'admin123',
      name: 'Administrador Principal',
      role: 'admin'
    });

    // Asesores
    await User.create({
      email: 'asesor1@vitamarket.com',
      password: 'asesor123',
      name: 'Carlos Rodríguez',
      role: 'advisor',
      vehicleType: 'car',
      licensePlate: 'MED456',
      assignedZone: 'El Poblado'
    });

    await User.create({
      email: 'asesor2@vitamarket.com',
      password: 'asesor123',
      name: 'María González',
      role: 'advisor',
      vehicleType: 'motorcycle',
      licensePlate: 'MED789',
      assignedZone: 'Laureles'
    });

    await User.create({
      email: 'asesor3@vitamarket.com',
      password: 'asesor123',
      name: 'Javier López',
      role: 'advisor',
      vehicleType: 'bicycle',
      licensePlate: 'MED101',
      assignedZone: 'Centro'
    });

    console.log('✅ Usuarios de prueba creados exitosamente');
  } catch (error) {
    console.error('❌ Error creando usuarios:', error);
  }
};

seedUsers();