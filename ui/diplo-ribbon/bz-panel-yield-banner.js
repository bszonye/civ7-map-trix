import { PanelYieldBanner } from '/base-standard/ui/diplo-ribbon/panel-yield-banner.js';

const BZ_STYLE = document.createElement('style');
BZ_STYLE.textContent = `
.panel-yield__top-bar-content .text-yield-gold,
.panel-yield__top-bar-content .text-yield-influence,
.panel-yield__top-bar-content .text-yield-science,
.panel-yield__top-bar-content .text-yield-culture,
.panel-yield__top-bar-content .text-yield-happiness,
.panel-yield__top-bar-content .text-yield-cities {
    color: #c2c4cc;  /* text-accent-2 */
    border-radius: 0.777rem / 50%;
    border-color: white;
    padding-left: 0.1111111111rem;
    padding-right: 0.5555555556rem;
    transition: color 0.25s cubic-bezier(0.215, 0.61, 0.355, 1);
    transition: background-color 0.25s cubic-bezier(0.215, 0.61, 0.355, 1);
}
.panel-yield__top-bar-content .text-yield-gold:hover,
.panel-yield__top-bar-content .text-yield-influence:hover,
.panel-yield__top-bar-content .text-yield-science:hover,
.panel-yield__top-bar-content .text-yield-culture:hover,
.panel-yield__top-bar-content .text-yield-happiness:hover,
.panel-yield__top-bar-content .text-yield-cities:hover {
    color: #e5e5e5;  /* text-accent-1 */
}
.panel-yield__top-bar-content .text-yield-gold {
    background-color: #f0c44244;
}
.panel-yield__top-bar-content .text-yield-gold:hover {
    background-color: #f0c442aa;
}
.panel-yield__top-bar-content .text-yield-influence {
    background-color: #99e6bf44;
}
.panel-yield__top-bar-content .text-yield-influence:hover {
    background-color: #99e6bfaa;
}
.panel-yield__top-bar-content .text-yield-science {
    background-color: #80bfff55;
}
.panel-yield__top-bar-content .text-yield-science:hover {
    background-color: #80bfffaa;
}
.panel-yield__top-bar-content .text-yield-culture {
    background-color: #bf99e655;
}
.panel-yield__top-bar-content .text-yield-culture:hover {
    background-color: #bf99e6aa;
}
.panel-yield__top-bar-content .text-yield-happiness {
    background-color: #ff993366;
}
.panel-yield__top-bar-content .text-yield-happiness:hover {
    background-color: #ff9933aa;
}
.panel-yield__top-bar-content .text-yield-cities {
    background-color: #e5d2ac66;
}
.panel-yield__top-bar-content .text-yield-cities:hover {
    background-color: #e5d2acaa;
}
`;
document.head.appendChild(BZ_STYLE);

// add missing style for settlement count
const YieldBarEntry_render = PanelYieldBanner.prototype.render;
PanelYieldBanner.prototype.render = function() {
    YieldBarEntry_render.apply(this);
    this.settlementCapElement.classList.value = 'mr-1\\.5 text-yield-cities focus\\:bg-magenta';
}
