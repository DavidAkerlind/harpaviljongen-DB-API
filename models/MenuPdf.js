import mongoose from 'mongoose';

export const PDF_TYPES = ['food', 'wine', 'lunch', 'drinks'];

const MenuPdfSchema = new mongoose.Schema({
	type: {
		type: String,
		enum: PDF_TYPES,
		required: true,
	},
	// Namn som visas i admin, t.ex. "Höstmeny 2026"
	title: {
		type: String,
		trim: true,
		maxLength: 100,
	},
	originalName: {
		type: String,
	},
	bytes: {
		type: Number,
	},
	url: {
		type: String,
		required: true,
	},
	publicId: {
		type: String,
		required: true,
	},
	// Cloudinary resource type, needed to delete the file again
	resourceType: {
		type: String,
	},
	uploadedAt: {
		type: Date,
		default: Date.now,
	},
	// Högst en aktiv per typ – den visas på hemsidan
	isActive: {
		type: Boolean,
		default: false,
	},
});

export default mongoose.model('MenuPdf', MenuPdfSchema);
