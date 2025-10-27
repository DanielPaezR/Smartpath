// backend/src/routes/storeRoutes.js
import express from 'express';
import { storeController } from '../controllers/storeController.js';

const router = express.Router();

router.get('/', storeController.getStores);
router.get('/search', storeController.searchStores);
router.get('/:id', storeController.getStoreById);
router.post('/', storeController.createStore);
router.put('/:id', storeController.updateStore);
router.delete('/:id', storeController.deleteStore);
router.patch('/:id/assign', storeController.assignStore);

export default router;