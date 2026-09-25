import mongoose from 'mongoose';

// The menus that PDFs are uploaded to: Meny and Vinlista from the start, plus any the
// admin creates (e.g. "Lunchmeny"). A PDF's `type` is the `type` of its menu.
// navbar/home: whether the website shows a button for it in the menu and on the homepage.

export const MAX_MENU_LABEL = 40;
export const MAX_MENUS = 20;

// Always there and can't be deleted. When none of their PDFs is active the website
// links to its "Ny meny kommer snart" placeholder, so the buttons never disappear.
export const BUILT_IN_MENUS = [
	{ type: 'food', label: 'Meny', order: 0 },
	{ type: 'wine', label: 'Vinlista', order: 1 },
];

const menuListSchema = new mongoose.Schema(
	{
		type: {
			type: String,
			required: true,
			unique: true,
			match: /^[a-z0-9-]{1,40}$/,
		},
		label: {
			type: String,
			required: true,
			trim: true,
			maxlength: MAX_MENU_LABEL,
		},
		order: { type: Number, default: 0 },
		navbar: { type: Boolean, default: true },
		home: { type: Boolean, default: true },
		builtIn: { type: Boolean, default: false },
	},
	{
		timestamps: true,
		collection: 'menulists',
		toJSON: {
			transform: (doc, ret) => ({
				type: ret.type,
				label: ret.label,
				order: ret.order,
				navbar: ret.navbar,
				home: ret.home,
				builtIn: ret.builtIn,
				createdAt: ret.createdAt ?? null,
			}),
		},
	}
);

const MenuList = mongoose.model('MenuList', menuListSchema);

export default MenuList;
