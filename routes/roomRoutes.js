import express from 'express';
import {
  getRooms,
  getRoomById,
  getRoomsByResort,
  createRoom,
  updateRoom,
  deleteRoom
} from '../controllers/roomController.js';
import { protect } from '../middleware/authMiddleware.js';
import { isSalesOrAdmin, isAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All room routes require authentication
router.use(protect);

router.get('/', getRooms);
router.get('/resort/:resortId', getRoomsByResort);
router.get('/:id', getRoomById);
router.post('/', isSalesOrAdmin, createRoom);
router.patch('/:id', isSalesOrAdmin, updateRoom);
router.delete('/:id', isAdmin, deleteRoom);

export default router;