import { Router } from 'express';
import * as postController from '../controllers/postController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, postController.createPost);
router.get('/', postController.getPosts);
router.get('/:id', postController.getPost);
router.get('/categories/:category', postController.getCatPosts);
router.get('/users/:id', postController.getUserPosts);
router.patch('/:id', authMiddleware, postController.editPost);
router.delete('/:id', authMiddleware, postController.deletePost);

export default router;
