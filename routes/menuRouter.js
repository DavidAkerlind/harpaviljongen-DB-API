import { Router } from 'express';
import { MenuController } from '../controllers/menuController.js';
import { fallbackController } from '../services/fallbackService.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = Router();
/* router.use(authenticateUser);*/

// GET routes
router.get('/', MenuController.getAllMenus);
router.get('/search/items', MenuController.searchMenuItems);
router.get('/:menuId', MenuController.getMenuById);
router.get('/:menuId/items', MenuController.getMenuItems);

// POST routes
router.post('/', MenuController.createMenu);
router.post('/bulk', MenuController.createBulkMenus);
router.post('/:menuId/items', MenuController.addMenuItem);

// PUT routes
router.put('/:menuId/:field', MenuController.updateMenu);
router.put('/:menuId/items/:itemId/:field', MenuController.updateMenuItem);

// PATCH routes
router.patch('/:menuId/items/:itemId/toggle', MenuController.toggleMenuItem);

// DELETE routes
router.delete('/:menuId', MenuController.deleteMenu);
router.delete('/:menuId/items/:itemId', MenuController.deleteMenuItem);
router.delete('/', MenuController.deleteAllMenus);

// ==== FALLBACK ====
router.use(fallbackController);

// ==== EXPORT ====
export default router;
