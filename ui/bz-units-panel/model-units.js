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
        const unitSort = (a, b) => {
            // group army units with their commanders
            const aCommander = this._units.get(a.armyId);
            const bCommander = this._units.get(b.armyId);
            // sort by domain
            const aDomain = DOMAIN_VALUE.get(aCommander?.domain ?? a.domain);
            const bDomain = DOMAIN_VALUE.get(bCommander?.domain ?? b.domain);
            if (aDomain != bDomain) return aDomain - bDomain;
            // group armies together
            if (a.armyId != b.armyId) {
                a = aCommander ?? a;
                b = bCommander ?? b;
            }
            // list commanders & armies first
            if (a.unit.isCommanderUnit != b.unit.isCommanderUnit) {
                return a.unit.isCommanderUnit ? -1 : +1;
            }
            // compare units
            if (a.strength != b.strength) return b.strength - a.strength;
            // compare names + original order
            return Locale.compare(a.name.toUpperCase(), b.name.toUpperCase()) ||
                a.index - b.index;
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
        // unit type info
        const info = GameInfo.Units.lookup(unit.type);
        const type = info.UnitType;
        const icon = Icon.getUnitIconFromDefinition(info);
        const name = unit.name;
        const domain = info.Domain;
        // unit stats
        const stats = GameInfo.Unit_Stats.lookup(type);
        const strength = stats ? Math.max(stats.Combat, stats.RangedCombat) : -1;
        // activation details
        const selectId = { ...id };  // unit to select
        const lookId = { ...id };  // unit or army to view
        if (armyId != -1) lookId.id = armyId;
        const data = JSON.stringify({ lookId, selectId });
        // original sort order
        const index = this._units.get(localId)?.index ?? this._units.size;
        // collate entry
        const entry = {
            unit, id, localId, armyId,
            info, type, icon, name, domain,
            stats, strength,
            data, index,
        };
        this._units.set(localId, entry);
    }
    onUnitSelection(event) {
        const id = event?.unit;
        if (ComponentID.isInvalid(id)) return;
        this.updateUnit(id);
        const selected = event.selected ? id : ComponentID.getInvalidID();
        this._selectedUnit = this._units.get(selected.id);
        Object.entries(this._selectedUnit?.unit ?? {}).forEach(([key, value]) =>
            console.warn(`TRIX SELECT ${key} ${JSON.stringify(value)}`));
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
