import { template, insert } from '/core/vendor/solid-js/web/dist/web.js';
import { createMemo, createComponent, Show } from '/core/vendor/solid-js/dist/solid.js';
import { L10n } from '/core/ui-next/components/l10n.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="flex flex-col text-accent-2 max-w-96 mt-2 mx-2"><div class="flex flex-row justify-left text-sm font-bold tooltip-title"></div></div>`);
const ARCHEOLOGY_CONSTRUCTIBLE_TYPES = ["IMPROVEMENT_RUINS", "BUILDING_MUSEUM", "BUILDING_UNIVERSITY"];
function getConstructibleInfo(construct) {
  const instance = Constructibles.getByComponentID(construct);
  if (!instance) {
    return void 0;
  }
  return GameInfo.Constructibles.lookup(instance.type) ?? void 0;
}
function getArcheologyData(plotCoord) {
  const constructibles = MapConstructibles.getConstructibles(plotCoord.x, plotCoord.y);
  let constructibleInfo;
  for (const construct of constructibles) {
    const info = getConstructibleInfo(construct);
    if (info && ARCHEOLOGY_CONSTRUCTIBLE_TYPES.includes(info.ConstructibleType)) {
      constructibleInfo = info;
    }
  }
  const isNaturalWonder = GameplayMap.isNaturalWonder(plotCoord.x, plotCoord.y);
  if (!constructibleInfo && !isNaturalWonder) {
    return void 0;
  }
  if (constructibleInfo?.ConstructibleType === "IMPROVEMENT_RUINS") {
    return {
      titleText: "LOC_PLOT_TOOLTIP_EXCAVATE_TITLE",
      descriptionText: "LOC_PLOT_TOOLTIP_EXCAVATE_RUINS_DESCRIPTION"
    };
  }
  if (isNaturalWonder) {
    return {
      titleText: "LOC_PLOT_TOOLTIP_STUDY_NATURAL_WONDER",
      descriptionText: "LOC_PLOT_TOOLTIP_NATURAL_WONDER_RESEARCH_DESCRIPTION"
    };
  }
  if (constructibleInfo?.ConstructibleType === "BUILDING_MUSEUM" || constructibleInfo?.ConstructibleType === "BUILDING_UNIVERSITY") {
    const research = Players.get(GameContext.localPlayerID)?.Culture?.getContinentResearchStatus(GameplayMap.getContinentType(plotCoord.x, plotCoord.y)) ?? "";
    return {
      titleText: "LOC_PLOT_TOOLTIP_RESEARCH_TITLE",
      descriptionText: research
    };
  }
  return void 0;
}
function hasArcheologyData(plotCoord) {
  return getArcheologyData(plotCoord) !== void 0;
}
const ArcheologyPlotTooltipContent = (props) => {
  const data = createMemo(() => getArcheologyData(props.plotCoord));
  return createComponent(Show, {
    get when() {
      return data();
    },
    children: (info) => (() => {
      var _el$ = _tmpl$(), _el$2 = _el$.firstChild;
      insert(_el$2, createComponent(L10n.Stylize, {
        get text() {
          return info().titleText;
        }
      }));
      insert(_el$, createComponent(Show, {
        get when() {
          return info().descriptionText;
        },
        get children() {
          return createComponent(L10n.Stylize, {
            "class": "flex flex-col justify-around text-sm",
            get text() {
              return info().descriptionText;
            }
          });
        }
      }), null);
      return _el$;
    })()
  });
};

export { ArcheologyPlotTooltipContent, getArcheologyData, hasArcheologyData };
//# sourceMappingURL=archeology-content.js.map
