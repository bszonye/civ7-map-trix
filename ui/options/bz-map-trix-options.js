import '/core/ui/options/options.js';  // make sure this loads first
import { CategoryType } from '/core/ui/options/options-helpers.js';
import { Options, OptionType } from '/core/ui/options/model-options.js';
import ModSettings from '/bz-map-trix/ui/options/mod-options-decorator.js';

const MOD_ID = "bz-map-trix";
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

const BZ_DEFAULT_OPTIONS = {
    verbose: bzVerbosity.STANDARD,
    yieldBanner: true,
};
const bzMapTrixOptions = new class {
    data = { ...BZ_DEFAULT_OPTIONS };
    constructor() {
        const modSettings = ModSettings.load(MOD_ID);
        if (modSettings) this.data = modSettings;
    }
    save() {
        ModSettings.save(MOD_ID, this.data);
        // sync optional styling
        if (this.yieldBanner) {
            document.body.classList.add("bz-yield-banner");
        } else {
            document.body.classList.remove("bz-yield-banner");
        }
    }
    get verbose() {
        // convert legacy boolean options
        if (this.data.verbose === true) return bzVerbosity.VERBOSE;
        if (this.data.verbose === false) return bzVerbosity.STANDARD;
        return this.data.verbose ?? BZ_DEFAULT_OPTIONS.verbose;
    }
    set verbose(level) {
        this.data.verbose = level;
        this.save();
    }
    get yieldBanner() {
        return this.data.yieldBanner ?? BZ_DEFAULT_OPTIONS.yieldBanner;
    }
    set yieldBanner(flag) {
        this.data.yieldBanner = !!flag;
        this.save();
    }
};
const onInitVerbose = (info) => {
    info.selectedItemIndex = bzMapTrixOptions.verbose;
};
const onUpdateVerbose = (_info, level) => {
    bzMapTrixOptions.verbose = level;
};
Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        // @ts-ignore
        group: "bz_mods",
        type: OptionType.Dropdown,
        id: "bz-map-trix-verbose",
        initListener: onInitVerbose,
        updateListener: onUpdateVerbose,
        label: "LOC_OPTIONS_BZ_MAP_TRIX_VERBOSE",
        description: "LOC_OPTIONS_BZ_MAP_TRIX_VERBOSE_DESCRIPTION",
        dropdownItems: verbosityOptions,
    });
});
const onInitYieldBanner = (info) => {
    info.currentValue = bzMapTrixOptions.yieldBanner;
};
const onUpdateYieldBanner = (_info, flag) => {
    bzMapTrixOptions.yieldBanner = flag;
};
Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        // @ts-ignore
        group: "bz_mods",
        type: OptionType.Checkbox,
        id: "bz-restyle-yield-banner",
        initListener: onInitYieldBanner,
        updateListener: onUpdateYieldBanner,
        label: "LOC_OPTIONS_BZ_RESTYLE_YIELD_BANNER",
        description: "LOC_OPTIONS_BZ_RESTYLE_YIELD_BANNER_DESCRIPTION",
    });
});

export { bzMapTrixOptions as default };
