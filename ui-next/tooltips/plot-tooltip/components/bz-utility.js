import { template, className, insert, setAttribute, spread } from '/core/vendor/solid-js/web/dist/web.js';
import { createRenderEffect, createComponent, Show, mergeProps, splitProps } from '/core/vendor/solid-js/dist/solid.js';
import { Icon } from '/core/ui-next/components/icon.js';
import { L10n } from '/core/ui-next/components/l10n.js';

// horizontal list separator (spaced in non-ideographic locales)
const BZ_DOT_DIVIDER = Locale.compose("LOC_PLOT_DIVIDER_DOT");
const BZ_DOT_JOINER = Locale.getCurrentDisplayLocale().startsWith("zh_") ?
    BZ_DOT_DIVIDER : `&nbsp;${BZ_DOT_DIVIDER} `;

const bzPill = (props) => {
  const [local, other] = splitProps(props, ["class", "iconClass", "icon", "text"]);
  return (() => {
    var _el$ = _tmpl$();
    spread(_el$, mergeProps({
      get ["class"]() {
        return `bz-keyword-pill text-xs min-h-5 px-2 flex items-center rounded-full leading-tight ${local.class ?? ""}`;
      },
    }, other), false, true);
    insert(_el$, createComponent(Show, {
      get when() {
        return local.icon;
      },
      children: (icon) => createComponent(Icon, {
          get ["class"]() {
            return local.iconClass ?? "size-4 -ml-1\\.5 mr-1";
          },
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

var _tmpl$ = /* @__PURE__ */ template(`<div></div>`), _tmpl$2 = /* @__PURE__ */ template(`<div><div class="w-12 shrink-0 flex items-center justify-center py-0\\.5"></div><div class="w-px self-stretch bg-accent-2 opacity-30 mx-2"></div><div class="flex flex-col justify-start flex-auto my-0\\.5"></div></div>`);
const Divider = (props) => (() => {
  var _el$ = _tmpl$();
  _el$.style.setProperty("background-image", "linear-gradient(90deg, rgba(141, 151, 166, 0) 0%, #8d97a6ff 50%, rgba(141, 151, 166, 0) 100%)");
  createRenderEffect(() => className(_el$, `h-0\\.5 flex-auto -ml-6 -mr-6 my-0\\.5 ${props.class ?? ""}`));
  return _el$;
})();
const EntryDivider = (props) => (() => {
  var _el$2 = _tmpl$();
  createRenderEffect(() => className(_el$2, `h-px flex-auto my-0\\.5 bg-accent-2 opacity-30 ${props.class ?? ""}`));
  return _el$2;
})();
const TICKET_VARIANT_IMAGES = {
  default: "url(blp:base_ticket-bg)",
  negative: "url(blp:base_ticket-negative_bg)",
  gold: "url(blp:base_ticket-gold_bg)"
};
const TicketSection = (props) => (() => {
  var _el$3 = _tmpl$();
  insert(_el$3, () => props.children);
  createRenderEffect((_p$) => {
    var _v$ = props.name ?? "TicketSection", _v$2 = `img-base-ticket-bg-container mt-1 px-3 py-1\\.5 ${props.class ?? ""}`, _v$3 = TICKET_VARIANT_IMAGES[props.variant ?? "default"];
    _v$ !== _p$.e && setAttribute(_el$3, "data-name", _p$.e = _v$);
    _v$2 !== _p$.t && className(_el$3, _p$.t = _v$2);
    _v$3 !== _p$.a && ((_p$.a = _v$3) != null ? _el$3.style.setProperty("border-image-source", _v$3) : _el$3.style.removeProperty("border-image-source"));
    return _p$;
  }, {
    e: void 0,
    t: void 0,
    a: void 0
  });
  return _el$3;
})();
const TicketRow = (props) => (() => {
  var _el$4 = _tmpl$2(), _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$6.nextSibling;
  insert(_el$5, () => props.icon);
  insert(_el$7, () => props.children);
  createRenderEffect(() => className(_el$4, `flex w-full items-center ${props.class ?? ""}`));
  return _el$4;
})();

export { Divider, EntryDivider, TicketRow, TicketSection };
export { BZ_DOT_DIVIDER, BZ_DOT_JOINER, bzPill };
//# sourceMappingURL=utility.js.map
// vim: sw=2 et
