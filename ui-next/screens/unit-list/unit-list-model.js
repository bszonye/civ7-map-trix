import { createSignal, createEffect, onMount, onCleanup, createContext, useContext } from '../../../../core/vendor/solid-js/dist/solid.js';
import { createStore, reconcile } from '../../../../core/vendor/solid-js/store/dist/store.js';
import { ComponentID } from '../../../../core/ui/utilities/utilities-component-id.js';
import UpdateGate from '../../../../core/ui/utilities/utilities-update-gate.js';
import { useLocalPlayerId } from '../../../../core/ui-next/utilities/game-core-utilities.js';
import { FullTextSearch } from '../../../../core/ui-next/utilities/search-utils.js';
import { UnitActionHandlers } from '../../../ui/unit-interact/unit-action-handlers.js';
import { getTagsFromType } from '../../../ui/utilities/utilities-tags.js';

var UnitActionCategory = /* @__PURE__ */ ((UnitActionCategory2) => {
  UnitActionCategory2[UnitActionCategory2["OPERATION"] = 0] = "OPERATION";
  UnitActionCategory2[UnitActionCategory2["COMMAND"] = 1] = "COMMAND";
  return UnitActionCategory2;
})(UnitActionCategory || {});
const ACTIVITY_DATA = {
  [UnitActivityTypes.HOLD]: ["url(blp:Action_Skip)", "LOC_UNITOPERATION_SKIP_TURN_NAME", ""],
  [UnitActivityTypes.SLEEP]: ["url(blp:Action_Sleep)", "LOC_UNITOPERATION_SLEEP_NAME", ""],
  [UnitActivityTypes.HEAL]: ["url(blp:Action_Heal)", "LOC_UNITOPERATION_HEAL_NAME", ""],
  [UnitActivityTypes.SENTRY]: ["url(blp:Action_Wake)", "LOC_UNITOPERATION_ALERT_NAME", ""]
};
const UNITDOMAIN_NAME = {
  DOMAIN_LAND: "LOC_TAG_UNIT_CLASS_LAND",
  DOMAIN_SEA: "LOC_TAG_UNIT_CLASS_NAVAL",
  DOMAIN_AIR: "LOC_TAG_UNIT_CLASS_AIRCRAFT"
};
const OPERATIONS_QUICK_ACCESS = ["UNITOPERATION_ALERT"];
const COMMANDS_QUICK_ACCESS = ["UNITCOMMAND_UPGRADE", "UNITCOMMAND_PROMOTE"];
const UnitListModel = () => {
  const updateGate = new UpdateGate(() => {
    populateData();
  });
  let unitListSearch = new FullTextSearch("UnitListFilter");
  const fulltextSearch = (text) => unitListSearch.find(text.trim().toLocaleLowerCase());
  const localPlayerID = useLocalPlayerId();
  const [isUnitListOpen, setIsUnitListOpen] = createSignal(false);
  const [isFocusActions, setIsFocusActions] = createSignal(false);
  const [focusedUnitIndex, setFocusedUnitIndex] = createSignal(0);
  const [actionIndex, setActionIndex] = createSignal(0);
  const [unitListData, setUnitListData] = createStore({
    units: [],
    armies: []
  });
  const unitIndexMap = /* @__PURE__ */ new Map();
  const findUnitIndex = (id) => {
    const index = unitIndexMap.get(id) ?? -1;
    return index;
  };
  const findUnit = (id, model) => {
    const index = unitIndexMap.get(id) ?? -1;
    const unit = model[index];
    return unit;
  };
  const armyIndexMap = /* @__PURE__ */ new Map();
  const findArmyIndex = (id) => {
    const index = armyIndexMap.get(id) ?? -1;
    return index;
  };
  const findArmy = (id, model) => {
    const index = armyIndexMap.get(id) ?? -1;
    const army = model[index];
    return army;
  };
  const onUpdate = () => {
    updateGate.call("unitListUpdate");
  };
  createEffect(() => {
    if (isUnitListOpen()) {
      onUpdate();
    }
  });
  onMount(() => {
    onUpdate();
    function updateMovement(data) {
      if (!isUnitListOpen()) return;
      if (data.unit.owner != localPlayerID()) return;
      const index = findUnitIndex(data.unit.id);
      if (index < 0) return;
      const unit = Units.get(data.unit);
      if (!unit) return;
      setUnitListData("units", index, {
        movesRemaining: data.newPoints,
        canMove: unit.canMove,
        location: unit.location
      });
      if (unit.isCommanderUnit) {
        const armyEntry = findArmy(unit.armyId.id, unitListData.armies);
        if (armyEntry) {
          for (const unit2 of armyEntry.packedUnits) {
            updateOperations({ unit: unit2 });
          }
        }
      }
    }
    function updateOperations(data) {
      if (!isUnitListOpen()) return;
      if (data.unit.owner != localPlayerID()) return;
      const index = findUnitIndex(data.unit.id);
      const unitEntry = unitListData.units[index];
      if (index < 0 || !unitEntry) return;
      const unit = Units.get(unitEntry.id);
      if (!unit) return;
      const statusData = getStatusData(unit);
      const actions = getValidActions(unit);
      setUnitListData("units", index, {
        statusIcon: statusData[0],
        statusName: statusData[1],
        actions
      });
      if (unit.isCommanderUnit) {
        const armyEntry = findArmy(unit.armyId.id, unitListData.armies);
        if (armyEntry) {
          for (const unit2 of armyEntry.packedUnits) {
            updateOperations({ unit: unit2 });
          }
        }
      }
    }
    function updateExperience(data) {
      if (!isUnitListOpen()) return;
      if (data.unit.owner != localPlayerID()) return;
      const index = findUnitIndex(data.unit.id);
      const unit = Units.get(data.unit);
      if (index < 0 || !unit) return;
      setUnitListData("units", index, {
        promotions: unit.Experience?.getLevel ?? 0
      });
      updateOperations(data);
    }
    function updateDamage(data) {
      if (!isUnitListOpen()) return;
      if (data.unit.owner != localPlayerID()) return;
      const index = findUnitIndex(data.unit.id);
      if (index < 0) return;
      setUnitListData("units", index, {
        damage: data.newDamage
      });
    }
    function updateName(data) {
      if (!isUnitListOpen()) return;
      if (data.unit.owner != localPlayerID()) return;
      if (data.command != Database.makeHash("UNITCOMMAND_NAME_UNIT")) return;
      const index = findUnitIndex(data.unit.id);
      const unit = Units.get(data.unit);
      if (index < 0 || !unit) return;
      setUnitListData("units", index, {
        name: unit.name
      });
    }
    const events = [
      // More specific updates
      ["UnitMovementPointsChanged", updateMovement],
      ["UnitDamageChanged", updateDamage],
      ["UnitExperienceChanged", updateExperience],
      ["UnitActivityChanged", updateOperations],
      ["UnitOperationStarted", updateOperations],
      ["UnitCommandStarted", updateOperations],
      ["UnitCommandStarted", updateName],
      // On Update is EXPENSIVE
      // It recreates the entire model from scratch
      // If we can create a more targeted update for these, we should do that.
      ["UnitAddedToMap", onUpdate],
      ["UnitRemovedFromMap", onUpdate],
      ["UnitAddedToArmy", onUpdate],
      ["UnitRemovedFromArmy", onUpdate]
    ];
    events.forEach((event) => engine.on(event[0], event[1]));
    onCleanup(() => {
      events.forEach((event) => engine.off(event[0], event[1]));
    });
  });
  function getArmy(unit) {
    if (ComponentID.isValid(unit.armyId)) return unit.armyId;
    const armyID = Players.get(unit.id.owner)?.Armies?.getUnitReinforcementCommanderId(unit.id, unit.id.owner);
    if (armyID && armyID > 0) {
      return ComponentID.make(unit.id.owner, 29, armyID);
    }
    return ComponentID.getInvalidID();
  }
  function getReinforcementTime(unit) {
    const player = Players.get(unit.id.owner);
    if (!player) return -1;
    return player.Armies?.getUnitReinforcementETA(unit.id, unit.id.owner) ?? -1;
  }
  function getStatusData(unit) {
    if (unit.getTimeoutReturn > 0) {
      return [
        `url(blp:Action_Delete)`,
        "LOC_UNIT_LIST_RESPAWN_NAME",
        Locale.compose("LOC_UNIT_LIST_RESPAWN_DESCRIPTION", unit.getTimeoutReturn)
      ];
    }
    const operationType = unit.getOperationType();
    const operationDef = GameInfo.UnitOperations.lookup(operationType);
    if (operationDef) {
      if (operationDef.OperationType == "UNITOPERATION_REINFORCE_ARMY") {
        return [
          `url(${operationDef.Icon})`,
          operationDef.Name,
          Locale.compose("LOC_UNIT_LIST_REINFORCE_DESCRIPTION", getReinforcementTime(unit))
        ];
      } else {
        return [`url(${operationDef.Icon})`, operationDef.Name, ""];
      }
    }
    const activityType = unit.activityType;
    return ACTIVITY_DATA[activityType] ?? ["", "", ""];
  }
  function getTextSearch(unit, unitListData2, memo) {
    const unitId = unit.id.id;
    if (memo.has(unitId)) {
      return memo.get(unitId);
    }
    let textSearch = unit.textSearchSnippet;
    for (const packedId of unit.packedUnits) {
      const childUnit = findUnit(packedId.id, unitListData2);
      if (childUnit) {
        textSearch += ` ${getTextSearch(childUnit, unitListData2, memo)}`;
      }
    }
    memo.set(unitId, textSearch);
    return textSearch;
  }
  const EMPTY_PAYLOAD = Object.freeze({});
  function executeOperation(unit, operationType) {
    if (unit.isOnMap) {
      Camera.lookAtPlot(unit.location);
    }
    Game.UnitOperations.sendRequest(unit.id, operationType, EMPTY_PAYLOAD);
  }
  function checkOperationValid(unit, operationType) {
    const result = Game.UnitOperations?.canStart(unit.id, operationType, {}, false);
    if (result.Success) {
      const row = GameInfo.UnitOperations.lookup(operationType);
      if (row) {
        const action = {
          category: 0 /* OPERATION */,
          type: row.OperationType,
          name: row.Name,
          icon: row.Icon,
          description: Locale.compose(row.Description),
          callback: () => executeOperation(unit, operationType)
        };
        if (result.AdditionalDescription) {
          for (const desc of result.AdditionalDescription) {
            action.description += `[n][STYLE:unit-action__tooltip-additional-desc]${Locale.compose(desc)}[/STYLE]`;
          }
        }
        return action;
      }
    }
  }
  function executeCommand(unit, commandType) {
    if (commandType != "UNITCOMMAND_PROMOTE") {
      if (unit.isOnMap) {
        Camera.lookAtPlot(unit.location);
      }
      Game.UnitCommands.sendRequest(unit.id, commandType, EMPTY_PAYLOAD);
    } else {
      UI.Player.selectUnit(unit.id);
      UnitActionHandlers.switchToActionInterfaceMode("UNITCOMMAND_PROMOTE", {
        UnitID: unit.id
      });
    }
  }
  function checkCommandValid(unit, commandType) {
    const result = Game.UnitCommands?.canStart(unit.id, commandType, {}, false);
    if (result.Success) {
      const row = GameInfo.UnitCommands.lookup(commandType);
      if (row) {
        const action = {
          category: 1 /* COMMAND */,
          type: row.CommandType,
          name: row.Name,
          icon: row.Icon,
          description: row.Description ? Locale.compose(row.Description) : "",
          callback: () => executeCommand(unit, commandType)
        };
        if (result.AdditionalDescription) {
          for (const desc of result.AdditionalDescription) {
            action.description += `[n][STYLE:unit-action__tooltip-additional-desc]${Locale.compose(desc)}[/STYLE]`;
          }
        }
        return action;
      }
    }
  }
  function getValidActions(unit) {
    const actions = [];
    for (const operationType of ["UNITOPERATION_REST_UNTIL_HEALED", "UNITOPERATION_SLEEP"]) {
      const action = checkOperationValid(unit, operationType);
      if (action) {
        actions.push(action);
        break;
      }
    }
    for (const operationType of OPERATIONS_QUICK_ACCESS) {
      const action = checkOperationValid(unit, operationType);
      if (action) {
        actions.push(action);
      }
    }
    for (const commandType of COMMANDS_QUICK_ACCESS) {
      const action = checkCommandValid(unit, commandType);
      if (action) {
        if (commandType == "UNITCOMMAND_PROMOTE") {
          const promotionsCount = (unit.Experience?.getStoredPromotionPoints ?? 0) + (unit.Experience?.getStoredCommendations ?? 0);
          if (promotionsCount < 1) continue;
        }
        actions.push(action);
      }
    }
    return actions.reverse();
  }
  function rebuildSearch(unitListData2) {
    unitListSearch = new FullTextSearch("UnitListFilter");
    const searchData = [];
    const searchMemo = /* @__PURE__ */ new Map();
    for (const unitEntry of unitListData2) {
      if (unitEntry.packedUnits.length > 0) {
        unitEntry.textSearch = getTextSearch(unitEntry, unitListData2, searchMemo);
      }
      searchData.push({
        key: unitEntry.id.id.toString(),
        title: unitEntry.textSearchSnippet.toLocaleLowerCase(),
        fullText: unitEntry.textSearch.toLocaleLowerCase()
      });
    }
    unitListSearch.addSearchData(searchData);
  }
  function buildParentMap(armyListData) {
    const parentMap = /* @__PURE__ */ new Map();
    for (const armyEntry of armyListData) {
      if (!ComponentID.isValid(armyEntry.commanderId)) continue;
      for (const packedId of armyEntry.packedUnits) {
        if (packedId.id !== armyEntry.commanderId.id) {
          parentMap.set(packedId.id, armyEntry.commanderId);
        }
      }
    }
    return parentMap;
  }
  function getUnitData(unit, armyListData, parentMap) {
    const unitDef = GameInfo.Units.lookup(unit.type);
    const unitMovement = unit.Movement;
    const unitHealth = unit.Health;
    const statusData = getStatusData(unit);
    const armyID = getArmy(unit);
    const unitTypeName = unitDef ? Locale.compose(unitDef.Name) : "";
    const unitName = unit.name || unitTypeName;
    const tags = new Set(getTagsFromType(unitDef?.UnitType ?? ""));
    let parentID = parentMap.get(unit.id.id) ?? null;
    let unitClassName = "LOC_UNIT_CLASS_MILITARY";
    const eCoreClassType = unit.getCoreClass;
    if (!unit.Combat?.canAttack) {
      if (eCoreClassType === UnitCoreClassTypes.CORE_CLASS_SUPPORT || eCoreClassType === UnitCoreClassTypes.CORE_CLASS_STATIC_CONSTRUCTIBLE) {
        unitClassName = "LOC_UNIT_CLASS_SUPPORT";
      } else {
        unitClassName = "LOC_UNIT_CLASS_CIVILIAN";
      }
    }
    tags.add(Locale.compose(unitClassName));
    const unitDomainName = UNITDOMAIN_NAME[unitDef?.Domain ?? ""] ?? "LOC_TAG_UNIT_CLASS_LAND";
    tags.add(Locale.compose(unitDomainName));
    if (unit.isGreatPerson) {
      const greatPersonClassName = GameInfo.GreatPersonClasses.lookup(unit.GreatPerson?.class ?? "")?.Name ?? "";
      if (greatPersonClassName) tags.add(Locale.compose(greatPersonClassName));
    }
    let armyEntry = findArmy(armyID.id, armyListData);
    if (ComponentID.isValid(unit.armyId) !== ComponentID.isValid(armyID)) {
      if (!armyEntry) {
        armyEntry = { id: armyID, commanderId: ComponentID.getInvalidID(), packedUnits: [] };
      }
      armyEntry.packedUnits.push(unit.id);
      if (ComponentID.isValid(armyEntry.commanderId)) {
        parentID = armyEntry.commanderId;
      }
    }
    let packedUnits = [];
    if (armyEntry?.commanderId.id == unit.id.id) {
      packedUnits = armyEntry.packedUnits;
    }
    return {
      id: unit.id,
      armyId: armyID,
      parentUnitId: parentID,
      type: unit.type,
      coreClass: unitClassName,
      typeName: unit.typeName,
      unitTypeName,
      name: unitName,
      tier: unitDef?.Tier ?? 0,
      promotions: unit.Experience?.getLevel ?? 0,
      timeoutReturn: unit.getTimeoutReturn,
      reinforcementTime: getReinforcementTime(unit),
      damage: unitHealth?.damage.valueOf() ?? 0,
      maxDamage: unitHealth?.maxDamage ?? 0,
      canMove: unit.canMove,
      movesRemaining: unitMovement?.movementMovesRemaining ?? 0,
      maxMoves: unitMovement?.maxMoves ?? 0,
      statusIcon: statusData[0],
      statusName: statusData[1],
      statusDescription: statusData[2],
      actions: getValidActions(unit),
      isOnMap: unit.isOnMap,
      location: unit.location,
      isSelectValid: unit.isOnMap || ComponentID.isValid(unit.armyId) && unit.getTimeoutReturn <= 0,
      isCommander: unit.isCommanderUnit,
      packedUnits,
      textSearchSnippet: `${unitName}, ${[...tags].join(", ")}, `,
      textSearch: unitTypeName
    };
  }
  function populateData() {
    if (!isUnitListOpen()) return;
    const playerID = localPlayerID();
    const player = Players.get(playerID);
    const units = player?.Units?.getUnits() ?? [];
    const armyListData = [];
    armyIndexMap.clear();
    const unitListData2 = [];
    unitIndexMap.clear();
    const armies = player?.Armies?.getArmyIds() ?? [];
    for (const armyId of armies) {
      const army = Armies.get(armyId);
      if (!army) {
        console.error("unit-list-model: army not found for armyID?");
        continue;
      }
      const commanderId = army.getCommanderId();
      const armyEntry = {
        id: armyId,
        commanderId,
        packedUnits: army?.getUnitIds() ?? []
      };
      armyIndexMap.set(armyId.id, armyListData.length);
      armyListData.push(armyEntry);
    }
    const parentMap = buildParentMap(armyListData);
    for (const unit of units) {
      if (!unit) continue;
      const unitEntry = getUnitData(unit, armyListData, parentMap);
      unitIndexMap.set(unit.id.id, unitListData2.length);
      unitListData2.push(unitEntry);
    }
    rebuildSearch(unitListData2);
    setUnitListData("units", reconcile(unitListData2));
    setUnitListData("armies", reconcile(armyListData));
  }
  return {
    data: unitListData,
    setIsUnitListOpen,
    fullTextSearch: fulltextSearch,
    findUnit,
    findUnitIndex,
    findArmy,
    findArmyIndex,
    isFocusActions,
    setIsFocusActions,
    focusedUnitIndex,
    setFocusedUnitIndex,
    actionIndex,
    setActionIndex
  };
};
const UnitListModelContext = createContext(UnitListModel());
const useUnitListModel = () => useContext(UnitListModelContext);

export { UnitListModelContext, useUnitListModel };
//# sourceMappingURL=unit-list-model.js.map
