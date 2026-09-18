/* @ds-bundle: {"format":4,"namespace":"UNBSTOOLSDesignSystem_229a5a","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"SectionLabel","sourcePath":"components/core/SectionLabel.jsx"},{"name":"BarSeries","sourcePath":"components/data/BarSeries.jsx"},{"name":"Gauge","sourcePath":"components/data/Gauge.jsx"},{"name":"InsightPopover","sourcePath":"components/data/InsightPopover.jsx"},{"name":"LegendList","sourcePath":"components/data/LegendList.jsx"},{"name":"MetricBlock","sourcePath":"components/data/MetricBlock.jsx"},{"name":"SearchInput","sourcePath":"components/forms/SearchInput.jsx"},{"name":"SeriesToggle","sourcePath":"components/forms/SeriesToggle.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/forms/Tabs.jsx"},{"name":"AvatarStack","sourcePath":"components/navigation/AvatarStack.jsx"},{"name":"Breadcrumb","sourcePath":"components/navigation/Breadcrumb.jsx"},{"name":"CommandBar","sourcePath":"components/navigation/CommandBar.jsx"},{"name":"NavRail","sourcePath":"components/navigation/NavRail.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"327d9cea431a","components/core/Button.jsx":"b7d593fc7939","components/core/Card.jsx":"4ff305921f44","components/core/Chip.jsx":"02ce8e4abaf7","components/core/IconButton.jsx":"6631d259722b","components/core/SectionLabel.jsx":"a61114989149","components/data/BarSeries.jsx":"7e1e1ae0b76e","components/data/Gauge.jsx":"9d58a48c5b90","components/data/InsightPopover.jsx":"584f8a8831f0","components/data/LegendList.jsx":"adbe37a6ab27","components/data/MetricBlock.jsx":"a7626afb136c","components/forms/SearchInput.jsx":"8dd6b7aad640","components/forms/SeriesToggle.jsx":"822d5c5f3c8b","components/forms/Switch.jsx":"5e22ba33597a","components/forms/Tabs.jsx":"5bb562f82d6a","components/navigation/AvatarStack.jsx":"a1c90b6794c9","components/navigation/Breadcrumb.jsx":"18a6e1042b82","components/navigation/CommandBar.jsx":"910982487365","components/navigation/NavRail.jsx":"81747d3f64d6","ui_kits/mobile/MobileScreens.jsx":"54c035b6762b","ui_kits/site/SiteHeader.jsx":"d876089af0c7","ui_kits/site/SiteHero.jsx":"edd6c9fb881b","ui_kits/site/SiteSections.jsx":"707894ccc4fd","ui_kits/workspace/AppShell.jsx":"47da01483acc","ui_kits/workspace/AutomationsScreen.jsx":"91059bea5669","ui_kits/workspace/LibraryScreen.jsx":"1a0908c40f6c","ui_kits/workspace/OverviewScreen.jsx":"ccc2ccabf36f","ui_kits/workspace/UsageScreen.jsx":"4ebc4603de40"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.UNBSTOOLSDesignSystem_229a5a = window.UNBSTOOLSDesignSystem_229a5a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  accent: {
    background: 'var(--accent)',
    color: 'var(--text-on-accent)'
  },
  invert: {
    background: 'var(--surface-invert)',
    color: 'var(--text-on-invert)'
  },
  neutral: {
    background: 'var(--surface-100)',
    color: 'var(--ink-700)'
  },
  outline: {
    background: 'var(--surface-000)',
    color: 'var(--ink-700)',
    boxShadow: 'inset 0 0 0 1px var(--border-field)'
  },
  quiet: {
    background: 'var(--accent-quiet)',
    color: 'var(--accent-ink)'
  }
};
function Badge({
  children,
  tone = 'accent',
  dot = false,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.accent;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      height: 22,
      padding: dot ? '0 10px 0 8px' : '0 10px',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-core)',
      fontSize: 'var(--fs-caption)',
      fontWeight: 'var(--fw-medium)',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      fontVariantNumeric: 'tabular-nums',
      ...t,
      ...style
    }
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 'var(--radius-pill)',
      background: 'currentColor',
      opacity: .85
    }
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    height: 'var(--control-h-sm)',
    padding: '0 14px',
    fontSize: 'var(--fs-body-s)',
    radius: 'var(--radius-sm)'
  },
  md: {
    height: 'var(--control-h)',
    padding: '0 20px',
    fontSize: 'var(--fs-body-s)',
    radius: 'var(--radius-md)'
  },
  lg: {
    height: 'var(--control-h-lg)',
    padding: '0 26px',
    fontSize: 'var(--fs-body)',
    radius: 'var(--radius-md)'
  }
};
const VARIANTS = {
  primary: {
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
    border: '1px solid transparent'
  },
  invert: {
    background: 'var(--surface-invert)',
    color: 'var(--text-on-invert)',
    border: '1px solid transparent'
  },
  secondary: {
    background: 'var(--surface-000)',
    color: 'var(--ink-900)',
    border: '1px solid var(--border-field)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ink-900)',
    border: '1px solid transparent'
  }
};
function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  disabled = false,
  fullWidth = false,
  type = 'button',
  onClick,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const hoverStyle = !disabled && hover ? variant === 'primary' ? {
    background: 'var(--accent-hover)'
  } : variant === 'invert' ? {
    background: 'var(--surface-invert-soft)'
  } : {
    background: 'var(--surface-100)'
  } : null;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      width: fullWidth ? '100%' : 'auto',
      height: s.height,
      padding: s.padding,
      borderRadius: s.radius,
      fontFamily: 'var(--font-core)',
      fontSize: s.fontSize,
      fontWeight: 'var(--fw-medium)',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.38 : 1,
      transform: press ? 'scale(.985)' : 'none',
      transition: 'var(--transition-control), transform var(--dur-instant) var(--ease-in-out)',
      ...v,
      ...hoverStyle,
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement("i", {
    className: icon,
    style: {
      fontSize: 'var(--icon)',
      lineHeight: 0
    },
    "aria-hidden": "true"
  }) : null, children, iconAfter ? /*#__PURE__*/React.createElement("i", {
    className: iconAfter,
    style: {
      fontSize: 'var(--icon)',
      lineHeight: 0
    },
    "aria-hidden": "true"
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  label,
  actions,
  children,
  tone = 'raised',
  padding = 'var(--pad-card)',
  radius = 'var(--radius-lg)',
  dot,
  style,
  ...rest
}) {
  const tones = {
    raised: {
      background: 'var(--surface-card)',
      boxShadow: 'var(--shadow-2)',
      color: 'var(--text-body)',
      border: '1px solid var(--border-card)'
    },
    quiet: {
      background: 'var(--surface-card-quiet)',
      boxShadow: 'none',
      color: 'var(--text-body)',
      border: '1px solid transparent'
    },
    inset: {
      background: 'var(--bg-inset)',
      boxShadow: 'none',
      color: 'var(--text-body)',
      border: '1px solid transparent'
    },
    invert: {
      background: 'var(--surface-invert)',
      boxShadow: 'var(--shadow-3)',
      color: 'rgba(255,255,255,.82)',
      border: '1px solid transparent'
    }
  };
  const t = tones[tone] || tones.raised;
  const dotColor = dot === true ? 'var(--accent)' : dot;
  return /*#__PURE__*/React.createElement("section", _extends({
    style: {
      borderRadius: radius,
      padding,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      minWidth: 0,
      ...t,
      ...style
    }
  }, rest), label || actions || dot ? /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: 'var(--font-core)',
      fontSize: 'var(--fs-micro)',
      fontWeight: 'var(--fw-medium)',
      letterSpacing: 'var(--ls-eyebrow)',
      textTransform: 'uppercase',
      color: tone === 'invert' ? 'rgba(255,255,255,.55)' : 'var(--text-muted)'
    }
  }, dot ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 'var(--radius-pill)',
      background: dotColor
    }
  }) : null, label), actions ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }
  }, actions) : null) : null, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Chip({
  children,
  onAdd,
  onClick,
  tone = 'light',
  icon,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const dark = tone === 'dark';
  return /*#__PURE__*/React.createElement("span", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      height: 32,
      padding: onAdd ? '0 6px 0 12px' : '0 12px',
      borderRadius: 'var(--radius-sm)',
      background: dark ? hover ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.08)' : hover ? 'var(--surface-100)' : 'var(--surface-050)',
      boxShadow: dark ? 'none' : 'inset 0 0 0 1px var(--hairline-soft)',
      color: dark ? 'rgba(255,255,255,.88)' : 'var(--ink-700)',
      fontFamily: 'var(--font-core)',
      fontSize: 'var(--fs-body-s)',
      lineHeight: 1,
      cursor: onClick || onAdd ? 'pointer' : 'default',
      transition: 'var(--transition-control)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement("i", {
    className: icon,
    style: {
      fontSize: 'var(--icon-sm)',
      lineHeight: 0
    },
    "aria-hidden": "true"
  }) : null, children, onAdd ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Add",
    onClick: e => {
      e.stopPropagation();
      onAdd(e);
    },
    style: {
      width: 20,
      height: 20,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 0,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--accent)',
      color: 'var(--text-on-accent)',
      cursor: 'pointer',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-bold ph-plus",
    style: {
      fontSize: 10,
      lineHeight: 0
    },
    "aria-hidden": "true"
  })) : null);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: 32,
  md: 40,
  lg: 52
};
function IconButton({
  icon = 'ph ph-house',
  label,
  size = 'md',
  variant = 'surface',
  active = false,
  disabled = false,
  badge = false,
  onClick,
  style,
  ...rest
}) {
  const px = SIZES[size] || SIZES.md;
  const [hover, setHover] = React.useState(false);
  const resolved = active ? 'invert' : variant;
  const skins = {
    surface: {
      background: 'var(--surface-000)',
      color: 'var(--ink-900)',
      border: '1px solid var(--border-field)'
    },
    quiet: {
      background: 'var(--surface-100)',
      color: 'var(--ink-700)',
      border: '1px solid transparent'
    },
    invert: {
      background: 'var(--surface-invert)',
      color: 'var(--text-on-invert)',
      border: '1px solid transparent'
    },
    accent: {
      background: 'var(--accent)',
      color: 'var(--text-on-accent)',
      border: '1px solid transparent'
    }
  };
  const skin = skins[resolved] || skins.surface;
  const hoverSkin = !disabled && hover ? resolved === 'invert' ? {
    background: 'var(--surface-invert-soft)'
  } : resolved === 'accent' ? {
    background: 'var(--accent-hover)'
  } : {
    background: 'var(--surface-100)'
  } : null;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      width: px,
      height: px,
      flex: '0 0 auto',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-md)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.38 : 1,
      transition: 'var(--transition-control)',
      ...skin,
      ...hoverSkin,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("i", {
    className: icon,
    style: {
      fontSize: size === 'sm' ? 'var(--icon-sm)' : 'var(--icon)',
      lineHeight: 0
    },
    "aria-hidden": "true"
  }), badge ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 7,
      right: 7,
      width: 6,
      height: 6,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--accent)'
    }
  }) : null);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/SectionLabel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SectionLabel({
  children,
  tone = 'accent',
  size = 'md',
  style,
  ...rest
}) {
  const dot = {
    accent: 'var(--accent)',
    ink: 'var(--ink-900)',
    muted: 'var(--ink-300)'
  }[tone] || 'var(--accent)';
  const fs = size === 'sm' ? 'var(--fs-micro)' : 'var(--fs-caption)';
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      fontFamily: 'var(--font-core)',
      fontSize: fs,
      fontWeight: 'var(--fw-medium)',
      letterSpacing: 'var(--ls-eyebrow)',
      textTransform: 'uppercase',
      color: 'var(--ink-900)',
      lineHeight: 1.2,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: 'var(--radius-pill)',
      background: dot,
      flex: '0 0 auto'
    }
  }), children);
}
Object.assign(__ds_scope, { SectionLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SectionLabel.jsx", error: String((e && e.message) || e) }); }

// components/data/BarSeries.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function BarSeries({
  data = [],
  height = 120,
  gap = 2,
  tone = 'ink',
  highlightIndex = -1,
  barWidth,
  rounded = false,
  baseline = false,
  style,
  ...rest
}) {
  const max = Math.max(1, ...data.map(d => typeof d === 'number' ? d : d.value));
  const stroke = {
    ink: 'var(--ink-900)',
    gray: 'var(--light-gray)',
    accent: 'var(--mint-400)'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 0,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap,
      height,
      minWidth: 0
    }
  }, data.map((d, i) => {
    const v = typeof d === 'number' ? d : d.value;
    const t = typeof d === 'number' ? tone : d.tone || tone;
    const hot = i === highlightIndex;
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      title: typeof d === 'number' ? undefined : d.label,
      style: {
        flex: barWidth ? '0 0 auto' : 1,
        width: barWidth,
        minWidth: barWidth ? undefined : 1,
        height: Math.max(2, v / max * height),
        background: hot ? 'var(--mint-400)' : stroke[t] || stroke.ink,
        borderRadius: rounded ? 'var(--radius-xs)' : 0,
        transition: 'height var(--dur-base) var(--ease-out), background-color var(--dur-fast) linear'
      }
    });
  })), baseline ? /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--grid-line)'
    }
  }) : null);
}
Object.assign(__ds_scope, { BarSeries });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/BarSeries.jsx", error: String((e && e.message) || e) }); }

