import { template, insert, className } from '/core/vendor/solid-js/web/dist/web.js';
import { createMemo, createComponent, Show, For, createRenderEffect } from '/core/vendor/solid-js/dist/solid.js';
import { L10n } from '/core/ui-next/components/l10n.js';
import { SettlementRecommendationsLayer } from '/base-standard/ui/lenses/layer/settlement-recommendations-layer.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="flex flex-row text-accent-2"><div class="flex flex-col"></div><div class="flex flex-col justify-around text-sm font-bold mr-5"></div><div class="flex flex-col justify-around text-sm"></div></div>`), _tmpl$2 = /* @__PURE__ */ template(`<span></span>`);
function hasSettlementRecommendationData(plotCoord) {
  return SettlementRecommendationsLayer.instance.getRecommendationResult(plotCoord.x, plotCoord.y) !== void 0;
}
function getSettlementRecommendationData(plotCoord) {
  return SettlementRecommendationsLayer.instance.getRecommendationResult(plotCoord.x, plotCoord.y);
}
const SettlementRecommendationPlotTooltipContent = (props) => {
  const recommendation = createMemo(() => getSettlementRecommendationData(props.plotCoord));
  return createComponent(Show, {
    get when() {
      return recommendation();
    },
    children: (data) => (() => {
      var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.nextSibling;
      insert(_el$2, createComponent(For, {
        get each() {
          return data().factors;
        },
        children: (factor) => (() => {
          var _el$5 = _tmpl$2();
          createRenderEffect(() => className(_el$5, factor.positive ? "img-plus-icon" : "img-minus-icon"));
          return _el$5;
        })()
      }));
      insert(_el$3, createComponent(For, {
        get each() {
          return data().factors;
        },
        children: (factor) => createComponent(L10n.Stylize, {
          get text() {
            return factor.title;
          }
        })
      }));
      insert(_el$4, createComponent(For, {
        get each() {
          return data().factors;
        },
        children: (factor) => createComponent(L10n.Stylize, {
          get text() {
            return factor.description;
          }
        })
      }));
      return _el$;
    })()
  });
};

export { SettlementRecommendationPlotTooltipContent, getSettlementRecommendationData, hasSettlementRecommendationData };
//# sourceMappingURL=settlement-recommendation-content.js.map
// vim: sw=2 et
