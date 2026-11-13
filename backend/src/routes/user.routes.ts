import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { getMe, updateMe, changePassword } from '../controllers/user.controller';

const router = Router();

router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);
router.put('/me/password', authenticate, changePassword);

export default router;
