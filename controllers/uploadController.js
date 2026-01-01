import asyncHandler from 'express-async-handler';
import { uploadToCloudinary, uploadMultipleToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import fs from 'fs';

// @desc    Upload single image
// @route   POST /api/upload/image
// @access  Private
export const uploadSingleImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload a file');
  }

  const { folder = 'general' } = req.body;

  try {
    const result = await uploadToCloudinary(req.file, folder);
    
    // Delete file from local storage after upload
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height
      }
    });
  } catch (error) {
    // Clean up file if upload fails
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    throw error;
  }
});

// @desc    Upload multiple images
// @route   POST /api/upload/images
// @access  Private
export const uploadMultipleImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error('Please upload at least one file');
  }

  const { folder = 'general' } = req.body;

  try {
    const results = await uploadMultipleToCloudinary(req.files, folder);
    
    // Delete files from local storage after upload
    req.files.forEach(file => {
      fs.unlinkSync(file.path);
    });

    const urls = results.map(result => result.url);

    res.json({
      success: true,
      count: urls.length,
      data: {
        urls,
        details: results
      }
    });
  } catch (error) {
    // Clean up files if upload fails
    req.files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
    throw error;
  }
});

// @desc    Delete image from Cloudinary
// @route   DELETE /api/upload/image
// @access  Private
export const deleteImage = asyncHandler(async (req, res) => {
  const { publicId } = req.body;

  if (!publicId) {
    res.status(400);
    throw new Error('Please provide public ID');
  }

  const result = await deleteFromCloudinary(publicId);

  res.json({
    success: true,
    message: 'Image deleted successfully',
    data: result
  });
});