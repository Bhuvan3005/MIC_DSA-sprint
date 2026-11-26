import { Children, isValidElement } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowRevealButton from '../originkit/ui/arrow-reveal-button';
import { Spinner } from './Spinner';
import { cn } from '../../utils/format';

/**
 * App-wide button: the Originkit "Arrow Reveal Button", wrapped so it behaves like a normal button.
 * The Originkit file itself is untouched; this wrapper adds onClick, submit, links, disabled and loading.
 *
 *   <Button>Save</Button>                          primary, medium
 *   <Button variant="ghost" size="sm">Cancel</Button>
 *   <Button to="/videos">Browse</Button>         client-side navigation
 *   <Button href="https://…" target="_blank">Solve</Button>
 *   <Button type="submit" className="w-full">Log in</Button>
 *
 * The label is the text inside the children; icons are dropped, and a <Spinner /> child marks it as loading.
 * On hover the arrow badge expands over the label (the component's reveal), so keep labels short.
 */
const VARIANTS = {
  primary: { fill: '#2f6fb0', text: '#ffffff', border: null, disc: '#7fb0e6', arrow: '#0d0e10' },
  ghost: { fill: 'transparent', text: '#e4e4e7', border: 'rgba(255,255,255,0.16)', disc: '#d4d4d8', arrow: '#0d0e10' },
  danger: { fill: 'rgba(239,68,68,0.08)', text: '#fca5a5', border: 'rgba(248,113,113,0.35)', disc: '#f87171', arrow: '#220606' },
};
const SIZES = {
  md: { padding: '5px 18px 5px 5px', icon: 16, ipad: 7, font: 14, gap: 12 },
  sm: { padding: '4px 14px 4px 4px', icon: 12, ipad: 5, font: 12, gap: 8 },
};
// Hover/press motion: a longer ease-out so the badge glides open instead of snapping.
const MOTION = { type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.6, delay: 0 };
const FONT = '"Instrument Sans", ui-sans-serif, system-ui, sans-serif';

export default function Button({
  variant = 'primary', size, className = '', children, onClick, disabled, loading, type, form, to, href, target, fontFamily = FONT,
}) {
  const nav = useNavigate();
  const sm = size ? size === 'sm' : /(^|\s)(!py-1|text-xs)(\s|$)/.test(className);
  const full = /(^|\s)(w-full|flex-1)(\s|$)/.test(className);
  const layout = className.replace(/(^|\s)(!py-1|text-xs|!px-2\.5)(?=\s|$)/g, ' ').trim();

  let isLoading = !!loading;
  const parts = [];
  const collect = (nodes) => Children.forEach(nodes, (c) => {
    if (typeof c === 'string' || typeof c === 'number') parts.push(String(c));
    else if (isValidElement(c) && c.type === Spinner) isLoading = true;
    else if (isValidElement(c) && c.type === 'span') collect(c.props.children); // plain text wrappers
  });
  collect(children);
  let label = parts.join('').replace(/\s+/g, ' ').trim();
  if (isLoading && label && !label.endsWith('…')) label += '…';

  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[sm ? 'sm' : 'md'];
  const off = !!disabled || isLoading;
  const w = v.border ? 1 : 0;
  const border = { borderStyle: 'solid', borderColor: v.border || 'transparent', borderWidth: w, borderTopWidth: w, borderRightWidth: w, borderBottomWidth: w, borderLeftWidth: w };
  const submit = type === 'submit' || (!type && !onClick && !to && !href);

  const handle = (e) => {
    if (off) return;
    if (to) { nav(to); return; }
    if (href) { window.open(href, target || '_self', 'noopener,noreferrer'); return; }
    if (submit) {
      const f = form ? document.getElementById(form) : e.currentTarget.closest('form');
      if (f) f.requestSubmit();
      return;
    }
    onClick?.(e);
  };

  return (
    <div className={cn(full ? 'flex' : 'inline-flex', 'transition-opacity duration-200', layout, off && 'opacity-50')} onClick={handle}
      {...(off ? { inert: '' } : {})} aria-busy={isLoading || undefined}>
      <ArrowRevealButton
        label={label}
        colors={{ fill: v.fill, textColor: v.text }}
        border={border}
        padding={s.padding}
        gap={s.gap}
        rounded={100}
        font={{ fontFamily, fontSize: s.font, fontWeight: 600, lineHeight: 1.2 }}
        icon={{ type: 'icon', icon: 'arrow', side: 'left', size: s.icon, padding: s.ipad, rounded: 100, background: v.disc, color: v.arrow }}
        newTab={false}
        transition={MOTION}
        style={{ minWidth: 0, minHeight: 0, width: full ? '100%' : undefined }}
      />
    </div>
  );
}
