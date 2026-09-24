import { Router } from 'express';
import { SiteSettingsController } from '../controllers/siteSettingsController.js';
import { fallbackController } from '../services/fallbackService.js';
import { protectWrites } from '../middlewares/auth.js';

const router = Router();

// Reads are public, everything else needs a login token
router.use(protectWrites);

// GET – vilka sidor som visas i navbaren / på startsidan
router.get('/', SiteSettingsController.getSettings);

// PUT – ändra en eller flera sidor
router.put('/', SiteSettingsController.updateSettings);
/*{
    "pages": {
        "chambre": { "navbar": true, "home": false },
        "events": { "home": true }
    }
}*/

// ==== FALLBACK ====
router.use(fallbackController);

// ==== EXPORT ====
export default router;
