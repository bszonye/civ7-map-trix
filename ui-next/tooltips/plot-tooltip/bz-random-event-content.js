import { template, insert } from '/core/vendor/solid-js/web/dist/web.js';
import { createMemo, createComponent, Show } from '/core/vendor/solid-js/dist/solid.js';
import { L10n } from '/core/ui-next/components/l10n.js';
import { RandomEventsLayer } from '/base-standard/ui/lenses/layer/random-events-layer.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="flex flex-row text-accent-2"><div class="flex text-sm"></div></div>`);
function getRandomEventInfo(plotCoord) {
  const randomEvent = RandomEventsLayer.instance.getRandomEventResult(plotCoord.x, plotCoord.y);
  if (!randomEvent) return void 0;
  let eventData = null;
  if (randomEvent.tooltipKey === "CLASS_FLOOD_VOLCANO") {
    const floodEvent = GameInfo.RandomEventUI.lookup("CLASS_FLOOD");
    const volcanoEvent = GameInfo.RandomEventUI.lookup("CLASS_VOLCANO");
    if (floodEvent !== null && volcanoEvent !== null) {
      eventData = {
        ...floodEvent,
        Tooltip: "LOC_UI_RANDOM_EVENT_FLOOD_VOLCANO_TOOLTIP"
      };
    }
  } else {
    eventData = GameInfo.RandomEventUI.lookup(randomEvent.eventClass);
  }
  if (!eventData) return void 0;
  return {
    randomEvent,
    eventData
  };
}
function hasRandomEventData(plotCoord) {
  return getRandomEventInfo(plotCoord) !== void 0;
}
const RandomEventPlotTooltipContent = (props) => {
  const eventInfo = createMemo(() => getRandomEventInfo(props.plotCoord));
  return createComponent(Show, {
    get when() {
      return eventInfo();
    },
    children: (info) => (() => {
      var _el$ = _tmpl$(), _el$2 = _el$.firstChild;
      insert(_el$2, createComponent(L10n.Stylize, {
        get text() {
          return info().eventData.Tooltip;
        }
      }));
      return _el$;
    })()
  });
};

export { RandomEventPlotTooltipContent, getRandomEventInfo, hasRandomEventData };
//# sourceMappingURL=random-event-content.js.map
