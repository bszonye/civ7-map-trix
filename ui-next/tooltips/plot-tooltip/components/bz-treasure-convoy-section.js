import { template, insert } from '/core/vendor/solid-js/web/dist/web.js';
import { createMemo, createComponent, Show } from '/core/vendor/solid-js/dist/solid.js';
import { Icon } from '/core/ui-next/components/icon.js';
import { L10n } from '/core/ui-next/components/l10n.js';
import { TooltipKeyword } from '/core/ui-next/components/tooltip-keyword.js';
import { Tooltip } from '/core/ui-next/components/tooltip.js';
import { TicketSection, TicketRow } from './bz-utility.js';
import { getTreasureConvoyInfo } from '../bz-helpers.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="flex flex-col items-center ml-2 shrink-0"><div class="size-6 bg-contain bg-center bg-no-repeat"></div><span class="font-body text-xs text-accent-2"></span></div>`), _tmpl$2 = /* @__PURE__ */ template(`<div class=flex></div>`);
const TreasureConvoySection = (props) => {
  const convoy = createMemo(() => getTreasureConvoyInfo(props.owningCity));
  return createComponent(TicketSection, {
    name: "TreasureConvoySection",
    variant: "gold",
    get children() {
      return createComponent(TicketRow, {
        get icon() {
          return createComponent(Icon, {
            "class": "size-8",
            get name() {
              return `url(blp:${props.isDistantLands ? "restype_treasure_v2" : "restype_treasure_v3"})`;
            },
            isUrl: true
          });
        },
        get children() {
          var _el$ = _tmpl$2();
          insert(_el$, createComponent(Tooltip.Text, {
            text: "LOC_PEDIA_CONCEPTS_TREASURE_CONVOY_TOOLTIP",
            get children() {
              return createComponent(TooltipKeyword, {
                "class": "flex-auto self-center",
                // TRIX: center label vertically
                get children() {
                  return createComponent(L10n.Stylize, {
                    "class": "font-title text-sm",
                    text: "LOC_PLOT_TOOLTIP_TREASURE_RESOURCE"
                  });
                }
              });
            }
          }), null);
          insert(_el$, createComponent(Show, {
            get when() {
              return convoy()?.turnsRemaining != null;
            },
            get children() {
              var _el$2 = _tmpl$(), _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling;
              _el$3.style.setProperty("background-image", "url(blp:hud_turn-timer)");
              insert(_el$4, () => convoy().turnsRemaining);
              return _el$2;
            }
          }), null);
          return _el$;
        }
      });
    }
  });
};

export { TreasureConvoySection };
//# sourceMappingURL=treasure-convoy-section.js.map
// vim: sw=2 et
