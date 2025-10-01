import { d as CategoryData, C as CategoryType } from '/core/ui/options/editors/index.chunk.js';

CategoryType["Mods"] = "mods";
CategoryData[CategoryType.Mods] = {
    title: "LOC_UI_CONTENT_MGR_SUBTITLE",
    description: "LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION",
};

// fix Options tab spacing
const MOD_OPTIONS_STYLE = document.createElement('style');
MOD_OPTIONS_STYLE.textContent = `
.option-frame .tab-bar__items .flex-auto {
    flex: 1 0 auto;
    min-width: 0rem;
    margin-left: 0.4444444444rem;
    margin-right: 0.4444444444rem;
}
`;
document.head.appendChild(MOD_OPTIONS_STYLE);
