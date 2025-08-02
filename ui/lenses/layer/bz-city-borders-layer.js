/**
 * @file city-borders-layer
 * @copyright 2024, Firaxis Games
 * @description Lens layer for city borders where individual city bounds are represented if two cities are adjacent
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';
var BorderStyleTypes;
(function (BorderStyleTypes) {
    BorderStyleTypes["Closed"] = "CultureBorder_Closed";
    BorderStyleTypes["CityStateClosed"] = "CultureBorder_CityState_Closed";
    BorderStyleTypes["CityStateOpen"] = "CultureBorder_CityState_Open";
})(BorderStyleTypes || (BorderStyleTypes = {}));
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
        this.cityOverlayGroup = WorldUI.createOverlayGroup("CityBorderOverlayGroup", OVERLAY_PRIORITY.CULTURE_BORDER);
        /** Map of border overlays keyed by the PlotIndex of the city */
        this.borderOverlayMap = new Map();
        /** Map of city center plot indexes keyed by plot indexes owned by that city */
        this.ownedPlotMap = new Map();
        this.lastZoomLevel = -1;
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.onPlotOwnershipChanged = (data) => {
            const plotIndex = GameplayMap.getIndexFromLocation(data.location);
            // Remove plot from prior owner if valid
            if (data.priorOwner != PlayerIds.NO_PLAYER) {
                const owningPlot = this.ownedPlotMap.get(plotIndex);
                console.warn(`TRIX DEL ${plotIndex} from ${owningPlot} for ${JSON.stringify(data)}`);
                // TODO: remove stale borderOverlayMap entries
                if (owningPlot) {
                    this.ownedPlotMap.delete(plotIndex);
                    const previousOverlay = this.borderOverlayMap.get(owningPlot);
                    if (previousOverlay) previousOverlay.clearPlotGroups(plotIndex);
                }
            }
            // Add plot to new owner
            if (data.owner != PlayerIds.NO_PLAYER && Players.isAlive(data.owner)) {
                const cityPlot = this.findCityCenterIndexForPlotIndex(plotIndex);
                if (cityPlot != -1) {
                    this.ownedPlotMap.set(plotIndex, cityPlot);
                    const newOverlay = this.getBorderOverlay(plotIndex);
                    console.warn(`TRIX SET ${JSON.stringify(data)}`);
                    newOverlay.setPlotGroups(plotIndex, 0);
                    if (cityPlot == plotIndex) {
                        // TODO: update border style
                    }
                }
            }
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
    initBordersForIndependent(player) {
        let villagePlotIndex = -1;
        let plotIndexes = [];
        player.Constructibles?.getConstructibles().forEach(construct => {
            const constructDef = GameInfo.Constructibles.lookup(construct.type);
            if (constructDef) {
                if (constructDef.ConstructibleType == "IMPROVEMENT_VILLAGE" || constructDef.ConstructibleType == "IMPROVEMENT_ENCAMPMENT") {
                    villagePlotIndex = GameplayMap.getIndexFromLocation(construct.location);
                    plotIndexes = plotIndexes.concat(villagePlotIndex);
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
                        let plot = GameplayMap.getAdjacentPlotLocation(construct.location, adjacentPlotDirection[directionIndex]);
                        let owner = GameplayMap.getOwner(plot.x, plot.y);
                        if (owner == player.id) {
                            plotIndexes = plotIndexes.concat(GameplayMap.getIndexFromLocation(plot));
                        }
                    }
                }
            }
        });
        if (plotIndexes.length > 0) {
            const borderOverlay = this.getBorderOverlay(villagePlotIndex);
            borderOverlay.setPlotGroups(plotIndexes, 0);
        }
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
            let villagePlotIndex = -1;
            player.Constructibles?.getConstructibles().forEach(construct => {
                const constructDef = GameInfo.Constructibles.lookup(construct.type);
                if (constructDef) {
                    if (constructDef.ConstructibleType == "IMPROVEMENT_VILLAGE") {
                        villagePlotIndex = GameplayMap.getIndexFromLocation(construct.location);
                    }
                }
            });
            if (villagePlotIndex == -1) {
                console.error(`city-borders-layer: findCityCenterIndexForPlotIndex failed to find villagePlotIndex for plotIndex ${plotIndex}`);
            }
            return villagePlotIndex;
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
}
LensManager.registerLensLayer('bz-city-borders-layer', new bzCityBordersLayer());

//# sourceMappingURL=file:///base-standard/ui/lenses/layer/city-borders-layer.js.map
