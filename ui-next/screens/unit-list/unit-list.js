import { template, insert, className, addEventListener } from '../../../../core/vendor/solid-js/web/dist/web.js';
import { createSignal, createEffect, createComponent, createMemo, Show, createRenderEffect, For, onMount, onCleanup } from '../../../../core/vendor/solid-js/dist/solid.js';
import { ContextManager } from '../../../../core/ui/context-manager/context-manager.js';
import { InputEngineEventName, NavigateInputEventName } from '../../../../core/ui/input/input-support.js';
import LensManager from '../../../../core/ui/lenses/lens-manager.js';
import { SocialPanelOpenEventName } from '../../../../core/ui/shell/mp-staging/mp-friends.js';
import { ComponentID } from '../../../../core/ui/utilities/utilities-component-id.js';
import { Layout } from '../../../../core/ui/utilities/utilities-layout.js';
import { Activatable } from '../../../../core/ui-next/components/activatable.js';
import { AudioContextProvider } from '../../../../core/ui-next/components/audio-context-provider.js';
import { CollapsibleContainer } from '../../../../core/ui-next/components/collapsible-container.js';
import { FiligreeTitle } from '../../../../core/ui-next/components/filigree-title.js';
import { defineLegacyComponent } from '../../../../core/ui-next/components/fxs-solid-component.js';
import { Hotkeys } from '../../../../core/ui-next/components/hotkeys.js';
import { Icon } from '../../../../core/ui-next/components/icon.js';
import { L10n } from '../../../../core/ui-next/components/l10n.js';
import { NavHelp } from '../../../../core/ui-next/components/nav-help.js';
import { Panel } from '../../../../core/ui-next/components/panel.js';
import { ScrollArea } from '../../../../core/ui-next/components/scroll-area.js';
import { SearchBar } from '../../../../core/ui-next/components/search-bar.js';
import { HSlot, VSlot } from '../../../../core/ui-next/components/slot.js';
import { TooltipKeyword } from '../../../../core/ui-next/components/tooltip-keyword.js';
import { Tooltip, TooltipHorizontalPosition, TooltipVerticalPosition } from '../../../../core/ui-next/components/tooltip.js';
import { ComponentRegistry } from '../../../../core/ui-next/services/component-registry.js';
import { FocusManager } from '../../../../core/ui-next/services/focus-manager.js';
import { IsControllerActive, IsTouchActive } from '../../../../core/ui-next/services/input.js';
import { ComponentUtilities } from '../../../../core/ui-next/utilities/component-utilities.js';
import { UnitMapDecorationSupport } from '../../../ui/interface-modes/support-unit-map-decoration.js';
import { SubpanelCloseEventName } from '../../../ui/mini-map/minimap-support.js';
import { NarrativePopupManager } from '../../../ui/narrative-event/narrative-popup-manager.js';
import { ProductionPanelCategory } from '../../../ui/production-chooser/production-chooser-helpers.js';
import UnitSelection from '../../../ui/unit-selection/unit-selection.js';
import { useUnitListModel } from './unit-list-model.js';
import { TicketSection } from '../../tooltips/plot-tooltip/components/utility.js';
import { ProductionTooltip } from '../../tooltips/production-tooltip.js';
import styles from './unit-list.scss.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="relative size-10 -top-1 -left-1 unit-list-command__button-bg-container flex item-center justify-center"><div class="absolute size-10 unit-list-command__button-highlight"></div></div>`), _tmpl$2 = /* @__PURE__ */ template(`<div class="ml-1\\.5 relative text-xs"></div>`), _tmpl$3 = /* @__PURE__ */ template(`<div><div class="healthbar-inner h-1\\.5"></div></div>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="flex flex-row items-center justify-center"></div>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="p-1 flex flex-row gap-2 relative items-center overflow-y-hidden"><div class="flex flex-row gap-2 items-center overflow-x-hidden"><div class="flex flex-col items-start justify-center"><div class="flex flex-row items-center unit-entry-info relative"></div></div></div><div class="grow"></div><div class="relative flex flex-row items-center justify-end"><div class="relative flex flex-row gap-2 items-center justify-end"></div></div></div>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="grow h-px"></div>`), _tmpl$7 = /* @__PURE__ */ template(`<div class="flex flex-row items-center mt-1 gap-1"></div>`), _tmpl$8 = /* @__PURE__ */ template(`<div class="unit-list-container relative max-w-full overflow-y-hidden flex flex-row grow items-center"></div>`), _tmpl$9 = /* @__PURE__ */ template(`<div class="size-6"></div>`), _tmpl$10 = /* @__PURE__ */ template(`<div class="absolute top-0 right-0 -translate-y-1\\/2 pointer-events-none"></div>`), _tmpl$11 = /* @__PURE__ */ template(`<div class="relative flex-1 min-h-0 w-full py-1 fxs-inner-frame-darker"><div class="absolute top-0 inset-x-0 filigree-inner-frame-top"></div><div class="absolute bottom-0 inset-x-0 filigree-inner-frame-bottom"></div></div>`), _tmpl$12 = /* @__PURE__ */ template(`<div class="h-full flex flex-col justify-end items-center max-h-full pt-11 pointer-events-none transition-all relative"tabindex="-1"></div>`);
const CORE_CLASS_SORT_ORDER = {
  LOC_UNIT_CLASS_MILITARY: 0,
  LOC_UNIT_CLASS_SUPPORT: 1,
  LOC_UNIT_CLASS_CIVILIAN: 2
};
const CORE_CLASS_LENGTH = Object.keys(CORE_CLASS_SORT_ORDER).length;
const sortUnits = (a, b) => {
  if (a.isCommander !== b.isCommander) {
    return a.isCommander ? -1 : 1;
  }
  const classComparison = (CORE_CLASS_SORT_ORDER[a.coreClass] ?? CORE_CLASS_LENGTH) - (CORE_CLASS_SORT_ORDER[b.coreClass] ?? CORE_CLASS_LENGTH);
  if (classComparison !== 0) {
    return classComparison;
  }
  const nameComparison = Locale.compare(a.name, b.name);
  if (nameComparison !== 0) {
    return nameComparison;
  }
  return a.tier - b.tier;
};
const filter = (unit, filter2, textSearch) => {
  if (textSearch.trim().length <= 0) return true;
  return filter2.has(unit.id.id.toString());
};
const selectUnit = (unit, model, lookAtOnly) => {
  let targetUnit = unit;
  do {
    const parentID = targetUnit.parentUnitId;
    if (!parentID) break;
    const parentUnit = model.findUnit(parentID.id, model.data.units);
    if (!parentUnit) break;
    targetUnit = parentUnit;
  } while (true);  // eslint-disable-line no-constant-condition
  if (!lookAtOnly) UI.Player.selectUnit(unit.id);
  if (targetUnit && targetUnit.isOnMap) {
    Camera.lookAtPlot(targetUnit.location);
  }
};
const UnitListCommand = (props) => {
  const [root, setRoot] = createSignal();
  const model = useUnitListModel();
  const focusManager = FocusManager.get();
  createEffect(() => {
    if (model.isFocusActions()) {
      if (model.focusedUnitIndex() == props.unit.id.id) {
        if (model.actionIndex() == props.index) {
          const target = root();
          if (target) focusManager.setFocus(target);
        }
      }
    }
  });
  return createComponent(Tooltip.Text, {
    get text() {
      return `[STYLE:unit-action__tooltip-title]${Locale.compose(props.action.name)}[/STYLE][n]${props.action.description}`;
    },
    bodyClass: "text-xs max-w-96",
    get children() {
      return createComponent(AudioContextProvider, {
        get vars() {
          return {
            UnitAbility: props.action.type
          };
        },
        segment: "UnitList",
        get children() {
          return createComponent(Activatable, {
            ref: setRoot,
            "class": "size-8 flex item-center justify-center relative unit-list__action-button -top-px",
            autoFocus: false,
            onActivate: () => {
              if (props.action.type == "UNITCOMMAND_PROMOTE") {
                ContextManager.pop("panel-unit-list");
              }
              props.action.callback();
              model.setIsFocusActions(false);
              model.setActionIndex(0);
            },
            get children() {
              var _el$ = _tmpl$(), _el$2 = _el$.firstChild;
              insert(_el$, createComponent(Icon, {
                "class": "size-6 relative top-2",
                get name() {
                  return `url(${props.action.icon ?? ""})`;
                },
                isUrl: true
              }), null);
              return _el$;
            }
          });
        }
      });
    }
  });
};
const UnitListEntry = (props) => {
  const MEDIUM_HEALTH_THRESHOLD = 0.75;
  const LOW_HEALTH_THRESHOLD = 0.5;
  const model = useUnitListModel();
  const max_w = Configuration.getUser().uiFontScale < 3 ? 150 : 120;
  const isFocused = createMemo(() => model.focusedUnitIndex() == props.unit.id.id);
  const [root, setRoot] = createSignal();
  const focusManager = FocusManager.get();
  const unitData = createMemo(() => props.unit);
  const unitHealth = createMemo(() => (unitData().maxDamage - unitData().damage) / unitData().maxDamage * 100);
  const unitHealthStatus = createMemo(() => {
    const health = (unitData().maxDamage - unitData().damage) / unitData().maxDamage;
    if (health <= LOW_HEALTH_THRESHOLD) {
      return "healthbar-low-health";
    } else if (health <= MEDIUM_HEALTH_THRESHOLD) {
      return "healthbar-med-health";
    } else {
      return "";
    }
  });
  const hasCommands = createMemo(() => {
    return unitData().actions.length > 0;
  });
  const packedUnits = createMemo(() => {
    const packedUnitIDs = props.unit.packedUnits?.map((unitID) => unitID.id);
    if (!packedUnitIDs) return [];
    const packedUnits2 = [];
    for (const id of packedUnitIDs) {
      const unitEntry = model.findUnit(id, model.data.units);
      if (unitEntry) packedUnits2.push(unitEntry);
    }
    return packedUnits2.filter((unit) => {
      return filter(unit, props.filteredUnits, props.textSearch);
    }).sort(sortUnits);
  });
  const onActivate = () => {
    if (unitData().isSelectValid) {
      const selectedUnit = UI.Player.getHeadSelectedUnit();
      if (selectedUnit && selectedUnit.id == unitData().id.id) {
        UI.Player.deselectAllUnits();
        UnitMapDecorationSupport.manager.deactivate();
        return;
      }
      if (IsControllerActive()) {
        props.setUnitToSelect(unitData().id);
      } else {
        selectUnit(unitData(), model);
      }
    }
  };
  const onFocus = () => {
    model.setFocusedUnitIndex(props.unit.id.id);
    model.setActionIndex(0);
    model.setIsFocusActions(false);
    selectUnit(unitData(), model, true);
  };
  const onBlur = () => {
    if (!model.isFocusActions()) {
      model.setFocusedUnitIndex(-1);
    }
  };
  const onInputAction = (e) => {
    const name = e.detail.name;
    const status = e.detail.status;
    if (IsTouchActive() && status == InputActionStatuses.FINISH) {
      if (name === "touch-press") {
        onFocus();
      } else if (name === "touch-tap") {
        onActivate();
      }
    }
  };
  createEffect(() => {
    if (!model.isFocusActions()) {
      if (model.focusedUnitIndex() == props.unit.id.id) {
        const target = root();
        const currentFocus = focusManager.currentFocus();
        if (target && currentFocus && currentFocus.classList.contains("unit-list__action-button")) {
          focusManager.setFocus(target);
        }
      }
    }
  });
  return [(() => {
    var _el$3 = _tmpl$8();
    insert(_el$3, createComponent(AudioContextProvider, {
      segment: "UnitList",
      get children() {
        return createComponent(Tooltip, {
          showFiligrees: false,
          get initialVPosition() {
            return TooltipVerticalPosition.CENTER;
          },
          get initialHPosition() {
            return TooltipHorizontalPosition.RIGHT;
          },
          offset: 10,
          get children() {
            return [createComponent(Tooltip.Trigger, {
              get children() {
                return createComponent(Activatable, {
                  get autoFocus() {
                    return props.autoFocus;
                  },
                  ref: setRoot,
                  "class": "relative unit-entry max-w-full grow text-accent-2",
                  get classList() {
                    return {
                      "unit-entry-exhausted": !unitData().isSelectValid || !unitData().canMove
                    };
                  },
                  get style() {
                    return {
                      "margin-left": Layout.pixels(props.indentLevel * 24)
                    };
                  },
                  "on:engine-input": onInputAction,
                  onActivate: () => {
                    if (IsTouchActive()) onFocus();
                    onActivate();
                  },
                  onFocus,
                  onBlur,
                  get disableTrigger() {
                    return !unitData().isSelectValid;
                  },
                  get children() {
                    return [(() => {
                      var _el$4 = _tmpl$5(), _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild, _el$11 = _el$5.nextSibling, _el$12 = _el$11.nextSibling, _el$13 = _el$12.firstChild;
                      insert(_el$5, createComponent(Icon, {
                        "class": "size-6 unit-entry-info",
                        get name() {
                          return unitData().typeName;
                        }
                      }), _el$6);
                      insert(_el$7, createComponent(L10n.Stylize, {
                        get text() {
                          return unitData().name;
                        },
                        "class": "text-xs truncate",
                        get style() {
                          return {
                            "max-width": Layout.pixels(max_w - props.indentLevel * 24)
                          };
                        }
                      }), null);
                      insert(_el$7, createComponent(Show, {
                        get when() {
                          return unitData().tier > 0;
                        },
                        get children() {
                          return createComponent(Icon, {
                            "class": "size-4 ml-1 relative",
                            get classList() {
                              return {
                                "-top-0\\.5": unitData().tier == 1
                                //Offset tier 1 units so it looks centered
                              };
                            },
                            get name() {
                              return `url('fs://game/unit_chevron-0${unitData().tier}.png')`;
                            },
                            isUrl: true
                          });
                        }
                      }), null);
                      insert(_el$7, createComponent(Show, {
                        get when() {
                          return unitData().promotions > 0;
                        },
                        get children() {
                          var _el$8 = _tmpl$2();
                          insert(_el$8, () => unitData().promotions);
                          return _el$8;
                        }
                      }), null);
                      insert(_el$6, createComponent(Show, {
                        get when() {
                          return unitData().damage > 0;
                        },
                        get children() {
                          var _el$9 = _tmpl$3(), _el$10 = _el$9.firstChild;
                          createRenderEffect((_p$) => {
                            var _v$ = "bg-black h-1\\.5 w-10 mt-1 " + unitHealthStatus(), _v$2 = `${unitHealth()}%`;
                            _v$ !== _p$.e && className(_el$9, _p$.e = _v$);
                            _v$2 !== _p$.t && ((_p$.t = _v$2) != null ? _el$10.style.setProperty("width", _v$2) : _el$10.style.removeProperty("width"));
                            return _p$;
                          }, {
                            e: void 0,
                            t: void 0
                          });
                          return _el$9;
                        }
                      }), null);
                      insert(_el$13, createComponent(Show, {
                        get when() {
                          return unitData().isSelectValid;
                        },
                        get children() {
                          return createComponent(L10n.Stylize, {
                            text: "[icon:Action_Move] {1}/{2}",
                            get args() {
                              return [unitData().movesRemaining, unitData().maxMoves];
                            },
                            "class": "text-xs"
                          });
                        }
                      }), null);
                      insert(_el$13, createComponent(Show, {
                        get when() {
                          return unitData().statusName;
                        },
                        get fallback() {
                          return _tmpl$9();
                        },
                        get children() {
                          var _el$14 = _tmpl$4();
                          insert(_el$14, createComponent(Show, {
                            get when() {
                              return unitData().reinforcementTime > 0 || unitData().timeoutReturn > -1;
                            },
                            get children() {
                              return [createComponent(L10n.Stylize, {
                                get text() {
                                  return (unitData().reinforcementTime || unitData().timeoutReturn).toString();
                                },
                                "class": "text-xs unit-entry-info mr-1"
                              }), createComponent(Icon, {
                                "class": "size-4 mr-2 unit-entry-info",
                                name: `url("blp:turn_icon")`,
                                isUrl: true
                              })];
                            }
                          }), null);
                          insert(_el$14, createComponent(Icon, {
                            "class": "size-6",
                            get name() {
                              return unitData().statusIcon;
                            },
                            isUrl: true
                          }), null);
                          return _el$14;
                        }
                      }), null);
                      createRenderEffect((_p$) => {
                        var _v$3 = !!hasCommands(), _v$4 = !!hasCommands(), _v$5 = !!hasCommands();
                        _v$3 !== _p$.e && _el$13.classList.toggle("unit-list-status-info", _p$.e = _v$3);
                        _v$4 !== _p$.t && _el$13.classList.toggle("transition-all", _p$.t = _v$4);
                        _v$5 !== _p$.a && _el$13.classList.toggle("transition-duration-100", _p$.a = _v$5);
                        return _p$;
                      }, {
                        e: void 0,
                        t: void 0,
                        a: void 0
                      });
                      return _el$4;
                    })(), (() => {
                      var _el$15 = _tmpl$6();
                      _el$15.style.setProperty("background", "rgba(77, 83, 102, 0.30)");
                      return _el$15;
                    })()];
                  }
                });
              }
            }), createComponent(Tooltip.Content, {
              get children() {
                return createComponent(Tooltip.Frame, {
                  "class": "w-auto min-w-62 max-w-84 self-start text-sm",
                  get children() {
                    return createComponent(TicketSection, {
                      "class": "text-xs flex flex-col p-2",
                      get children() {
                        return [createComponent(ProductionTooltip, {
                          get category() {
                            return ProductionPanelCategory.UNITS;
                          },
                          get type() {
                            return unitData().typeName;
                          },
                          get name() {
                            return unitData().name;
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
                                    return unitData().unitTypeName;
                                  }
                                });
                              }
                            });
                          }
                        }), createComponent(Show, {
                          get when() {
                            return unitData().damage > 0;
                          },
                          get children() {
                            return createComponent(L10n.Stylize, {
                              text: "LOC_UNIT_LIST_HP",
                              get args() {
                                return [unitData().maxDamage - unitData().damage, unitData().maxDamage];
                              }
                            });
                          }
                        }), createComponent(Show, {
                          get when() {
                            return unitData().statusName;
                          },
                          get children() {
                            return [(() => {
                              var _el$16 = _tmpl$7();
                              insert(_el$16, createComponent(L10n.Stylize, {
                                get text() {
                                  return unitData().statusName;
                                }
                              }), null);
                              insert(_el$16, createComponent(Icon, {
                                "class": "size-6",
                                get name() {
                                  return unitData().statusIcon;
                                },
                                isUrl: true
                              }), null);
                              return _el$16;
                            })(), createComponent(Show, {
                              get when() {
                                return unitData().statusDescription;
                              },
                              get children() {
                                return createComponent(L10n.Stylize, {
                                  get text() {
                                    return unitData().statusDescription;
                                  }
                                });
                              }
                            })];
                          }
                        })];
                      }
                    });
                  }
                });
              }
            })];
          }
        });
      }
    }), null);
    insert(_el$3, createComponent(Show, {
      get when() {
        return hasCommands();
      },
      get children() {
        return createComponent(HSlot, {
          "class": "unit-list-commands -right-1 flex flex-row items-center justify-end absolute transition-all transition-duration-100 gap-0\\.5",
          disableFocus: true,
          get children() {
            return createComponent(For, {
              get each() {
                return unitData().actions;
              },
              children: (action, index) => createComponent(UnitListCommand, {
                get index() {
                  return index();
                },
                get unit() {
                  return unitData();
                },
                action
              })
            });
          }
        });
      }
    }), null);
    insert(_el$3, createComponent(Show, {
      get when() {
        return createMemo(() => !!hasCommands())() && isFocused();
      },
      get children() {
        return createComponent(Hotkeys, {
          get hotkeys() {
            return [{
              hotkeyAction: "shell-action-1",
              navTrayText: model.isFocusActions() ? "LOC_UI_UNIT_LIST_FOCUS_LIST" : "LOC_UI_UNIT_LIST_FOCUS_ACTIONS",
              onActivate: () => {
                model.setIsFocusActions(!model.isFocusActions());
              }
            }];
          }
        });
      }
    }), null);
    createRenderEffect(() => _el$3.classList.toggle("focused", !!(hasCommands() && isFocused())));
    return _el$3;
  })(), createComponent(For, {
    get each() {
      return packedUnits();
    },
    children: (unit) => createComponent(UnitListEntry, {
      unit,
      get indentLevel() {
        return props.indentLevel + 1;
      },
      get filteredUnits() {
        return props.filteredUnits;
      },
      get textSearch() {
        return props.textSearch;
      },
      autoFocus: false,
      get setUnitToSelect() {
        return props.setUnitToSelect;
      }
    })
  })];
};
const UnitListComponent = () => {
  const model = useUnitListModel();
  const [textFilter, setTextFilter] = createSignal("");
  const [getAnimation, setAnimation] = createSignal("unit-list_animate-in-fade");
  const searchResults = createMemo(() => textFilter() ? model.fullTextSearch(textFilter()) : /* @__PURE__ */ new Set());
  const [unitToSelect, setUnitToSelect] = createSignal(ComponentID.getInvalidID());
  const unitIsValid = (unit) => {
    return unit.isOnMap || unit.timeoutReturn >= 0;
  };
  const unitGroups = createMemo(() => {
    const groups = {
      commanders: [],
      military: [],
      support: [],
      civilian: []
    };
    for (const unit of model.data.units) {
      if (!unitIsValid(unit) || !filter(unit, searchResults(), textFilter())) {
        continue;
      }
      if (unit.isCommander) {
        groups.commanders.push(unit);
      } else if (unit.coreClass == "LOC_UNIT_CLASS_MILITARY") {
        groups.military.push(unit);
      } else if (unit.coreClass == "LOC_UNIT_CLASS_SUPPORT") {
        groups.support.push(unit);
      } else {
        groups.civilian.push(unit);
      }
    }
    for (const group of Object.values(groups)) {
      group.sort(sortUnits);
    }
    return groups;
  });
  const startCollapsed = createMemo(() => {
    return unitGroups().commanders.length + unitGroups().military.length + unitGroups().support.length + unitGroups().civilian.length > 50;
  });
  const handleEngineInput = (inputEvent) => {
    if (inputEvent.detail.name == "mousewheel-up" || inputEvent.detail.name == "mousewheel-down") {
      inputEvent.preventDefault();
      inputEvent.stopPropagation();
      return;
    }
    return;
  };
  const captureEngineInput = (inputEvent) => {
    if (inputEvent.detail.name == "mousebutton-right" && UI.Player.getHeadSelectedUnit()) {
      inputEvent.stopPropagation();
      return;
    }
    return;
  };
  const onUnitSelect = () => {
    if (IsControllerActive()) {
      onClose();
    }
  };
  let hasPoppedContext = false;
  const onClose = () => {
    setAnimation("unit-list_animate-out-fade");
    setTimeout(() => {
      if (!hasPoppedContext) {
        hasPoppedContext = true;
        ContextManager.pop("panel-unit-list");
      }
    }, 375);
  };
  const onSubpanelClose = (event) => {
    if (event.detail.tag == "panel-unit-list") {
      onClose();
    }
  };
  const onNavigate = (navigationEvent) => {
    if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
      return;
    }
    if (!model.isFocusActions()) return;
    const direction = navigationEvent.getDirection();
    if (direction == InputNavigationAction.LEFT) {
      model.setActionIndex(Math.max(0, model.actionIndex() - 1));
      navigationEvent.preventDefault();
      navigationEvent.stopPropagation();
    } else if (direction == InputNavigationAction.RIGHT) {
      const unit = model.findUnit(model.focusedUnitIndex(), model.data.units);
      if (unit) {
        const max = unit.actions.length - 1;
        model.setActionIndex(Math.min(max, model.actionIndex() + 1));
      }
      navigationEvent.preventDefault();
      navigationEvent.stopPropagation();
    }
  };
  createEffect(() => {
    IsTouchActive();
    model.setFocusedUnitIndex(0);
    model.setActionIndex(0);
    model.setIsFocusActions(false);
    if (IsControllerActive()) {
      if (UI.Player.getHeadSelectedUnit()) {
        onClose();
        return;
      }
      setTextFilter("");
      Input.setActiveContext(InputContext.Shell);
    } else {
      Input.setActiveContext(InputContext.World);
    }
  });
  createEffect(() => {
    if (ComponentID.isValid(unitToSelect())) {
      if (IsControllerActive()) {
        onClose();
      }
    }
  });
  onMount(() => {
    window.addEventListener(InputEngineEventName, captureEngineInput, true);
    window.addEventListener(NavigateInputEventName, onNavigate, true);
    window.addEventListener(SocialPanelOpenEventName, onClose);
    window.addEventListener(SubpanelCloseEventName, onSubpanelClose);
    engine.on("PlayerTurnDeactivated", onClose);
    UnitSelection.onRaise.on(onUnitSelect);
    model.setIsUnitListOpen(true);
    if (LensManager.getActiveLens() != "fxs-default-lens") {
      LensManager.setActiveLens("fxs-default-lens");
      UI.Player.deselectAllUnits();
    }
    onCleanup(() => {
      window.removeEventListener(InputEngineEventName, captureEngineInput, true);
      window.removeEventListener(NavigateInputEventName, onNavigate, true);
      window.removeEventListener(SocialPanelOpenEventName, onClose);
      window.removeEventListener(SubpanelCloseEventName, onSubpanelClose);
      engine.off("PlayerTurnDeactivated", onClose);
      UnitSelection.onRaise.off(onUnitSelect);
      model.setIsUnitListOpen(false);
      if (ContextManager.hasInstanceOf("panel-unit-list")) ContextManager.pop("panel-unit-list");
      if (IsControllerActive() && ComponentID.isValid(unitToSelect())) UI.Player.selectUnit(unitToSelect());
    });
  });
  return (() => {
    var _el$18 = _tmpl$12();
    addEventListener(_el$18, "engine-input", handleEngineInput);
    insert(_el$18, createComponent(Panel, {
      name: "Unit List",
      id: "unit-list",
      get ["class"]() {
        return `mini-map__lens-panel unit-list_panel grow pointer-events-auto pt-3 pb-7 px-2 flex flex-col justify-start items-center relative gap-2 ${getAnimation()}`;
      },
      get autoFocus() {
        return IsControllerActive();
      },
      onCancelInput: onClose,
      get children() {
        return [createComponent(Hotkeys, {
          hotkeys: [{
            // Prevent Zooming while mouse is on panel
            // @ts-expect-error apparently this isn't registered as an option
            hotkeyAction: "mousewheel-up",
            onActivate: () => {
              return;
            }
          }, {
            // Prevent Zooming while mouse is on panel
            // @ts-expect-error apparently this isn't registered as an option
            hotkeyAction: "mousewheel-down",
            onActivate: () => {
              return;
            }
          }]
        }), createComponent(FiligreeTitle.H4, {
          text: "LOC_UI_TOGGLE_UNIT_LIST_PANEL",
          "filigree-style": "h4"
        }), createComponent(Show, {
          get when() {
            return !IsControllerActive();
          },
          get children() {
            return createComponent(VSlot, {
              get children() {
                return createComponent(SearchBar, {
                  value: textFilter,
                  setValue: setTextFilter,
                  "class": "mr-4 unit-list-search"
                });
              }
            });
          }
        }), (() => {
          var _el$19 = _tmpl$10();
          insert(_el$19, createComponent(NavHelp, {
            actionName: "cancel",
            "class": "relative translate-x-1\\/2"
          }));
          return _el$19;
        })(), (() => {
          var _el$20 = _tmpl$11(), _el$21 = _el$20.firstChild, _el$22 = _el$21.nextSibling;
          insert(_el$20, createComponent(ScrollArea, {
            "class": "flex-auto w-full",
            useProxy: true,
            get children() {
              return createComponent(VSlot, {
                "class": "flex-auto flex-col",
                get children() {
                  return [createComponent(VSlot, {
                    get children() {
                      return createComponent(Show, {
                        get when() {
                          return unitGroups().commanders.length > 0;
                        },
                        get children() {
                          return createComponent(CollapsibleContainer, {
                            titleText: "LOC_UNIT_LIST_COMMANDER_TITLE",
                            "class": "w-full h-auto mb-1",
                            headerClass: "text-xs",
                            disableFocus: false,
                            centerTitle: true,
                            get children() {
                              return [(() => {
                                var _el$23 = _tmpl$6();
                                _el$23.style.setProperty("background", "rgba(77, 83, 102, 0.30)");
                                return _el$23;
                              })(), createComponent(For, {
                                get each() {
                                  return unitGroups().commanders;
                                },
                                children: (unit) => createComponent(UnitListEntry, {
                                  unit,
                                  indentLevel: 0,
                                  get filteredUnits() {
                                    return searchResults();
                                  },
                                  get textSearch() {
                                    return textFilter();
                                  },
                                  autoFocus: false,
                                  setUnitToSelect
                                })
                              })];
                            }
                          });
                        }
                      });
                    }
                  }), createComponent(VSlot, {
                    get children() {
                      return createComponent(Show, {
                        get when() {
                          return unitGroups().military.length > 0;
                        },
                        get children() {
                          return createComponent(CollapsibleContainer, {
                            titleText: "LOC_UNIT_CLASS_MILITARY",
                            "class": "w-full h-auto mb-1",
                            headerClass: "text-xs",
                            disableFocus: false,
                            centerTitle: true,
                            get initiallyCollapsed() {
                              return startCollapsed();
                            },
                            get children() {
                              return [(() => {
                                var _el$24 = _tmpl$6();
                                _el$24.style.setProperty("background", "rgba(77, 83, 102, 0.30)");
                                return _el$24;
                              })(), createComponent(For, {
                                get each() {
                                  return unitGroups().military;
                                },
                                children: (unit) => createComponent(UnitListEntry, {
                                  unit,
                                  indentLevel: 0,
                                  get filteredUnits() {
                                    return searchResults();
                                  },
                                  get textSearch() {
                                    return textFilter();
                                  },
                                  autoFocus: false,
                                  setUnitToSelect
                                })
                              })];
                            }
                          });
                        }
                      });
                    }
                  }), createComponent(VSlot, {
                    get children() {
                      return createComponent(Show, {
                        get when() {
                          return unitGroups().support.length > 0;
                        },
                        get children() {
                          return createComponent(CollapsibleContainer, {
                            titleText: "LOC_UNIT_CLASS_SUPPORT",
                            "class": "w-full h-auto mb-1",
                            headerClass: "text-xs",
                            disableFocus: false,
                            centerTitle: true,
                            get initiallyCollapsed() {
                              return startCollapsed();
                            },
                            get children() {
                              return [(() => {
                                var _el$25 = _tmpl$6();
                                _el$25.style.setProperty("background", "rgba(77, 83, 102, 0.30)");
                                return _el$25;
                              })(), createComponent(For, {
                                get each() {
                                  return unitGroups().support;
                                },
                                children: (unit) => createComponent(UnitListEntry, {
                                  unit,
                                  indentLevel: 0,
                                  get filteredUnits() {
                                    return searchResults();
                                  },
                                  get textSearch() {
                                    return textFilter();
                                  },
                                  autoFocus: false,
                                  setUnitToSelect
                                })
                              })];
                            }
                          });
                        }
                      });
                    }
                  }), createComponent(VSlot, {
                    get children() {
                      return createComponent(Show, {
                        get when() {
                          return unitGroups().civilian.length > 0;
                        },
                        get children() {
                          return createComponent(CollapsibleContainer, {
                            titleText: "LOC_UNIT_CLASS_CIVILIAN",
                            "class": "w-full h-auto mb-1",
                            headerClass: "text-xs",
                            disableFocus: false,
                            centerTitle: true,
                            get initiallyCollapsed() {
                              return startCollapsed();
                            },
                            get children() {
                              return [(() => {
                                var _el$26 = _tmpl$6();
                                _el$26.style.setProperty("background", "rgba(77, 83, 102, 0.30)");
                                return _el$26;
                              })(), createComponent(For, {
                                get each() {
                                  return unitGroups().civilian;
                                },
                                children: (unit) => createComponent(UnitListEntry, {
                                  unit,
                                  indentLevel: 0,
                                  get filteredUnits() {
                                    return searchResults();
                                  },
                                  get textSearch() {
                                    return textFilter();
                                  },
                                  autoFocus: false,
                                  setUnitToSelect
                                })
                              })];
                            }
                          });
                        }
                      });
                    }
                  })];
                }
              });
            }
          }), null);
          return _el$20;
        })()];
      }
    }));
    createRenderEffect((_p$) => {
      var _v$6 = Layout.pixels(380), _v$7 = Layout.pixels(239 + 4);
      _v$6 !== _p$.e && ((_p$.e = _v$6) != null ? _el$18.style.setProperty("width", _v$6) : _el$18.style.removeProperty("width"));
      _v$7 !== _p$.t && ((_p$.t = _v$7) != null ? _el$18.style.setProperty("padding-bottom", _v$7) : _el$18.style.removeProperty("padding-bottom"));
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$18;
  })();
};
const UnitListPanel = ComponentRegistry.register({
  name: "UnitList",
  createInstance: UnitListComponent
});
defineLegacyComponent("panel-unit-list", {
  classNames: ["relative", "unit-list-panel"],
  inputContext: () => {
    return IsControllerActive() ? InputContext.Shell : InputContext.World;
  }
}, (_attrs, _element) => {
  return createComponent(UnitListPanel, {});
});
NarrativePopupManager.addIgnoredPanelClass("unit-list-panel");
ComponentUtilities.loadStyles(styles);

export { UnitListPanel };
//# sourceMappingURL=unit-list.js.map
