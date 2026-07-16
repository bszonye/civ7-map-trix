// vim: sw=2 et
// NOTE: file renamed to avoid import conflict with
//       ui-next/screens/choosers/helpers.js
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import DistrictHealthManager from '/base-standard/ui/district/district-health-manager.js';

const BZ_TYPE_ICONS = {
  // AGELESS: "url(blp:city_ageless)",
  MILITARY: "url(blp:nar_rew_promotion)",
  RELIGIOUS: "url(blp:fi_nar_rew_religion_64)",
  GREATWORK: "url(blp:fi_greatwork_64)",
  FORTIFICATION: "url(blp:fi_action_fortify_64)",
  CITY_STATE_UNIQUE_IMPROVEMENT: "url(blp:fi_citystate_gold_64)",
  // UNIQUE: null,
  // UNIQUE_IMPROVEMENT: null,
  FOOD_WAREHOUSE: "url(blp:fi_Yield_Food_64)",
  PRODUCTION_WAREHOUSE: "url(blp:fi_Yield_Production_64)",
  WAREHOUSE: "url(blp:icon_building_warehouse)",
  WATER: "url(blp:icon_building_water)",
  // BRIDGE: null,
  FOOD: "url(blp:fi_Yield_Food_64)",
  PRODUCTION: "url(blp:fi_Yield_Production_64)",
  GOLD: "url(blp:fi_Yield_Gold_64)",
  SCIENCE: "url(blp:fi_Yield_Science_64)",
  CULTURE: "url(blp:fi_Yield_Culture_64)",
  HAPPINESS: "url(blp:fi_Yield_Happiness_64)",
  DIPLOMACY: "url(blp:fi_yield_diplomacy_64)",
}
const BZ_TYPE_TAGS = /* @__PURE__ */ new Map();
for (const e of GameInfo.TypeTags) {
  let tags = BZ_TYPE_TAGS.get(e.Type) ?? new Set();
  if (!tags.size) BZ_TYPE_TAGS.set(e.Type, tags);
  tags.add(e.Tag);
}

