import express from 'express';
import {
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage
} from '../controllers/uploadController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// All upload routes require authentication
router.use(protect);

router.post('/image', uploadSingle, handleUploadError, uploadSingleImage);
router.post('/images', uploadMultiple, handleUploadError, uploadMultipleImages);
router.delete('/image', deleteImage);

export default router;