import express from 'express';
import multer from 'multer';
import { login, register, refreshToken, logout, getMe, updateProfile, getSocketToken, forgotPassword, resetPassword, uploadAvatar, removeAvatar } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Configure multer for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

// Public routes
router.post('/login', login);
router.post('/register', register);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.get('/socket-token', authenticate, getSocketToken);

// Avatar routes
router.post('/upload-avatar', authenticate, upload.single('avatar'), uploadAvatar);
router.delete('/remove-avatar', authenticate, removeAvatar);

export default router;