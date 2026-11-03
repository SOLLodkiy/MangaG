import { Router } from 'express';
import validate from '../middleware/validate.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import { idParam } from '../validators/common.js';
import {
  catalogQuery,
  createTitleSchema,
  slugParam,
  updateTitleSchema,
} from '../validators/titles.js';
import * as titles from '../controllers/titlesController.js';

const router = Router();
const canWrite = [requireAuth, requireRole('AUTHOR', 'ADMIN')];

router.get('/', validate({ query: catalogQuery }), titles.listTitles);
router.get('/:slug', optionalAuth, validate({ params: slugParam }), titles.getTitle);

router.post('/', ...canWrite, validate({ body: createTitleSchema }), titles.createTitle);
router.patch(
  '/:id',
  ...canWrite,
  validate({ params: idParam, body: updateTitleSchema }),
  titles.updateTitle,
);
router.delete('/:id', ...canWrite, validate({ params: idParam }), titles.deleteTitle);
router.post(
  '/:id/cover',
  ...canWrite,
  validate({ params: idParam }),
  uploadSingle('cover'),
  titles.uploadCover,
);

export default router;
