import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserActivityLogs
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All user routes require authentication
router.use(protect);

router.get('/', isAdmin, getUsers);
router.get('/:id', getUserById);
router.post('/', isAdmin, createUser);
router.patch('/:id', updateUser);
router.delete('/:id', isAdmin, deleteUser);
router.get('/:id/activity-logs', getUserActivityLogs);

export default router;