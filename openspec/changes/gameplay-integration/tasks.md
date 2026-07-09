## 1. New Crops

- [x] 1.1 Add 9 crop entries to `src/data/crops.ts`: echo_shroom, magnetic_clover, solar_cactus, stellar_rose, nebula_moss, storm_sprout, crystal_reed, shadow_fern, chrono_vine — each with growthTime, yields, seedCost
- [x] 1.2 Update `src/components/GameIcon.tsx` to handle new crop IDs for display (if not already present)
- [x] 1.3 Handle missing crop images gracefully in greenhouse/garden components

## 2. New Recipes

- [x] 2.1 Add 9 new manual recipes to `src/data/recipes.ts`: aether_ingot_smelt, nanite_slurry_recipe, plasma_arc_craft, rusted_spring_craft, ration_deluxe_recipe, stimpack_recipe, canteen_recipe, geiger_counter_recipe, deflective_lens_recipe, dream_lantern_recipe
- [x] 2.2 Add 6 new auto-recipes to `src/data/autoRecipes.ts`: craft_rusted_spring, craft_nanite_slurry, craft_crystal_silicon, craft_aether_ingot, craft_plasma_arc, craft_ration_deluxe

## 3. Survivor Events + Expedition Locations

- [x] 3.1 Add 3 new expedition locations to `src/data/expeditionLocations.ts`: poison_factory, ruined_armory, ancient_library — each with unique loot tables
- [x] 3.2 Add 3 new rescue events to `src/data/rescueEvents.ts`: rescue_soldier, rescue_healer, rescue_apprentice with A/B choice designs
- [x] 3.3 Add 3 new entries to `RESCUE_LOCATION_MAP`: poison_factory→rescue_soldier, ruined_armory→rescue_healer, ancient_library→rescue_apprentice
- [x] 3.4 Add 3 new dream signal events to `src/data/dreamEvents.ts`: soldier_signal, healer_signal, apprentice_signal

## 4. Loot Table Integration

- [x] 4.1 Add new items to existing expedition locations: radar_station (+crystal_silicon), subway_station (+rusted_spring), bio_lab (+nanite_slurry)
- [x] 4.2 Add new items to existing reality event rewards: ruined_truck, abandoned_train, fungus_nest, abandoned_lab, wasteland_bandits, sandstorm

## 5. Build & Verify

- [x] 5.1 Run `npm run build` to verify TypeScript compilation
- [x] 5.2 Run `npm run lint` to verify no new lint errors
- [x] 5.3 Run `npx vitest run` to ensure all tests still pass
