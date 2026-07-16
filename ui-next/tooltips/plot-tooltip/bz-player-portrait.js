import { template, insert } from '/core/vendor/solid-js/web/dist/web.js';
import { createSignal, createEffect, createComponent, Show, createRenderEffect } from '/core/vendor/solid-js/dist/solid.js';
import { getPlayerColorVariants, isPrimaryColorLighter } from '/core/ui/utilities/utilities-color.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
import { PortraitIcon } from '/core/ui-next/components/portrait-icon.js';
import { Tooltip } from '/core/ui-next/components/tooltip.js';
import { getSettlementIconInfo } from '/core/ui-next/utilities/settlement-utilities.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="-z-1 relative h-16 w-9 flex-1 flex flex-row justify-center mx-1.5 -mt-8"><div class="absolute inset-0"></div><div class="absolute inset-0"></div><div class="absolute inset-0"></div><div class="bg-contain bg-center bg-no-repeat relative self-end mb-3 size-6"></div></div>`), _tmpl$2 = /* @__PURE__ */ template(`<div class="z-0 relative flex flex-col items-center justify-center"data-name=PlotTooltipPlayerPortrait></div>`);
const PlotTooltipPlayerPortrait = (props) => {
  const [bannerColor, setBannerColor] = createSignal("");
  const [civSymbol, setCivSymbol] = createSignal("");
  const [civSymbolColor, setCivSymbolColor] = createSignal("");
  const [settlementName, setSettlementName] = createSignal("");
  const [playerName, setPlayerName] = createSignal("");
  createEffect(() => {
    if (props.leaderId === PlayerIds.NO_PLAYER) {
      return;
    }
    const player = Players.get(props.leaderId);
    if (!player) {
      return;
    }
    setPlayerName(Locale.compose(player.name));
    const variants = getPlayerColorVariants(props.leaderId);
    if (variants) {
      setBannerColor(variants.primaryColor.moreColor);
    }
    if (props.cityId) {
      const iconProperities = getSettlementIconInfo(props.cityId);
      if (iconProperities) {
        setCivSymbol(iconProperities.icon);
        setCivSymbolColor(iconProperities.color);
      }
      const city = Cities.get(props.cityId);
      if (city) {
        setSettlementName(Locale.compose(city.name));
      }
    } else {
      setCivSymbol(Icon.getCivSymbolFromCivilizationType(player.civilizationType));
    }
  });
  return (() => {
    var _el$ = _tmpl$2();
    insert(_el$, createComponent(Show, {
      get when() {
        return props.representsCityState;
      },
      get fallback() {
        return createComponent(PortraitIcon, {
          get playerId() {
            return props.leaderId;
          },
          size: 12
        });
      },
      get children() {
        return createComponent(Tooltip.Text, {
          header: "LOC_CIVILIZATION_CITY_STATE_NAME",
          text: "LOC_COMMERCE_TRADE_ROUTE_CITY_STATE_TOOLTIP",
          get args() {
            return [settlementName(), playerName()];
          },
          get children() {
            return createComponent(PortraitIcon, {
              get playerId() {
                return props.leaderId;
              },
              size: 11
            });
          }
        });
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return props.showBanner;
      },
      get children() {
        var _el$2 = _tmpl$(), _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$4.nextSibling, _el$6 = _el$5.nextSibling;
        _el$3.style.setProperty("border-image-slice", "40 31 31 31 fill");
        _el$3.style.setProperty("border-image-source", "url(blp:hud_frontbanner)");
        _el$4.style.setProperty("border-image-source", "url('blp:hud_frontbanner_shadow')");
        _el$4.style.setProperty("border-image-slice", "40 31 31 31 fill");
        _el$5.style.setProperty("border-image-source", "url('blp:hud_frontbanner_overlay')");
        _el$5.style.setProperty("border-image-slice", "1 31 29 31 fill");
        createRenderEffect((_p$) => {
          var _v$ = `${Layout.pixels(40)} ${Layout.pixels(31)} ${Layout.pixels(31)} ${Layout.pixels(31)}`, _v$2 = props.representsCityState ? "white" : bannerColor(), _v$3 = `${Layout.pixels(40)} ${Layout.pixels(31)} ${Layout.pixels(31)} ${Layout.pixels(31)}`, _v$4 = `${Layout.pixels(1)} ${Layout.pixels(31)} ${Layout.pixels(29)} ${Layout.pixels(31)}`, _v$5 = civSymbol().startsWith("url") ? civSymbol() : `url('${civSymbol()}')`, _v$6 = civSymbolColor();
          _v$ !== _p$.e && ((_p$.e = _v$) != null ? _el$3.style.setProperty("border-image-width", _v$) : _el$3.style.removeProperty("border-image-width"));
          _v$2 !== _p$.t && ((_p$.t = _v$2) != null ? _el$3.style.setProperty("fxs-border-image-tint", _v$2) : _el$3.style.removeProperty("fxs-border-image-tint"));
          _v$3 !== _p$.a && ((_p$.a = _v$3) != null ? _el$4.style.setProperty("border-image-width", _v$3) : _el$4.style.removeProperty("border-image-width"));
          _v$4 !== _p$.o && ((_p$.o = _v$4) != null ? _el$5.style.setProperty("border-image-width", _v$4) : _el$5.style.removeProperty("border-image-width"));
          _v$5 !== _p$.i && ((_p$.i = _v$5) != null ? _el$6.style.setProperty("background-image", _v$5) : _el$6.style.removeProperty("background-image"));
          _v$6 !== _p$.n && ((_p$.n = _v$6) != null ? _el$6.style.setProperty("fxs-background-image-tint", _v$6) : _el$6.style.removeProperty("fxs-background-image-tint"));
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0,
          o: void 0,
          i: void 0,
          n: void 0
        });
        return _el$2;
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$7 = !!isPrimaryColorLighter(props.leaderId), _v$8 = !!(props.leaderId === GameContext.localPlayerID);
      _v$7 !== _p$.e && _el$.classList.toggle("primary-color-is-lighter", _p$.e = _v$7);
      _v$8 !== _p$.t && _el$.classList.toggle("local-player", _p$.t = _v$8);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$;
  })();
};

export { PlotTooltipPlayerPortrait };
//# sourceMappingURL=player-portrait.js.map
