import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { Icon } from '/core/ui/utilities/utilities-image.chunk.js';
import { U as UpdateGate } from '/core/ui/utilities/utilities-update-gate.chunk.js';

class bzUnitsListModel {
    onUpdate;
    updateGate = new UpdateGate(() => { this.update(); });
    _selectedUnit = ComponentID.getInvalidID();
    _units = [];
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
    get selectedUnitID() {
        return this._selectedUnit.id;
    }
    get units() {
        return this._units;
    }
    update() {
        console.warn(`TRIX UPDATE`);
        const units = this._units = [];
        const player = Players.get(GameContext.localObserverID);
        if (player?.Units == void 0) return;
        // console.warn(`TRIX ${JSON.stringify(player.Units)}`);
        for (const id of player.Units.getUnitIds()) {
            const unit = Units.get(id);
            // console.warn(`TRIX UNIT ${Object.keys(unit)}`);
            if (!unit) continue;
            const utype = GameInfo.Units.lookup(unit.type);
            // console.warn(`TRIX UNIT ${JSON.stringify(utype)}`);
            const icon = Icon.getUnitIconFromDefinition(utype);
            const name = unit.name;
            const entry = { id: id.id, icon, name, };
            console.warn(`TRIX ENTRY ${JSON.stringify(entry)}`);
            units.push(entry);
        }
        if (this.onUpdate) this.onUpdate(this);
    }
    isLocalUnit(id) {
        return !ComponentID.isInvalid(id) && id.owner == GameContext.localObserverID;
    }
    onUnitSelection(event) {
        const id = event?.unit;
        const valid = event?.selected && this.isLocalUnit(id);
        this._selectedUnit = valid ? id : ComponentID.getInvalidID();
        if (this.onUpdate) this.onUpdate(this);
        console.warn(`TRIX UNIT ${JSON.stringify(this.selectedUnitID)}`);
    }
    onUnitUpdate(event) {
        if (this.isLocalUnit(event?.unit)) {
            console.warn(`TRIX EVENT ${JSON.stringify(event)}`);
            this.updateGate.call("onUnitUpdate");
        }
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
