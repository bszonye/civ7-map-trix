import { PanelYieldBanner } from '/base-standard/ui/diplo-ribbon/panel-yield-banner.js';

const BZ_HEAD_STYLE = document.createElement('style');
BZ_HEAD_STYLE.textContent = `
.bz-yield-banner .panel-yield__top-bar-content .text-yield-food,
.bz-yield-banner .panel-yield__top-bar-content .text-yield-production,
.bz-yield-banner .panel-yield__top-bar-content .text-yield-gold,
.bz-yield-banner .panel-yield__top-bar-content .text-yield-influence,
.bz-yield-banner .panel-yield__top-bar-content .text-yield-science,
.bz-yield-banner .panel-yield__top-bar-content .text-yield-culture,
.bz-yield-banner .panel-yield__top-bar-content .text-yield-happiness,
.bz-yield-banner .panel-yield__top-bar-content .text-yield-cities {
    color: #c2c4cc;  /* text-accent-2 */
    border-radius: 0.777rem / 50%;
    padding-left: 0.1111111111rem;
    padding-right: 0.5555555556rem;
    transition: color 0.25s cubic-bezier(0.215, 0.61, 0.355, 1);
    transition: background-color 0.25s cubic-bezier(0.215, 0.61, 0.355, 1);
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-food:hover,
.bz-yield-banner .panel-yield__top-bar-content .text-yield-production:hover,
.bz-yield-banner .panel-yield__top-bar-content .text-yield-gold:hover,
.bz-yield-banner .panel-yield__top-bar-content .text-yield-influence:hover,
.bz-yield-banner .panel-yield__top-bar-content .text-yield-science:hover,
.bz-yield-banner .panel-yield__top-bar-content .text-yield-culture:hover,
.bz-yield-banner .panel-yield__top-bar-content .text-yield-happiness:hover,
.bz-yield-banner .panel-yield__top-bar-content .text-yield-cities:hover {
    color: #e5e5e5;  /* text-accent-1 */
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-food {
    background-color: #a6cc3344;
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-food:hover {
    background-color: #a6cc33aa;
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-production {
    background-color: #a33d2955;
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-production:hover {
    background-color: #a33d29aa;
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-gold {
    background-color: #f0c44244;
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-gold:hover {
    background-color: #f0c442aa;
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-influence {
    background-color: #99e6bf66;
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-influence:hover {
    background-color: #99e6bfaa;
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-science {
    background-color: #80bfff55;
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-science:hover {
    background-color: #80bfffaa;
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-culture {
    background-color: #bf99e666;
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-culture:hover {
    background-color: #bf99e6aa;
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-happiness {
    background-color: #ff993366;
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-happiness:hover {
    background-color: #ff9933aa;
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-cities {
    background-color: #e5d2ac66;
}
.bz-yield-banner .panel-yield__top-bar-content .text-yield-cities:hover {
    background-color: #e5d2acaa;
}
`;
document.head.appendChild(BZ_HEAD_STYLE);

// add missing style for settlement count
const YieldBarEntry_render = PanelYieldBanner.prototype.render;
PanelYieldBanner.prototype.render = function() {
    YieldBarEntry_render.apply(this);
    this.settlementCapElement.classList.value = 'mr-1\\.5 text-yield-cities focus\\:bg-magenta';
}
