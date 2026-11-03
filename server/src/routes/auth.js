import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../config.js';
import validate from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { loginSchema, registerSchema } from '../validators/auth.js';
import * as auth from '../controllers/authController.js';

const router = Router();

// Защита от перебора паролей: 20 попыток за 15 минут с одного IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.env === 'test' ? 1000 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Слишком много попыток, попробуйте позже' },
});

router.post('/register', authLimiter, validate({ body: registerSchema }), auth.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), auth.login);
router.get('/me', requireAuth, auth.me);

export default router;
