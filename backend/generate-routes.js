// /home/daniel.paez/Smartpath/backend/generate-routes.js
import dotenv from 'dotenv';
import { routeGenerator } from './src/services/routeGenerator.js';

dotenv.config();

async function run() {
    try {
        console.log(`[${new Date().toISOString()}] Iniciando generación de rutas...`);
        const result = await routeGenerator.generateDailyRoutes();
        console.log(`[${new Date().toISOString()}] Resultado:`, JSON.stringify(result, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error:`, error);
        process.exit(1);
    }
}

run();