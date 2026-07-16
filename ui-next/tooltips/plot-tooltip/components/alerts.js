// vim: sw=2 et
import { template, insert } from '../../../../../core/vendor/solid-js/web/dist/web.js';
import { createRenderEffect, createComponent, Show, createMemo, For } from '../../../../../core/vendor/solid-js/dist/solid.js';
import { Icon } from '../../../../../core/ui-next/components/icon.js';
import { L10n } from '../../../../../core/ui-next/components/l10n.js';
import { TooltipKeyword } from '../../../../../core/ui-next/components/tooltip-keyword.js';
import { Tooltip } from '../../../../../core/ui-next/components/tooltip.js';
import { getDistrictHealthInfo } from '../bz-helpers.js';
import { TicketSection, TicketRow } from './utility.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="size-6 shrink-0 bg-contain bg-center bg-no-repeat"></div>`), _tmpl$2 = /* @__PURE__ */ template(`<div class="flex flex-col items-center ml-2 shrink-0"><div class="size-6 bg-contain bg-center bg-no-repeat"></div><span class="font-body text-xs text-accent-2"></span></div>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="flex items-center w-full"><div class="font-title text-sm uppercase text-secondary flex-1 flex flex-wrap items-center"></div></div>`), _tmpl$4 = /* @__PURE__ */ template(`<span class=mx-1>•</span>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="flex items-center w-full"></div>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="flex items-center mt-0\\.5 font-body text-sm text-accent-3"><span></span></div>`);
const PlotAlertIcon = (props) => (() => {
  var _el$ = _tmpl$();
  // eslint-disable-next-line no-constant-binary-expression -- FXS
  createRenderEffect((_$p) => (_$p = props.icon ?? "url(blp:tooltip_alert_icon)") != null ? _el$.style.setProperty("background-image", _$p) : _el$.style.removeProperty("background-image"));  // noqa
  return _el$;
})();
const PlotAlertTimer = (props) => createComponent(Show, {
  get when() {
    return props.turns != null && 0 <= props.turns;
  },
  get children() {
    var _el$2 = _tmpl$2(), _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling;
    _el$3.style.setProperty("background-image", "url(blp:hud_turn-timer)");
    insert(_el$4, () => props.turns);
    return _el$2;
  }
});
const PlotAlertLabel = (props) => createComponent(Show, {
  get when() {
    return props.alert.tooltipText;
  },
  get fallback() {
    return createComponent(L10n.Stylize, {
      get ["class"]() {
        return props.class;
      },
      get text() {
        return props.alert.title;
      }
    });
  },
  children: (tooltipText) => createComponent(Tooltip.Text, {
    get text() {
      return tooltipText();
    },
    get children() {
      return createComponent(TooltipKeyword, {
        get ["class"]() {
          return props.keywordClass;
        },
        get children() {
          return createComponent(L10n.Stylize, {
            get ["class"]() {
              return props.class;
            },
            get text() {
              return props.alert.title;
            }
          });
        }
      });
    }
  })
});
function pushUniqueAlert(target, alert) {
  const hasMatch = target.some((existing) => existing.title === alert.title && existing.turns === alert.turns && existing.variant === alert.variant && existing.icon === alert.icon && existing.tooltipText === alert.tooltipText);
  if (!hasMatch) {
    target.push(alert);
  }
}
function getEventClassAlertTooltip(eventClass) {
  return GameInfo.RandomEventUI.lookup(eventClass)?.AlertTooltip ?? void 0;
}
function getPlotEffectAlert(effect) {
  const turns = effect.duration > 0 ? effect.duration : void 0;
  if (effect.plotEffectType === "PLOTEFFECT_RADIOACTIVE_FALLOUT") {
    return {
      title: effect.name,
      tooltipText: "LOC_PEDIA_CONCEPTS_FALLOUT_TOOLTIP",
      turns
    };
  }
  if (effect.plotEffectType === "PLOTEFFECT_IS_BURNING") {
    return {
      title: effect.name,
      turns
    };
  }
  if (effect.plotEffectType === "PLOTEFFECT_PLAGUE") {
    return {
      title: effect.name,
      tooltipText: "LOC_PEDIA_CONCEPTS_INFECTED_TOOLTIP",
      icon: "url(blp:fi_yield_plague_64)",
      turns
    };
  }
  if (effect.plotEffectType === "PLOTEFFECT_UNIT_FORTIFICATIONS") {
    return {
      title: effect.name,
      icon: "url(blp:fi_action_fortify_64)",
      variant: "gold",
      turns: -1
    };
  }
  return null;
}
function getStormAlert(storm) {
  return {
    title: storm.Name,
    tooltipText: getEventClassAlertTooltip(storm.EventClass)
  };
}
function getVolcanoRandomEvent(featureType, eruptionInfo) {
  const featureName = GameInfo.Features.lookup(featureType)?.FeatureType;
  if (featureName) {
    const namedEvent = GameInfo.RandomEvents.find((event) => event.EventClass === "CLASS_VOLCANO" && event.NaturalWonder === featureName);
    if (namedEvent) {
      return namedEvent;
    }
  }
  return GameInfo.RandomEvents.find((event) => event.EventClass === "CLASS_VOLCANO" && !event.NaturalWonder && event.Severity === eruptionInfo?.severity) ?? null;
}
const PlotAlertSection = (props) => {
  const districtHealth = createMemo(() => getDistrictHealthInfo(props.plotCoord));
  const isOccupiedByEnemy = createMemo(() => props.unitEntries.some((unitEntry) => unitEntry.unit.owner !== GameContext.localObserverID && !unitEntry.isCivilian && unitEntry.relationship?.hostile));
  const hasPillagedConstructible = createMemo(() => props.constructibles.some((entry) => entry.damaged));
  const activeStorm = createMemo(() => {
    const stormID = MapStorms.getActiveStormIDAtPlot(props.plotIndex);
    if (!stormID) {
      return null;
    }
    const stormInfo = MapStorms.getStorm(stormID);
    if (!stormInfo?.isActive) {
      return null;
    }
    return GameInfo.RandomEvents.lookup(stormInfo.type);
  });
  const plotEffectAlerts = createMemo(() => {
    const alerts = [];
    const activeStormEventClass = activeStorm()?.EventClass;
    for (const effect of props.plotEffects) {
      if (props.feature.volcano?.eruptionInfo?.isErupting && effect.plotEffectType === "PLOTEFFECT_IS_BURNING") {
        continue;
      }
      if (activeStormEventClass && effect.eventClass === activeStormEventClass) {
        continue;
      }
      const alert = getPlotEffectAlert(effect);
      if (alert) {
        pushUniqueAlert(alerts, alert);
      }
    }
    return alerts;
  });
  const activeStormAlert = createMemo(() => {
    const storm = activeStorm();
    return storm ? getStormAlert(storm) : null;
  });
  const volcanoAlert = createMemo(() => {
    const volcano = props.feature.volcano;
    if (!volcano?.active || !volcano.eruptionInfo?.isErupting) {
      return null;
    }
    const event = getVolcanoRandomEvent(props.feature.type, volcano.eruptionInfo);
    if (!event) {
      return null;
    }
    return {
      title: event.Name,
      tooltipText: getEventClassAlertTooltip("CLASS_VOLCANO")
    };
  });
  const simpleAlerts = createMemo(() => {
    const alerts = [];
    const activeVolcanoAlert = volcanoAlert();
    if (activeVolcanoAlert) {
      pushUniqueAlert(alerts, activeVolcanoAlert);
    }
    for (const alert of plotEffectAlerts()) {
      if (alert.turns == null) {
        pushUniqueAlert(alerts, alert);
      }
    }
    const stormAlert = activeStormAlert();
    if (stormAlert && stormAlert.turns == null) {
      pushUniqueAlert(alerts, stormAlert);
    }
    if (hasPillagedConstructible()) {
      pushUniqueAlert(alerts, {
        title: "LOC_RESOURCE_PILLAGED"
      });
    }
    if (isOccupiedByEnemy()) {
      pushUniqueAlert(alerts, {
        title: "LOC_PLOT_TOOLTIP_ALERT_OCCUPIED"
      });
    }
    return alerts;
  });
  const timedAlerts = createMemo(() => {
    const alerts = [];
    for (const alert of plotEffectAlerts()) {
      if (alert.turns != null) {
        pushUniqueAlert(alerts, alert);
      }
    }
    return alerts;
  });
  const districtHealthAlert = createMemo(() => {
    const health = districtHealth();
    if (!health) {
      return null;
    }
    return {
      title: health.isUnderSiege ? "LOC_PLOT_TOOLTIP_UNDER_SIEGE" : "LOC_PLOT_TOOLTIP_DAMAGED_WALLS",
      currentHealth: health.currentHealth,
      maxHealth: health.maxHealth
    };
  });
  const hasAlerts = createMemo(() => simpleAlerts().length > 0 || timedAlerts().length > 0 || districtHealthAlert() != null);
  return createComponent(Show, {
    get when() {
      return hasAlerts();
    },
    get children() {
      return [createComponent(Show, {
        get when() {
          return simpleAlerts().length > 0;
        },
        get children() {
          return createComponent(TicketSection, {
            name: "PlotAlertSection",
            variant: "negative",
            get children() {
              return createComponent(TicketRow, {
                get icon() {
                  return createComponent(PlotAlertIcon, {});
                },
                get children() {
                  var _el$5 = _tmpl$3(), _el$6 = _el$5.firstChild;
                  insert(_el$6, createComponent(For, {
                    get each() {
                      return simpleAlerts();
                    },
                    children: (alert, index) => [createComponent(Show, {
                      get when() {
                        return index() > 0;
                      },
                      get children() {
                        return _tmpl$4();
                      }
                    }), createComponent(PlotAlertLabel, {
                      alert,
                      "class": "font-title text-sm uppercase",
                      keywordClass: "inline-flex"
                    })]
                  }));
                  return _el$5;
                }
              });
            }
          });
        }
      }), createComponent(For, {
        get each() {
          return timedAlerts();
        },
        children: (alert) => createComponent(TicketSection, {
          name: "PlotTimedAlertSection",
          get variant() {
            return alert.variant ?? "negative";
          },
          get children() {
            return createComponent(TicketRow, {
              get icon() {
                return createComponent(PlotAlertIcon, {
                  get icon() {
                    return alert.icon;
                  }
                });
              },
              get children() {
                var _el$8 = _tmpl$5();
                insert(_el$8, createComponent(PlotAlertLabel, {
                  alert,
                  "class": "font-title text-sm uppercase flex-1",
                  keywordClass: "flex-1"
                }), null);
                insert(_el$8, createComponent(PlotAlertTimer, {
                  get turns() {
                    return alert.turns;
                  }
                }), null);
                return _el$8;
              }
            });
          }
        })
      }), createComponent(Show, {
        get when() {
          return districtHealthAlert();
        },
        children: (healthAlert) => createComponent(TicketSection, {
          name: "PlotDistrictHealthAlertSection",
          variant: "negative",
          get children() {
            return createComponent(TicketRow, {
              get icon() {
                return createComponent(PlotAlertIcon, {});
              },
              get children() {
                return [createComponent(L10n.Stylize, {
                  "class": "font-title text-sm text-accent-1",
                  get text() {
                    return healthAlert().title;
                  }
                }), (() => {
                  var _el$9 = _tmpl$6(), _el$10 = _el$9.firstChild;
                  insert(_el$9, createComponent(Icon, {
                    "class": "size-5 mr-1",
                    name: "DAMAGED"
                  }), _el$10);
                  insert(_el$10, () => `${healthAlert().currentHealth}/${healthAlert().maxHealth}`);
                  return _el$9;
                })()];
              }
            });
          }
        })
      })];
    }
  });
};

export { PlotAlertSection };
//# sourceMappingURL=alerts.js.map
