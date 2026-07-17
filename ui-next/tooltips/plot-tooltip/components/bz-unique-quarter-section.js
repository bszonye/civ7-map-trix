// vim: sw=2 et
import { template, insert } from '/core/vendor/solid-js/web/dist/web.js';
import { createComponent, Show, For, createMemo, createRenderEffect } from '/core/vendor/solid-js/dist/solid.js';
import { Icon } from '/core/ui-next/components/icon.js';
import { L10n } from '/core/ui-next/components/l10n.js';
import { TooltipKeyword } from '/core/ui-next/components/tooltip-keyword.js';
import { TooltipHorizontalPosition, TooltipVerticalPosition } from '/core/ui-next/components/tooltip.js';
import { ProductionTooltip } from '/base-standard/ui-next/tooltips/production-tooltip.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="w-px flex-1"></div>`), _tmpl$2 = /* @__PURE__ */ template(`<div class="flex flex-col w-full"><div class="flex flex-row items-stretch"><div class="w-12 shrink-0 flex justify-center items-start"></div><div class="w-4 shrink-0 flex flex-col items-center"></div><div class="flex flex-col flex-auto ml-1"></div></div></div>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="flex w-full items-center gap-1 pr-0\\.5"></div>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="flex flex-row items-center"><div class="w-12 shrink-0 flex justify-center"></div><div class="w-4 shrink-0 self-stretch flex flex-col items-center"><div class="w-px flex-1"></div><div></div><div class="w-px flex-1"></div></div><div class="flex flex-col ml-1 justify-start flex-auto"></div></div>`);
const UniqueQuarterSection = (props) => {
  const hasBuildings = () => props.buildings.length > 0;
  return (() => {
    var _el$ = _tmpl$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$6 = _el$4.nextSibling;
    insert(_el$3, createComponent(Icon, {
      "class": "size-6 pt-1 mt-1",
      name: "CITY_UNIQUE_QUARTER"
    }));
    insert(_el$4, createComponent(Show, {
      get when() {
        return hasBuildings();
      },
      get children() {
        var _el$5 = _tmpl$();
        _el$5.style.setProperty("background-color", "#B79A64");
        return _el$5;
      }
    }));
    insert(_el$6, createComponent(L10n.Stylize, {
      "class": "font-title text-sm uppercase text-secondary mt-1",
      get text() {
        return props.definition.Name;
      }
    }), null);
    insert(_el$6, createComponent(L10n.Stylize, {
      "class": "font-body text-2xs mb-1",
      // TRIX: resize text
      text: "LOC_PLOT_TOOLTIP_UNIQUE_QUARTER"
    }), null);
    insert(_el$6, createComponent(L10n.Stylize, {
      "class": "font-body text-xs text-accent-3 mb-2",
      // TRIX: resize text
      get text() {
        return props.definition.Tooltip;
        // TRIX: use Tooltip (compact) instead of Description (verbose)
      }
    }), null);
    insert(_el$, createComponent(For, {
      get each() {
        return props.buildings;
      },
      children: (building, index) => {
        const isLast = createMemo(() => index() === props.buildings.length - 1);
        return (() => {
          var _el$7 = _tmpl$4(), _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling, _el$10 = _el$9.firstChild, _el$11 = _el$10.nextSibling, _el$12 = _el$11.nextSibling, _el$13 = _el$9.nextSibling;
          _el$7.style.setProperty("background", "linear-gradient(90deg, #36383F 5.59%, rgba(54, 56, 63, 0.00) 99.99%)");
          insert(_el$8, createComponent(Icon, {
            "class": "size-7 py-0\\.5",
            isUrl: true,
            get name() {
              return building.icon;
            }
          }));
          _el$10.style.setProperty("background-color", "#B79A64");
          insert(_el$11, createComponent(Icon, {
            "class": "size-3 shrink-0",
            isUrl: true,
            name: "url(blp:tooltip_uniqueIcon)"
          }));
          _el$12.style.setProperty("background-color", "#B79A64");
          var _el$14 = _tmpl$3();
          insert(_el$13, () => _el$14);
          insert(_el$14, createComponent(Show, {
            get when() {
              return building.isBuilding || building.isWonder;
            },
            get fallback() {
              return createComponent(L10n.Stylize, {
                "class": "font-title text-sm flex-auto",
                get text() {
                  return building.title;
                }
              });
            },
            get children() {
              return createComponent(ProductionTooltip, {
                get type() {
                  return building.type;
                },
                get name() {
                  return building.title;
                },
                get initialVPosition() {
                  return TooltipVerticalPosition.BOTTOM;
                },
                get initialHPosition() {
                  return TooltipHorizontalPosition.RIGHT;
                },
                get children() {
                  return createComponent(TooltipKeyword, {
                    // TRIX: expand to right-align status icons
                    "class": "flex-auto",
                    get children() {
                      return createComponent(L10n.Stylize, {
                        "class": "font-title text-sm",
                        get text() {
                          return building.title;
                        }
                      });
                    }
                  });
                }
              });
            }
          }), null);
          insert(_el$14, createComponent(Show, {
            get when() {
              return building.damaged;
            },
            get children() {
              return createComponent(Icon, {
                "class": "size-5",
                isUrl: true,
                name: "url(blp:fi_damaged_64)"
              });
            }
          }), null);
          insert(_el$14, createComponent(For, {
            get each() {
              return building.icons;
            },
            children: (icon) => createComponent(Icon, {
              "class": "size-5",
              get name() {
                return icon;
              },
              isUrl: true,
            }),
          }), null);
          createRenderEffect((_$p) => (_$p = isLast() ? "rotate(180deg)" : "none") != null ? _el$11.style.setProperty("transform", _$p) : _el$11.style.removeProperty("transform"));
          return _el$7;
        })();
      }
    }), null);
    return _el$;
  })();
};

export { UniqueQuarterSection };
//# sourceMappingURL=unique-quarter-section.js.map
