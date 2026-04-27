# Task: 09-polish/002-scroll-reveals

# Scroll reveals

Subtle fade-up animation when each section enters the viewport. Use the
new `view-timeline` / `animation-timeline` CSS APIs (browsers shipped 2024+)
so this is CSS-only, no IntersectionObserver JS.

## File: `apps/landing/src/styles/animations.css`

```css
/* Scroll-driven reveal — CSS only, no JS */
@layer utilities {
  .reveal-on-scroll {
    opacity: 0;
    transform: translateY(20px);
    animation: reveal-fade-up linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 30%;
  }

  @keyframes reveal-fade-up {
    to { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .reveal-on-scroll {
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
}
```

## Update: `apps/landing/src/styles/globals.css`

Add `@import "./animations.css";` after the typography import.

## Update: `apps/landing/src/components/layout/Section.astro`

Add the `reveal-on-scroll` class to the `<section>` element by default.
Add a `noReveal` prop to opt out (useful for hero, which shouldn't fade-in
when it's already in viewport on page load).

```astro
---
interface Props {
  id?: string;
  padY?: 'md' | 'lg' | 'xl';
  bg?: 'default' | 'elev' | 'gradient';
  noReveal?: boolean;
}
const { id, padY = 'lg', bg = 'default', noReveal = false } = Astro.props;
const padYClass = { md: 'py-12', lg: 'py-20', xl: 'py-32' }[padY];
const bgClass = { default: '', elev: 'bg-bg-elev', gradient: 'bg-gradient-to-b from-bg to-bg-elev' }[bg];
const revealClass = noReveal ? '' : 'reveal-on-scroll';
---
<section id={id} class={`${padYClass} ${bgClass} ${revealClass}`}>
  <slot />
</section>
```

## Banned

- IntersectionObserver-based reveals. CSS scroll-timeline is supported in all evergreen browsers; the JS approach pays a runtime cost for no benefit.
- Heavy animations (slide-in-from-side, scale, rotate). The "fade up 20px" is intentionally subtle — anything more becomes annoying on a content-heavy page.
- Forgetting hero. The hero should NOT have `reveal-on-scroll` (it's already in viewport on load); pass `noReveal={true}` from `Hero.astro`.