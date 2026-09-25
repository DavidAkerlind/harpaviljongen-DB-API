import { Router } from 'express';
import { MenuListController } from '../controllers/menuListController.js';
import { fallbackController } from '../services/fallbackService.js';
import { protectWrites } from '../middlewares/auth.js';

const router = Router();

// Reads are public (the website builds its menu buttons from them), changes need a login
router.use(protectWrites);

// GET – all menus, e.g. [{ type: 'food', label: 'Meny', navbar: true, home: true, builtIn: true }]
router.get('/', MenuListController.list);

// POST – new menu, { "label": "Lunchmeny", "navbar": true, "home": true }
router.post('/', MenuListController.create);

// PATCH – rename or show/hide its buttons on the website, { "label"?, "navbar"?, "home"? }
router.patch('/:type', MenuListController.update);

// DELETE – the menu and all its PDFs (not Meny or Vinlista)
router.delete('/:type', MenuListController.remove);

// ==== FALLBACK ====
router.use(fallbackController);

export default router;
