import '/core/vendor/solid-js/web/dist/web.js';
import { createComponent, Show } from '/core/vendor/solid-js/dist/solid.js';
import { Icon } from '/core/ui-next/components/icon.js';
import { L10n } from '/core/ui-next/components/l10n.js';
import { TooltipKeyword } from '/core/ui-next/components/tooltip-keyword.js';
import { Tooltip } from '/core/ui-next/components/tooltip.js';
import { TicketSection, TicketRow } from '/bz-map-trix/ui-next/tooltips/plot-tooltip/components/bz-utility.js';

const VolcanoSection = (props) => {
  return createComponent(TicketSection, {
    name: "VolcanoSection",
    get children() {
      return createComponent(TicketRow, {
        get icon() {
          return createComponent(Icon, {
            "class": "size-8",
            get name() {
              return props.volcano.active ? "url(blp:ntf_volcano_active)" : "url(blp:ntf_volcano_inactive)";
            },
            isUrl: true
          });
        },
        get children() {
          return [createComponent(Show, {
            get when() {
              return props.volcano.active;
            },
            get fallback() {
              return createComponent(L10n.Stylize, {
                "class": "font-title text-sm uppercase text-secondary",
                text: "LOC_FEATURE_VOLCANO_NAME_INACTIVE"
              });
            },
            get children() {
              return createComponent(Tooltip.Text, {
                text: "LOC_NOTIFICATION_VOLCANO_ACTIVE_SUMMARY",
                get args() {
                  return [props.volcano.name];
                },
                get children() {
                  return createComponent(TooltipKeyword, {
                    get children() {
                      return createComponent(L10n.Stylize, {
                        "class": "font-title text-sm uppercase",
                        text: "LOC_FEATURE_VOLCANO_NAME_ACTIVE"
                      });
                    }
                  });
                }
              });
            }
          }), createComponent(L10n.Stylize, {
            "class": "font-body text-sm",
            get text() {
              return props.volcano.name;
            }
          })];
        }
      });
    }
  });
};

export { VolcanoSection };
//# sourceMappingURL=volcano-section.js.map
