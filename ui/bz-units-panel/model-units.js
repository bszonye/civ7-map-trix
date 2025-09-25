import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { Icon } from '/core/ui/utilities/utilities-image.chunk.js';
import { U as UpdateGate } from '/core/ui/utilities/utilities-update-gate.chunk.js';

const DOMAIN_VALUE = new Map(
    ["DOMAIN_LAND", "DOMAIN_SEA", "DOMAIN_AIR"].map((d, i) => [d, i])
);
class bzUnitsListModel {
    onUpdate;
    updateGate = new UpdateGate(() => { this.update(); });
    _selectedUnit = null;
    _units = new Map();
    _unitList = [];
    constructor() {
        this.updateGate.call("constructor");
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
    get units() {
        return this._unitList;
    }
    update() {
        this._units = new Map();
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
        const unitSort = (a, b) => {
            // group armies together in their original order
            if (a.armyId == b.armyId && a.armyId != -1) {
                return a.index - b.index;
            }
            // otherwise, group army units with their commanders
            a = this._units.get(a.armyId) ?? a;
            b = this._units.get(b.armyId) ?? b;
            // sort civilian units last
            if (a.strength < 0 && 0 <= b.strength) return +1;
            if (b.strength < 0 && 0 <= a.strength) return -1;
            // sort support units after military units
            const aSupport = a.strength <= 0 && !a.unit.isCommanderUnit;
            const bSupport = b.strength <= 0 && !b.unit.isCommanderUnit;
            if (aSupport && !bSupport) return +1;
            if (bSupport && !aSupport) return -1;
            // sort by domain
            const aDomain = DOMAIN_VALUE.get(a.domain);
            const bDomain = DOMAIN_VALUE.get(b.domain);
            if (aDomain != bDomain) return aDomain - bDomain;
            // sort armies by commander experience
            if (a.unit.isCommanderUnit && b.unit.isCommanderUnit) {
                if (a.totalXP != b.totalXP) return b.totalXP - a.totalXP;
            } else {
                if (a.unit.isCommanderUnit) return -1;
                if (b.unit.isCommanderUnit) return +1;
            }
            // compare units
            if (a.strength != b.strength) return b.strength - a.strength;
            // fallback: localized names, then original order
            return nameSort(a.name, b.name) || a.index - b.index;
        };
        this._unitList.sort(unitSort);
        if (this.onUpdate) this.onUpdate(this);
    }
    updateUnit(id) {
        const unit = Units.get(id);
        if (!unit) return;
        // unit details
        const localId = unit.localId;
        const armyId = unit.armyId.id;
        const isInArmy = armyId != localId && armyId != -1;
        // unit type info
        const info = GameInfo.Units.lookup(unit.type);
        const type = info.UnitType;
        const icon = Icon.getUnitIconFromDefinition(info);
        const name = unit.name;
        const domain = info.Domain;
        // unit stats
        const stats = GameInfo.Unit_Stats.lookup(type);
        const strength = stats ? Math.max(stats.Combat, stats.RangedCombat) : -1;
        // upgrades and promotions
        const xp = unit.Experience;
        const totalXP = xp ? xp.spentExperience + xp.experiencePoints : void 0;
        const canPromote = Boolean(
            xp?.getStoredCommendations || xp?.getStoredPromotionPoints
        );
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
            unit, id, localId, armyId, isInArmy,
            info, type, icon, name, domain,
            stats, strength,
            totalXP, canPromote, canUpgrade,
            data, index,
        };
        this._units.set(localId, entry);
    }
    selectUnit(localId) {
        if (UI.Player.getHeadSelectedUnit()?.id == localId) {
            UI.Player.deselectAllUnits();
            return;
        }
        const unit = this._units.get(localId);
        if (!unit) return;
        const army = this._units.get(unit.armyId);
        if (army) {
            UI.Player.lookAtID(army.id);
            UI.Player.selectUnit(army.id);
            requestAnimationFrame(() => UI.Player.selectUnit(unit.id));
        } else {
            UI.Player.lookAtID(unit.id);
            UI.Player.selectUnit(unit.id);
        }
    }
    onUnitSelection(event) {
        const id = event?.unit;
        if (ComponentID.isInvalid(id)) return;
        this.updateUnit(id);
        const selected = event.selected ? id : ComponentID.getInvalidID();
        this._selectedUnit = this._units.get(selected.id);
        if (this._selectedUnit) {
            Object.entries(this._selectedUnit.unit ?? {}).forEach(([key, value]) =>
                console.warn(`TRIX SELECT ${key} ${JSON.stringify(value)}`));
            console.warn(`TRIX SELECT Experience = ${JSON.stringify(this._selectedUnit.unit.Experience)}`);
        } else {
            console.warn(`TRIX DESELECT`);
        }
        this.updateDisplay();
    }
    onUnitUpdate(event) {
        const id = event?.unit;
        if (ComponentID.isInvalid(id)) return;
        if (id.owner != GameContext.localObserverID) return;
        this.updateGate.call("onUnitUpdate");
    }
}

const bzUnitsList = new bzUnitsListModel();
engine.whenReady.then(() => {
  const updateModel = () => {
    engine.updateWholeModel(bzUnitsList);
  };
  engine.createJSModel("g_bzUnitsListModel", bzUnitsList);
  bzUnitsList.updateCallback = updateModel;
});

export { bzUnitsList };
