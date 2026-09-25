import MenuList, { BUILT_IN_MENUS } from '../models/menuList.js';
import MenuPdf from '../models/MenuPdf.js';

export async function listMenuLists() {
	return MenuList.find().sort({ order: 1, createdAt: 1 });
}

export async function getMenuList(type) {
	if (typeof type !== 'string') return null;
	return MenuList.findOne({ type });
}

// "Lunchmeny & bar" -> "lunchmeny-bar", with -2, -3… if it is taken
async function freeType(label) {
	const base =
		label
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '') // å -> a, é -> e
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 30) || 'meny';
	for (let n = 1; ; n += 1) {
		const type = n === 1 ? base : `${base}-${n}`;
		if (!(await MenuList.exists({ type }))) return type;
	}
}

export async function createMenuList({ label, navbar = true, home = true }) {
	const last = await MenuList.findOne().sort({ order: -1 });
	return MenuList.create({
		type: await freeType(label),
		label,
		navbar,
		home,
		order: (last?.order ?? -1) + 1,
	});
}

export const labelTaken = async (label, exceptType) =>
	Boolean(
		await MenuList.exists({ label, type: { $ne: exceptType } }).collation({
			locale: 'sv',
			strength: 2,
		})
	);

// On startup: Meny and Vinlista always exist, and PDFs of a type without a menu
// (from before menus could be created) get a hidden menu so they show up in the admin.
export async function ensureMenuLists() {
	for (const menu of BUILT_IN_MENUS) {
		await MenuList.updateOne(
			{ type: menu.type },
			{ $setOnInsert: { ...menu, builtIn: true, navbar: true, home: true } },
			{ upsert: true }
		);
	}
	const known = (await MenuList.find()).map((m) => m.type);
	const orphans = (await MenuPdf.distinct('type')).filter(
		(type) => !known.includes(type)
	);
	for (const type of orphans) {
		const last = await MenuList.findOne().sort({ order: -1 });
		await MenuList.create({
			type,
			label: type.charAt(0).toUpperCase() + type.slice(1),
			navbar: false,
			home: false,
			order: (last?.order ?? -1) + 1,
		});
	}
	return orphans.length;
}