// components/data/Gauge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Gauge({
  value = 0,
  max = 100,
  size = 200,
  thickness = 5,
  tone = 'ink',
  label,
  caption,
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = (size - thickness) / 2;
  const cx = size / 2,
    cy = size / 2;
  const arc = (from, to) => {
    const a0 = Math.PI * (1 + from),
      a1 = Math.PI * (1 + to);
    const x0 = cx + r * Math.cos(a0),
      y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1),
      y1 = cy + r * Math.sin(a1);
    return 'M ' + x0 + ' ' + y0 + ' A ' + r + ' ' + r + ' 0 0 1 ' + x1 + ' ' + y1;
  };
  const stroke = tone === 'accent' ? 'var(--mint-400)' : 'var(--ink-900)';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size / 2 + thickness,
    viewBox: '0 0 ' + size + ' ' + (size / 2 + thickness),
    role: "img",
    "aria-label": label ? String(label) : 'gauge'
  }, /*#__PURE__*/React.createElement("path", {
    d: arc(0, 1),
    fill: "none",
    stroke: "var(--light-gray)",
    strokeWidth: thickness,
    strokeLinecap: "round"
  }), pct > 0 ? /*#__PURE__*/React.createElement("path", {
    d: arc(0, pct),
    fill: "none",
    stroke: stroke,
    strokeWidth: thickness,
    strokeLinecap: "round"
  }) : null), label || caption ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, label ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-h1)',
      lineHeight: 1,
      color: 'var(--text-display)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, label) : null, caption ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-body-s)',
      color: 'var(--text-muted)',
      marginTop: 4
    }
  }, caption) : null) : null);
}
Object.assign(__ds_scope, { Gauge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Gauge.jsx", error: String((e && e.message) || e) }); }

// components/data/InsightPopover.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function InsightPopover({
  value,
  delta,
  deltaTone = 'accent',
  children,
  onDismiss,
  tone = 'light',
  style,
  ...rest
}) {
  const dark = tone === 'dark';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'relative',
      display: 'inline-flex',
      flexDirection: 'column',
      gap: '8px',
      minWidth: 200,
      maxWidth: 280,
      padding: '14px 32px 14px 16px',
      borderRadius: 'var(--radius-md)',
      background: dark ? 'var(--glass-invert)' : 'var(--glass-light)',
      backdropFilter: 'var(--blur-glass)',
      WebkitBackdropFilter: 'var(--blur-glass)',
      boxShadow: 'var(--shadow-popover)',
      color: dark ? 'rgba(255,255,255,.8)' : 'var(--text-body)',
      ...style
    }
  }, rest), value || delta ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, value ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-h3)',
      lineHeight: 1,
      color: dark ? 'var(--white)' : 'var(--text-display)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, value) : null, delta ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      height: 20,
      padding: '0 9px',
      borderRadius: 'var(--radius-pill)',
      fontSize: 'var(--fs-micro)',
      fontWeight: 'var(--fw-medium)',
      background: deltaTone === 'invert' ? 'var(--surface-invert)' : 'var(--accent)',
      color: deltaTone === 'invert' ? 'var(--text-on-invert)' : 'var(--text-on-accent)'
    }
  }, delta) : null) : null, children ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-body-s)',
      lineHeight: 'var(--lh-normal)'
    }
  }, children) : null, onDismiss ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Dismiss",
    onClick: onDismiss,
    style: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 18,
      height: 18,
      padding: 0,
      border: 0,
      background: 'transparent',
      cursor: 'pointer',
      color: dark ? 'rgba(255,255,255,.5)' : 'var(--ink-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-x",
    style: {
      fontSize: 11,
      lineHeight: 0
    },
    "aria-hidden": "true"
  })) : null);
}
Object.assign(__ds_scope, { InsightPopover });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/InsightPopover.jsx", error: String((e && e.message) || e) }); }

