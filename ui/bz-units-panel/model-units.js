import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { Icon } from '/core/ui/utilities/utilities-image.chunk.js';
import { U as UpdateGate } from '/core/ui/utilities/utilities-update-gate.chunk.js';

const tagTypes = (tag) => GameInfo.TypeTags
    .filter(e => e.Tag == tag).map(e => Game.getHash(e.Type));
const TRADER_TYPES = new Set(tagTypes("UNIT_CLASS_TRADE_ROUTE"));

// TODO: determine which actions use INTERCEPT and JUMP
const ACTIVITY_ICONS = new Map([
    [UnitActivityTypes.NONE, ""],
    [UnitActivityTypes.AWAKE, ""],
    [UnitActivityTypes.HOLD, "blp:Action_Skip"],
    [UnitActivityTypes.SLEEP, "blp:Action_Sleep"],
    [UnitActivityTypes.HEAL, "blp:Action_Heal"],
    [UnitActivityTypes.SENTRY, "blp:Action_Wake"],
    [UnitActivityTypes.INTERCEPT, "blp:Action_Alert"],
    [UnitActivityTypes.OPERATION, ""],
    [UnitActivityTypes.JUMP, "blp:Action_Alert"],
]);
const ACTIVITY_NAMES = new Map([
    [UnitActivityTypes.NONE, ""],
    [UnitActivityTypes.AWAKE, ""],
    [UnitActivityTypes.HOLD, "LOC_UNITOPERATION_SKIP_TURN_NAME"],
    [UnitActivityTypes.SLEEP, "LOC_UNITOPERATION_SLEEP_NAME"],
    [UnitActivityTypes.HEAL, "LOC_UNITOPERATION_HEAL_NAME"],
    [UnitActivityTypes.SENTRY, "LOC_UNITOPERATION_ALERT_NAME"],
    [UnitActivityTypes.INTERCEPT, ""],
    [UnitActivityTypes.OPERATION, ""],
    [UnitActivityTypes.JUMP, ""],
]);
const DISTRICT_ICONS = new Map([
    [DistrictTypes.INVALID, ""],
    [DistrictTypes.CITY_CENTER, "blp:city_urban"],
    [DistrictTypes.RURAL, "blp:city_rural"],
    [DistrictTypes.URBAN, "blp:city_urban"],
    [DistrictTypes.WONDER, ""],
    [DistrictTypes.WILDERNESS, ""],
]);
const DOMAIN_VALUE = new Map(
    ["DOMAIN_LAND", "DOMAIN_SEA", "DOMAIN_AIR"].map((d, i) => [d, i])
);
class bzUnitListModel {
    onUpdate;
    updateGate = new UpdateGate(() => this.update());
    pauseSelection = false;
    _selectedUnit = null;
    _types = new Map();
    _typeList = [];
    _units = new Map();
    _unitGroups = new Map();
    _unitList = [];
    constructor() {
        this.updateGate.call("constructor");
        engine.on("UnitActivityChanged", this.onUnitUpdate, this);
        engine.on("UnitAddedToArmy", this.onUnitUpdate, this);
        engine.on("UnitAddedToMap", this.onUnitUpdate, this);
        engine.on("UnitBermudaTeleported", this.onUnitUpdate, this);
        engine.on("UnitDamageChanged", this.onUnitUpdate, this);
        engine.on("UnitExperienceChanged", this.onUnitUpdate, this);
        engine.on("UnitMoved", this.onUnitUpdate, this);
        engine.on("UnitMovementPointsChanged", this.onUnitUpdate, this);
        engine.on("UnitPromoted", this.onUnitUpdate, this);
        engine.on("UnitRemovedFromArmy", this.onUnitUpdate, this);
        engine.on("UnitRemovedFromMap", this.onUnitUpdate, this);
        engine.on("UnitUpgraded", this.onUnitUpdate, this);
        engine.on("UnitSelectionChanged", this.onUnitSelection, this);
    }
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    get selectedUnit() {
        return this._selectedUnit;
    }
    get types() {
        return this._types;
    }
    get typeList() {
        return this._typeList;
    }
    get units() {
        return this._units;
    }
    get unitList() {
        return this._unitList;
    }
    update() {
        this._units = new Map();
        this._unitGroups = new Map();
        const player = Players.get(GameContext.localObserverID);
        if (player?.Units == void 0) return;
        for (const id of player.Units.getUnitIds()) {
            this.updateUnit(id);
        }
        this.updateDisplay();
    }
    updateDisplay() {
        this._unitList = [...this._units.values()];
        const nameSort = (a, b) => {
            const aName = Locale.compose(a).toUpperCase();
            const bName = Locale.compose(b).toUpperCase();
            return Locale.compare(aName, bName);
        };
        const typeSort = (a, b) => {
            // sort by combat classes first
            if (a.combat != b.combat) return b.combat - a.combat;
            // sort by domain
            const aDomain = DOMAIN_VALUE.get(a.domain);
            const bDomain = DOMAIN_VALUE.get(b.domain);
            if (aDomain != bDomain) return aDomain - bDomain;
            // sort unique units first
            if (a.isUnique && !b.isUnique) return -1;
            if (b.isUnique && !a.isUnique) return +1;
            // sort by age
            if (a.age.ChronologyIndex != b.age.ChronologyIndex) {
                return a.age.ChronologyIndex - b.age.ChronologyIndex;
            }
            // sort by name
            return nameSort(a.name, b.name);
        }
        this._typeList.sort(typeSort);
        const unitSort = (a, b) => {
            // sort victory units first
            if (a.isVictoryUnit && !b.isVictoryUnit) return -1;
            if (b.isVictoryUnit && !a.isVictoryUnit) return +1;
            // group armies together in original order
            if (a.armyId == b.armyId && a.armyId != -1) {
                // commander first
                if (a.isCommander) return -1;
                if (b.isCommander) return +1;
                return a.index - b.index;
            }
            // otherwise, group army units with their commanders
            a = this._unitGroups.get(a.armyId) ?? a;
            b = this._unitGroups.get(b.armyId) ?? b;
            // sort support and civilian units after military units
            if (a.combat <= 0 || b.combat <= 0) {
                if (a.combat != b.combat) return b.combat - a.combat;
            }
            // sort by domain
            const aDomain = DOMAIN_VALUE.get(a.domain);
            const bDomain = DOMAIN_VALUE.get(b.domain);
            if (aDomain != bDomain) return aDomain - bDomain;
            // sort armies first
            if (a.isCommander && !b.isCommander) return -1;
            if (b.isCommander && !a.isCommander) return +1;
            // sort armies by commander age and experience
            if (a.isCommander && b.isCommander) {
                if (a.age.ChronologyIndex != b.age.ChronologyIndex) {
                    return a.age.ChronologyIndex - b.age.ChronologyIndex;
                }
                if (a.totalXP != b.totalXP) return b.totalXP - a.totalXP;
                return nameSort(a.name, b.name) || a.index - b.index;
            }
            // compare combat units by strength
            if (a.combat != b.combat) return b.combat - a.combat;
            // sort unique units first
            if (a.isUnique && !b.isUnique) return -1;
            if (b.isUnique && !a.isUnique) return +1;
            // sort by age
            if (a.age.ChronologyIndex != b.age.ChronologyIndex) {
                return a.age.ChronologyIndex - b.age.ChronologyIndex;
            }
            // group by localized name
            const lex = nameSort(a.name, b.name);
            if (lex) return lex;
            // sort by moves left
            if (a.movesLeft && !b.movesLeft) return -1;
            if (b.movesLeft && !a.movesLeft) return +1;
            // sort by unit operation
            if (a.operationName != b.operationName) {
                return nameSort(a.operationName, b.operationName);
            }
            // sort garrisons last
            if (a.isGarrison && !b.isGarrison) return +1;
            if (b.isGarrison && !a.isGarrison) return -1;
            // fallback: original order
            return a.index - b.index;
        };
        this._unitList.sort(unitSort);
        this._types = new Map();
        this._typeList = [];
        for (const unit of this._unitList) {
            if (unit.info.CoreClass == "CORE_CLASS_MILITARY") continue;
            if (unit.isTradeUnit || unit.isVictoryUnit) continue;
            const tlist = this._types.get(unit.icon) ?? [];
            if (tlist.length == 0) {
                this._types.set(unit.icon, tlist);
                this._typeList.push(unit);
            }
            tlist.push(unit.localId);
        }
        if (this.onUpdate) this.onUpdate(this);
        window.dispatchEvent(new CustomEvent("bz-model-units-update"));
    }
    updateUnit(id) {
        const unit = Units.get(id);
        if (!unit) return;
        // unit details
        const localId = unit.localId;
        const armyId = unit.armyId.id;
        const isCommander = unit.isCommanderUnit;
        const isGreatPerson = unit.isGreatPerson;
        const isPacked = armyId != -1 && !isCommander;
        const level = isCommander ? unit.Experience.getLevel : void 0;
        const age = GameInfo.Ages.lookup(unit.age);
        // unit type info
        const info = GameInfo.Units.lookup(unit.type);
        const type = info.UnitType;
        const typeName = (() => {
            if (!isGreatPerson) return info.Name;
            const gplist = GameInfo.GreatPersonIndividuals;
            const gp = gplist?.find(gp => gp.UnitType == type);
            const gpclass = gp && GameInfo.GreatPersonClasses
                .lookup(gp.GreatPersonClassType);
            return gpclass?.Name ?? info.Name;
        })();
        const icon = Icon.getUnitIconFromDefinition(info);
        const name = isCommander && level ? `${unit.name} ${level}` : unit.name;
        const domain = info.Domain;
        const trait = info.TraitType;
        const isUnique = Boolean(trait);
        const isTradeUnit = TRADER_TYPES.has(unit.type);
        const isVictoryUnit = info.VictoryUnit;
        // unit stats
        const stats = GameInfo.Unit_Stats.lookup(type);
        const combat =
            info.FormationClass == "FORMATION_CLASS_COMMAND" ? 9999 :
            isTradeUnit ? -9999 :
            info.CoreClass == "CORE_CLASS_CIVILIAN" ? -1 :
            stats ? Math.max(stats.Combat, stats.RangedCombat) : 0;
        // health
        const health = unit.Health;
        const damage = health?.damage ?? 0;
        const maxHealth = health?.maxDamage ?? 0;
        const healthLeft = maxHealth - damage;
        const slashHealth = `${healthLeft}/${maxHealth}`;
        const hasDamage = !!damage;
        // movement
        const moves = unit.Movement;
        const movesLeft = moves?.movementMovesRemaining ?? 0;
        const maxMoves = moves?.maxMoves ?? 0;
        const slashMoves = `${movesLeft}/${maxMoves}`;
        const canMove = moves?.canMove;
        // operations
        const activityType = unit.activityType;
        const operationType = unit.operationQueueSize ?
            unit.getOperationType(0) : void 0;
        const operation = operationType && GameInfo.UnitOperations.lookup(operationType);
        const operationIcon = operation?.Icon ?? ACTIVITY_ICONS.get(activityType);
        const operationName = operation?.Name ?? ACTIVITY_NAMES.get(activityType);
        const isBusy = !!operationIcon;
        // location
        const location = unit.location;
        const districtID = MapCities.getDistrict(location.x, location.y);
        const district = districtID && Districts.get(districtID);
        const isHome = district?.owner == GameContext.localObserverID;
        const districtIcon = DISTRICT_ICONS.get(isHome ? district.type : -1);
        const isGarrison = isHome && district.type == DistrictTypes.CITY_CENTER;
        // promotion
        const xp = unit.Experience;
        const totalXP = xp ? xp.spentExperience + xp.experiencePoints : void 0;
        const canPromote = isCommander &&
            Boolean(xp?.getStoredCommendations || xp?.getStoredPromotionPoints);
        const canStartUpgrade = Game.UnitCommands?.canStart(
            unit.id, "UNITCOMMAND_UPGRADE", { X: -9999, Y: -9999 }, false
        );
        const canUpgrade = canStartUpgrade?.Success;
        // activation details
        const selectId = { ...id };  // unit to select
        const lookId = { ...id };  // unit or army to view
        if (armyId != -1) lookId.id = armyId;
        const data = JSON.stringify({ lookId, selectId });
        // original sort order
        const index = this._units.get(localId)?.index ?? this._units.size;
        // collate entry
        const entry = {
            unit, id, localId, armyId, isCommander, isGreatPerson, isPacked, age,
            activityType, operationType, operation, operationIcon, operationName, isBusy,
            info, type, typeName, icon, name, domain, trait,
            isUnique, isTradeUnit, isVictoryUnit,
            stats, combat,
            health, healthLeft, maxHealth, slashHealth, hasDamage,
            moves, movesLeft, maxMoves, slashMoves, canMove,
            location, district, districtIcon, isGarrison,
            totalXP, canPromote, canUpgrade,
            data, index,
        };
        if (isCommander) this._unitGroups.set(armyId, entry);
        this._units.set(localId, entry);
    }
    selectUnit(localId) {
        if (UI.Player.getHeadSelectedUnit()?.id == localId) {
            UI.Player.deselectAllUnits();
            return;
        }
        const unit = this._units.get(localId);
        if (!unit) return;
        const group = this._unitGroups.get(unit.armyId);
        if (group && !unit.isCommander) {
            // select the group first
            this.pauseSelection = true;
            UI.Player.lookAtID(group.id);
            UI.Player.selectUnit(group.id);
            // and give it time to settle
            requestAnimationFrame(() => {
                this.pauseSelection = false;
                UI.Player.selectUnit(unit.id);
            });
        } else {
            // select the unit
            UI.Player.lookAtID(unit.id);
            UI.Player.selectUnit(unit.id);
        }
    }
    onUnitSelection(event) {
        if (this.pauseSelection) return;
        const id = event?.unit;
        if (!id || ComponentID.isInvalid(id)) return;
        this.updateUnit(id);
        const selected = event.selected ? id : ComponentID.getInvalidID();
        this._selectedUnit = this._units.get(selected.id);
        this.updateDisplay();
    }
    onUnitUpdate(event) {
        const id = event?.unit;
        if (!id || ComponentID.isInvalid(id)) return;
        if (id.owner != GameContext.localObserverID) return;
        this.updateGate.call("onUnitUpdate");
    }
}

const bzUnitList = new bzUnitListModel();
engine.whenReady.then(() => {
  const updateModel = () => {
    engine.updateWholeModel(bzUnitList);
  };
  engine.createJSModel("g_bzUnitListModel", bzUnitList);
  bzUnitList.updateCallback = updateModel;
});

export { bzUnitList };
