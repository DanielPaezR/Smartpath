import express from 'express';
import { routeController } from '../controllers/routeController';

const router = express.Router();

router.post('/generate', routeController.generateDailyRoute);
router.get('/advisor/:advisorId/current', routeController.getCurrentRoute);
router.patch('/start-visit', routeController.startStoreVisit);
router.patch('/complete-visit', routeController.completeStoreVisit);
router.patch('/skip-visit', routeController.skipStoreVisit);
router.patch('/update-tasks', routeController.updateStoreTasks);
router.get('/metrics', routeController.getRouteMetrics);

export default router;