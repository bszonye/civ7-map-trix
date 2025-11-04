import '/core/ui/options/screen-options.js';  // make sure this loads first
import { C as CategoryType, O as Options, a as OptionType } from '/core/ui/options/editors/index.chunk.js';
// set up mod options tab
import ModOptions from '/bz-map-trix/ui/options/mod-options.js';

export var bzCommanderLens;
(function (bzCommanderLens) {
        bzCommanderLens[bzCommanderLens["NONE"] = 0] = "NONE";
        bzCommanderLens[bzCommanderLens["COMMANDERS"] = 1] = "COMMANDERS";
        bzCommanderLens[bzCommanderLens["MILITARY"] = 2] = "MILITARY";
        bzCommanderLens[bzCommanderLens["RECON"] = 3] = "RECON";
})(bzCommanderLens || (bzCommanderLens = {}));
const commandOptions = [
    { label: 'LOC_OPTIONS_BZ_COMLENS_NONE', value: bzCommanderLens.NONE },
    { label: 'LOC_OPTIONS_BZ_COMLENS_COMMANDERS', value: bzCommanderLens.COMMANDERS },
    { label: 'LOC_OPTIONS_BZ_COMLENS_MILITARY', value: bzCommanderLens.MILITARY },
    { label: 'LOC_OPTIONS_BZ_COMLENS_RECON', value: bzCommanderLens.RECON },
];
export var bzVerbosity;
(function (bzVerbosity) {
        bzVerbosity[bzVerbosity["HIDDEN"] = 0] = "HIDDEN";
        bzVerbosity[bzVerbosity["COMPACT"] = 1] = "COMPACT";
        bzVerbosity[bzVerbosity["STANDARD"] = 2] = "STANDARD";
        bzVerbosity[bzVerbosity["VERBOSE"] = 3] = "VERBOSE";
})(bzVerbosity || (bzVerbosity = {}));
const verbosityOptions = [
    { label: 'LOC_OPTIONS_BZ_VERBOSITY_HIDDEN', value: bzVerbosity.HIDDEN },
    { label: 'LOC_OPTIONS_BZ_VERBOSITY_COMPACT', value: bzVerbosity.COMPACT },
    { label: 'LOC_OPTIONS_BZ_VERBOSITY_STANDARD', value: bzVerbosity.STANDARD },
    { label: 'LOC_OPTIONS_BZ_VERBOSITY_VERBOSE', value: bzVerbosity.VERBOSE },
];

const bzMapTrixOptions = new class {
    modID = "bz-map-trix";
    defaults = {
        commanders: bzCommanderLens.MILITARY,
        verbose: bzVerbosity.STANDARD,
        yieldBanner: Number(true),
    };
    data = {};
    load(optionID) {
        const value = ModOptions.load(this.modID, optionID);
        if (value == null) {
            const value = this.defaults[optionID];
            console.warn(`LOAD ${this.modID}.${optionID}=${value} (default)`);
            return value;
        }
        return value;
    }
    save(optionID) {
        const value = Number(this.data[optionID]);
        ModOptions.save(this.modID, optionID, value);
    }
    get commanders() {
        this.data.commanders ??= this.load("commanders");
        return this.data.commanders;
    }
    set commanders(value) {
        this.data.commanders = value;
        this.save("commanders");
    }
    get verbose() {
        this.data.verbose ??= this.load("verbose");
        return this.data.verbose;
    }
    set verbose(value) {
        this.data.verbose = value;
        this.save("verbose");
    }
    get yieldBanner() {
        this.data.yieldBanner ??= Boolean(this.load("yieldBanner"));
        return this.data.yieldBanner;
    }
    set yieldBanner(flag) {
        this.data.yieldBanner = Boolean(flag);
        this.save("yieldBanner");
        document.body.classList.toggle("bz-yield-banner", this.data.yieldBanner);
    }
};
// log stored values
bzMapTrixOptions.commanders;
bzMapTrixOptions.verbose;
// load optional CSS
document.body.classList.toggle("bz-yield-banner", bzMapTrixOptions.yieldBanner);
Controls.loadStyle("fs://game/bz-map-trix/ui/bz-style/bz-panel-yield-banner.css");

// fix Options initialization
Options.addInitCallback = function(callback) {
    if (this.optionsReInitCallbacks.length && !this.optionsInitCallbacks.length) {
        throw new Error("Options already initialized, cannot add init callback");
    }
    this.optionsInitCallbacks.push(callback);
    this.optionsReInitCallbacks.push(callback);
}

Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        group: "bz_mods",
        type: OptionType.Dropdown,
        id: "bz-commander-lens",
        initListener: (info) => info.selectedItemIndex = bzMapTrixOptions.commanders,
        updateListener: (_info, value) => bzMapTrixOptions.commanders = value,
        label: "LOC_OPTIONS_BZ_COMMANDER_LENS",
        description: "LOC_OPTIONS_BZ_COMMANDER_LENS_DESCRIPTION",
        dropdownItems: commandOptions,
    });
    Options.addOption({
        category: CategoryType.Mods,
        group: "bz_mods",
        type: OptionType.Dropdown,
        id: "bz-map-trix-verbose",
        initListener: (info) => info.selectedItemIndex = bzMapTrixOptions.verbose,
        updateListener: (_info, value) => bzMapTrixOptions.verbose = value,
        label: "LOC_OPTIONS_BZ_MAP_TRIX_VERBOSE",
        description: "LOC_OPTIONS_BZ_MAP_TRIX_VERBOSE_DESCRIPTION",
        dropdownItems: verbosityOptions,
    });
    Options.addOption({
        category: CategoryType.Mods,
        group: "bz_mods",
        type: OptionType.Checkbox,
        id: "bz-restyle-yield-banner",
        initListener: (info) => info.currentValue = bzMapTrixOptions.yieldBanner,
        updateListener: (_info, value) => bzMapTrixOptions.yieldBanner = value,
        label: "LOC_OPTIONS_BZ_RESTYLE_YIELD_BANNER",
        description: "LOC_OPTIONS_BZ_RESTYLE_YIELD_BANNER_DESCRIPTION",
    });
});

export { bzMapTrixOptions as default };
