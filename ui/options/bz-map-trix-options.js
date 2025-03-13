import '/core/ui/options/options.js';  // make sure this loads first
import { CategoryType } from '/core/ui/options/options-helpers.js';
import { Options, OptionType } from '/core/ui/options/model-options.js';
import ModSettings from '/bz-map-trix/ui/options/mod-options-decorator.js';

const bzMapTrixOptions = new class {
    data = {
        relationshipFix: true,
        yieldBanner: true,
        verbose: false,
    };
    constructor() {
        const modSettings = ModSettings.load("bz-map-trix");
        if (modSettings) this.data = modSettings;
    }
    save() {
        ModSettings.save("bz-map-trix", this.data);
        // sync optional styling
        if (this.data.relationshipFix) {
            document.body.classList.add("bz-relationship-fix");
        } else {
            document.body.classList.remove("bz-relationship-fix");
        }
        if (this.data.yieldBanner) {
            document.body.classList.add("bz-yield-banner");
        } else {
            document.body.classList.remove("bz-yield-banner");
        }
    }
    get relationshipFix() {
        return this.data.relationshipFix;
    }
    set relationshipFix(flag) {
        this.data.relationshipFix = !!flag;
        this.save();
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

const onInitRelationshipFix = (info) => {
    info.currentValue = bzMapTrixOptions.relationshipFix;
};
const onUpdateRelationshipFix = (_info, flag) => {
    bzMapTrixOptions.relationshipFix = flag;
};
const onInitVerbose = (info) => {
    info.currentValue = bzMapTrixOptions.verbose;
};
const onUpdateVerbose = (_info, flag) => {
    bzMapTrixOptions.verbose = flag;
};
const onInitYieldBanner = (info) => {
    info.currentValue = bzMapTrixOptions.yieldBanner;
};
const onUpdateYieldBanner = (_info, flag) => {
    bzMapTrixOptions.yieldBanner = flag;
};

Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.System,
        // @ts-ignore
        group: 'bz_map_trix',
        type: OptionType.Checkbox,
        id: "bz-fix-relationship-tooltips",
        initListener: onInitRelationshipFix,
        updateListener: onUpdateRelationshipFix,
        label: "LOC_OPTIONS_BZ_FIX_RELATIONSHIP_TOOLTIPS",
        description: "LOC_OPTIONS_BZ_FIX_RELATIONSHIP_TOOLTIPS_DESCRIPTION",
    });
});
Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.System,
        // @ts-ignore
        group: 'bz_map_trix',
        type: OptionType.Checkbox,
        id: "bz-restyle-yield-banner",
        initListener: onInitYieldBanner,
        updateListener: onUpdateYieldBanner,
        label: "LOC_OPTIONS_BZ_RESTYLE_YIELD_BANNER",
        description: "LOC_OPTIONS_BZ_RESTYLE_YIELD_BANNER_DESCRIPTION",
    });
});
Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.System,
        // @ts-ignore
        group: 'bz_map_trix',
        type: OptionType.Checkbox,
        id: "bz-map-trix-verbose",
        initListener: onInitVerbose,
        updateListener: onUpdateVerbose,
        label: "LOC_OPTIONS_BZ_VERBOSE_TOOLTIPS",
        description: "LOC_OPTIONS_BZ_VERBOSE_TOOLTIPS_DESCRIPTION",
    });
});

export { bzMapTrixOptions as default };
