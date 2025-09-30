import express from 'express';
import { storeController } from '../controllers/storeController';

const router = express.Router();

router.get('/', storeController.getStores);
router.post('/', storeController.createStore);
router.patch('/:storeId/assign', storeController.assignStore);

export default router;