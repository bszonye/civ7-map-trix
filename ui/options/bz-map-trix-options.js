import '/core/ui/options/screen-options.js';  // make sure this loads first
import { C as CategoryType, O as Options, a as OptionType } from '/core/ui/options/editors/index.chunk.js';
// set up mod options tab
import '/bz-map-trix/ui/options/mod-options.js';

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
    data = {
        commanders: {
            optionName: "bzMapTrixCommanders",
            defaultValue: bzCommanderLens.MILITARY,
        },
        verbose: {
            optionName: "bzMapTrixVerbosity",
            defaultValue: bzVerbosity.STANDARD,
        },
        yieldBanner: {
            optionName: "bzMapTrixYieldBanner",
            defaultValue: true,
        },
    };
    load(data) {
        const value = UI.getOption("user", "Mod", data.optionName);
        console.warn(`LOAD ${data.optionName} = ${JSON.stringify(value)}`);
        return value ?? data.defaultValue;
    }
    save(data, value) {
        UI.setOption("user", "Mod", data.optionName, value);
        console.warn(`SAVE ${data.optionName} = ${JSON.stringify(value)}`);
        Configuration.getUser().saveCheckpoint();
    }
    get commanders() {
        const data = this.data.commanders;
        data.selectedItemIndex ??= this.load(data);
        return data.selectedItemIndex;
    }
    set commanders(level) {
        const data = this.data.commanders;
        data.selectedItemIndex = level;
        this.save(data, data.selectedItemIndex);
    }
    get verbose() {
        const data = this.data.verbose;
        data.selectedItemIndex ??= this.load(data);
        return data.selectedItemIndex;
    }
    set verbose(level) {
        const data = this.data.verbose;
        data.selectedItemIndex = level;
        this.save(data, data.selectedItemIndex);
    }
    get yieldBanner() {
        const data = this.data.yieldBanner;
        data.currentValue ??= Boolean(this.load(data));
        return data.currentValue;
    }
    set yieldBanner(flag) {
        const data = this.data.yieldBanner;
        data.currentValue = Boolean(flag);
        this.save(data, data.currentValue ? 1 : 0);
        document.body.classList.toggle("bz-yield-banner", data.currentValue);
    }
};
// log stored values
bzMapTrixOptions.commanders;
bzMapTrixOptions.verbose;
// load optional CSS
document.body.classList.toggle("bz-yield-banner", bzMapTrixOptions.yieldBanner);
Controls.loadStyle("fs://game/bz-map-trix/ui/bz-style/bz-panel-yield-banner.css");

Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        // @ts-ignore
        group: "bz_mods",
        type: OptionType.Dropdown,
        id: "bz-commander-lens",
        initListener: (info) => {
            info.selectedItemIndex = bzMapTrixOptions.commanders;
        },
        updateListener: (_info, value) => {
            bzMapTrixOptions.commanders = value;
        },
        label: "LOC_OPTIONS_BZ_COMMANDER_LENS",
        description: "LOC_OPTIONS_BZ_COMMANDER_LENS_DESCRIPTION",
        dropdownItems: commandOptions,
    });
});
Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        // @ts-ignore
        group: "bz_mods",
        type: OptionType.Dropdown,
        id: "bz-map-trix-verbose",
        initListener: (info) => {
            info.selectedItemIndex = bzMapTrixOptions.verbose;
        },
        updateListener: (_info, value) => {
            bzMapTrixOptions.verbose = value;
        },
        label: "LOC_OPTIONS_BZ_MAP_TRIX_VERBOSE",
        description: "LOC_OPTIONS_BZ_MAP_TRIX_VERBOSE_DESCRIPTION",
        dropdownItems: verbosityOptions,
    });
});
Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        group: "bz_mods",
        type: OptionType.Checkbox,
        id: "bz-restyle-yield-banner",
        initListener: (info) => {
            info.currentValue = bzMapTrixOptions.yieldBanner;
        },
        updateListener: (_info, value) => {
            bzMapTrixOptions.yieldBanner = value;
        },
        label: "LOC_OPTIONS_BZ_RESTYLE_YIELD_BANNER",
        description: "LOC_OPTIONS_BZ_RESTYLE_YIELD_BANNER_DESCRIPTION",
    });
});

export { bzMapTrixOptions as default };
