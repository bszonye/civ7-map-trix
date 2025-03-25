import '/core/ui/options/options.js';  // make sure this loads first
import { CategoryType } from '/core/ui/options/options-helpers.js';
import { Options, OptionType } from '/core/ui/options/model-options.js';
import ModSettings from '/bz-map-trix/ui/options/mod-options-decorator.js';

const MOD_ID = "bz-map-trix";

const bzMapTrixOptions = new class {
    data = {
        verbose: false,
        yieldBanner: true,
    };
    constructor() {
        const modSettings = ModSettings.load(MOD_ID);
        if (modSettings) this.data = modSettings;
    }
    save() {
        ModSettings.save(MOD_ID, this.data);
        // sync optional styling
        if (this.data.yieldBanner) {
            document.body.classList.add("bz-yield-banner");
        } else {
            document.body.classList.remove("bz-yield-banner");
        }
    }
    get verbose() {
        return this.data.verbose;
    }
    set verbose(flag) {
        this.data.verbose = !!flag;
        this.save();
    }
    get yieldBanner() {
        return this.data.yieldBanner;
    }
    set yieldBanner(flag) {
        this.data.yieldBanner = !!flag;
        this.save();
    }
};
const onInitVerbose = (info) => {
    info.currentValue = bzMapTrixOptions.verbose;
};
const onUpdateVerbose = (_info, flag) => {
    bzMapTrixOptions.verbose = flag;
};
Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        // @ts-ignore
        group: "bz_mods",
        type: OptionType.Checkbox,
        id: "bz-map-trix-verbose",
        initListener: onInitVerbose,
        updateListener: onUpdateVerbose,
        label: "LOC_OPTIONS_BZ_MAP_TRIX_VERBOSE",
        description: "LOC_OPTIONS_BZ_MAP_TRIX_VERBOSE_DESCRIPTION",
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
