import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllConversations,
  getOrCreateConversation,
  getConversation,
  getMessages,
  sendMessage,
  closeConversation,
  getChatStats,
  editMessage,
  deleteMessage,
  clearConversationMessages,
  sendBroadcastMessage
} from '../controllers/chatController';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Debug route to test authentication
router.get('/debug', (req: any, res) => {
  console.log('Debug route - User:', req.user);
  res.json({ user: req.user, authenticated: !!req.user });
});

// Admin routes
router.get('/conversations', authorize('super_admin'), getAllConversations);
router.get('/stats', authorize('super_admin'), getChatStats);
router.put('/conversations/:conversationId/close', authorize('super_admin'), closeConversation);
router.delete('/conversations/:conversationId/messages', authorize('super_admin'), clearConversationMessages);
router.post('/broadcast', authorize('super_admin'), sendBroadcastMessage);

// Socio routes
router.get('/conversation', authorize('socio'), getOrCreateConversation);

// Shared routes (admin and socio)
router.get('/conversations/:conversationId', getConversation);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);

// Message CRUD operations
router.put('/messages/:messageId', editMessage);
router.delete('/messages/:messageId', deleteMessage);

export default router;