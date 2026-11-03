import { Router } from 'express';
import validate from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import { changePasswordSchema, updateProfileSchema, usernameParam } from '../validators/users.js';
import * as users from '../controllers/usersController.js';

const router = Router();

// Маршруты /me объявлены раньше /:username
router.patch('/me', requireAuth, validate({ body: updateProfileSchema }), users.updateMe);
router.patch(
  '/me/password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  users.changePassword,
);
router.post('/me/avatar', requireAuth, uploadSingle('avatar'), users.uploadAvatar);
router.delete('/me/avatar', requireAuth, users.deleteAvatar);
router.post('/me/become-author', requireAuth, users.becomeAuthor);

router.get('/:username', validate({ params: usernameParam }), users.getProfile);

export default router;
