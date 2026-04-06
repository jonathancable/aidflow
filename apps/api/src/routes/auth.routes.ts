import { Router } from 'express';

const router: Router = Router();

// POST /api/v1/auth/register
router.post('/register', (_req, res) => res.status(501).json({ message: 'Not implemented' }));
// POST /api/v1/auth/login
router.post('/login', (_req, res) => res.status(501).json({ message: 'Not implemented' }));
// POST /api/v1/auth/refresh
router.post('/refresh', (_req, res) => res.status(501).json({ message: 'Not implemented' }));
// POST /api/v1/auth/logout
router.post('/logout', (_req, res) => res.status(501).json({ message: 'Not implemented' }));

export { router as authRouter };