// components/data/LegendList.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function LegendList({
  items = [],
  columns = 2,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(' + columns + ', minmax(0,auto))',
      gap: '6px 18px',
      justifyContent: 'start',
      ...style
    }
  }, rest), items.map((it, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: 'var(--font-core)',
      fontSize: 'var(--fs-body-s)',
      color: 'var(--text-body)',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: 'var(--radius-pill)',
      background: it.color || 'var(--ink-300)',
      flex: '0 0 auto'
    }
  }), it.label, it.value ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, it.value) : null)));
}
Object.assign(__ds_scope, { LegendList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/LegendList.jsx", error: String((e && e.message) || e) }); }

// components/data/MetricBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  hero: {
    fs: 'var(--fs-display-xl)',
    fw: 'var(--fw-regular)'
  },
  lg: {
    fs: 'var(--fs-display-m)',
    fw: 'var(--fw-regular)'
  },
  md: {
    fs: 'var(--fs-h1)',
    fw: 'var(--fw-regular)'
  },
  sm: {
    fs: 'var(--fs-h3)',
    fw: 'var(--fw-regular)'
  }
};
function MetricBlock({
  value,
  caption,
  prefix,
  delta,
  deltaTone = 'accent',
  size = 'md',
  align = 'left',
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      alignItems: align === 'center' ? 'center' : 'flex-start',
      minWidth: 0,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: s.fs,
      fontWeight: s.fw,
      lineHeight: 'var(--lh-tight)',
      letterSpacing: 'var(--ls-display)',
      color: 'var(--text-display)',
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap'
    }
  }, prefix, value), delta ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      height: 22,
      padding: '0 10px',
      borderRadius: 'var(--radius-pill)',
      fontSize: 'var(--fs-caption)',
      fontWeight: 'var(--fw-medium)',
      background: deltaTone === 'invert' ? 'var(--surface-invert)' : 'var(--accent)',
      color: deltaTone === 'invert' ? 'var(--text-on-invert)' : 'var(--text-on-accent)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, delta) : null), caption ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-core)',
      fontSize: 'var(--fs-body-s)',
      color: 'var(--text-muted)'
    }
  }, caption) : null);
}
Object.assign(__ds_scope, { MetricBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/MetricBlock.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchInput.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  size = 'md',
  detached = false,
  tone = 'light',
  trailing,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 'var(--control-h-sm)' : size === 'lg' ? 'var(--control-h-lg)' : 'var(--control-h)';
  const dark = tone === 'dark';
  const field = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flex: 1,
      minWidth: 0,
      height: h,
      padding: '0 14px',
      borderRadius: 'var(--radius-md)',
      background: dark ? 'rgba(255,255,255,.08)' : 'var(--surface-000)',
      boxShadow: dark ? 'none' : focus ? 'inset 0 0 0 1px var(--ink-900)' : 'inset 0 0 0 1px var(--border-field)',
      transition: 'var(--transition-control)'
    }
  }, !detached ? /*#__PURE__*/React.createElement("i", {
    className: "ph ph-magnifying-glass",
    "aria-hidden": "true",
    style: {
      fontSize: 'var(--icon-sm)',
      color: dark ? 'rgba(255,255,255,.55)' : 'var(--ink-300)',
      lineHeight: 0
    }
  }) : null, /*#__PURE__*/React.createElement("input", _extends({
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-core)',
      fontSize: 'var(--fs-body-s)',
      color: dark ? 'var(--white)' : 'var(--ink-900)'
    }
  }, rest)), trailing);
  if (!detached) return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      minWidth: 0,
      ...style
    }
  }, field);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: h,
      height: h,
      flex: '0 0 auto',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-000)',
      boxShadow: 'inset 0 0 0 1px var(--border-field)',
      color: 'var(--ink-900)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-magnifying-glass",
    "aria-hidden": "true",
    style: {
      fontSize: 'var(--icon-sm)',
      lineHeight: 0
    }
  })), field);
}
Object.assign(__ds_scope, { SearchInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchInput.jsx", error: String((e && e.message) || e) }); }

// components/forms/SeriesToggle.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SeriesToggle({
  options = [],
  value,
  onChange,
  gap = 'var(--space-5)',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "radiogroup",
    style: {
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap,
      ...style
    }
  }, rest), options.map(opt => {
    const o = typeof opt === 'string' ? {
      value: opt,
      label: opt
    } : opt;
    const on = o.value === value;
    const swatch = o.color || 'var(--ink-900)';
    return /*#__PURE__*/React.createElement("button", {
      key: o.value,
      type: "button",
      role: "radio",
      "aria-checked": on,
      onClick: () => onChange && onChange(o.value),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        border: 0,
        background: 'transparent',
        padding: 0,
        cursor: 'pointer',
        fontFamily: 'var(--font-core)',
        fontSize: 'var(--fs-body-s)',
        color: on ? 'var(--ink-900)' : 'var(--text-muted)',
        transition: 'var(--transition-control)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 11,
        height: 11,
        borderRadius: 'var(--radius-pill)',
        background: on ? swatch : 'transparent',
        boxShadow: on ? 'none' : 'inset 0 0 0 1.5px var(--ink-200)',
        transition: 'var(--transition-control)'
      }
    }), o.label);
  }));
}
Object.assign(__ds_scope, { SeriesToggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SeriesToggle.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  checked = false,
  onChange,
  label,
  disabled = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? .4 : 1,
      fontFamily: 'var(--font-core)',
      fontSize: 'var(--fs-body-s)',
      color: 'var(--ink-700)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    onClick: () => onChange && onChange(!checked),
    style: {
      width: 40,
      height: 22,
      flex: '0 0 auto',
      padding: 2,
      border: 0,
      borderRadius: 'var(--radius-pill)',
      cursor: 'inherit',
      background: checked ? 'var(--accent)' : 'var(--light-gray)',
      transition: 'var(--transition-control)',
      display: 'flex',
      justifyContent: checked ? 'flex-end' : 'flex-start',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: 'var(--radius-pill)',
      background: checked ? 'var(--ink-900)' : 'var(--white)',
      boxShadow: 'var(--shadow-1)',
      transition: 'var(--transition-control)'
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tabs({
  items = [],
  value,
  onChange,
  variant = 'underline',
  size = 'md',
  style,
  ...rest
}) {
  const fs = size === 'sm' ? 'var(--fs-caption)' : 'var(--fs-body-s)';
  const norm = items.map(i => typeof i === 'string' ? {
    value: i,
    label: i
  } : i);
  if (variant === 'pill') {
    return /*#__PURE__*/React.createElement("div", _extends({
      role: "tablist",
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
        ...style
      }
    }, rest), norm.map(i => {
      const on = i.value === value;
      return /*#__PURE__*/React.createElement("button", {
        key: i.value,
        type: "button",
        role: "tab",
        "aria-selected": on,
        onClick: () => onChange && onChange(i.value),
        style: {
          height: 34,
          padding: '0 16px',
          border: 0,
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          fontFamily: 'var(--font-core)',
          fontSize: fs,
          fontWeight: 'var(--fw-medium)',
          background: on ? 'var(--surface-invert)' : 'transparent',
          color: on ? 'var(--text-on-invert)' : 'var(--ink-700)',
          transition: 'var(--transition-control)'
        }
      }, i.label);
    }));
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-5)',
      flexWrap: 'wrap',
      ...style
    }
  }, rest), norm.map(i => {
    const on = i.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: i.value,
      type: "button",
      role: "tab",
      "aria-selected": on,
      onClick: () => onChange && onChange(i.value),
      style: {
        border: 0,
        background: 'transparent',
        padding: '0 0 4px',
        cursor: 'pointer',
        fontFamily: 'var(--font-core)',
        fontSize: fs,
        color: on ? 'var(--ink-900)' : 'var(--text-muted)',
        borderBottom: on ? '1.5px solid var(--ink-900)' : '1.5px solid transparent',
        transition: 'var(--transition-control)'
      }
    }, i.label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/AvatarStack.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function AvatarStack({
  people = [],
  size = 30,
  overlap = 8,
  action,
  count,
  style,
  ...rest
}) {
  const hasAction = Boolean(action || count);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: hasAction ? '3px 3px 3px 3px' : 0,
      borderRadius: hasAction ? 'var(--radius-sm)' : 0,
      background: hasAction ? 'var(--surface-invert)' : 'transparent',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex'
    }
  }, people.map((p, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    title: p.name,
    style: {
      width: size,
      height: size,
      marginLeft: i === 0 ? 0 : -overlap,
      borderRadius: 'var(--radius-xs)',
      overflow: 'hidden',
      background: 'var(--light-gray)',
      border: '1.5px solid ' + (hasAction ? 'var(--black)' : 'var(--white)'),
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 'var(--fw-medium)',
      color: 'var(--ink-700)'
    }
  }, p.src ? /*#__PURE__*/React.createElement("img", {
    src: p.src,
    alt: p.name || '',
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : p.initials || ''))), hasAction ? /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '0 12px 0 10px',
      fontFamily: 'var(--font-core)',
      fontSize: 'var(--fs-body-s)',
      color: 'var(--text-on-invert)',
      whiteSpace: 'nowrap'
    }
  }, action || count) : null);
}
Object.assign(__ds_scope, { AvatarStack });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/AvatarStack.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Breadcrumb.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Breadcrumb({
  items = [],
  separator = '/',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      flexWrap: 'wrap',
      fontFamily: 'var(--font-core)',
      fontSize: 'var(--fs-body-s)',
      color: 'var(--text-muted)',
      ...style
    }
  }, rest), items.map((it, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-200)'
    }
  }, separator) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      color: i === items.length - 1 ? 'var(--ink-700)' : 'var(--text-muted)'
    }
  }, it.icon ? /*#__PURE__*/React.createElement("i", {
    className: it.icon,
    style: {
      fontSize: 'var(--icon-sm)',
      lineHeight: 0
    },
    "aria-hidden": "true"
  }) : null, it.label))));
}
Object.assign(__ds_scope, { Breadcrumb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Breadcrumb.jsx", error: String((e && e.message) || e) }); }

// components/navigation/CommandBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function CommandBar({
  placeholder = 'Ask anything or search',
  value,
  onChange,
  onSubmit,
  suggestions = [],
  onSuggestion,
  actions,
  width = 640,
  floating = true,
  style,
  ...rest
}) {
  const [text, setText] = React.useState('');
  const v = value !== undefined ? value : text;
  const set = next => {
    if (onChange) onChange(next);else setText(next);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 0,
      width,
      maxWidth: '100%',
      ...style
    }
  }, rest), suggestions.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'nowrap',
      overflow: 'hidden',
      padding: '8px 10px 14px',
      margin: '0 10px -10px',
      borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
      background: 'rgba(58,58,60,.82)',
      backdropFilter: 'var(--blur-glass)',
      WebkitBackdropFilter: 'var(--blur-glass)'
    }
  }, suggestions.map((s, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    type: "button",
    onClick: () => onSuggestion && onSuggestion(s),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      height: 28,
      padding: '0 6px 0 12px',
      border: 0,
      borderRadius: 'var(--radius-xs)',
      background: 'rgba(255,255,255,.1)',
      color: 'rgba(255,255,255,.85)',
      fontFamily: 'var(--font-core)',
      fontSize: 'var(--fs-caption)',
      whiteSpace: 'nowrap',
      cursor: 'pointer'
    }
  }, s, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--accent)',
      color: 'var(--text-on-accent)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-bold ph-plus",
    style: {
      fontSize: 9,
      lineHeight: 0
    },
    "aria-hidden": "true"
  }))))) : null, /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      onSubmit && onSubmit(v);
    },
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      height: 56,
      padding: '0 8px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-invert)',
      boxShadow: floating ? 'var(--shadow-4)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      flex: '0 0 auto',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--accent)',
      color: 'var(--text-on-accent)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-sparkle",
    style: {
      fontSize: 'var(--icon)',
      lineHeight: 0
    },
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("input", {
    value: v,
    onChange: e => set(e.target.value),
    placeholder: placeholder,
    style: {
      flex: 1,
      minWidth: 0,
      height: '100%',
      border: 0,
      outline: 'none',
      background: 'transparent',
      textAlign: 'center',
      fontFamily: 'var(--font-core)',
      fontSize: 'var(--fs-body)',
      color: 'var(--white)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      flex: '0 0 auto'
    }
  }, actions || /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 'var(--radius-sm)',
      background: 'rgba(255,255,255,.1)',
      color: 'rgba(255,255,255,.85)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-microphone",
    style: {
      fontSize: 'var(--icon-sm)',
      lineHeight: 0
    },
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 'var(--radius-sm)',
      background: 'rgba(255,255,255,.1)',
      color: 'rgba(255,255,255,.85)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-squares-four",
    style: {
      fontSize: 'var(--icon-sm)',
      lineHeight: 0
    },
    "aria-hidden": "true"
  }))))));
}
Object.assign(__ds_scope, { CommandBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/CommandBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavRail.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function NavRail({
  items = [],
  value,
  onChange,
  gap = 8,
  size = 'lg',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap,
      ...style
    }
  }, rest), items.map(it => /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    key: it.value,
    icon: it.value === value ? it.iconActive || it.icon : it.icon,
    label: it.label,
    size: size,
    active: it.value === value,
    badge: it.badge,
    onClick: () => onChange && onChange(it.value)
  })));
}
Object.assign(__ds_scope, { NavRail });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavRail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/MobileScreens.jsx
try { (() => {
// UNBSTOOLS mobile — 390x844. Three screens behind a live tab bar.
(() => {
  const {
    MetricBlock,
    BarSeries,
    SeriesToggle,
    Tabs,
    InsightPopover,
    IconButton,
    Card,
    Badge,
    Gauge,
    Switch,
    SectionLabel,
    LegendList
  } = window.DS;
  function StatusBar() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 54,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 26px',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        gap: 6,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("i", {
      className: "ph-fill ph-cell-signal-full",
      style: {
        fontSize: 14
      }
    }), /*#__PURE__*/React.createElement("i", {
      className: "ph-fill ph-wifi-high",
      style: {
        fontSize: 14
      }
    }), /*#__PURE__*/React.createElement("i", {
      className: "ph-fill ph-battery-full",
      style: {
        fontSize: 16
      }
    })));
  }
  function MobileHeader({
    title
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '4px 20px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement(Wordmark, {
      size: 14
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      size: "md",
      variant: "accent",
      icon: "ph-fill ph-sparkle",
      label: "Assistant"
    }), /*#__PURE__*/React.createElement(IconButton, {
      size: "md",
      icon: "ph ph-gear",
      label: "Settings"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 40,
        height: 40,
        borderRadius: 10,
        background: 'var(--light-gray)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: '500 12px/1 var(--font-core)',
        color: 'var(--ink-700)'
      }
    }, "SM"))), /*#__PURE__*/React.createElement("h1", {
      style: {
        font: '400 30px/1.1 var(--font-display)',
        letterSpacing: '-.015em',
        color: 'var(--ink-900)'
      }
    }, title));
  }
  function MobileOverview() {
    const [series, setSeries] = React.useState('exports');
    const [period, setPeriod] = React.useState('Month');
    const [tip, setTip] = React.useState(true);
    const bars = Array.from({
      length: 46
    }, (_, i) => 24 + Math.round(22 * Math.sin(i / 5)) + i * 31 % 15);
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MobileHeader, {
      title: "Overview"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "u-eyebrow"
    }, "Half-year statement"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      size: "sm",
      variant: "quiet",
      icon: "ph ph-sliders-horizontal",
      label: "Configure"
    }), /*#__PURE__*/React.createElement(IconButton, {
      size: "sm",
      variant: "quiet",
      icon: "ph ph-corners-out",
      label: "Expand"
    }))), /*#__PURE__*/React.createElement(SeriesToggle, {
      gap: "var(--space-3)",
      value: series,
      onChange: setSeries,
      options: [{
        value: 'exports',
        label: 'Exports',
        color: 'var(--series-1)'
      }, {
        value: 'renders',
        label: 'Renders',
        color: 'var(--series-2)'
      }, {
        value: 'assets',
        label: 'Assets',
        color: 'var(--series-3)'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Tabs, {
      value: period,
      onChange: setPeriod,
      items: ['Week', 'Month', 'Quarter', 'Year']
    })), /*#__PURE__*/React.createElement(MetricBlock, {
      size: "lg",
      align: "center",
      value: "1,651,045",
      caption: "Assets processed"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement(BarSeries, {
      data: bars,
      height: 120,
      gap: 2,
      tone: "gray"
    }), tip ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: 18,
        top: 4
      }
    }, /*#__PURE__*/React.createElement(InsightPopover, {
      delta: "+32%",
      onDismiss: () => setTip(false)
    }, "exports grew through the half-year")) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Card, {
      label: "Render minutes",
      padding: "16px",
      actions: /*#__PURE__*/React.createElement(IconButton, {
        size: "sm",
        variant: "quiet",
        icon: "ph ph-corners-out",
        label: "Expand"
      })
    }, /*#__PURE__*/React.createElement(MetricBlock, {
      value: "17,2k",
      caption: "This month",
      delta: "+10%"
    }), /*#__PURE__*/React.createElement(LegendList, {
      columns: 2,
      items: [{
        label: 'Video',
        color: 'var(--series-1)'
      }, {
        label: 'Stills',
        color: 'var(--series-2)'
      }]
    })), /*#__PURE__*/React.createElement(Card, {
      label: "Insight",
      padding: "16px",
      dot: true
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 14,
        lineHeight: 1.4,
        color: 'var(--ink-900)',
        textAlign: 'center'
      }
    }, "The new export preset ", /*#__PURE__*/React.createElement("strong", {
      style: {
        fontWeight: 600
      }
    }, "halved handoff time")), /*#__PURE__*/React.createElement(Gauge, {
      value: 72,
      size: 190,
      tone: "ink"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement(MetricBlock, {
      size: "sm",
      value: "57,6k",
      caption: "Before"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement(MetricBlock, {
      size: "sm",
      value: "93,5k",
      caption: "After"
    })))))));
  }
  function MobileLibrary() {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MobileHeader, {
      title: "Library"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Tabs, {
      variant: "pill",
      size: "sm",
      value: "All",
      onChange: () => {},
      items: ['All', 'Layout', 'Colour', 'Type']
    }), [['Grid Forge', 'Layout', '12,4k', 'Updated'], ['Palette Lift', 'Colour', '9,8k', null], ['Type Ramp', 'Typography', '8,1k', 'New'], ['Mask Studio', 'Imagery', '6,6k', null], ['Token Sync', 'Systems', '4,9k', 'Beta']].map(([n, k, u, tag]) => /*#__PURE__*/React.createElement(Card, {
      key: n,
      padding: "14px",
      radius: "var(--radius-md)",
      style: {
        gap: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 46,
        height: 46,
        borderRadius: 10,
        background: 'var(--bg-inset)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto'
      }
    }, /*#__PURE__*/React.createElement("i", {
      className: "ph ph-image",
      style: {
        fontSize: 18,
        color: 'var(--ink-200)'
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 15,
        fontWeight: 500,
        color: 'var(--ink-900)'
      }
    }, n), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, k, " \xB7 ", u, " runs")), tag ? /*#__PURE__*/React.createElement(Badge, {
      tone: tag === 'Beta' ? 'neutral' : 'accent'
    }, tag) : /*#__PURE__*/React.createElement("i", {
      className: "ph ph-caret-right",
      style: {
        fontSize: 14,
        color: 'var(--ink-200)'
      }
    }))))));
  }
  function MobileSettings() {
    const [a, setA] = React.useState(true);
    const [b, setB] = React.useState(false);
    const [c, setC] = React.useState(true);
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MobileHeader, {
      title: "Settings"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Card, {
      padding: "20px"
    }, /*#__PURE__*/React.createElement(SectionLabel, null, "Automation"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Switch, {
      checked: a,
      onChange: setA,
      label: "Auto-export on publish"
    }), /*#__PURE__*/React.createElement(Switch, {
      checked: b,
      onChange: setB,
      label: "Beta tools"
    }), /*#__PURE__*/React.createElement(Switch, {
      checked: c,
      onChange: setC,
      label: "Push run alerts"
    }))), /*#__PURE__*/React.createElement(Card, {
      padding: "20px",
      tone: "quiet"
    }, /*#__PURE__*/React.createElement(SectionLabel, {
      tone: "ink"
    }, "Plan"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement(MetricBlock, {
      size: "sm",
      value: "Pro",
      caption: "$225 / month"
    }), /*#__PURE__*/React.createElement(Badge, {
      tone: "quiet",
      dot: true
    }, "Active")))));
  }
  const TABS = [{
    value: 'overview',
    label: 'Overview',
    icon: 'ph ph-house',
    iconActive: 'ph-fill ph-house'
  }, {
    value: 'library',
    label: 'Library',
    icon: 'ph ph-folder',
    iconActive: 'ph-fill ph-folder'
  }, {
    value: 'automations',
    label: 'Automations',
    icon: 'ph ph-lightning',
    iconActive: 'ph-fill ph-lightning'
  }, {
    value: 'settings',
    label: 'Settings',
    icon: 'ph ph-gear',
    iconActive: 'ph-fill ph-gear'
  }];
  function TabBar({
    tab,
    onTab
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 92,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
        padding: '10px 18px 0',
        background: 'rgba(239,239,241,.86)',
        backdropFilter: 'var(--blur-glass)',
        WebkitBackdropFilter: 'var(--blur-glass)',
        borderTop: '1px solid var(--hairline-soft)'
      }
    }, TABS.map(t => /*#__PURE__*/React.createElement(IconButton, {
      key: t.value,
      size: "lg",
      label: t.label,
      icon: t.value === tab ? t.iconActive : t.icon,
      active: t.value === tab,
      variant: "quiet",
      onClick: () => onTab(t.value)
    })));
  }
  function Phone() {
    const [tab, setTab] = React.useState('overview');
    const Screen = {
      overview: MobileOverview,
      library: MobileLibrary,
      settings: MobileSettings
    }[tab];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        width: 390,
        height: 844,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 54,
        background: 'var(--bg-page)',
        boxShadow: '0 0 0 11px #0b0b0c, var(--shadow-4)'
      }
    }, /*#__PURE__*/React.createElement(StatusBar, null), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 112,
        height: 32,
        borderRadius: 999,
        background: '#0b0b0c'
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "phone-scroll",
      style: {
        height: 'calc(100% - 54px)',
        overflowY: 'auto',
        paddingBottom: 110
      }
    }, Screen ? /*#__PURE__*/React.createElement(Screen, null) : /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '60px 26px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("i", {
      className: "ph ph-stack",
      style: {
        fontSize: 28,
        color: 'var(--ink-200)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 15,
        color: 'var(--ink-900)'
      }
    }, "Automations is not part of this kit"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'var(--text-muted)'
      }
    }, "No mobile source screen was supplied for it."))), /*#__PURE__*/React.createElement(TabBar, {
      tab: tab,
      onTab: setTab
    }));
  }
  Object.assign(window, {
    Phone,
    MobileOverview,
    MobileLibrary,
    MobileSettings,
    TabBar,
    StatusBar,
    MobileHeader
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/MobileScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/SiteHeader.jsx
try { (() => {
// Marketing header — pill nav centred, auth pair right.
(() => {
  const {
    Tabs,
    Button
  } = window.DS;
  function SiteHeader({
    page,
    onPage
  }) {
    return /*#__PURE__*/React.createElement("header", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 24,
        padding: '20px 40px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'rgba(239,239,241,.78)',
        backdropFilter: 'var(--blur-glass)',
        WebkitBackdropFilter: 'var(--blur-glass)'
      }
    }, /*#__PURE__*/React.createElement(Wordmark, null), /*#__PURE__*/React.createElement(Tabs, {
      variant: "pill",
      value: page,
      onChange: onPage,
      items: ['Home', 'Benefits', 'Overview', 'Plans', 'Contact']
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm"
    }, "Sign in"), /*#__PURE__*/React.createElement(Button, {
      size: "sm"
    }, "Get started")));
  }
  Object.assign(window, {
    SiteHeader
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/SiteHeader.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/SiteHero.jsx
try { (() => {
// Hero — centred headline in two weights, button pair, product mock in an inset frame.
(() => {
  const {
    Button,
    Card,
    MetricBlock,
    BarSeries,
    InsightPopover,
    Tabs,
    SeriesToggle,
    IconButton,
    CommandBar
  } = window.DS;
  function MockChrome({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        background: 'var(--white)',
        boxShadow: 'var(--shadow-4)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 38,
        background: 'var(--ink-900)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 14px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        gap: 6
      }
    }, ['#FF5F57', '#FEBC2E', '#28C840'].map(c => /*#__PURE__*/React.createElement("span", {
      key: c,
      style: {
        width: 10,
        height: 10,
        borderRadius: 999,
        background: c
      }
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        maxWidth: 380,
        margin: '0 auto',
        height: 22,
        borderRadius: 6,
        background: 'rgba(255,255,255,.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        color: 'rgba(255,255,255,.62)'
      }
    }, "unbstools.com/workspace")), children);
  }
  function HeroMock() {
    const bars = Array.from({
      length: 58
    }, (_, i) => 30 + Math.round(24 * Math.sin(i / 6)) + Math.round(18 * (i * 37 % 11) / 11));
    return /*#__PURE__*/React.createElement(MockChrome, null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '18px 22px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement(Wordmark, {
      size: 13
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        gap: 6
      }
    }, ['ph-fill ph-house', 'ph ph-folder', 'ph ph-lightning', 'ph ph-briefcase'].map((ic, i) => /*#__PURE__*/React.createElement(IconButton, {
      key: ic,
      size: "sm",
      icon: ic,
      label: "nav",
      active: i === 0
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--text-faint)'
      }
    }, "Stewart Menzies")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 18
      }
    }, /*#__PURE__*/React.createElement(SeriesToggle, {
      value: "exports",
      onChange: () => {},
      options: [{
        value: 'exports',
        label: 'Exports',
        color: 'var(--series-1)'
      }, {
        value: 'renders',
        label: 'Renders',
        color: 'var(--series-2)'
      }]
    }), /*#__PURE__*/React.createElement(MetricBlock, {
      size: "lg",
      align: "center",
      value: "1,651,045",
      caption: "Assets processed"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        justifySelf: 'end'
      }
    }, /*#__PURE__*/React.createElement(Tabs, {
      size: "sm",
      value: "Month",
      onChange: () => {},
      items: ['Week', 'Month', 'Year']
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement(BarSeries, {
      data: bars,
      height: 104,
      gap: 2,
      tone: "gray"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: '40%',
        top: 0
      }
    }, /*#__PURE__*/React.createElement(InsightPopover, {
      value: "115k",
      delta: "+32%"
    }, "asset exports grew through the half-year"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3,1fr)',
        gap: 14
      }
    }, [['141,7k', 'Exports'], ['17,2k', 'Render minutes'], ['92,1k', 'Seat budget']].map(([v, c]) => /*#__PURE__*/React.createElement(Card, {
      key: c,
      tone: "quiet",
      padding: "14px",
      label: c
    }, /*#__PURE__*/React.createElement(MetricBlock, {
      size: "sm",
      value: v
    }))))));
  }
  function SiteHero() {
    return /*#__PURE__*/React.createElement("section", {
      style: {
        padding: '56px 40px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28
      }
    }, /*#__PURE__*/React.createElement("h1", {
      style: {
        font: '400 60px/1.1 var(--font-display)',
        letterSpacing: '-.02em',
        textAlign: 'center',
        color: 'var(--ink-900)',
        maxWidth: '20ch'
      }
    }, "Smarter design tooling.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("strong", {
      style: {
        fontWeight: 600
      }
    }, "Powered by AI.")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 16,
        lineHeight: 1.5,
        color: 'var(--text-muted)',
        textAlign: 'center',
        maxWidth: '52ch'
      }
    }, "UNBSTOOLS keeps every tool, kit and export in one workspace, so designers ship faster without leaving the canvas."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary"
    }, "Free version"), /*#__PURE__*/React.createElement(Button, null, "Get started")), /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100%',
        maxWidth: 'var(--max-content)',
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement(HeroMock, null)));
  }
  Object.assign(window, {
    SiteHero,
    HeroMock,
    MockChrome
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/SiteHero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/SiteSections.jsx
try { (() => {
// Benefits, overview, plans, mobile band and footer.
(() => {
  const {
    SectionLabel,
    Card,
    Button,
    Badge,
    Tabs,
    MetricBlock,
    BarSeries,
    Gauge,
    IconButton,
    LegendList
  } = window.DS;
  function SectionHead({
    label,
    lead,
    strong,
    meta
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 18
      }
    }, /*#__PURE__*/React.createElement(SectionLabel, null, label), /*#__PURE__*/React.createElement("h2", {
      style: {
        font: '400 40px/1.14 var(--font-display)',
        letterSpacing: '-.015em',
        color: 'var(--ink-900)',
        textTransform: 'uppercase',
        maxWidth: '24ch'
      }
    }, lead, " ", /*#__PURE__*/React.createElement("strong", {
      style: {
        fontWeight: 700
      }
    }, strong)), meta ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 1,
        background: 'var(--hairline)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 14,
        color: 'var(--text-faint)'
      }
    }, meta.map(m => /*#__PURE__*/React.createElement("span", {
      key: m
    }, m)))) : null);
  }
  const BENEFITS = [{
    icon: 'ph-fill ph-sparkle',
    t: 'Instant insight',
    d: 'Get the numbers you need across every tool run, without building a report.'
  }, {
    icon: 'ph-fill ph-compass-tool',
    t: 'Smarter decisions',
    d: 'Real-time data and AI suggestions sit next to the canvas, not in another tab.'
  }, {
    icon: 'ph-fill ph-devices',
    t: 'Real-time access',
    d: 'Reach your workspace anytime — desktop, tablet or mobile — with no sync step.'
  }, {
    icon: 'ph-fill ph-stack-simple',
    t: 'One source of truth',
    d: 'Tokens, kits and exports share one library, so nothing drifts between files.'
  }];
  function BenefitsSection() {
    return /*#__PURE__*/React.createElement("section", {
      style: {
        padding: '0 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 36
      }
    }, /*#__PURE__*/React.createElement(SectionHead, {
      label: "Benefits",
      lead: "Smarter design decisions",
      strong: "start with UNBSTOOLS",
      meta: ['AI assisted', 'Token native', '64 tools']
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
        gap: 'var(--gap-card)'
      }
    }, BENEFITS.map(b => /*#__PURE__*/React.createElement(Card, {
      key: b.t,
      tone: "quiet",
      padding: "24px",
      style: {
        gap: 20,
        minHeight: 210,
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 40,
        height: 40,
        borderRadius: 12,
        background: 'var(--mint-400)',
        color: 'var(--ink-900)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("i", {
      className: b.icon,
      style: {
        fontSize: 18
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "u-eyebrow",
      style: {
        color: 'var(--ink-900)'
      }
    }, b.t), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 14,
        lineHeight: 1.5,
        color: 'var(--text-muted)'
      }
    }, b.d))))));
  }
  function OverviewSection() {
    const [view, setView] = React.useState('Analytics');
    const bars = Array.from({
      length: 70
    }, (_, i) => 24 + Math.round(26 * Math.sin(i / 8)) + i * 29 % 17);
    return /*#__PURE__*/React.createElement("section", {
      style: {
        padding: '0 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 32
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(SectionHead, {
      label: "Overview",
      lead: "Explore key metrics",
      strong: "from your dashboard"
    }), /*#__PURE__*/React.createElement(Tabs, {
      variant: "pill",
      value: view,
      onChange: setView,
      items: ['Analytics', 'AI assistant', 'Overview', 'Forecast']
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.6fr 1fr',
        gap: 'var(--gap-card)'
      }
    }, /*#__PURE__*/React.createElement(Card, {
      label: "Production overview",
      dot: true
    }, /*#__PURE__*/React.createElement(BarSeries, {
      data: bars,
      height: 180,
      gap: 2,
      tone: "gray",
      highlightIndex: 52
    }), /*#__PURE__*/React.createElement(LegendList, {
      columns: 4,
      items: [{
        label: 'Exports',
        color: 'var(--series-1)'
      }, {
        label: 'Renders',
        color: 'var(--series-2)'
      }, {
        label: 'Assets',
        color: 'var(--series-3)'
      }, {
        label: 'Handoffs',
        color: 'var(--series-4)'
      }]
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--gap-card)'
      }
    }, /*#__PURE__*/React.createElement(Card, {
      label: "Insight",
      dot: true
    }, /*#__PURE__*/React.createElement(Gauge, {
      value: 72,
      size: 180,
      tone: "ink",
      label: "93,5k",
      caption: "After the new preset"
    })), /*#__PURE__*/React.createElement(Card, {
      tone: "invert",
      label: "Financial snapshot",
      dot: true
    }, /*#__PURE__*/React.createElement(MetricBlock, {
      value: "17,2k",
      caption: "Render minutes",
      style: {
        color: 'var(--white)'
      }
    })))));
  }
  const PLANS = [{
    name: 'Standard plan',
    head: 'Smart design tools for',
    strong: 'growing teams',
    price: '$120',
    tone: 'quiet',
    feats: ['Real-time analytics', 'AI-assisted presets', 'Custom dashboards', 'Forecast tooling', 'Export tracking', 'Multi-device access', 'Shared token library', 'Community support']
  }, {
    name: 'Pro plan',
    head: 'Powerful tooling for',
    strong: 'mature design orgs',
    price: '$225',
    tone: 'invert',
    feats: ['Automated forecast modelling', 'Custom AI reports', 'Team collaboration tools', 'Automated pipelines', 'Priority support access', 'Role-based permissions', 'Mobile app integration', 'Real-time alerts']
  }];
  function PlansSection() {
    return /*#__PURE__*/React.createElement("section", {
      style: {
        padding: '0 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 32
      }
    }, /*#__PURE__*/React.createElement(SectionHead, {
      label: "Plans",
      lead: "Innovative tooling for",
      strong: "digital success",
      meta: ['Monthly billing', 'Cancel anytime', 'Team seats']
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
        gap: 'var(--gap-card)'
      }
    }, PLANS.map(p => {
      const dark = p.tone === 'invert';
      return /*#__PURE__*/React.createElement(Card, {
        key: p.name,
        tone: p.tone,
        padding: "28px",
        style: {
          gap: 22
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "u-eyebrow",
        style: {
          color: dark ? 'rgba(255,255,255,.55)' : 'var(--text-muted)'
        }
      }, p.name), /*#__PURE__*/React.createElement("h3", {
        style: {
          font: '400 26px/1.24 var(--font-display)',
          textTransform: 'uppercase',
          color: dark ? 'var(--white)' : 'var(--ink-900)',
          maxWidth: '20ch'
        }
      }, p.head, " ", /*#__PURE__*/React.createElement("strong", {
        style: {
          fontWeight: 700
        }
      }, p.strong)), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'baseline',
          gap: 4
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          font: '400 40px/1 var(--font-display)',
          color: dark ? 'var(--white)' : 'var(--ink-900)',
          fontVariantNumeric: 'tabular-nums'
        }
      }, p.price), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          color: dark ? 'rgba(255,255,255,.5)' : 'var(--text-faint)'
        }
      }, "/mo")), /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: dark ? 'primary' : 'invert'
      }, "Select plan"), /*#__PURE__*/React.createElement("div", {
        style: {
          height: 1,
          background: dark ? 'rgba(255,255,255,.14)' : 'var(--hairline)'
        }
      }), /*#__PURE__*/React.createElement("ul", {
        style: {
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px 20px'
        }
      }, p.feats.map(f => /*#__PURE__*/React.createElement("li", {
        key: f,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: dark ? 'rgba(255,255,255,.78)' : 'var(--text-body)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 5,
          height: 5,
          borderRadius: 999,
          background: dark ? 'var(--mint-400)' : 'var(--ink-900)',
          flex: '0 0 auto'
        }
      }), f))));
    })));
  }
  function MobileBand() {
    return /*#__PURE__*/React.createElement("section", {
      style: {
        padding: '0 40px'
      }
    }, /*#__PURE__*/React.createElement(Card, {
      tone: "quiet",
      padding: "0",
      style: {
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'center',
        gap: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '48px 44px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        font: '400 34px/1.18 var(--font-display)',
        textTransform: 'uppercase',
        color: 'var(--ink-900)',
        maxWidth: '20ch'
      }
    }, "Your workspace, ", /*#__PURE__*/React.createElement("strong", {
      style: {
        fontWeight: 700
      }
    }, "always within reach")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 15,
        lineHeight: 1.5,
        color: 'var(--text-muted)',
        maxWidth: '44ch'
      }
    }, "Download the UNBSTOOLS app to review runs, approve exports and ask the assistant from anywhere."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10
      }
    }, [['ph-fill ph-apple-logo', 'App Store'], ['ph-fill ph-google-play-logo', 'Google Play']].map(([ic, l]) => /*#__PURE__*/React.createElement("span", {
      key: l,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        height: 40,
        padding: '0 16px',
        borderRadius: 10,
        background: 'var(--ink-900)',
        color: 'var(--white)',
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("i", {
      className: ic,
      style: {
        fontSize: 16
      }
    }), l)))), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 320,
        background: 'var(--bg-inset)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("i", {
      className: "ph ph-device-mobile",
      style: {
        fontSize: 34,
        color: 'var(--ink-200)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--text-faint)',
        letterSpacing: 'var(--ls-caps)'
      }
    }, "APP PHOTOGRAPHY PLACEHOLDER")))));
  }
  function SiteFooter() {
    return /*#__PURE__*/React.createElement("footer", {
      style: {
        padding: '40px 40px 0',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 26,
        background: 'var(--white)',
        borderRadius: 'var(--radius-xl)',
        padding: '36px 36px 0'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Wordmark, null), /*#__PURE__*/React.createElement("nav", {
      style: {
        display: 'flex',
        gap: 26,
        fontSize: 14
      }
    }, ['Home', 'Benefits', 'Overview', 'Pricing', 'Help', 'Contact'].map(l => /*#__PURE__*/React.createElement("a", {
      key: l,
      href: "#top",
      style: {
        borderBottom: 0,
        color: 'var(--text-muted)'
      }
    }, l)))), /*#__PURE__*/React.createElement("div", {
      style: {
        font: '600 clamp(60px, 15vw, 190px)/0.9 var(--font-display)',
        letterSpacing: '-.04em',
        color: 'var(--surface-100)',
        marginBottom: -34,
        userSelect: 'none',
        whiteSpace: 'nowrap'
      }
    }, "UNBSTOOLS")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '18px 4px 32px',
        fontSize: 12,
        color: 'var(--text-faint)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 UNBSTOOLS. All rights reserved."), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement("span", null, "Terms"), /*#__PURE__*/React.createElement("span", null, "Privacy"), /*#__PURE__*/React.createElement("span", null, "Cookies"))));
  }
  Object.assign(window, {
    SectionHead,
    BenefitsSection,
    OverviewSection,
    PlansSection,
    MobileBand,
    SiteFooter
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/SiteSections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/AppShell.jsx
try { (() => {
// UNBSTOOLS Workspace — chrome: top bar, nav rail, title row.
(() => {
  const {
    NavRail,
    SearchInput,
    IconButton,
    Breadcrumb,
    AvatarStack
  } = window.DS;
  const NAV = [{
    value: 'overview',
    label: 'Overview',
    icon: 'ph ph-house',
    iconActive: 'ph-fill ph-house'
  }, {
    value: 'library',
    label: 'Library',
    icon: 'ph ph-folder',
    iconActive: 'ph-fill ph-folder'
  }, {
    value: 'automations',
    label: 'Automations',
    icon: 'ph ph-lightning',
    iconActive: 'ph-fill ph-lightning'
  }, {
    value: 'kits',
    label: 'Kits',
    icon: 'ph ph-briefcase',
    iconActive: 'ph-fill ph-briefcase'
  }, {
    value: 'docs',
    label: 'Docs',
    icon: 'ph ph-file-text',
    iconActive: 'ph-fill ph-file-text'
  }, {
    value: 'team',
    label: 'Team',
    icon: 'ph ph-users-three',
    iconActive: 'ph-fill ph-users-three',
    badge: true
  }, {
    value: 'usage',
    label: 'Usage',
    icon: 'ph ph-chart-line',
    iconActive: 'ph-fill ph-chart-line'
  }];
  const TEAM = [{
    initials: 'AM'
  }, {
    initials: 'RS'
  }, {
    initials: 'KT'
  }];
  function Wordmark({
    size = 17
  }) {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: '600 ' + size + 'px/1 var(--font-display)',
        letterSpacing: '-.015em',
        color: 'var(--ink-900)'
      }
    }, "UNBSTOOLS"));
  }
  function TopBar({
    tab,
    onTab
  }) {
    return /*#__PURE__*/React.createElement("header", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 24,
        padding: '18px var(--gutter-page) 0'
      }
    }, /*#__PURE__*/React.createElement(Wordmark, null), /*#__PURE__*/React.createElement(NavRail, {
      value: tab,
      onChange: onTab,
      items: NAV
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(SearchInput, {
      detached: true,
      placeholder: "Type a tool name or ID...",
      style: {
        width: 300
      }
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "ph-fill ph-bell",
      label: "Notifications",
      badge: true
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "ph ph-gear",
      label: "Settings"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        paddingLeft: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 40,
        height: 40,
        borderRadius: 10,
        background: 'var(--light-gray)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: '500 13px/1 var(--font-core)',
        color: 'var(--ink-700)'
      }
    }, "SM"), /*#__PURE__*/React.createElement("span", {
      style: {
        lineHeight: 1.25
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 14,
        fontWeight: 500,
        color: 'var(--ink-900)'
      }
    }, "Stewart Menzies"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 12,
        color: 'var(--text-faint)'
      }
    }, "Manager")))));
  }
  function TitleRow({
    title,
    crumbs,
    actions
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        padding: '20px var(--gutter-page) 0',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement("h1", {
      style: {
        font: '400 40px/1.1 var(--font-display)',
        letterSpacing: '-.015em',
        color: 'var(--ink-900)'
      }
    }, title), crumbs ? /*#__PURE__*/React.createElement(Breadcrumb, {
      items: crumbs
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, actions, /*#__PURE__*/React.createElement(IconButton, {
      icon: "ph-fill ph-lightning",
      label: "Run automation"
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "ph-fill ph-star",
      label: "Favourite"
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "ph ph-gear",
      label: "View settings"
    }), /*#__PURE__*/React.createElement(AvatarStack, {
      action: "Share",
      people: TEAM
    })));
  }
  Object.assign(window, {
    Wordmark,
    TopBar,
    TitleRow,
    NAV,
    TEAM
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/AutomationsScreen.jsx
try { (() => {
// Automations — the system's list treatment: hairline rows, no table chrome.
(() => {
  const {
    Card,
    Switch,
    Badge,
    Button,
    IconButton,
    SectionLabel,
    MetricBlock,
    BarSeries
  } = window.DS;
  const ROWS = [{
    name: 'Export on publish',
    trigger: 'Figma · file published',
    runs: '1,284',
    on: true
  }, {
    name: 'Token sync to repo',
    trigger: 'Library · variables changed',
    runs: '962',
    on: true
  }, {
    name: 'Contrast audit',
    trigger: 'Frame · marked ready',
    runs: '714',
    on: false
  }, {
    name: 'Render 3D preview',
    trigger: 'Asset · 3D uploaded',
    runs: '503',
    on: true
  }, {
    name: 'Handoff spec sheet',
    trigger: 'Frame · dev-ready tag',
    runs: '388',
    on: false
  }];
  function AutomationRow({
    r,
    onToggle
  }) {
    const [hover, setHover] = React.useState(false);
    return /*#__PURE__*/React.createElement("div", {
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 240px 110px 120px',
        alignItems: 'center',
        gap: 20,
        padding: '18px 8px',
        borderTop: '1px solid var(--hairline-soft)',
        background: hover ? 'var(--surface-050)' : 'transparent',
        transition: 'background-color var(--dur-fast) linear'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 34,
        height: 34,
        borderRadius: 10,
        flex: '0 0 auto',
        background: r.on ? 'var(--mint-050)' : 'var(--surface-100)',
        color: r.on ? 'var(--mint-600)' : 'var(--ink-300)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("i", {
      className: "ph-fill ph-lightning",
      style: {
        fontSize: 15
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 15,
        color: 'var(--ink-900)'
      }
    }, r.name)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'var(--text-muted)'
      }
    }, r.trigger), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'var(--text-muted)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, r.runs, " runs"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 10
      }
    }, r.on ? /*#__PURE__*/React.createElement(Badge, {
      tone: "quiet",
      dot: true
    }, "Live") : /*#__PURE__*/React.createElement(Badge, {
      tone: "neutral"
    }, "Paused"), /*#__PURE__*/React.createElement(Switch, {
      checked: r.on,
      onChange: () => onToggle(r.name)
    })));
  }
  function AutomationsScreen() {
    const [rows, setRows] = React.useState(ROWS);
    const toggle = name => setRows(rs => rs.map(r => r.name === name ? {
      ...r,
      on: !r.on
    } : r));
    const live = rows.filter(r => r.on).length;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '24px var(--gutter-page) 140px',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--gap-card)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
        gap: 'var(--gap-card)'
      }
    }, /*#__PURE__*/React.createElement(Card, {
      label: "Live automations",
      dot: true
    }, /*#__PURE__*/React.createElement(MetricBlock, {
      value: live + ' / ' + rows.length,
      caption: "Enabled"
    })), /*#__PURE__*/React.createElement(Card, {
      label: "Runs this month"
    }, /*#__PURE__*/React.createElement(MetricBlock, {
      value: "3,851",
      caption: "Executions",
      delta: "+18%"
    })), /*#__PURE__*/React.createElement(Card, {
      label: "Time saved"
    }, /*#__PURE__*/React.createElement(MetricBlock, {
      value: "412h",
      caption: "Across the team"
    }), /*#__PURE__*/React.createElement(BarSeries, {
      data: [30, 44, 38, 62, 55, 78, 71],
      height: 52,
      gap: 10,
      rounded: true,
      tone: "gray",
      highlightIndex: 5
    }))), /*#__PURE__*/React.createElement(Card, {
      padding: "24px"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(SectionLabel, null, "All automations"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      icon: "ph ph-funnel"
    }, "Filter"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      icon: "ph ph-plus"
    }, "New automation"))), /*#__PURE__*/React.createElement("div", null, rows.map(r => /*#__PURE__*/React.createElement(AutomationRow, {
      key: r.name,
      r: r,
      onToggle: toggle
    })))));
  }
  Object.assign(window, {
    AutomationsScreen,
    AutomationRow
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/AutomationsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/LibraryScreen.jsx
try { (() => {
// Library — asset + tool grid. Image slots are intentionally left as flat
// tinted placeholders: no real product imagery was supplied.
(() => {
  const {
    Card,
    Badge,
    Tabs,
    Button,
    IconButton,
    SectionLabel
  } = window.DS;
  const TOOLS = [{
    name: 'Grid Forge',
    kind: 'Layout',
    uses: '12,4k',
    tag: 'Updated'
  }, {
    name: 'Palette Lift',
    kind: 'Colour',
    uses: '9,8k'
  }, {
    name: 'Type Ramp',
    kind: 'Typography',
    uses: '8,1k',
    tag: 'New'
  }, {
    name: 'Mask Studio',
    kind: 'Imagery',
    uses: '6,6k'
  }, {
    name: 'Spec Sheet',
    kind: 'Handoff',
    uses: '5,2k'
  }, {
    name: 'Token Sync',
    kind: 'Systems',
    uses: '4,9k',
    tag: 'Beta'
  }, {
    name: 'Frame Audit',
    kind: 'QA',
    uses: '3,7k'
  }, {
    name: 'Export Queue',
    kind: 'Delivery',
    uses: '3,1k'
  }];
  function ToolTile({
    t
  }) {
    const [hover, setHover] = React.useState(false);
    return /*#__PURE__*/React.createElement(Card, {
      tone: "raised",
      padding: "0",
      radius: "var(--radius-lg)",
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      style: {
        overflow: 'hidden',
        gap: 0,
        cursor: 'pointer',
        boxShadow: hover ? 'var(--shadow-3)' : 'var(--shadow-2)',
        transition: 'box-shadow var(--dur-fast) var(--ease-in-out)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 132,
        background: 'var(--bg-inset)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("i", {
      className: "ph ph-image",
      style: {
        fontSize: 26,
        color: 'var(--ink-200)'
      }
    }), t.tag ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 12,
        left: 12
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: t.tag === 'Beta' ? 'neutral' : 'accent'
    }, t.tag)) : null, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 10,
        right: 10,
        opacity: hover ? 1 : 0,
        transition: 'opacity var(--dur-fast) linear'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      size: "sm",
      icon: "ph ph-arrow-up-right",
      label: 'Open ' + t.name
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 500,
        color: 'var(--ink-900)'
      }
    }, t.name), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 13,
        color: 'var(--text-muted)'
      }
    }, /*#__PURE__*/React.createElement("span", null, t.kind), /*#__PURE__*/React.createElement("span", {
      style: {
        fontVariantNumeric: 'tabular-nums'
      }
    }, t.uses, " runs"))));
  }
  function LibraryScreen() {
    const [filter, setFilter] = React.useState('All tools');
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '24px var(--gutter-page) 140px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Tabs, {
      variant: "pill",
      value: filter,
      onChange: setFilter,
      items: ['All tools', 'Layout', 'Colour', 'Typography', 'Handoff']
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      icon: "ph ph-arrows-down-up"
    }, "Sort"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      icon: "ph ph-plus"
    }, "New tool"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
        gap: 'var(--gap-card)'
      }
    }, TOOLS.map(t => /*#__PURE__*/React.createElement(ToolTile, {
      key: t.name,
      t: t
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        paddingTop: 8
      }
    }, /*#__PURE__*/React.createElement(SectionLabel, {
      tone: "muted"
    }, "8 of 64 shown"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: 1,
        background: 'var(--hairline)'
      }
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      iconAfter: "ph ph-arrow-down"
    }, "Load more")));
  }
  Object.assign(window, {
    LibraryScreen,
    ToolTile,
    TOOLS
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/LibraryScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/OverviewScreen.jsx
try { (() => {
// Overview — the product's front page: one hero metric, one dense chart, four cards.
(() => {
  const {
    Card,
    MetricBlock,
    BarSeries,
    LegendList,
    SeriesToggle,
    Tabs,
    InsightPopover,
    IconButton,
    Gauge,
    Badge
  } = window.DS;
  const rand = seed => {
    let s = seed;
    return () => (s = (s * 9301 + 49297) % 233280) / 233280;
  };
  const makeSeries = (n, seed, base, amp) => {
    const r = rand(seed);
    return Array.from({
      length: n
    }, (_, i) => Math.max(4, Math.round(base + amp * Math.sin(i / 7) + amp * 0.7 * r())));
  };
  function CardTools() {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(IconButton, {
      size: "sm",
      variant: "quiet",
      icon: "ph ph-sliders-horizontal",
      label: "Configure"
    }), /*#__PURE__*/React.createElement(IconButton, {
      size: "sm",
      variant: "quiet",
      icon: "ph ph-corners-out",
      label: "Expand"
    }));
  }
  function OverviewScreen() {
    const [series, setSeries] = React.useState('exports');
    const [period, setPeriod] = React.useState('Month');
    const [tip, setTip] = React.useState(true);
    const front = makeSeries(72, 11, 44, 26);
    const back = makeSeries(72, 77, 30, 18);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '10px var(--gutter-page) 140px',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--rhythm-section)'
      }
    }, /*#__PURE__*/React.createElement("section", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'start',
        gap: 24,
        paddingTop: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "u-eyebrow"
    }, "Half-year production statement"), /*#__PURE__*/React.createElement(SeriesToggle, {
      value: series,
      onChange: setSeries,
      options: [{
        value: 'exports',
        label: 'Exports',
        color: 'var(--series-1)'
      }, {
        value: 'renders',
        label: 'Renders',
        color: 'var(--series-2)'
      }, {
        value: 'assets',
        label: 'Assets',
        color: 'var(--series-3)'
      }, {
        value: 'handoffs',
        label: 'Handoffs',
        color: 'var(--series-4)'
      }]
    })), /*#__PURE__*/React.createElement(MetricBlock, {
      size: "hero",
      align: "center",
      value: "1,651,045",
      caption: "Assets processed"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(CardTools, null)), /*#__PURE__*/React.createElement(Tabs, {
      value: period,
      onChange: setPeriod,
      items: ['Week', 'Month', 'Quarter', 'Year']
    }))), /*#__PURE__*/React.createElement("section", {
      style: {
        position: 'relative',
        marginTop: -28
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 18,
        alignItems: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        opacity: .45
      }
    }, /*#__PURE__*/React.createElement(BarSeries, {
      data: back,
      height: 190,
      gap: 2,
      tone: "gray"
    })), /*#__PURE__*/React.createElement(BarSeries, {
      data: front,
      height: 190,
      gap: 2,
      tone: "gray",
      highlightIndex: -1
    }), tip ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: '38%',
        top: 26
      }
    }, /*#__PURE__*/React.createElement(InsightPopover, {
      value: "115k",
      delta: "+32%",
      onDismiss: () => setTip(false)
    }, "asset exports grew through the half-year")) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: 190,
        fontSize: 12,
        color: 'var(--text-faint)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, /*#__PURE__*/React.createElement("span", null, "150k"), /*#__PURE__*/React.createElement("span", null, "100k"), /*#__PURE__*/React.createElement("span", null, "50k"), /*#__PURE__*/React.createElement("span", null, "0"))), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 1,
        background: 'var(--grid-line)',
        margin: '14px 0 8px'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 12,
        color: 'var(--text-faint)'
      }
    }, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'].map(m => /*#__PURE__*/React.createElement("span", {
      key: m
    }, m)))), /*#__PURE__*/React.createElement("section", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
        gap: 'var(--gap-card)',
        marginTop: -32
      }
    }, /*#__PURE__*/React.createElement(Card, {
      label: "Export forecast",
      actions: /*#__PURE__*/React.createElement(CardTools, null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(MetricBlock, {
      value: "141,7k",
      caption: "Exports"
    }), /*#__PURE__*/React.createElement(LegendList, {
      columns: 1,
      items: [{
        label: 'Actual',
        color: 'var(--series-1)'
      }, {
        label: 'Forecast',
        color: 'var(--series-3)'
      }]
    })), /*#__PURE__*/React.createElement(Tabs, {
      size: "sm",
      value: "Month",
      onChange: () => {},
      items: ['Week', 'Month', 'Quarter', 'Year']
    }), /*#__PURE__*/React.createElement(BarSeries, {
      data: [62, 48, 90, 71, 40, 84, 55],
      height: 96,
      gap: 12,
      tone: "ink",
      barWidth: 3
    })), /*#__PURE__*/React.createElement(Card, {
      label: "Render minutes",
      actions: /*#__PURE__*/React.createElement(CardTools, null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(MetricBlock, {
      value: "17,2k",
      caption: "Minutes"
    }), /*#__PURE__*/React.createElement(LegendList, {
      items: [{
        label: 'Video',
        color: 'var(--series-1)'
      }, {
        label: 'Stills',
        color: 'var(--series-2)'
      }, {
        label: '3D',
        color: 'var(--series-3)'
      }, {
        label: 'Other',
        color: 'var(--series-4)'
      }]
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement(BarSeries, {
      data: [{
        value: 40,
        tone: 'gray'
      }, {
        value: 64,
        tone: 'gray'
      }, {
        value: 92,
        tone: 'accent'
      }, {
        value: 58,
        tone: 'gray'
      }, {
        value: 34,
        tone: 'gray'
      }],
      height: 92,
      gap: 10,
      rounded: true
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: '34%',
        top: 6
      }
    }, /*#__PURE__*/React.createElement(InsightPopover, {
      delta: "+10%",
      deltaTone: "invert"
    }, "render load rose with the new 3D pipeline")))), /*#__PURE__*/React.createElement(Card, {
      label: "Seat budget",
      actions: /*#__PURE__*/React.createElement(CardTools, null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(MetricBlock, {
      value: "92,1k",
      caption: "Budgeted"
    }), /*#__PURE__*/React.createElement(LegendList, {
      columns: 1,
      items: [{
        label: 'Used',
        color: 'var(--series-1)'
      }, {
        label: 'Planned',
        color: 'var(--series-3)'
      }]
    })), /*#__PURE__*/React.createElement(Tabs, {
      size: "sm",
      value: "Quarter",
      onChange: () => {},
      items: ['Week', 'Month', 'Quarter', 'Year']
    }), /*#__PURE__*/React.createElement(BarSeries, {
      data: makeSeries(30, 5, 40, 30),
      height: 96,
      gap: 3,
      tone: "gray",
      highlightIndex: 22
    })), /*#__PURE__*/React.createElement(Card, {
      label: "Insight",
      actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(IconButton, {
        size: "sm",
        variant: "quiet",
        icon: "ph ph-caret-left",
        label: "Previous"
      }), /*#__PURE__*/React.createElement(IconButton, {
        size: "sm",
        variant: "quiet",
        icon: "ph ph-caret-right",
        label: "Next"
      }))
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 15,
        lineHeight: 1.4,
        color: 'var(--ink-900)',
        textAlign: 'center'
      }
    }, "The new export preset ", /*#__PURE__*/React.createElement("strong", {
      style: {
        fontWeight: 600
      }
    }, "halved handoff time")), /*#__PURE__*/React.createElement(Gauge, {
      value: 72,
      size: 190,
      tone: "ink"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: -8
      }
    }, /*#__PURE__*/React.createElement(MetricBlock, {
      size: "sm",
      value: "57,6k",
      caption: "Before 12/06"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement(MetricBlock, {
      size: "sm",
      value: "93,5k",
      caption: "After 12/06"
    }))))));
  }
  Object.assign(window, {
    OverviewScreen,
    CardTools,
    makeSeries
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/OverviewScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/UsageScreen.jsx
try { (() => {
// Usage — score + survey layout, mirroring the case-study usability treatment.
(() => {
  const {
    Card,
    Gauge,
    BarSeries,
    MetricBlock,
    LegendList,
    SectionLabel,
    AvatarStack,
    Badge
  } = window.DS;
  const QUESTIONS = [{
    q: 'How easy was it to find the tool you needed?',
    pct: 47,
    word: 'Intuitive',
    legend: ['Intuitive', 'Simple', 'Fast']
  }, {
    q: 'How confident do you feel shipping from UNBSTOOLS exports?',
    pct: 67,
    word: 'Confident',
    legend: ['Confident', 'Clear', 'Reliable']
  }, {
    q: 'How would you describe the experience across devices?',
    pct: 73,
    word: 'Seamless',
    legend: ['Seamless', 'Consistent', 'Smooth']
  }];
  function SurveyCard({
    item,
    index
  }) {
    const bars = [62, item.pct + 28, 46, 12];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: 22
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right',
        flex: '0 0 auto',
        paddingBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: '400 26px/1 var(--font-display)',
        color: 'var(--ink-900)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, "0", index + 1, "."), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--text-faint)'
      }
    }, "stage")), /*#__PURE__*/React.createElement(Card, {
      tone: "quiet",
      padding: "24px",
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 15,
        lineHeight: 1.4,
        color: 'var(--ink-700)',
        maxWidth: '40ch'
      }
    }, item.q), /*#__PURE__*/React.createElement(MetricBlock, {
      value: item.pct + '%',
      caption: item.word
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: 14,
        height: 110
      }
    }, bars.map((v, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        flex: 1,
        height: v / 110 * 110 + 'px',
        borderRadius: '6px 6px 0 0',
        background: i === 1 ? 'linear-gradient(180deg,var(--mint-400),var(--mint-050))' : i === 3 ? 'var(--ink-500)' : 'var(--surface-000)',
        boxShadow: i === 1 || i === 3 ? 'none' : 'inset 0 0 0 1px var(--hairline-soft)',
        position: 'relative'
      }
    }, i === 1 ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: -13,
        left: '50%',
        transform: 'translateX(-50%)'
      }
    }, /*#__PURE__*/React.createElement(Badge, null, item.pct, "%")) : null))), /*#__PURE__*/React.createElement(LegendList, {
      columns: 3,
      items: item.legend.map((l, i) => ({
        label: l,
        color: i === 0 ? 'var(--mint-400)' : i === 1 ? 'var(--surface-000)' : 'var(--ink-500)'
      }))
    })));
  }
  function UsageScreen() {
    const dist = Array.from({
      length: 96
    }, (_, i) => ({
      value: 18 + Math.round(34 * Math.abs(Math.sin(i / 9))) + (i > 62 ? 26 : 0),
      tone: i > 62 ? 'accent' : 'gray'
    }));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '24px var(--gutter-page) 140px',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--rhythm-section)'
      }
    }, /*#__PURE__*/React.createElement("section", {
      style: {
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: 40,
        alignItems: 'start'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 18
      }
    }, /*#__PURE__*/React.createElement(SectionLabel, null, "System usability score"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 15,
        lineHeight: 1.5,
        color: 'var(--text-muted)',
        maxWidth: '32ch'
      }
    }, "Designers found the workspace intuitive, consistent and quick to navigate day to day."), /*#__PURE__*/React.createElement(AvatarStack, {
      count: "140+ designers",
      people: [{
        initials: 'AM'
      }, {
        initials: 'RS'
      }, {
        initials: 'KT'
      }]
    })), /*#__PURE__*/React.createElement(Card, {
      padding: "28px"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 44,
        alignItems: 'center',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Gauge, {
      value: 77,
      size: 220,
      tone: "accent",
      label: "77",
      caption: "Excellent"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3,auto)',
        gap: '18px 40px'
      }
    }, /*#__PURE__*/React.createElement(MetricBlock, {
      size: "sm",
      value: "140+",
      caption: "Designers evaluated"
    }), /*#__PURE__*/React.createElement(MetricBlock, {
      size: "sm",
      value: "10",
      caption: "Question survey"
    }), /*#__PURE__*/React.createElement(MetricBlock, {
      size: "sm",
      value: "87",
      caption: "Average score"
    }))))), /*#__PURE__*/React.createElement("section", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 40
      }
    }, QUESTIONS.map((item, i) => /*#__PURE__*/React.createElement(SurveyCard, {
      key: item.q,
      item: item,
      index: i
    }))), /*#__PURE__*/React.createElement(Card, {
      tone: "quiet",
      padding: "28px"
    }, /*#__PURE__*/React.createElement(SectionLabel, {
      tone: "ink"
    }, "Score distribution"), /*#__PURE__*/React.createElement(BarSeries, {
      data: dist,
      height: 150,
      gap: 2
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between'
      }
    }, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(n => /*#__PURE__*/React.createElement("span", {
      key: n,
      style: {
        height: 20,
        minWidth: 34,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontVariantNumeric: 'tabular-nums',
        background: n >= 80 ? 'var(--mint-400)' : 'var(--surface-000)',
        color: 'var(--ink-900)',
        boxShadow: n >= 80 ? 'none' : 'inset 0 0 0 1px var(--hairline)'
      }
    }, n)))));
  }
  Object.assign(window, {
    UsageScreen,
    SurveyCard
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/UsageScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.SectionLabel = __ds_scope.SectionLabel;

__ds_ns.BarSeries = __ds_scope.BarSeries;

__ds_ns.Gauge = __ds_scope.Gauge;

__ds_ns.InsightPopover = __ds_scope.InsightPopover;

__ds_ns.LegendList = __ds_scope.LegendList;

__ds_ns.MetricBlock = __ds_scope.MetricBlock;

__ds_ns.SearchInput = __ds_scope.SearchInput;

__ds_ns.SeriesToggle = __ds_scope.SeriesToggle;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.AvatarStack = __ds_scope.AvatarStack;

__ds_ns.Breadcrumb = __ds_scope.Breadcrumb;

__ds_ns.CommandBar = __ds_scope.CommandBar;

__ds_ns.NavRail = __ds_scope.NavRail;

})();
