/**
 * @file city-borders-layer
 * @copyright 2024, Firaxis Games
 * @description Lens layer for city borders where individual city bounds are represented if two cities are adjacent
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import LensManager, { LensActivationEventName } from '/core/ui/lenses/lens-manager.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';
var BorderStyleTypes;
(function (BorderStyleTypes) {
    BorderStyleTypes["Closed"] = "CultureBorder_Closed";
    BorderStyleTypes["CityStateClosed"] = "CultureBorder_CityState_Closed";
    BorderStyleTypes["CityStateOpen"] = "CultureBorder_CityState_Open";
})(BorderStyleTypes || (BorderStyleTypes = {}));

const BZ_DEFAULT_LENSES = ['dmt-map-tack-lens', 'fxs-trade-lens'];
const BZ_GRID_SIZE = GameplayMap.getGridWidth() * GameplayMap.getGridHeight();

// TODO: Pull from database or gamecore when implemented
const independentPrimaryColor = 0xFF333333;
const independentSecondaryColor = 0xFFCCFFFF;
/** Default style - Only used to initialize the BorderOverlay */
const defaultStyle = {
    style: BorderStyleTypes.CityStateOpen,
    primaryColor: independentPrimaryColor,
    secondaryColor: independentSecondaryColor
};
const thicknessZoomMultiplier = 3;
class bzCityBordersLayer {
    constructor() {
        this.defaultLenses = new Set(BZ_DEFAULT_LENSES);  // initialization tracker
        this.cityOverlayGroup = WorldUI.createOverlayGroup("bzCityBorderOverlayGroup", OVERLAY_PRIORITY.CULTURE_BORDER);
        // border overlay storage
        this.cityCenters = new Map();  // plot -> center plot
        this.cityOverlays = new Map();  // center plot -> overlay
        this.villageOverlays = new Map();  // player ID -> overlay
        this.plotOwners = new Array(BZ_GRID_SIZE).fill(-1);
        console.warn(`TRIX GRID ${this.plotOwners}`);
        // Map of border overlays keyed by the PlotIndex of the city
        this.borderOverlayMap = new Map();
        // Map of city center plot indexes keyed by plot indexes owned by that city
        this.ownedPlotMap = new Map();
        this.lastZoomLevel = -1;
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.onLensActivationListener = this.onLensActivation.bind(this);
        this.onPlotOwnershipChanged = (data) => {
            const plotIndex = GameplayMap.getIndexFromLocation(data.location);
            console.warn(`TRIX CHANGE ${JSON.stringify(data)}`);
            // Remove plot from prior owner if valid
            if (data.priorOwner != PlayerIds.NO_PLAYER) this.removeOwningPlot(plotIndex);
            // Add plot to new owner
            if (Players.isAlive(data.owner)) this.setOwningPlot(plotIndex);
        };
        this.onCameraChanged = (camera) => {
            if (this.lastZoomLevel != camera.zoomLevel) {
                this.lastZoomLevel = camera.zoomLevel;
                this.borderOverlayMap.forEach((borderOverlay) => {
                    borderOverlay.setThicknessScale(camera.zoomLevel * thicknessZoomMultiplier); // Set thickness to 0 when zoomed all the way in.
                });
            }
        };
    }
    initLayer() {
        const alivePlayers = Players.getAlive();
        alivePlayers.forEach((player) => {
            if (player.isIndependent) {
                this.initBordersForIndependent(player);
            }
            else {
                this.initBordersForPlayer(player);
            }
        });
        engine.on('CameraChanged', this.onCameraChanged);
        engine.on('PlotOwnershipChanged', this.onPlotOwnershipChanged);
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
        window.addEventListener(LensActivationEventName, this.onLensActivationListener);
        this.cityOverlayGroup.setVisible(false);
    }
    getBorderOverlay(plotIndex) {
        // First assuming we're looking for the border overlay by city center plot index
        const borderOverlay = this.borderOverlayMap.get(plotIndex);
        if (borderOverlay) {
            return borderOverlay;
        }
        // If that fails see if this plot index is tied to an existing border overlay
        const owningPlot = this.ownedPlotMap.get(plotIndex);
        if (owningPlot) {
            const borderOverlay = this.borderOverlayMap.get(owningPlot);
            if (borderOverlay) {
                return borderOverlay;
            }
        }
        return this.createBorderOverlay(plotIndex);
    }
    createBorderOverlay(plotIndex) {
        const borderOverlay = this.cityOverlayGroup.addBorderOverlay(defaultStyle);
        // Find the owning player for this plot index
        const plotLocation = GameplayMap.getLocationFromIndex(plotIndex);
        const ownerId = GameplayMap.getOwner(plotLocation.x, plotLocation.y);
        const owner = Players.get(ownerId);
        if (!owner) {
            console.error(`city-borders-layer: createBorderOverlay failed to create overlay for plotIndex ${plotIndex}`);
            return borderOverlay;
        }
        // Set border group style
        const primary = UI.Player.getPrimaryColorValueAsHex(owner.id);
        const secondary = UI.Player.getSecondaryColorValueAsHex(owner.id);
        const borderStyle = {
            style: BorderStyleTypes.Closed,
            primaryColor: primary,
            secondaryColor: secondary
        };
        // Check if we want to use city-state or independent styles
        if (owner.isIndependent) {
            borderStyle.style = BorderStyleTypes.CityStateOpen;
            borderStyle.primaryColor = independentPrimaryColor;
            borderStyle.secondaryColor = independentSecondaryColor;
        }
        else if (!owner.isMajor) {
            borderStyle.style = BorderStyleTypes.CityStateClosed;
        }
        borderOverlay.setDefaultStyle(borderStyle);
        this.borderOverlayMap.set(plotIndex, borderOverlay);
        return borderOverlay;
    }
    initBordersForPlayer(player) {
        const playerCities = player.Cities?.getCities();
        if (!playerCities) {
            console.error(`city-borders-layer: initLayer() failed to find cities for PlayerID ${player.id}`);
            return;
        }
        // Find all the plots owned by the player
        playerCities.forEach((city) => {
            const cityPlots = city.getPurchasedPlots();
            if (cityPlots.length > 0) {
                const cityPlotIndex = GameplayMap.getIndexFromLocation(city.location);
                this.ownedPlotMap.set(cityPlotIndex, cityPlotIndex);
                const borderOverlay = this.getBorderOverlay(cityPlotIndex);
                borderOverlay.setPlotGroups(cityPlots, 0);
                cityPlots.forEach((plotIndex) => {
                    this.ownedPlotMap.set(plotIndex, cityPlotIndex);
                });
            }
        });
    }
    findVillage(player) {
        for (const con of player.Constructibles?.getConstructibles() ?? []) {;
            const info = GameInfo.Constructibles.lookup(con.type);
            if (info.ConstructibleType == "IMPROVEMENT_VILLAGE" ||
                info.ConstructibleType == "IMPROVEMENT_ENCAMPMENT") {
                return con;
            }
        }
        return undefined;
    }
    initBordersForIndependent(player) {
        const village = this.findVillage(player);
        if (!village) return;
        const villagePlotIndex = GameplayMap.getIndexFromLocation(village.location);
        let plotIndexes = [villagePlotIndex];
        const adjacentPlotDirection = [
            DirectionTypes.DIRECTION_NORTHEAST,
            DirectionTypes.DIRECTION_EAST,
            DirectionTypes.DIRECTION_SOUTHEAST,
            DirectionTypes.DIRECTION_SOUTHWEST,
            DirectionTypes.DIRECTION_WEST,
            DirectionTypes.DIRECTION_NORTHWEST
        ];
        // Loop through each direction type, and if they are not hidden and owned, add.
        for (let directionIndex = 0; directionIndex < adjacentPlotDirection.length; directionIndex++) {
            let plot = GameplayMap.getAdjacentPlotLocation(village.location, adjacentPlotDirection[directionIndex]);
            let owner = GameplayMap.getOwner(plot.x, plot.y);
            if (owner == player.id) {
                plotIndexes.push(GameplayMap.getIndexFromLocation(plot));
            }
        }
        for (const plot of plotIndexes) this.ownedPlotMap.set(plot, villagePlotIndex);
        const borderOverlay = this.getBorderOverlay(villagePlotIndex);
        borderOverlay.setPlotGroups(plotIndexes, 0);
    }
    removeOwningPlot(plotIndex) {
        const owningPlot = this.ownedPlotMap.get(plotIndex);
        console.warn(`TRIX DEL ${plotIndex} from ${owningPlot}`);
        if (!owningPlot) return;
        const overlay = this.borderOverlayMap.get(owningPlot);
        if (overlay) overlay.clearPlotGroups(plotIndex);
        this.ownedPlotMap.delete(plotIndex);
        if (plotIndex == owningPlot) {
            for (const [plot, owner] of this.ownedPlotMap) {
                if (owner == owningPlot) this.ownedPlotMap.delete(plot);
            }
            if (overlay) overlay.clear();
            this.borderOverlayMap.delete(owningPlot);
        }
    }
    setOwningPlot(plotIndex) {
        const owningPlot = this.findCityCenterIndexForPlotIndex(plotIndex);
        if (owningPlot == -1) return;
        this.ownedPlotMap.set(plotIndex, owningPlot);
        const overlay = this.getBorderOverlay(plotIndex);
        console.warn(`TRIX SET ${plotIndex} to ${owningPlot}`);
        overlay.setPlotGroups(plotIndex, 0);
    }
    findCityCenterIndexForPlotIndex(plotIndex) {
        const plotCoord = GameplayMap.getLocationFromIndex(plotIndex);
        const owningCityId = GameplayMap.getOwningCityFromXY(plotCoord.x, plotCoord.y);
        if (!owningCityId) {
            return -1; // off the map
        }
        const player = Players.get(owningCityId.owner);
        if (!player) {
            console.error(`city-borders-layer: findCityCenterIndexForPlotIndex failed to find owning player for plotIndex ${plotIndex}`);
            return -1;
        }
        if (player.isIndependent) {
            const village = this.findVillage(player);
            if (!village) {
                console.error(`city-borders-layer: findCityCenterIndexForPlotIndex failed to find villagePlotIndex for plotIndex ${plotIndex}`);
                return -1;
            }
            return GameplayMap.getIndexFromLocation(village.location);
        }
        const owningCity = player.Cities?.getCities().find((city) => {
            return ComponentID.isMatch(city.id, owningCityId);
        });
        if (!owningCity) {
            console.error(`city-borders-layer: findCityCenterIndexForPlotIndex failed to find owningCity for plotIndex ${plotIndex}`);
            return -1;
        }
        return GameplayMap.getIndexFromLocation(owningCity.location);
    }
    applyLayer() {
        this.cityOverlayGroup.setVisible(true);
    }
    removeLayer() {
        this.cityOverlayGroup.setVisible(false);
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-city-borders-layer') {
            LensManager.toggleLayer('bz-city-borders-layer');
        } else if (hotkey.detail.name == 'toggle-fxs-culture-borders-layer') {
            LensManager.toggleLayer('fxs-culture-borders-layer');
        }
    }
    onLensActivation(event) {
        if (this.defaultLenses.has(event.detail.activeLens)) {
            LensManager.enableLayer('bz-city-borders-layer');
            LensManager.disableLayer('fxs-culture-borders-layer');
            LensManager.disableLayer('fxs-city-borders-layer');
            this.defaultLenses.delete(event.detail.activeLens);
        }
    }
}
LensManager.registerLensLayer('bz-city-borders-layer', new bzCityBordersLayer());

//# sourceMappingURL=file:///base-standard/ui/lenses/layer/city-borders-layer.js.map
