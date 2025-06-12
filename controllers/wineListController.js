import WineList from '../models/wineList.js';
import { constructResObj } from '../utils/constructResObj.js';

export class WineListController {
	// Hämta alla vinblad (rött, vitt, mousserande etc)
	static async getAll(req, res) {
		try {
			const wineLists = await WineList.find();
			if (!wineLists?.length) {
				return res
					.status(404)
					.json(constructResObj(404, 'No wine lists found', false));
			}
			res.json(
				constructResObj(
					200,
					'Wine lists retrieved successfully',
					true,
					wineLists
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	// Hämta ett specifikt vinblad (t.ex. rött, vitt, mousserande) via id
	static async getById(req, res) {
		try {
			const { id } = req.params;
			const wineList = await WineList.findOne({ id });
			if (!wineList) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`Wine list not found with id: ${id}`,
							false
						)
					);
			}
			res.json(
				constructResObj(
					200,
					'Wine list retrieved successfully',
					true,
					wineList
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	// Uppdatera ett helt vinblad (skicka in hela objektet)
	static async updateWineList(req, res) {
		try {
			const { id } = req.params;
			const updateData = req.body;
			const updated = await WineList.findOneAndUpdate(
				{ id },
				{ $set: updateData },
				{ new: true, upsert: false }
			);
			if (!updated) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`Wine list not found with id: ${id}`,
							false
						)
					);
			}
			res.json(
				constructResObj(
					200,
					'Wine list updated successfully',
					true,
					updated
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async addWine(req, res) {
		try {
			const { id } = req.params; // t.ex. "red-wines"
			const { country, area, name, price } = req.body;

			if (!country || !name || price === undefined) {
				return res
					.status(400)
					.json(
						constructResObj(
							400,
							'country, name and price is required',
							false
						)
					);
			}

			const wineList = await WineList.findOne({ id });
			if (!wineList) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`Wine list not found with id: ${id}`,
							false
						)
					);
			}

			// Skapa nytt vinobjekt
			const newWine = {
				id: `wine-${Date.now()}`,
				name,
				price,
				active: true,
			};

			// Hitta eller skapa land
			if (!wineList.countries.has(country)) {
				wineList.countries.set(country, {
					country: country,
					areas: [],
				});
			}
			const countryObj = wineList.countries.get(country);

			if (area) {
				// Hitta eller skapa område
				let areaObj = countryObj.areas.find((a) => a.area === area);
				if (!areaObj) {
					areaObj = { area: area, items: [] };
					countryObj.areas.push(areaObj);
				}
				const exists = areaObj.items.some((wine) => wine.name === name);
				if (exists) {
					return res
						.status(400)
						.json(
							constructResObj(
								400,
								'Wine name already exists in this area',
								false
							)
						);
				}
				areaObj.items.push(newWine);
			} else {
				// Om inget område, lägg vinet i ett område "Övrigt" eller direkt i areas
				let areaObj = countryObj.areas.find((a) => a.area === 'other');
				if (!areaObj) {
					areaObj = { area: 'other', items: [] };
					countryObj.areas.push(areaObj);
				}
				areaObj.items.push(newWine);
			}

			// Spara ändringar
			wineList.countries.set(country, countryObj);
			await wineList.save();

			res.status(201).json(
				constructResObj(
					201,
					`Wine: ${newWine.name}  added to country: ${country}, area: ${area} successfully`,
					true,
					newWine
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	// ...existing code...
}
