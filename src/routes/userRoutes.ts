import { Router } from 'express';
import * as userController from '../controllers/userControllers';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.get('/:id', userController.getUser);
router.get('/', userController.getAuthors);
router.post('/change-avatar', authMiddleware, userController.changeAvatar);
router.patch('/edit-user', authMiddleware, userController.editUser);

export default router;
