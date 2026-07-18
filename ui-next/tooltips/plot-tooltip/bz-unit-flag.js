// vim: sw=2 et
import { template, insert, className } from '/core/vendor/solid-js/web/dist/web.js';
import { createComponent, Show, createRenderEffect } from '/core/vendor/solid-js/dist/solid.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
import { Icon } from '/core/ui-next/components/icon.js';

var _tmpl$ = /* @__PURE__ */ template(`<div></div>`), _tmpl$2 = /* @__PURE__ */ template(`<div><div class="size-7 bg-center bg-contain bg-no-repeat"></div></div>`), _tmpl$3 = /* @__PURE__ */ template(`<div><div class="absolute inset-0"></div><div class="absolute inset-0"></div><div class="absolute inset-0"></div><div class="bg-contain bg-center bg-no-repeat relative size-6 self-end mb-3"></div></div>`);
const UnitFlag = (props) => (() => {
  var _el$ = _tmpl$();
  insert(_el$, createComponent(Show, {
    get when() {
      return props.unitIcon;
    },
    children: (iconCss) => (() => {
      var _el$2 = _tmpl$2(), _el$3 = _el$2.firstChild;
      _el$2.style.setProperty("background-color", "rgba(14, 16, 20, 1)");
      createRenderEffect((_p$) => {
        var _v$ = `relative size-9 p-1 rounded-full border border-white flex items-center justify-center ${props.iconClass ?? ""}`, _v$2 = iconCss();
        _v$ !== _p$.e && className(_el$2, _p$.e = _v$);
        _v$2 !== _p$.t && ((_p$.t = _v$2) != null ? _el$3.style.setProperty("background-image", _v$2) : _el$3.style.removeProperty("background-image"));
        return _p$;
      }, {
        e: void 0,
        t: void 0
      });
      insert(_el$2, createComponent(Show, {
        get when() {
          return props.relationship?.hostile;
        },
        get children() {
          return createComponent(Icon, {
            "class": "size-5 top-7 absolute rounded-full bg-black border border-victory-military",
            name: "url(blp:dip_warswordshield)",
            isUrl: true
          });
        }
      }));
      return _el$2;
    })()
  }), null);
  insert(_el$, createComponent(Show, {
    get when() {
      return props.civSymbol;
    },
    children: (civCss) => (() => {
      var _el$4 = _tmpl$3(), _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$6.nextSibling, _el$8 = _el$7.nextSibling;
      _el$5.style.setProperty("border-image-slice", "40 31 31 31 fill");
      _el$5.style.setProperty("border-image-source", "url(blp:hud_frontbanner)");
      _el$6.style.setProperty("border-image-source", "url('blp:hud_frontbanner_shadow')");
      _el$6.style.setProperty("border-image-slice", "40 31 31 31 fill");
      _el$7.style.setProperty("border-image-source", "url('blp:hud_frontbanner_overlay')");
      _el$7.style.setProperty("border-image-slice", "1 31 29 31 fill");
      createRenderEffect((_p$) => {
        var _v$3 = `-z-1 relative w-9 h-14 -mt-4 flex justify-center ${props.bannerClass ?? ""}`, _v$4 = `${Layout.pixels(40)} ${Layout.pixels(31)} ${Layout.pixels(31)} ${Layout.pixels(31)}`, _v$5 = props.color, _v$6 = `${Layout.pixels(40)} ${Layout.pixels(31)} ${Layout.pixels(31)} ${Layout.pixels(31)}`, _v$7 = `${Layout.pixels(1)} ${Layout.pixels(31)} ${Layout.pixels(29)} ${Layout.pixels(31)}`, _v$8 = civCss();
        _v$3 !== _p$.e && className(_el$4, _p$.e = _v$3);
        _v$4 !== _p$.t && ((_p$.t = _v$4) != null ? _el$5.style.setProperty("border-image-width", _v$4) : _el$5.style.removeProperty("border-image-width"));
        _v$5 !== _p$.a && ((_p$.a = _v$5) != null ? _el$5.style.setProperty("fxs-border-image-tint", _v$5) : _el$5.style.removeProperty("fxs-border-image-tint"));
        _v$6 !== _p$.o && ((_p$.o = _v$6) != null ? _el$6.style.setProperty("border-image-width", _v$6) : _el$6.style.removeProperty("border-image-width"));
        _v$7 !== _p$.i && ((_p$.i = _v$7) != null ? _el$7.style.setProperty("border-image-width", _v$7) : _el$7.style.removeProperty("border-image-width"));
        _v$8 !== _p$.n && ((_p$.n = _v$8) != null ? _el$8.style.setProperty("background-image", _v$8) : _el$8.style.removeProperty("background-image"));
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0,
        n: void 0
      });
      return _el$4;
    })()
  }), null);
  createRenderEffect(() => className(_el$, `z-0 relative flex flex-col items-center ${props.class ?? ""}`));
  return _el$;
})();

export { UnitFlag };
//# sourceMappingURL=unit-flag.js.map