function getCurrentAge() {
  return GameInfo.Ages.lookup(Game.age)?.ChronologyIndex ?? 0;
}
function getAgelessTypes() {
  return new Set(GameInfo.TypeTags.filter((e) => e.Tag == "AGELESS").map((e) => e.Type));
}
function getTerrainLabel(location, showDebug) {
  const terrainType = GameplayMap.getTerrainType(location.x, location.y);
  const terrain = GameInfo.Terrains.lookup(terrainType);
  if (terrain) {
    if (showDebug) {
      if (terrain.TerrainType == "TERRAIN_COAST" && GameplayMap.isLake(location.x, location.y)) {
        return Locale.compose("{1_Name} ({2_Value})", "LOC_TERRAIN_LAKE_NAME", terrainType.toString());
      }
      return Locale.compose("{1_Name} ({2_Value})", terrain.Name, terrainType.toString());
    } else {
      if (terrain.TerrainType == "TERRAIN_COAST" && GameplayMap.isLake(location.x, location.y)) {
        return "LOC_TERRAIN_LAKE_NAME";
      }
      return terrain.Name;
    }
  }
  return "";
}
function getBiomeLabel(location, showDebug) {
  const biomeType = GameplayMap.getBiomeType(location.x, location.y);
  const biome = GameInfo.Biomes.lookup(biomeType);
  if (biome && biome.BiomeType != "BIOME_MARINE") {
    if (showDebug) {
      return Locale.compose("{1_Name} ({2_Value})", biome.Name, biomeType.toString());
    } else {
      return biome.Name;
    }
  }
  return "";
}
function getFeatureInfo(location, plotIndex) {
  let label = "";
  let tooltip = "";
  const type = GameplayMap.getFeatureType(location.x, location.y);
  const feature = GameInfo.Features.lookup(type);
  const isNaturalWonder = GameplayMap.isNaturalWonder(location.x, location.y);
  if (feature) {
    label = feature.Name;
    if (feature.Tooltip) {
      tooltip = feature.Tooltip;
    }
  }
  let volcano = void 0;
  if (GameplayMap.isVolcano(location.x, location.y)) {
    const active = GameplayMap.isVolcanoActive(location.x, location.y);
    const volcanoName = GameplayMap.getVolcanoName(location.x, location.y);
    const eruptionInfo = MapFeatures.getVolcanoEruptionInfoAt(plotIndex) ?? void 0;
    volcano = { name: volcanoName, active, eruptionInfo };
  }
  return { type, label, tooltip, isNaturalWonder, volcano };
}
function getContinentName(location) {
  const continentType = GameplayMap.getContinentType(location.x, location.y);
  const continent = GameInfo.Continents.lookup(continentType);
  if (continent && continent.Description) {
    return continent.Description;
  }
  return "";
}
function getRiverLabel(location) {
  const riverType = GameplayMap.getRiverType(location.x, location.y);
  if (riverType != RiverTypes.NO_RIVER) {
    let riverNameLabel = GameplayMap.getRiverName(location.x, location.y);
    if (!riverNameLabel) {
      switch (riverType) {
        case RiverTypes.RIVER_MINOR:
          riverNameLabel = "LOC_MINOR_RIVER_NAME";
          break;
        case RiverTypes.RIVER_NAVIGABLE:
          riverNameLabel = "LOC_NAVIGABLE_RIVER_NAME";
          break;
      }
    }
    return riverNameLabel;
  }
  return "";
}
function getRouteData(location) {
  const routeTypeHash = GameplayMap.getRouteType(location.x, location.y);
  const route = GameInfo.Routes.lookup(routeTypeHash);
  const isFerry = GameplayMap.isFerry(location.x, location.y);
  let returnString = "";
  if (route) {
    if (isFerry) {
      returnString = Locale.compose(
        "{1_RouteName} {LOC_PLOT_DIVIDER_DOT} {2_Ferry}",
        route.Name,
        "LOC_NAVIGABLE_RIVER_FERRY"
      );
    } else {
      returnString = route.Name;
    }
    return { name: returnString, type: route.RouteType };
  }
  return null;
}
function getResource(location) {
  const resourceType = GameplayMap.getResourceType(location.x, location.y);
  return GameInfo.Resources.lookup(resourceType);
}
function getSettlementName(owningCity) {
  return owningCity?.name;
}
function getSpecialistDescription(location, owningCity) {
  if (owningCity?.Workers) {
    const maxSpecialists = owningCity.Workers.getCityWorkerCap();
    if (maxSpecialists > 0) {
      const workerInfo = owningCity.Workers.GetTilePlacementInfo(
        GameplayMap.getIndexFromXY(location.x, location.y)
      );
      if (workerInfo.NumWorkers > 0 || !workerInfo.IsBlocked) {
        return {
          key: "LOC_PLOT_TOOLTIP_SPECIALISTS_ASSIGNED",
          args: [workerInfo.NumWorkers, workerInfo.MaxWorkers]
        };
      }
    }
  }
  return null;
}
function getConstructibleInfo(constructible, plotCoordinate, currentAge, agelessTypes, overbuildableConstructibleTypes) {
  const instance = Constructibles.getByComponentID(constructible);
  const info = instance ? GameInfo.Constructibles.lookup(instance.type) : null;
  const location = instance?.location;
  if (instance && info && location && location.x == plotCoordinate.x && location.y == plotCoordinate.y) {
    const type = info.ConstructibleType;
    const age = GameInfo.Ages.lookup(info.Age ?? 0)?.ChronologyIndex ?? 0;
    const isAgeless = agelessTypes.has(type);
    const isBuilding = info.ConstructibleClass == "BUILDING";
    const isWonder = info.ConstructibleClass == "WONDER";
    const isImprovement = info.ConstructibleClass == "IMPROVEMENT";
    const uniqueQuarterType = instance.uniqueQuarterType;
    console.warn(`TRIX UQ ${type} ${uniqueQuarterType}`);
    // TRIX: collect tags and matching icons
    const tagset = BZ_TYPE_TAGS.get(type) ?? new Set();
    const tags = [], icons = [];
    for (const [tag, icon] of Object.entries(BZ_TYPE_ICONS)) {
      tags.push(tag);
      if (tagset.has(tag)) icons.push(icon);
    }
    if (isBuilding || isWonder || isImprovement) {
      return {
        location,
        type,
        age,
        isAgeless,
        isBuilding,
        isWonder,
        isImprovement,
        uniqueQuarterType,
        damaged: instance.damaged,
        complete: instance.complete,
        overbuildable: overbuildableConstructibleTypes.includes(info.$hash) && isBuilding,
        title: info.Name,
        description: info.Description,
        icon: UI.getIconCSS(info.ConstructibleType),
        tags,
        icons,
        sortOrder: isBuilding || isWonder ? currentAge == age ? 1 : 0 : 2
      };
    }
  }
  return null;
}
function getPlotYields(location, playerID) {
  const plotIndex = GameplayMap.getIndexFromLocation(location);
  const rawYields = GameplayMap.getYields(plotIndex, playerID);
  const yields = [];
  if (rawYields) {
    for (const [yieldType, yieldAmount] of rawYields) {
      if (yieldAmount > 0) {
        const yieldDef = GameInfo.Yields.lookup(yieldType);
        if (yieldDef) {
          yields.push({
            yieldType: yieldDef.YieldType,
            amount: yieldAmount,
            name: yieldDef.Name
          });
        }
      }
    }
  }
  return yields;
}
function getDistrictHealthInfo(location) {
  const playerID = GameplayMap.getOwner(location.x, location.y);
  const playerDistricts = Players.Districts.get(playerID);
  if (!playerDistricts) {
    return null;
  }
  const currentHealth = playerDistricts.getDistrictHealth(location);
  const maxHealth = playerDistricts.getDistrictMaxHealth(location);
  const isUnderSiege = playerDistricts.getDistrictIsBesieged(location);
  if (!DistrictHealthManager.canShowDistrictHealth(currentHealth, maxHealth)) {
    return null;
  }
  const revealedState = GameplayMap.getRevealedState(
    GameContext.localPlayerID,
    location.x,
    location.y
  );
  if (revealedState != RevealedStates.VISIBLE) {
    return null;
  }
  return { currentHealth, maxHealth, isUnderSiege, canShow: true };
}
function getOwnerInfo(location, playerID) {
  if (playerID === null || playerID == PlayerIds.NO_PLAYER) {
    return null;
  }
  const filteredConstructibles = MapConstructibles.getHiddenFilteredConstructibles(location.x, location.y);
  const constructibles = MapConstructibles.getConstructibles(location.x, location.y);
  const player = Players.get(playerID);
  if (!player || !Players.isAlive(playerID)) {
    return null;
  }
  if (filteredConstructibles.length == 0 && filteredConstructibles.length != constructibles.length) {
    return null;
  }
  const civName = GameplayMap.getOwnerName(location.x, location.y);
  const localPlayerID = GameContext.localPlayerID;
  const playerName = player.name;
  if (player.isIndependent) {
    const relationship = GameplayMap.getOwnerHostility(location.x, location.y, localPlayerID);
    const bonusType = Game.CityStates.getBonusType(playerID);
    const bonusDefinition = GameInfo.CityStateBonuses.find(
      (t) => t.$hash == bonusType
    );
    return {
      isIndependent: true,
      civName,
      playerName,
      relationship: relationship ?? void 0,
      cityStateBonus: bonusDefinition?.Name
    };
  } else {
    const districtId = MapCities.getDistrict(location.x, location.y);
    let conquerorInfo;
    if (districtId) {
      const district = Districts.get(districtId);
      if (district && ComponentID.isValid(districtId) && district.owner != district.controllingPlayer) {
        const conqueror = Players.get(district.controllingPlayer);
        if (conqueror) {
          conquerorInfo = {
            isIndependent: conqueror.isIndependent,
            name: conqueror.isIndependent ? "LOC_PLOT_TOOLTIP_INDEPENDENT_CONQUEROR" : conqueror.civilizationFullName
          };
        }
      }
    }
    let suzerainId;
    if (player.isMinor && player.Influence?.hasSuzerain) {
      suzerainId = player.Influence.getSuzerain();
    }
    return {
      isIndependent: false,
      civName,
      playerName,
      conquerorInfo,
      suzerainId
    };
  }
}
function getPlayerRelationship(lpd, targetPlayerID) {
  const relationship = lpd.getRelationshipEnum(targetPlayerID);
  if (relationship === DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_NEUTRAL) {
    return void 0;
  }
  return {
    name: lpd.getRelationshipLevelName(targetPlayerID) ?? "LOC_RELATIONSHIP_UNKNOWN",
    hostile: relationship === DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HOSTILE
  };
}
function getIndependentRelationship(independentID, localPlayerID) {
  const relationship = Game.IndependentPowers.getIndependentRelationship(independentID, localPlayerID);
  if (relationship === IndependentRelationship.NEUTRAL) {
    return void 0;
  }
  return {
    name: Game.IndependentPowers.getIndependentHostility(independentID, localPlayerID),
    hostile: relationship === IndependentRelationship.HOSTILE
  };
}
function buildUnitInfoProps(unit, localPlayer) {
  const owningPlayer = Players.get(unit.owner);
  if (!owningPlayer) {
    return null;
  }
  const unitDefinition = GameInfo.Units.lookup(unit.type);
  const unitIcon = unitDefinition ? UI.getIconCSS(unitDefinition.UnitType) : void 0;
  const isCivilian = unitDefinition?.FormationClass === "FORMATION_CLASS_CIVILIAN";
  const civSymbol = Icon.getCivSymbolCSSFromCivilizationType(owningPlayer.civilizationType) || void 0;
  let treasureFleet;
  const disbandCityId = unit.getAssociatedDisbandCityId();
  const originCity = disbandCityId != null ? Cities.get(disbandCityId) : null;
  if (originCity) {
    treasureFleet = {
      originCityName: originCity.name,
      points: unit.getDisbandVictoryPoints()
    };
  }
  const lpd = localPlayer.Diplomacy;
  const isAtWarWithOwner = lpd.isAtWarWith(owningPlayer.id);
  let relationship;
  if (owningPlayer.isMinor || owningPlayer.isIndependent) {
    const independentID = Game.IndependentPowers.getIndependentPlayerIDFromUnit(unit.id);
    if (independentID != PlayerIds.NO_PLAYER) {
      const indy = Players.get(independentID);
      if (indy) {
        let civName = indy.civilizationFullName;
        if (owningPlayer.isMinor) {
          const cityStatePlayer = Players.get(independentID);
          const suzerainPlayer = cityStatePlayer?.Influence ? Players.get(cityStatePlayer.Influence.getSuzerain()) : null;
          if (suzerainPlayer) {
            relationship = getPlayerRelationship(lpd, suzerainPlayer.id);
          } else {
            relationship = getIndependentRelationship(independentID, localPlayer.id);
            civName = `LOC_CIVILIZATION_INDEPENDENT:${civName}`;
          }
        } else {
          civName = `LOC_CIVILIZATION_INDEPENDENT_SINGULAR:${civName}`;
        }
        if (isAtWarWithOwner) {
          relationship = getIndependentRelationship(independentID, localPlayer.id);
        }
        return {
          unit,
          unitIcon,
          ownerName: "",
          civName,
          civSymbol,
          relationship,
          isMinorOrIndependent: true,
          isCivilian,
          treasureFleet,
          isAtWarWithOwner
        };
      }
    }
    return null;
  } else {
    if (owningPlayer.id !== localPlayer.id) {
      relationship = getPlayerRelationship(lpd, owningPlayer.id);
    }
    return {
      unit,
      unitIcon,
      ownerName: owningPlayer.name,
      civName: owningPlayer.civilizationFullName,
      civSymbol,
      relationship,
      isMinorOrIndependent: false,
      isCivilian,
      treasureFleet,
      isAtWarWithOwner
    };
  }
}
function getUnitEntries(location, localPlayer) {
  if (GameplayMap.getRevealedState(localPlayer.id, location.x, location.y) != RevealedStates.VISIBLE) {
    return [];
  }
  const plotUnits = MapUnits.getUnits(location.x, location.y);
  const results = [];
  for (const unitId of plotUnits) {
    const unit = Units.get(unitId);
    if (unit && Visibility.isVisible(localPlayer.id, unit.id)) {
      const info = buildUnitInfoProps(unit, localPlayer);
      if (info) {
        results.push(info);
      }
    }
  }
  return results;
}
function getVisiblePlotEffects(plotIndex) {
  const plotEffects = MapPlotEffects.getPlotEffects(plotIndex);
  const localPlayerID = GameContext.localPlayerID;
  const visibleEffects = [];
  plotEffects?.forEach((item) => {
    const effectInfo = GameInfo.PlotEffects.lookup(item.effectType);
    if (!item.onlyVisibleToOwner || item.onlyVisibleToOwner && item.owner == localPlayerID) {
      if (effectInfo) {
        const eventMapping = GameInfo.RandomEventPlotEffects.find(
          (e) => e.PlotEffectType === effectInfo.PlotEffectType
        );
        const randomEvent = eventMapping ? GameInfo.RandomEvents.lookup(eventMapping.RandomEventType) : void 0;
        visibleEffects.push({
          name: effectInfo.Name,
          plotEffectType: effectInfo.PlotEffectType,
          effectType: item.effectType,
          eventClass: randomEvent?.EventClass,
          eventName: randomEvent?.Name,
          duration: item.duration,
          onlyVisibleToOwner: item.onlyVisibleToOwner,
          owner: item.owner
        });
      }
    }
  });
  return visibleEffects;
}
function getTreasureConvoyInfo(owningCity) {
  if (!owningCity?.Resources) return null;
  if (!owningCity.Resources.canStartTreasureFleet().Success) return null;
  return { turnsRemaining: owningCity.Resources.getTurnsUntilTreasureGenerated() };
}

export { getAgelessTypes, getBiomeLabel, getConstructibleInfo, getContinentName, getCurrentAge, getDistrictHealthInfo, getFeatureInfo, getOwnerInfo, getPlotYields, getResource, getRiverLabel, getRouteData, getSettlementName, getSpecialistDescription, getTerrainLabel, getTreasureConvoyInfo, getUnitEntries, getVisiblePlotEffects };
//# sourceMappingURL=helpers.js.map
