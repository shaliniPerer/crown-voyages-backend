import express from 'express';
import {
  getResorts,
  getResortById,
  createResort,
  updateResort,
  deleteResort
} from '../controllers/resortController.js';
import { protect } from '../middleware/authMiddleware.js';
import { isSalesOrAdmin, isAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All resort routes require authentication
router.use(protect);

router.get('/', getResorts);
router.get('/:id', getResortById);
router.post('/', isSalesOrAdmin, createResort);
router.patch('/:id', isSalesOrAdmin, updateResort);
router.delete('/:id', isAdmin, deleteResort);

export default router;