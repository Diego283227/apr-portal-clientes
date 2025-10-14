import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getSocios, getProfile, updateProfile } from '../controllers/userController';

const router = express.Router();

// Get all socios (admin only)
router.get('/socios', authenticate, authorize('super_admin'), getSocios);

// Get user profile
router.get('/profile', authenticate, getProfile);

// Update user profile
router.put('/profile', authenticate, updateProfile);


export default router;