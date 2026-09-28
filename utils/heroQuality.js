// How well a photo suits the home page's hero, from its size: 1–10, worked out once at upload.
//
// The photo fills the whole screen (CSS object-fit: cover). A computer screen (16:9) shows
// the photo's full width and cuts its top and bottom; a phone held upright (9:19.5) shows its
// full height and cuts the sides. What decides the sharpness is how many of the photo's
// pixels are left for each:
//   desktop – the visible width. 2560 px is sharp on large and Retina screens.
//   phone   – the visible height. 1600 px is sharp: the photos sit under a dark filter, so the
//             website gives phones about half their full resolution.
// The score is the weaker of the two. 8–10 good, 5–7 okay, 1–4 poor.

// The pixels needed for 2, 3 … 10
const DESKTOP_STEPS = [720, 900, 1080, 1280, 1440, 1600, 1920, 2240, 2560];
const PHONE_STEPS = [600, 700, 800, 900, 1000, 1120, 1280, 1440, 1600];

const stepScore = (pixels, steps) => 1 + steps.filter((step) => pixels >= step).length;

// 1080×1350 (upright) -> { score: 4, desktop: 4, phone: 8 }
export function heroQuality(width, height) {
	const desktop = stepScore(Math.min(width, (height * 16) / 9), DESKTOP_STEPS);
	const phone = stepScore(Math.min(height, (width * 19.5) / 9), PHONE_STEPS);
	return { score: Math.min(desktop, phone), desktop, phone };
}

export const qualityRating = (score) => (score >= 8 ? 'good' : score >= 5 ? 'ok' : 'poor');
