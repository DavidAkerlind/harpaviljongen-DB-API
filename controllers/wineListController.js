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

			let countryObj = wineList.countries.get(country);
			if (!countryObj) {
				countryObj = { country: country, areas: [] };
				wineList.countries.set(country, countryObj);
			}

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
				// Om inget område, lägg vinet i ett område "other" eller direkt i areas
				let areaObj = countryObj.areas.find((a) => a.area === 'other');
				if (!areaObj) {
					areaObj = { area: 'other', items: [] };
					countryObj.areas.push(areaObj);
				}
				// Flytta denna rad utanför if-satsen!
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

	static async toggleWineActive(req, res) {
		try {
			const { listId, wineId } = req.params;
			const wineList = await WineList.findOne({ id: listId });
			if (!wineList) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`Wine list not found with id: ${listId}`,
							false
						)
					);
			}

			let found = false;
			let toggledWine = null;

			// Loopa igenom alla länder och områden
			for (const [, countryObj] of wineList.countries) {
				for (const areaObj of countryObj.areas) {
					const wine = areaObj.items.find((w) => w.id === wineId);
					if (wine) {
						wine.active = !wine.active;
						found = true;
						toggledWine = wine;
						break;
					}
				}
				if (found) break;
			}

			if (!found) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`Wine with id: ${wineId} not found`,
							false
						)
					);
			}

			await wineList.save();
			res.json(
				constructResObj(
					200,
					`Wine ${wineId} active toggled to ${toggledWine.active}`,
					true,
					toggledWine
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async updateWine(req, res) {
		try {
			const { listId, wineId } = req.params;
			const { name, price, country, area } = req.body;

			const wineList = await WineList.findOne({ id: listId });
			if (!wineList) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`Wine list not found with id: ${listId}`,
							false
						)
					);
			}

			let found = false;
			let oldCountryKey = null;
			let oldAreaObj = null;
			let wineObj = null;

			// Hitta vinet och spara referenser till nuvarande country/area
			for (const [countryKey, countryObj] of wineList.countries) {
				for (const areaObj of countryObj.areas) {
					const wine = areaObj.items.find((w) => w.id === wineId);
					if (wine) {
						found = true;
						oldCountryKey = countryKey;
						oldAreaObj = areaObj;
						wineObj = wine;
						break;
					}
				}
				if (found) break;
			}

			if (!found) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`Wine with id: ${wineId} not found in ${listId}`,
							false
						)
					);
			}

			// Om country eller area ändras, ta bort från gamla platsen och lägg till på nya
			let targetCountryKey = country || oldCountryKey;
			let targetAreaName = area || oldAreaObj.area;

			// Om flytt krävs
			if (
				(country && country !== oldCountryKey) ||
				(area && area !== oldAreaObj.area)
			) {
				// Ta bort från gamla platsen
				oldAreaObj.items = oldAreaObj.items.filter(
					(w) => w.id !== wineId
				);

				// Om gamla området blir tomt, ta bort området
				if (oldAreaObj.items.length === 0) {
					const oldCountryObj = wineList.countries.get(oldCountryKey);
					oldCountryObj.areas = oldCountryObj.areas.filter(
						(a) => a.area !== oldAreaObj.area
					);
					wineList.countries.set(oldCountryKey, oldCountryObj);
				}

				// Hämta/skapa nytt land
				let targetCountryObj = wineList.countries.get(targetCountryKey);
				if (!targetCountryObj) {
					targetCountryObj = { country: targetCountryKey, areas: [] };
					wineList.countries.set(targetCountryKey, targetCountryObj);
				}

				// Hämta/skapa nytt område
				let targetAreaObj = targetCountryObj.areas.find(
					(a) => a.area === targetAreaName
				);
				if (!targetAreaObj) {
					targetAreaObj = { area: targetAreaName, items: [] };
					targetCountryObj.areas.push(targetAreaObj);
				}

				// Lägg till vinet i nya området
				targetAreaObj.items.push(wineObj);

				// Spara ändringar på landet
				wineList.countries.set(targetCountryKey, targetCountryObj);
			}

			// Uppdatera namn och pris om de skickas med
			if (name !== undefined) wineObj.name = name;
			if (price !== undefined) wineObj.price = price;

			await wineList.save();

			res.json(
				constructResObj(
					200,
					`Wine ${wineId} updated successfully`,
					true,
					wineObj
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}
	static async deleteWine(req, res) {
		try {
			const { listId, wineId } = req.params;
			const wineList = await WineList.findOne({ id: listId });
			if (!wineList) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`Wine list not found with id: ${listId}`,
							false
						)
					);
			}

			let found = false;
			let deletedWine = null;

			// Loopa igenom alla länder och områden
			for (const [, countryObj] of wineList.countries) {
				for (const areaObj of countryObj.areas) {
					const wineIndex = areaObj.items.findIndex(
						(w) => w.id === wineId
					);
					if (wineIndex !== -1) {
						[deletedWine] = areaObj.items.splice(wineIndex, 1);
						found = true;
						break;
					}
				}
				if (found) break;
			}

			if (!found) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`Wine with id: ${wineId} not found`,
							false
						)
					);
			}

			await wineList.save();
			res.json(
				constructResObj(
					200,
					`Wine ${wineId} deleted successfully`,
					true,
					deletedWine
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}
}
