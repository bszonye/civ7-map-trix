// vim: sw=2 et
import { template, insert, use, spread } from '../../../../core/vendor/solid-js/web/dist/web.js';
import { createSignal, createMemo, createComponent, Show, For, mergeProps, createRenderEffect, splitProps, useContext, createEffect, on, onCleanup, Switch, Match } from '../../../../core/vendor/solid-js/dist/solid.js';
import LensManager from '../../../../core/ui/lenses/lens-manager.js';
import { Icon } from '../../../../core/ui-next/components/icon.js';
import { L10n } from '../../../../core/ui-next/components/l10n.js';
import { TooltipKeyword } from '../../../../core/ui-next/components/tooltip-keyword.js';
import { TooltipModel } from '../../../../core/ui-next/components/tooltip-model.js';
import { TooltipHorizontalPosition, TooltipVerticalPosition, Tooltip, TooltipContext } from '../../../../core/ui-next/components/tooltip.js';
import { TriggerActivationContext, TriggerActivationContextProvider, TriggerType } from '../../../../core/ui-next/components/trigger.js';
import { ComponentRegistry } from '../../../../core/ui-next/services/component-registry.js';
import { FocusManager } from '../../../../core/ui-next/services/focus-manager.js';
import { isFocusable } from '../../../../core/ui-next/services/focus.js';
import { IsMouseActive } from '../../../../core/ui-next/services/input.js';
import { ProductionPanelCategory } from '../../../ui/production-chooser/production-chooser-helpers.js';
// import { PillText, Pill } from '../../components/pills.js';
import { YieldBarEntryStyle, YieldBar } from '../../components/yield-bar.js';
import { PlotAlertSection } from './components/alerts.js';
import { TreasureConvoySection } from './components/treasure-convoy-section.js';
import { UniqueQuarterSection } from './components/unique-quarter-section.js';
import { TicketRow, TicketSection, Divider, EntryDivider } from './components/utility.js';
import { VolcanoSection } from './components/volcano-section.js';
import { PlotTooltipPlayerPortrait } from './player-portrait.js';
import { ProductionTooltip } from '../production-tooltip.js';
import { hasArcheologyData, ArcheologyPlotTooltipContent } from './archeology-content.js';
import { getSettlementName, getOwnerInfo, getResource, getSpecialistDescription, getCurrentAge, getAgelessTypes, getTerrainLabel, getBiomeLabel, getFeatureInfo, getContinentName, getRiverLabel, getConstructibleInfo, getVisiblePlotEffects, getUnitEntries, getPlotYields, getRouteData } from './helpers.js';
import { hasRandomEventData, RandomEventPlotTooltipContent } from './random-event-content.js';
import { hasSettlementRecommendationData, SettlementRecommendationPlotTooltipContent } from './settlement-recommendation-content.js';
import { UnitFlag } from './unit-flag.js';

// TRIX: prevent flicker
Controls.preloadImage(UI.getIcon("ROUTE_ROAD"), "plot-tooltip");
Controls.preloadImage(UI.getIcon("ROUTE_RAILROAD"), "plot-tooltip");

// color palette
const BZ_COLOR = {
    // game colors
    silver: "#4c5366",  // = primary
    bronze: "#e5d2ac",  // = secondary
    primary: "#4c5366",
    primary1: "#8d97a6",
    primary2: "#4c5366",
    primary3: "#333640",
    primary4: "#23252b",
    primary5: "#12151f",
    secondary: "#e5d2ac",
    secondary1: "#e5d2ac",
    secondary2: "#8c7e62",
    secondary3: "#4c473d",
    accent: "#616266",
    accent1: "#e5e5e5",
    accent2: "#c2c4cc",
    accent3: "#9da0a6",
    accent4: "#85878c",
    accent5: "#616266",
    accent6: "#05070d",
    // bronze shades
    bronze1: "#f9ecd2",
    bronze2: "#e5d2ac",  // = secondary1
    bronze3: "#c7b28a",
    bronze4: "#a99670",
    bronze5: "#8c7e62",  // = secondary 2
    bronze6: "#4c473d",  // = secondary 3
    // rules background
    rules: "#8c7e6233",
    // alert colors
    black: "#000000",
    danger: "#af1b1c99",  // danger = militaristic 60% opacity
    caution: "#cea92f",  // caution = healthbar-medium
    note: "#ff800033",  // note = orange 20% opacity
    // geographic colors
    hill: "#ea995266",  // Rough terrain = orange 40% opacity
    aquatic: "#00ffee66",  // Aquaticy = teal 40% opacity
    vegetated: "#aaff0033",  // Vegetated features = green 20% opacity
    wet: "#55ffff33",  // Wet features = teal 20% opacity
    floodplain: "#ff800033",  // Floodplains = orange 20% opacity
    river: "#55aaff66",  // Rivers = azure 40% opacity
    road: "#e5d2accc",  // Roads = bronze 80% opacity
    rail: "#c2c4cccc",  // Railroads = silver 80% opacity
    bridge: "#d4c9c4cc",  // Bridges = warm gray 80% opacity
    // yield types
    food: "#80b34d",        //  90° 40 50 green
    production: "#a33d29",  //  10° 60 40 red
    gold: "#f6ce55",        //  45° 90 65 yellow
    science: "#6ca6e0",     // 210° 65 65 cyan
    culture: "#5c5cd6",     // 240° 60 60 violet
    happiness: "#f5993d",   //  30° 90 60 orange
    diplomacy: "#afb7cf",   // 225° 25 75 gray
    // independent power types
    militaristic: "#af1b1c",
    scientific: "#4d7c96",
    economic: "#ffd553",
    cultural: "#892bb3",
    expansionist: "#00a717",
    diplomatic: "#255be4",
};
const BZ_ALERT = {
    primary: { "background-color": BZ_COLOR.primary, },
    secondary: { "background-color": BZ_COLOR.secondary, color: BZ_COLOR.black, },
    title: { "fxs-font-gradient-color": BZ_COLOR.bronze1, color: BZ_COLOR.bronze2, },
    black: { "background-color": BZ_COLOR.black, },
    danger: { "background-color": BZ_COLOR.danger, },
    enemy: { "background-color": BZ_COLOR.danger, },
    caution: { "background-color": BZ_COLOR.caution, color: BZ_COLOR.black, },
    note: { "background-color": BZ_COLOR.note, },
    DEBUG: { "background-color": "#80808080", },
}
const BZ_STYLE = {
    debug: { "background-color": `${BZ_COLOR.bronze6}99`, },
    // movement & obstacle types
    TERRAIN_HILL: { "background-color": BZ_COLOR.hill, },
    // TERRAIN_OCEAN: {},  // don't need to highlight this
    FEATURE_ATOLL: { "background-color": BZ_COLOR.aquatic, color: BZ_COLOR.accent1, },
    FEATURE_CLASS_FLOODPLAIN:  { "background-color": BZ_COLOR.floodplain, },
    FEATURE_CLASS_VEGETATED: { "background-color": BZ_COLOR.vegetated, },
    // FEATURE_CLASS_WET: { "background-color": BZ_COLOR.wet, },
    FEATURE_MANGROVE: { "background-color": BZ_COLOR.wet, },
    FEATURE_MARSH: { "background-color": BZ_COLOR.wet, },
    FEATURE_TUNDRA_BOG: { "background-color": BZ_COLOR.wet, },
    FEATURE_VOLCANO: BZ_ALERT.caution,
    LOC_VOLCANO_NOT_ACTIVE: BZ_ALERT.note,
    RIVER_MINOR: { "background-color": BZ_COLOR.river, },
    RIVER_NAVIGABLE: { "background-color": BZ_COLOR.river, },
    ROUTE_BRIDGE: { "background-color": BZ_COLOR.bridge, color: BZ_COLOR.black, },
    ROUTE_RAILROAD: { "background-color": BZ_COLOR.rail, color: BZ_COLOR.black, },
    ROUTE_ROAD: { "background-color": BZ_COLOR.road, color: BZ_COLOR.black, },
}

