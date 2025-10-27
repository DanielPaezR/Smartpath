// backend/src/routes/stores.ts
import express from 'express';
import { storeController } from '../controllers/storeController';

const router = express.Router();

// Rutas existentes
router.get('/', storeController.getStores);
router.post('/', storeController.createStore);
router.patch('/:storeId/assign', storeController.assignStore);

// 🆕 Nuevas rutas
router.get('/:storeId', storeController.getStoreById);
router.put('/:storeId', storeController.updateStore);
router.delete('/:storeId', storeController.deactivateStore);
router.get('/advisor/:advisorId', storeController.getStoresByAdvisor);

export default router;