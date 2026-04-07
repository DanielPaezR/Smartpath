const { routeGenerator } = require('./src/services/routeGenerator.js');

async function run() {
    try {
        console.log(`[${new Date().toISOString()}] Iniciando generación de rutas...`);
        const result = await routeGenerator.generateDailyRoutes();
        console.log(`[${new Date().toISOString()}] Resultado:`, result);
        process.exit(0);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error:`, error);
        process.exit(1);
    }
}

run();