const bzPill = (props) => {
  const [local, other] = splitProps(props, ["class", "color", "backgroundStyle", "children", "icon", "text"]);
  const color = () => local.color ?? "#23252b";
  const backgroundStyle = () => local.backgroundStyle ?? {
    "background-color": color()
  };
  return (() => {
    var _el$ = _tmpl$();
    spread(_el$, mergeProps({
      get ["class"]() {
        return `text-xs min-h-5 px-2 flex items-center rounded-full leading-tight ${local.class ?? ""}`;
      },
      get style() {
        const s = {
          border: "1px solid #53565D",
          ...backgroundStyle()
        };
        return s;
      }
    }, other), false, true);
    insert(_el$, createComponent(Show, {
      get when() {
        return local.icon;
      },
      children: (icon) => createComponent(Icon, {
          "class": "size-5 -ml-0\\.5 mr-0\\.5",
          get name() {
            return icon();
          }
      }),
    }), null);
    insert(_el$, createComponent(L10n.Stylize, {
      get text() {
        return local.text;
      }
    }), null);
    return _el$;
  })();
};

// TRIX: various styling changes
var _tmpl$ = /* @__PURE__ */ template(`<div class="flex flex-row gap-2"></div>`),
  _tmpl$2 = /* @__PURE__ */ template(`<div class="flex items-center"></div>`),
  _tmpl$3 = /* @__PURE__ */ template(`<div></div>`),
  _tmpl$4 = /* @__PURE__ */ template(`<div class="flex flex-row"><span class="font-body text-sm text-accent-3"></span></div>`),
  _tmpl$5 = /* @__PURE__ */ template(`<div class="absolute top-0\\.5 right-2\\.5 size-7 flex items-center justify-center bg-contain bg-center bg-no-repeat"><div class="size-5 bg-contain bg-center bg-no-repeat"></div></div>`),
  _tmpl$6 = /* @__PURE__ */ template(`<div class="flex items-center font-body text-xs text-accent-3"></div>`),
  _tmpl$7 = /* @__PURE__ */ template(`<div class="flex flex-col justify-center grow-0 shrink"></div>`),
  _tmpl$8 = /* @__PURE__ */ template(`<div class="flex flex-row font-title text-sm text-negative"></div>`),
  _tmpl$9 = /* @__PURE__ */ template(`<div class="flex flex-row font-body text-xs text-accent-3"></div>`),
  _tmpl$10 = /* @__PURE__ */ template(`<div class="flex flex-col font-title text-sm text-accent-3"></div>`),
  _tmpl$11 = /* @__PURE__ */ template(`<div class=relative></div>`),
  _tmpl$12 = /* @__PURE__ */ template(`<div class="flex flex-row flex-wrap justify-center mt-1 mb-0\\.5 gap-1\\.5"></div>`);
