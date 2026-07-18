import '/core/vendor/solid-js/web/dist/web.js';
import { createComponent, Show } from '/core/vendor/solid-js/dist/solid.js';
import { Icon } from '/core/ui-next/components/icon.js';
import { L10n } from '/core/ui-next/components/l10n.js';
import { TooltipKeyword } from '/core/ui-next/components/tooltip-keyword.js';
import { Tooltip } from '/core/ui-next/components/tooltip.js';
import { TicketSection, TicketRow } from './bz-utility.js';

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
          // TRIX: use volcano name as heading, like natural wonders
          return [createComponent(L10n.Stylize, {
            "class": "font-title text-sm uppercase text-secondary",
            get text() {
              return props.volcano.name;
            }
          }), createComponent(Show, {
            get when() {
              return props.volcano.active;
            },
            get fallback() {
              return createComponent(L10n.Stylize, {
                "class": "font-body text-xs",
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
                        "class": "font-body text-xs",
                        text: "LOC_FEATURE_VOLCANO_NAME_ACTIVE"
                      });
                    }
                  });
                }
              });
            }
          })];
        }
      });
    }
  });
};

export { VolcanoSection };
//# sourceMappingURL=volcano-section.js.map
// vim: sw=2 et