const _PROTECTED_IMPORTS = [isFocusable];
const [IsPlotTooltipVisible, SetIsPlotTooltipVisible] = createSignal(true);
const ConstructibleRow = (props) => {
  const statusEntryIcons = createMemo(() => {
    const entryIcons = [];
    if (props.constructible.damaged) {
      entryIcons.push({
        icon: "url(blp:fonticon_damaged)"
      });
    }
    if (props.constructible.overbuildable && props.isLocalPlayer) {
      entryIcons.push({
        icon: "url(blp:city_overbuildable)",
        tooltipProps: {
          header: "LOC_PLOT_TOOLTIP_OVERBUILDABLE",
          text: "LOC_PEDIA_CONCEPTS_OVERBUILDABLE_TOOLTIP"
        }
      });
    }
    return entryIcons;
  });
  return createComponent(TicketRow, {
    get icon() {
      return createComponent(Icon, {
        get ["class"]() {
          return props.constructible.isImprovement ? "size-10" : "size-6";
        },
        // TRIX: larger improvement icons
        isUrl: true,
        get name() {
          return props.constructible.icon;
        }
      });
    },
    get children() {
      return [(() => {
        var _el$ = _tmpl$();
        insert(_el$, createComponent(Show, {
          get when() {
            return !props.constructible.isImprovement;
          },
          get fallback() {
            return createComponent(L10n.Stylize, {
              "class": "font-title text-sm",
              get text() {
                return props.constructible.title;
              }
            });
          },
          get children() {
            return createComponent(ProductionTooltip, {
              get type() {
                return props.constructible.type;
              },
              get name() {
                return props.constructible.title;
              },
              get initialVPosition() {
                return TooltipVerticalPosition.BOTTOM;
              },
              get initialHPosition() {
                return TooltipHorizontalPosition.RIGHT;
              },
              allowFlip: true,
              get children() {
                return createComponent(TooltipKeyword, {
                  get children() {
                    return createComponent(L10n.Stylize, {
                      "class": "font-title text-sm",
                      get text() {
                        return props.constructible.title;
                      }
                    });
                  }
                });
              }
            });
          }
        }), null);
        insert(_el$, createComponent(For, {
          get each() {
            return statusEntryIcons();
          },
          children: (entry) => (() => {
            var _el$2 = _tmpl$2();
            insert(_el$2, createComponent(Show, {
              get when() {
                return entry.tooltipProps;
              },
              get fallback() {
                return createComponent(Icon, {
                  isUrl: true,
                  "class": "size-5",
                  get name() {
                    return entry.icon;
                  }
                });
              },
              children: (tooltipProps) => createComponent(Tooltip.Text, mergeProps(tooltipProps, {
                get children() {
                  var _el$3 = _tmpl$3();
                  use(isFocusable, _el$3, () => [true, void 0]);
                  insert(_el$3, createComponent(Icon, {
                    isUrl: true,
                    get name() {
                      return entry.icon;
                    },
                    "class": "size-5"
                  }));
                  return _el$3;
                }
              }))
            }));
            return _el$2;
          })()
        }), null);
        return _el$;
      })(), createComponent(Show, {
        get when() {
          return props.constructible.isWonder && props.constructible.description;
        },
        children: (description) => createComponent(L10n.Stylize, {
          "class": "font-body text-xs text-accent-3",
          // TRIX: resize text
          get text() {
            return description();
          }
        })
      })];
    }
  });
};
const SpecialistsRow = (props) => createComponent(TicketRow, {
  get icon() {
    return createComponent(Icon, {
      "class": "size-6",
      // TRIX: resize icon
      isUrl: true,
      name: "url(blp:specialist_tile_pip_full)"
      // TRIX: better icon
    });
  },
  get children() {
    var _el$4 = _tmpl$4(), _el$5 = _el$4.firstChild;
    insert(_el$4, createComponent(Tooltip.Text, {
      text: "LOC_PEDIA_CONCEPTS_SPECIALIST_TOOLTIP",
      get initialVPosition() {
        return TooltipVerticalPosition.BOTTOM;
      },
      get initialHPosition() {
        return TooltipHorizontalPosition.RIGHT;
      },
      allowFlip: true,
      get children() {
        return createComponent(TooltipKeyword, {
          get children() {
            return createComponent(L10n.Stylize, {
              "class": "font-title text-sm mr-1",
              text: "LOC_PLOT_TOOLTIP_SPECIALISTS"
            });
          }
        });
      }
    }), _el$5);
    insert(_el$5, () => `${props.current}/${props.max}`);
    return _el$4;
  }
});
const PlayerOwnerRow = (props) => {
  const displayName = createMemo(() => {
    if (props.isLocalPlayer) {
      return `{1_Name} ({LOC_PLOT_TOOLTIP_YOU})`;
    }
    return "{1_Name}";
  });
  return [createComponent(TicketRow, {
    "class": "text-sm",
    get icon() {
      return createComponent(PlotTooltipPlayerPortrait, {
        get leaderId() {
          return props.playerId;
        },
        size: 9
      });
    },
    get children() {
      return [createComponent(Show, {
        get when() {
          return props.settlementName;
        },
        children: (settlementName) => createComponent(L10n.Stylize, {
          "class": "font-title uppercase text-secondary",
          get text() {
            return settlementName();
          }
        })
      }), createComponent(L10n.Stylize, {
        "class": "font-body text-xs text-accent-2",
        // TRIX: resize text
        get text() {
          return displayName();
        },
        get args() {
          return [props.civName];
        }
      })];
    }
  }), createComponent(Show, {
    get when() {
      return props.conquerorInfo;
    },
    children: (info) => createComponent(Show, {
      get when() {
        return info().isIndependent;
      },
      get fallback() {
        return createComponent(L10n.Stylize, {
          "class": "font-body text-xs text-accent-3",
          // TRIX: resize text
          text: "{1_Term}: {2_Subject}",
          get args() {
            return ["LOC_PLOT_TOOLTIP_CONQUEROR", info().name];
          }
        });
      },
      get children() {
        return createComponent(L10n.Stylize, {
          "class": "font-body text-xs text-accent-3",
          // TRIX: resize text
          text: "{1_Term}: {2_Subject}",
          args: ["LOC_PLOT_TOOLTIP_CONQUEROR", "LOC_PLOT_TOOLTIP_INDEPENDENT_CONQUEROR"]
        });
      }
    })
  })];
};
const UnitInfoSection = (props) => {
  const flagColor = createMemo(() => {
    const pid = props.unit.owner;
    if (pid == null) return "";
    const playerColor = UI.Color.getPlayerColors(pid);
    if (!playerColor) return "";
    const variants = UI.Color.createPlayerColorVariants(playerColor);
    return variants.primaryColor.moreColor;
  });
  const unitTypeString = createMemo(() => GameInfo.Units.lookup(props.unit.type)?.UnitType);
  const unitIcon = () => createComponent(UnitFlag, {
    get color() {
      return flagColor();
    },
    get unitIcon() {
      return props.unitIcon;
    }
  });
  return createComponent(TicketSection, {
    name: "UnitInfoSection",
    "class": "relative",
    get children() {
      return [(() => {
        var _el$6 = _tmpl$5(), _el$7 = _el$6.firstChild;
        _el$6.style.setProperty("background-image", "url(blp:tooltip_unitIconHolder)");
        createRenderEffect((_$p) => (_$p = props.isCivilian ? "url(blp:action_civilianunits)" : "url(blp:tooltip_unitIcon)") != null ? _el$7.style.setProperty("background-image", _$p) : _el$7.style.removeProperty("background-image"));
        return _el$6;
      })(), createComponent(TicketRow, {
        get icon() {
          return unitIcon();
        },
        get children() {
          return [createComponent(ProductionTooltip, {
            get category() {
              return ProductionPanelCategory.UNITS;
            },
            get type() {
              return unitTypeString();
            },
            get name() {
              return props.unit.name;
            },
            get initialVPosition() {
              return TooltipVerticalPosition.BOTTOM;
            },
            get initialHPosition() {
              return TooltipHorizontalPosition.RIGHT;
            },
            allowFlip: true,
            get children() {
              return createComponent(TooltipKeyword, {
                get children() {
                  return createComponent(L10n.Stylize, {
                    "class": "font-title text-sm break-words pr-4",
                    get text() {
                      return props.unit.name;
                    }
                  });
                }
              });
            }
          }), createComponent(Show, {
            get when() {
              return props.isMinorOrIndependent;
            },
            get children() {
              return createComponent(IndependentUnitInfo, {
                get civName() {
                  return props.civName;
                },
                get relationship() {
                  return props.relationship;
                }
              });
            }
          }), createComponent(Show, {
            get when() {
              return !props.isMinorOrIndependent;
            },
            get children() {
              return createComponent(PlayerUnitInfo, {
                get unit() {
                  return props.unit;
                },
                get isAtWarWithOwner() {
                  return props.isAtWarWithOwner;
                },
                get ownerName() {
                  return props.ownerName;
                },
                get civName() {
                  return props.civName;
                },
                get relationship() {
                  return props.relationship;
                }
              });
            }
          })];
        }
      })];
    }
  });
};
const IndependentUnitInfo = (props) => {
  const needsIndependentWrapper = createMemo(() => props.civName.startsWith("LOC_CIVILIZATION_INDEPENDENT_SINGULAR:"));
  const actualCivName = createMemo(() => needsIndependentWrapper() ? props.civName.split(":")[1] : props.civName);
  return [createComponent(Show, {
    get when() {
      return needsIndependentWrapper();
    },
    get fallback() {
      return createComponent(L10n.Stylize, {
        "class": "font-body text-xs text-accent-3",
        // TRIX: resize text
        get text() {
          return actualCivName();
        }
      });
    },
    get children() {
      return createComponent(L10n.Stylize, {
        "class": "font-body text-xs text-accent-3",
        // TRIX: resize text
        text: "LOC_CIVILIZATION_INDEPENDENT_SINGULAR",
        get args() {
          return [actualCivName()];
        }
      });
    }
  }), createComponent(Show, {
    get when() {
      return props.relationship;
    },
    children: (relationship) => (() => {
      var _el$8 = _tmpl$6();
      insert(_el$8, createComponent(Show, {
        get when() {
          return relationship().hostile;
        },
        get children() {
          return createComponent(Icon, {
            "class": "size-5 mr-1",
            name: "WAR"
          });
        }
      }), null);
      insert(_el$8, createComponent(L10n.Compose, {
        get text() {
          return relationship().name;
        }
      }), null);
      return _el$8;
    })()
  })];
};
const PlayerUnitInfo = (props) => {
  const civName = createComponent(Show, {
    get when() {
      return props.unit.owner === GameContext.localObserverID;
    },
    get fallback() {
      return createComponent(L10n.Stylize, {
        "class": "font-body text-xs text-accent-3",
        // TRIX: resize text
        get text() {
          return props.civName;
        }
      });
    },
    get children() {
      return createComponent(L10n.Stylize, {
        "class": "font-body text-xs text-accent-3",
        // TRIX: resize text
        text: "{1_Name} ({LOC_PLOT_TOOLTIP_YOU})",
        get args() {
          return [props.civName];
        }
      });
    }
  });
  return [createComponent(Show, {
    get when() {
      return props.relationship;
    },
    get children() {
      var _el$9 = _tmpl$6();
      insert(_el$9, createComponent(Show, {
        get when() {
          return props.relationship?.hostile;
        },
        get children() {
          return createComponent(Icon, {
            "class": "size-5 mr-1",
            name: "WAR"
          });
        }
      }), null);
      insert(_el$9, civName, null);
      return _el$9;
    }
  }), createComponent(Show, {
    get when() {
      return !props.relationship;
    },
    children: civName
  })];
};
const ResourceInfoRow = (props) => {
  const iconCSS = createMemo(() => UI.getIconCSS(props.resource.ResourceType));
  return [createComponent(Show, {
    get when() {
      return props.showHeaderDivider;
    },
    get children() {
      return createComponent(Divider, {});
    }
  }), createComponent(TicketRow, {
    get icon() {
      return createComponent(Icon, {
        "class": "size-10",
        // TRIX
        // "class": "size-7",
        isUrl: true,
        get name() {
          return iconCSS();
        }
      });
    },
    get children() {
      var _el$10 = _tmpl$7();
      insert(_el$10, createComponent(L10n.Stylize, {
        "class": "font-title text-sm uppercase text-secondary",
        // TRIX: add color
        get text() {
          return props.resource.Name;
        }
      }), null);
      insert(_el$10, createComponent(L10n.Stylize, {
        // TRIX: add font styling
        "class": "font-body text-xs text-accent-3",
        get text() {
          return props.resource.Tooltip;
        }
      }), null);
      return _el$10;
    }
  })];
};
const DebugInfoSection = (props) => {
  const hasHealth = () => props.currentHealth != null && props.maxHealth != null && props.currentHealth !== 0 && props.maxHealth !== 0;
  return createComponent(TicketSection, {
    name: "DebugInfoSection",
    get children() {
      return createComponent(TicketRow, {
        get children() {
          return [(() => {
            var _el$11 = _tmpl$8();
            insert(_el$11, createComponent(L10n.Compose, {
              text: "LOC_PLOT_TOOLTIP_DEBUG_TITLE"
            }), null);
            insert(_el$11, createComponent(Show, {
              get when() {
                return hasHealth();
              },
              fallback: ":",
              get children() {
                return `: ${props.currentHealth} / ${props.maxHealth}`;
              }
            }), null);
            return _el$11;
          })(), (() => {
            var _el$12 = _tmpl$9();
            insert(_el$12, createComponent(L10n.Compose, {
              text: "LOC_PLOT_TOOLTIP_PLOT"
            }), null);
            insert(_el$12, () => `: (${props.plotCoord.x},${props.plotCoord.y})`, null);
            return _el$12;
          })(), (() => {
            var _el$13 = _tmpl$9();
            insert(_el$13, createComponent(L10n.Compose, {
              text: "LOC_PLOT_TOOLTIP_INDEX"
            }), null);
            insert(_el$13, () => `: ${props.plotIndex}`, null);
            return _el$13;
          })()];
        }
      });
    }
  });
};
const ConstructibleRows = (props) => {
  const uniqueQuarterInfo = createMemo(() => {
    if (!props.district?.isUniqueQuarter || props.constructibles.length === 0) return null;
    const uniqueQuarterConstructible = props.constructibles.find((c) => c.uniqueQuarterType != UniqueQuarterTypes.NO_QUARTER);
    if (uniqueQuarterConstructible) {
      return GameInfo.UniqueQuarters.lookup(uniqueQuarterConstructible.uniqueQuarterType);
    }
    return null;
  });
  const uniqueQuarterBuildings = createMemo(() => props.constructibles.filter((c) => c.uniqueQuarterType != UniqueQuarterTypes.NO_QUARTER));
  const otherConstructibles = createMemo(() => uniqueQuarterInfo() ? props.constructibles.filter((c) => c.uniqueQuarterType == UniqueQuarterTypes.NO_QUARTER) : props.constructibles);
  const hasContent = () => props.constructibles.length > 0 || props.freeImprovement != null;
  return createComponent(Show, {
    get when() {
      return hasContent();
    },
    get children() {
      return [createComponent(Show, {
        get when() {
          return props.constructibles.length > 0;
        },
        get children() {
          return [createComponent(Show, {
            get when() {
              return uniqueQuarterInfo();
            },
            children: (info) => [createComponent(Show, {
              get when() {
                return props.showTopDivider;
              },
              get children() {
                return createComponent(EntryDivider, {});
              }
            }), createComponent(UniqueQuarterSection, {
              get definition() {
                return info();
              },
              get buildings() {
                return uniqueQuarterBuildings();
              }
            })]
          }), createComponent(For, {
            get each() {
              return otherConstructibles();
            },
            children: (constructible, index) => [createComponent(Show, {
              get when() {
                return index() > 0 || !!uniqueQuarterInfo() || !!props.showTopDivider && index() === 0;
              },
              get children() {
                return createComponent(EntryDivider, {});
              }
            }), createComponent(ConstructibleRow, {
              constructible,
              get isLocalPlayer() {
                return props.isLocalPlayer;
              }
            })]
          })];
        }
      }), createComponent(Show, {
        get when() {
          // TRIX: show warehouse bonuses for unique improvements
          const type = props.freeImprovement?.type;
          if (!type || props.constructibles.find(c => c.type == type)) return void 0;
          return props.freeImprovement;
        },
        children: (freeInfo) => [createComponent(Show, {
          get when() {
            return props.constructibles.length > 0 || !!uniqueQuarterInfo() || !!props.showTopDivider;
          },
          get children() {
            return createComponent(EntryDivider, {});
          }
        }), createComponent(TicketRow, {
          get icon() {
            return createComponent(Icon, {
              get ["class"]() {
                return props.constructibles.length ? "size-10" : "size-10 opacity-50";
              },
              isUrl: true,
              get name() {
                return freeInfo().icon;
              }
            });
          },
          get children() {
            // TRIX: show warehouse bonuses for unique improvements
            var _el$14 = _tmpl$10();
            insert(_el$14, createComponent(L10n.Stylize, {
              "class": "font-body text-2xs text-accent-2",
              get text() {
                return props.constructibles.length ?
                  "LOC_ATTR_YIELD_FROM_WAREHOUSES" :
                  "LOC_PLOT_TOOLTIP_GROWTH_IMPROVEMENT_PREFIX_ONLY";
              }
            }), null);
            insert(_el$14, createComponent(L10n.Compose, {
              get text() {
                return freeInfo().name;
              }
            }), null);
            return _el$14;
          }
        })]
      })];
    }
  });
};
const PlotDetailsSection = (props) => {
  const localPlayer = Players.get(GameContext.localObserverID);
  const settlementName = createMemo(() => getSettlementName(props.owningCity));
  const ownerInfo = createMemo(() => getOwnerInfo(props.plotCoord, props.owningPlayer));
  const hexResource = createMemo(() => getResource(props.plotCoord));
  const isDistantLands = createMemo(() => localPlayer.isDistantLands(props.plotCoord) ?? false);
  const freeImprovement = createMemo(() => {
    // if (props.constructibles.length > 0) {
    //   return null;
    // }
    // TRIX: unique improvements need this to show warehouse bonuses
    const currentDistrict = props.district;
    if (currentDistrict !== null && currentDistrict.type !== DistrictTypes.RURAL && currentDistrict.type !== DistrictTypes.WILDERNESS) {
      return null;
    }
    const freeConstructible = Districts.getFreeConstructible(props.plotCoord, GameContext.localPlayerID);
    if (freeConstructible === -1) {
      return null;
    }
    const info = GameInfo.Constructibles.lookup(freeConstructible);
    if (!info) {
      return null;
    }
    return {
      name: info.Name,
      icon: UI.getIconCSS(info.ConstructibleType),
      type: info.ConstructibleType
    };
  });
  const hasConstructiblesContent = createMemo(() => {
    return props.constructibles.length > 0 || freeImprovement() != null;
  });
  const specialistDesc = createMemo(() => getSpecialistDescription(props.plotCoord, props.owningCity));
  const specialistsAssigned = createMemo(() => {
    const specialist = specialistDesc();
    if (!specialist || specialist.args.length < 2) return null;
    const current = Number(specialist.args[0]);
    const max = Number(specialist.args[1]);
    if (Number.isNaN(current) || Number.isNaN(max) || max <= 0) return null;
    return {
      current,
      max
    };
  });
  const hasOwnerRow = createMemo(() => {
    const info = ownerInfo();
    return !!info && !info.isIndependent;
  });
  const hasTopContent = createMemo(() => hasOwnerRow());
  const hasContent = createMemo(() => {
    return hasOwnerRow() || !!hexResource() || hasConstructiblesContent() || !!specialistsAssigned();
  });
  return createComponent(Show, {
    get when() {
      return hasContent();
    },
    get children() {
      return createComponent(TicketSection, {
        name: "PlotDetailsSection",
        get children() {
          return [createComponent(Show, {
            get when() {
              return ownerInfo();
            },
            children: (info) => createComponent(Show, {
              get when() {
                return !info().isIndependent;
              },
              get children() {
                return createComponent(PlayerOwnerRow, {
                  get playerName() {
                    return info().playerName;
                  },
                  get civName() {
                    return info().civName;
                  },
                  get isLocalPlayer() {
                    return props.owningPlayer === GameContext.localPlayerID;
                  },
                  get playerId() {
                    return info().suzerainId ?? props.owningPlayer;
                  },
                  get settlementName() {
                    return settlementName();
                  },
                  get conquerorInfo() {
                    return info().conquerorInfo;
                  }
                });
              }
            })
          }), createComponent(Show, {
            get when() {
              return hexResource();
            },
            children: (resource) => [createComponent(Show, {
              get when() {
                return hasTopContent();
              },
              get children() {
                return createComponent(EntryDivider, {});
              }
            }), createComponent(ResourceInfoRow, {
              get resource() {
                return resource();
              },
              get isDistantLands() {
                return isDistantLands();
              }
            })]
          }), createComponent(Show, {
            get when() {
              return hasConstructiblesContent();
            },
            get children() {
              return createComponent(ConstructibleRows, {
                get constructibles() {
                  // TRIX: sort walls last
                  props.constructibles.sort((a, b) => {
                    const adef = GameInfo.Constructibles.lookup(a.type);
                    const bdef = GameInfo.Constructibles.lookup(b.type);
                    const awall = adef?.ExistingDistrictOnly ?? false;
                    const bwall = bdef?.ExistingDistrictOnly ?? false;
                    return +(awall) - +(bwall);
                  });
                  return props.constructibles;
                },
                get district() {
                  return props.district;
                },
                get freeImprovement() {
                  return freeImprovement();
                },
                get showTopDivider() {
                  return hasTopContent() || !!hexResource();
                },
                get isLocalPlayer() {
                  return props.owningPlayer === GameContext.localPlayerID;
                }
              });
            }
          }), createComponent(Show, {
            get when() {
              return specialistsAssigned();
            },
            children: (specialistsAssigned2) => [createComponent(Show, {
              get when() {
                return hasTopContent() || !!hexResource() || hasConstructiblesContent();
              },
              get children() {
                return createComponent(EntryDivider, {});
              }
            }), createComponent(SpecialistsRow, {
              get current() {
                return specialistsAssigned2().current;
              },
              get max() {
                return specialistsAssigned2().max;
              }
            })]
          })];
        }
      });
    }
  });
};
const PlotTooltipContent = (props) => {
  const [local, other] = splitProps(props, ["plotCoord", "showDebug", "class", "owningCity"]);
  const isShowingDebug = createMemo(() => local.showDebug ?? UI.isDebugPlotInfoVisible());
  const currentAge = createMemo(() => getCurrentAge());
  const agelessTypes = createMemo(() => getAgelessTypes());
  const plotIndex = createMemo(() => GameplayMap.getIndexFromLocation(local.plotCoord));
  const terrainLabel = createMemo(() => getTerrainLabel(local.plotCoord, isShowingDebug()));
  const biomeLabel = createMemo(() => getBiomeLabel(local.plotCoord, isShowingDebug()));
  const feature = createMemo(() => getFeatureInfo(local.plotCoord, plotIndex()));
  const continentName = createMemo(() => getContinentName(local.plotCoord));
  const riverLabel = createMemo(() => getRiverLabel(local.plotCoord));
  const playerID = createMemo(() => GameplayMap.getOwner(local.plotCoord.x, local.plotCoord.y));
  const localPlayer = Players.get(GameContext.localObserverID);
  const isDistantLands = createMemo(() => localPlayer.isDistantLands(local.plotCoord) ?? false);
  const district = createMemo(() => Districts.getAtLocation(props.plotCoord));
  const overbuildableConstructibles = createMemo(() => district()?.getOverbuildableConstructibleTypes() ?? []);
  const constructibles = createMemo(() => {
    const plotConstructibles = MapConstructibles.getHiddenFilteredConstructibles(local.plotCoord.x, local.plotCoord.y);
    return plotConstructibles.map((c) => getConstructibleInfo(c, local.plotCoord, currentAge(), agelessTypes(), overbuildableConstructibles())).filter((c) => c != null).sort((a, b) => a.sortOrder - b.sortOrder);
  });
  const hexTreasureResource = createMemo(() => getResource(local.plotCoord));
  const plotEffects = createMemo(() => getVisiblePlotEffects(plotIndex()));
  const unitEntries = createMemo(() => getUnitEntries(local.plotCoord, localPlayer));
  const terrainType = createMemo(() => GameplayMap.getTerrainType(local.plotCoord.x, local.plotCoord.y));
  const featureType = createMemo(() => GameplayMap.getFeatureType(local.plotCoord.x, local.plotCoord.y));
  const oceanTerrainType = GameInfo.Terrains.find((t) => t.TerrainType === "TERRAIN_OCEAN")?.$index;
  const isOcean = createMemo(() => terrainType() === oceanTerrainType);
  const isMountain = createMemo(() => GameplayMap.isMountain(local.plotCoord.x, local.plotCoord.y));
  // TRIX: get fresh water status
  const isFreshWater = createMemo(() => GameplayMap.isFreshWater(local.plotCoord.x, local.plotCoord.y));  // TRIX
  const oceanFreeConstructible = createMemo(() => {
    if (!isOcean()) {
      return -1;
    }
    return Districts.getFreeConstructible(local.plotCoord, GameContext.localPlayerID);
  });
  const mountainFreeConstructible = createMemo(() => {
    if (!isMountain()) {
      return -1;
    }
    return Districts.getFreeConstructible(local.plotCoord, GameContext.localPlayerID);
  });
  const shouldShowOceanYields = createMemo(() => {
    if (!isOcean()) {
      return true;
    }
    return constructibles().length > 0 || oceanFreeConstructible() !== -1;
  });
  const shouldShowMountainYields = createMemo(() => {
    if (!isMountain()) {
      return true;
    }
    return constructibles().length > 0 || mountainFreeConstructible() !== -1;
  });
  // TRIX: enable terrain highlighting
  const terrainDefinition = createMemo(() => GameInfo.Terrains.lookup(terrainType()));
  const featureDefinition = createMemo(() => GameInfo.Features.lookup(featureType()));
  const districtKeyword = createMemo(() => {
    const districtType = district() ? GameInfo.Districts.lookup(district().type)?.DistrictType : void 0;
    switch (districtType) {
      case "DISTRICT_CITY_CENTER":  // TRIX
      case "DISTRICT_URBAN":
        return "LOC_PLOT_TOOLTIP_URBAN_DISTRICT";
      case "DISTRICT_RURAL":
        return "LOC_PLOT_TOOLTIP_RURAL_DISTRICT";
      default:
        return void 0;
    }
  });
  const quarterKeyword = createMemo(() => district()?.isQuarter ? "LOC_PLOT_TOOLTIP_QUARTER" : void 0);
  // TRIX: define this earlier for use in keywordPills
  const route = createMemo(() => getRouteData(local.plotCoord));
  const yields = createMemo(() => {
    if (!shouldShowOceanYields() || !shouldShowMountainYields()) {
      return [];
    }
    return getPlotYields(local.plotCoord, playerID());
  });
  const yieldBarData = createMemo(() => yields().map((yieldInfo) => ({
    type: yieldInfo.yieldType,
    value: yieldInfo.amount,
    style: YieldBarEntryStyle.NONE,
    iconContext: "YIELD"
  })));
  const totalYields = createMemo(() => yields().reduce((sum, y) => sum + y.amount, 0));
  const keywordPills = createMemo(() => {
    const pills = [];
    if (BZ_STYLE[terrainDefinition().TerrainType] != null) {
      const style = BZ_STYLE[terrainDefinition().TerrainType];
      const text = terrainDefinition().Name;
      pills.push({ style, text });
    }
    if (feature().label && !feature().isNaturalWonder && !feature().volcano) {
      console.warn(`TRIX ${JSON.stringify(featureDefinition())}`);
      const style =
        BZ_STYLE[featureDefinition().FeatureType] ??
        BZ_STYLE[featureDefinition().FeatureClassType];
      const label = feature().label;
      const text = Locale.compose(label).replace(/\s*\(.*\)|\s*（.*）/, "");
      pills.push({ style, text });
    }
    if ((featureDefinition()?.SightThroughModifier ?? 0) < 0) {
      // TRIX: check for nonzero instead of negative values?
      const style = BZ_STYLE[featureDefinition().FeatureClassType] ?? BZ_ALERT.note;
      const text = "LOC_PLOT_TOOLTIP_BLOCKS_SIGHT";
      pills.push({ style, text });
    }
    if ((featureDefinition()?.MovementChange ?? 0) < 0) {
      pills.push("LOC_PLOT_TOOLTIP_ENDS_MOVEMENT");
    }
    // TRIX: add Fresh Water pill
    if (isFreshWater()) {
      if (playerID() == -1 || district()?.type == Game.getHash("DISTRICT_CITY_CENTER")) {
        pills.push("LOC_PLOTKEY_FRESHWATER");
      }
    }
    if (districtKeyword()) {
      pills.push(districtKeyword());
    }
    if (quarterKeyword()) {
      pills.push(quarterKeyword());
    }
    // TRIX: move route pill into keywordPills
    if (route()) {
      // const style = BZ_STYLE[route().type];
      const icon = route().type;
      const text = route().name;
      pills.push({ icon, text });
    }
    return pills;
  });
  const debugHealthInfo = createMemo(() => {
    const ph = Players.Districts.get(playerID())?.getDistrictHealth(local.plotCoord);
    const mh = Players.Districts.get(playerID())?.getDistrictMaxHealth(local.plotCoord);
    return {
      current: ph,
      max: mh
    };
  });
  const firstLineText = createMemo(() => {
    if (biomeLabel()) {
      return "LOC_PLOT_TOOLTIP_TERRAIN_WITH_BIOME";
    }
    return terrainLabel();
  });
  const firstLineArgs = createMemo(() => {
    if (biomeLabel()) {
      return [terrainLabel(), biomeLabel()];
    }
    return [];
  });
  const landsLabel = createMemo(() => !isOcean() ? isDistantLands() ? "LOC_PLOT_TOOLTIP_HEMISPHERE_WEST" : "LOC_PLOT_TOOLTIP_HEMISPHERE_EAST" : "");
  const subheaderText = createMemo(() => {
    const parts = [];
    if (riverLabel()) parts.push(riverLabel());
    if (continentName()) parts.push(continentName());
    if (landsLabel()) parts.push(landsLabel());
    return parts.map((part) => Locale.compose(part)).join(", ");
  });
  return (() => {
    var _el$15 = _tmpl$3();
    spread(_el$15, mergeProps({
      get ["class"]() {
        return `w-auto min-w-62 max-w-84 self-start text-sm ${local.class ?? ""}`;
      }
    }, other), false, true);
    insert(_el$15, createComponent(Show, {
      get when() {
        return biomeLabel();
      },
      get fallback() {
        return createComponent(L10n.Stylize, {
          "class": "text-secondary text-center uppercase font-title",
          get text() {
            return terrainLabel();
          }
        });
      },
      get children() {
        return createComponent(L10n.Stylize, {
          "class": "text-secondary text-center uppercase font-title",
          get text() {
            return firstLineText();
          },
          get args() {
            return firstLineArgs();
          }
        });
      }
    }), null);
    insert(_el$15, createComponent(Show, {
      get when() {
        return subheaderText();
      },
      get children() {
        var _el$16 = _tmpl$11();
        insert(_el$16, createComponent(L10n.Stylize, {
          "class": "text-2xs text-center",
          // TRIX: resize text
          style: {
            "line-height": "1.25"
            // TRIX: shrink subheader
          },
          get text() {
            return subheaderText();
          }
        }));
        return _el$16;
      }
    }), null);
    insert(_el$15, createComponent(Show, {
      get when() {
        return keywordPills().length;
        // TRIX: move route pill into keywordPills
      },
      get children() {
        var _el$17 = _tmpl$12();
        insert(_el$17, createComponent(For, {
          get each() {
            return keywordPills();
          },
          children: (keyword) => createComponent(bzPill, {
            color: keyword.color,
            backgroundStyle: keyword.style,
            icon: keyword.icon,
            text: keyword.text ?? keyword,
          })
        }), null);
        return _el$17;
      }
    }), null);
    insert(_el$15, createComponent(PlotAlertSection, {
      get plotCoord() {
        return local.plotCoord;
      },
      get plotIndex() {
        return plotIndex();
      },
      get feature() {
        return feature();
      },
      get plotEffects() {
        return plotEffects();
      },
      get constructibles() {
        return constructibles();
      },
      get unitEntries() {
        return unitEntries();
      }
    }), null);
    insert(_el$15, createComponent(Show, {
      get when() {
        return createMemo(() => !!(hexTreasureResource()?.ResourceClassType === "RESOURCECLASS_TREASURE" && local.owningCity != null))() && isDistantLands();
      },
      get children() {
        return createComponent(TreasureConvoySection, {
          get owningCity() {
            return local.owningCity;
          },
          get isDistantLands() {
            return isDistantLands();
          }
        });
      }
    }), null);
    insert(_el$15, createComponent(Show, {
      get when() {
        return feature().volcano;
      },
      children: (volcano) => createComponent(VolcanoSection, {
        get volcano() {
          return volcano();
        }
      })
    }), null);
    insert(_el$15, createComponent(Show, {
      get when() {
        return feature().isNaturalWonder;
      },
      get children() {
        return createComponent(TicketSection, {
          name: "NaturalWonderSection",
          get children() {
            return createComponent(TicketRow, {
              get icon() {
                return createComponent(Icon, {
                  "class": "size-8",
                  name: "url(blp:generic_natural_wonder)",
                  isUrl: true
                });
              },
              get children() {
                return [createComponent(L10n.Stylize, {
                  "class": "font-title text-sm uppercase text-secondary",
                  get text() {
                    return feature().label;
                  }
                }), createComponent(L10n.Stylize, {
                  "class": "font-body text-xs",
                  // TRIX: resize text
                  text: "LOC_PLOT_TOOLTIP_NATURAL_WONDER"
                }), createComponent(L10n.Stylize, {
                  "class": "font-body text-xs",
                  // TRIX: resize text
                  get text() {
                    return feature().tooltip;
                  }
                })];
              }
            });
          }
        });
      }
    }), null);
    insert(_el$15, createComponent(PlotDetailsSection, {
      get plotCoord() {
        return local.plotCoord;
      },
      get owningPlayer() {
        return playerID();
      },
      get owningCity() {
        return local.owningCity;
      },
      get constructibles() {
        return constructibles();
      },
      get district() {
        return district();
      }
    }), null);
    insert(_el$15, createComponent(For, {
      get each() {
        return unitEntries();
      },
      children: (info) => createComponent(UnitInfoSection, info)
    }), null);
    insert(_el$15, createComponent(Show, {
      get when() {
        return yieldBarData().length > 0;
      },
      get children() {
        return [createComponent(YieldBar, {
          get yieldBarData() {
            return yieldBarData();
          },
          variant: "compact",
          "class": "grow flex-wrap justify-center mt-1\\.5 mb-1"
          // TRIX: adjust whitespace
        }), createComponent(Show, {
          get when() {
            return totalYields() > 0;
          },
          get children() {
            return createComponent(L10n.Stylize, {
              "class": "text-xs text-center",
              // TRIX: resize text
              text: "LOC_PLOT_TOTAL_YIELDS",
              get args() {
                return [Locale.toNumber(totalYields(), "0.0")];
              }
            });
          }
        })];
      }
    }), null);
    insert(_el$15, createComponent(Show, {
      get when() {
        return isShowingDebug();
      },
      get children() {
        return createComponent(DebugInfoSection, {
          get plotCoord() {
            return local.plotCoord;
          },
          get plotIndex() {
            return plotIndex();
          },
          get currentHealth() {
            return debugHealthInfo().current;
          },
          get maxHealth() {
            return debugHealthInfo().max;
          }
        });
      }
    }), null);
    return _el$15;
  })();
};
const cameraPanActions = /* @__PURE__ */ new Set(["mousebutton-left", "keyboard-nav-up", "keyboard-nav-down", "keyboard-nav-left", "keyboard-nav-right", "camera-pan", "touch-pan"]);
// TRIX: add mouse button to camera pan actions
function getPlotTooltipKind(plotCoord) {
  const activeLens = LensManager.getActiveLens();
  if (activeLens === "fxs-settler-lens") {
    if (hasSettlementRecommendationData(plotCoord)) {
      return "settlement-recommendation";
    }
    if (hasRandomEventData(plotCoord)) {
      return "random-event";
    }
  }
  if (activeLens === "fxs-continent-lens" && hasArcheologyData(plotCoord)) {
    return "archeology";
  }
  return "default";
}
const PlotTooltipComponent = (props) => {
  const [local, other] = splitProps(props, ["showDebug", "class"]);
  const [plotCoords, setPlotCoords] = createSignal();
  const owningCity = createMemo(() => {
    const coord = plotCoords();
    if (!coord) return null;
    const cityId = GameplayMap.getOwningCityFromXY(coord.x, coord.y);
    return cityId ? Cities.get(cityId) : null;
  });
  return createComponent(Tooltip, mergeProps({
    get initialVPosition() {
      return TooltipVerticalPosition.BOTTOM;
    },
    get initialHPosition() {
      return TooltipHorizontalPosition.RIGHT;
    },
    offset: 22,
    allowFlip: true
  }, other, {
    children: () => {
      const tooltipModel = TooltipModel.get();
      const focusManager = FocusManager.get();
      const parentContext = useContext(TriggerActivationContext);
      const tooltipContext = useContext(TooltipContext);
      if (!tooltipContext) {
        throw new Error("PlotTooltipTrigger must be used within a <Tooltip> root component");
      }
      const [isWorldDragging, setIsWorldDragging] = createSignal(false);
      const reactiveName = createMemo(() => tooltipContext.name);
      const triggerContext = new TriggerActivationContextProvider(tooltipModel, parentContext, reactiveName);
      tooltipContext.setTriggerContext(triggerContext);
      let tooltipDelayHandle;
      const clearTooltipDelay = () => {
        if (tooltipDelayHandle !== void 0) {
          clearTimeout(tooltipDelayHandle);
          tooltipDelayHandle = void 0;
        }
      };
      const hidePlotTooltip = () => {
        if (tooltipModel.isLocked(tooltipContext.name)) {
          return;
        }
        clearTooltipDelay();
        tooltipModel.triggerTooltip(tooltipContext.name, TriggerType.Blur, void 0);
      };
      const triggerWithDelay = (plotCoords2) => {
        clearTooltipDelay();
        const activeTooltips = tooltipModel.active();
        const delay = activeTooltips.length === 0 ? Configuration.getUser().plotTooltipDelay : 0;
        if (delay <= 0) {
          tooltipModel.triggerTooltip(tooltipContext.name, TriggerType.Focus, plotCoords2);
          return;
        }
        tooltipDelayHandle = window.setTimeout(() => {
          tooltipDelayHandle = void 0;
          tooltipModel.triggerTooltip(tooltipContext.name, TriggerType.Focus, plotCoords2);
        }, delay);
      };
      const trySetPlotCoords = (incomingPlotCoords) => {
        const currentPlotCoord = plotCoords();
        if (incomingPlotCoords?.x === currentPlotCoord?.x && incomingPlotCoords?.y === currentPlotCoord?.y) {
          return;
        }
        if (tooltipModel.isLocked(tooltipContext.name)) {
          return;
        }
        setPlotCoords(incomingPlotCoords);
      };
      const onCursorUpdated = (event) => {
        trySetPlotCoords(event.detail.plot ?? void 0);
      };
      const onPlotCursorCoordsUpdated = (event) => {
        trySetPlotCoords(event.detail.plotCoords ?? void 0);
      };
      const onInputAction = (name, status) => {
        if (cameraPanActions.has(name)) {
          if (status === InputActionStatuses.START) {
            setIsWorldDragging(true);
          } else if (status === InputActionStatuses.FINISH) {
            setIsWorldDragging(false);
          }
        }
      };
      const isRevealed = createMemo(() => {
        const currentPlotCoords = plotCoords();
        if (!currentPlotCoords) return false;
        const revealedState = GameplayMap.getRevealedState(GameContext.localPlayerID, currentPlotCoords.x, currentPlotCoords.y);
        return revealedState !== RevealedStates.HIDDEN;
      });
      const isWorldFocused = createMemo(() => {
        return focusManager.activeElement() === document.body;
      });
      createEffect(on([plotCoords, IsPlotTooltipVisible, isWorldFocused, isRevealed, isWorldDragging], ([currentPlotCoords, isVisible, currentIsWorldFocused, revealed, currentIsWorldDragging], _prevValues) => {
        if (!currentPlotCoords || !isVisible || !currentIsWorldFocused || !revealed || currentIsWorldDragging) {
          hidePlotTooltip();
        } else {
          // const prevPlotCoord = prevValues?.[0];
          // if (currentPlotCoords.x !== prevPlotCoord?.x || currentPlotCoords.y !== prevPlotCoord?.y) {
          //   triggerContext.trigger(TriggerType.Blur, void 0);
          // }
          // TRIX: skip this for smooth tile transitions
          triggerWithDelay(currentPlotCoords);
        }
      }));
      createEffect(() => {
        if (IsMouseActive()) {
          window.addEventListener("cursor-updated", onCursorUpdated);
          onCleanup(() => {
            window.removeEventListener("cursor-updated", onCursorUpdated);
          });
        } else {
          window.addEventListener("plot-cursor-coords-updated", onPlotCursorCoordsUpdated);
          onCleanup(() => {
            window.removeEventListener("plot-cursor-coords-updated", onPlotCursorCoordsUpdated);
          });
        }
      });
      engine.on("InputAction", onInputAction);
      onCleanup(() => {
        clearTooltipDelay();
        window.removeEventListener("cursor-updated", onCursorUpdated);
        window.removeEventListener("plot-cursor-coords-updated", onPlotCursorCoordsUpdated);
        engine.off("InputAction", onInputAction);
      });
      return createComponent(TriggerActivationContext.Provider, {
        value: triggerContext,
        get children() {
          return createComponent(Tooltip.Content, {
            get ["class"]() {
              return local.class;
            },
            get children() {
              return createComponent(Show, {
                get when() {
                  return plotCoords();
                },
                children: (currentPlotCoords) => {
                  const tooltipKind = createMemo(() => getPlotTooltipKind(currentPlotCoords()));
                  return createComponent(Tooltip.Frame, {
                    "class": "relative flex flex-col",
                    get children() {
                      return createComponent(Switch, {
                        get fallback() {
                          return createComponent(PlotTooltipContent, {
                            get plotCoord() {
                              return currentPlotCoords();
                            },
                            get showDebug() {
                              return local.showDebug;
                            },
                            get owningCity() {
                              return owningCity();
                            }
                          });
                        },
                        get children() {
                          return [createComponent(Match, {
                            get when() {
                              return tooltipKind() === "settlement-recommendation";
                            },
                            get children() {
                              return createComponent(SettlementRecommendationPlotTooltipContent, {
                                get plotCoord() {
                                  return currentPlotCoords();
                                },
                                get showDebug() {
                                  return local.showDebug;
                                },
                                get owningCity() {
                                  return owningCity();
                                }
                              });
                            }
                          }), createComponent(Match, {
                            get when() {
                              return tooltipKind() === "random-event";
                            },
                            get children() {
                              return createComponent(RandomEventPlotTooltipContent, {
                                get plotCoord() {
                                  return currentPlotCoords();
                                },
                                get showDebug() {
                                  return local.showDebug;
                                },
                                get owningCity() {
                                  return owningCity();
                                }
                              });
                            }
                          }), createComponent(Match, {
                            get when() {
                              return tooltipKind() === "archeology";
                            },
                            get children() {
                              return createComponent(ArcheologyPlotTooltipContent, {
                                get plotCoord() {
                                  return currentPlotCoords();
                                },
                                get showDebug() {
                                  return local.showDebug;
                                },
                                get owningCity() {
                                  return owningCity();
                                }
                              });
                            }
                          })];
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  }));
};
const PlotTooltip = ComponentRegistry.register({
  name: "PlotTooltip",
  createInstance: PlotTooltipComponent
});

export { IsPlotTooltipVisible, PlotTooltip, PlotTooltipContent, SetIsPlotTooltipVisible };
//# sourceMappingURL=plot-tooltip.js.map
