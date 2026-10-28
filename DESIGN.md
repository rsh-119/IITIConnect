---
name: IITIConnect
description: Campus trip and pick-up sharing for IIT Indore students, as a calm spring-morning travel app.
colors:
  sky: "#fbf7f4"
  ink: "#1c2333"
  muted: "#5b6474"
  line: "#ece4dd"
  field-stroke: "#e4dbd3"
  coral: "#cf4416"
  coral-deep: "#b93c10"
  coral-glow: "#f0643c"
  coral-wash: "#fde9e1"
  blush: "#fde2e4"
  peach: "#ffe8d6"
  mint: "#dff3e4"
  green: "#15803d"
  green-wash: "#e3f4e8"
  chip-sand: "#f4eee9"
  notice-peach: "#fff4ec"
  card: "#ffffff"
typography:
  display:
    fontFamily: "Bodoni Moda, Georgia, serif"
    fontSize: "clamp(2.6rem, 6.2vw, 4.25rem)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 5vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.4
  chip:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  field: "14px"
  inset: "16px"
  card: "24px"
  card-lg: "28px"
  panel: "32px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "32px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.card}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.coral-deep}"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  input-field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 16px"
    height: "48px"
  card-trip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
  card-form:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card-lg}"
    padding: "28px"
  chip:
    backgroundColor: "{colors.chip-sand}"
    textColor: "{colors.muted}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  chip-go:
    backgroundColor: "{colors.green-wash}"
    textColor: "{colors.green}"
    rounded: "{rounded.pill}"
  chip-coral:
    backgroundColor: "{colors.coral-wash}"
    textColor: "{colors.coral-deep}"
    rounded: "{rounded.pill}"
  nav-pill-active:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "40px"
  tab-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
    rounded: "{rounded.pill}"
    height: "44px"
---

# Design System: IITIConnect

## Overview

**Creative North Star: "The Spring-Morning Departure Board"**

IITIConnect looks like a calm travel booking site at the start of a bright day. The page is a warm off-white sky washed with three soft radial glows (blush top-left, peach top-right, mint rising from the bottom), and every piece of content sits on a white, generously rounded card that floats on that sky with a long, low shadow. Public pages add drawn SVG hills and a dashed winding road that fade into the ground at the bottom of the hero.

The voice is quiet and friendly, never loud. One coral colour carries every primary action as a pill; green appears only for confirmed or safe states. Headlines split a light Bodoni Moda serif phrase with a bold Manrope phrase ("Hello, Aarav"; "Heading to the city?"), which gives the system its classy-but-casual signature. Density is relaxed on public pages and comfortable inside: cards of 20-28px padding, 12px gaps between trip cards, wide 24-32px radii.

Confirmed rejections (by the owner): the earlier fest-poster screenprint look, and the grey corporate SaaS dashboard.

**Key Characteristics:**

- Warm sky ground with blush, peach and mint radial glows fixed to the viewport.
- White floating cards (24-28px radius) with a soft two-layer ink-tinted shadow.
- One coral pill per decision; secondary actions are quiet white pills.
- Split serif/sans headlines on every page title.
- Seat dots and small sand chips as the recurring data atoms.
- One gentle rise-in on first paint; a 2px lift on hoverable cards.

## Colors

A warm pastel sky with one saturated coral voice and a single green for "confirmed".

### Primary

- **Ember Coral** (coral): every primary action pill, the Google sign-in button, step numerals, checkbox and radio accent, caret. White text on it passes AA (4.68:1).
- **Kiln Coral** (coral-deep): primary pill hover, and the text of coral chips.
- **Sunrise Glow** (coral-glow): decorative only. Open seat dots, the focus ring and field focus border, the wordmark's second dot. Never carries text.
- **Coral Wash** (coral-wash): background of "Can bring items" chips and the wordmark disc.

### Secondary

- **Meadow Green** (green): confirmed states and trust checkmarks only.
- **Green Wash** (green-wash): background of confirmed chips.

### Neutral

- **Morning Sky** (sky): page ground, PWA theme colour, and inset rows inside cards (sample lineup rows, trust promises).
- **Night Ink** (ink): all primary text and the active phone tab fill.
- **Slate Haze** (muted): supporting copy, labels, inactive nav pills.
- **Sand Line** (line): card borders (at 90% opacity) and the footer rule.
- **Field Stroke** (field-stroke): input, select, textarea and secondary-pill borders.
- **Chip Sand** (chip-sand): neutral chip background (times, dates).
- **Notice Peach** (notice-peach): inline status and notice panels.
- **Blush, Peach, Mint** (blush, peach, mint): the three sky glows; blush is also the text-selection colour. Not used as fills on components.

### Named Rules

**The One Coral Rule.** Coral marks the action, nothing else. A screen has one coral pill per decision; secondary actions are white pills.

**The Green Means Confirmed Rule.** Green is reserved for accepted, confirmed or verified states. It is never decorative.

**The Glow Is Not Text Rule.** Sunrise Glow fails contrast for text; it appears only as dots, rings and strokes.

## Typography

**Display Font:** Bodoni Moda (with Georgia, serif), loaded via next/font as `--font-elegant`
**Body Font:** Manrope (with system-ui, sans-serif), loaded as `--font-body`

**Character:** A light, high-contrast Didone phrase leads into a heavy geometric-humanist sans phrase, so every title reads as a friendly sentence with a touch of polish.

### Hierarchy

- **Display** (Bodoni 400, home hero at clamp(2.6rem, 6.2vw, 4.25rem), 1.04): the serif half of a split headline; shrinks to 0.86em of the line on desktop home.
- **Headline** (Manrope 800, clamp(2.1rem, 5vw, 3rem), 1.05, -0.03em): every page h1; the bold half of the split.
- **Title** (Manrope 700, 1.35rem, 1.2): section h2s; trip card destinations run at 1.25rem/800 tight.
- **Body** (Manrope 400, 1rem, relaxed 1.625): copy in Slate Haze, held to roughly 28-36rem measure (max-w-md / max-w-xl).
- **Label** (Manrope 600-700, 0.875rem): field labels, nav pills, button text.
- **Chip** (Manrope 700, 0.75rem): chips; times use tabular numerals everywhere.

### Named Rules

**The Split Headline Rule.** Page titles open with a short serif phrase (Bodoni 400) and finish in bold Manrope. The serif never carries a whole sentence or body text.

**The Tabular Time Rule.** Every `time` element and numeric readout uses tabular numerals.

## Layout

Public pages use a max-w-6xl container with 20px/32px side padding; the hero is a two-column grid (1.1fr / 0.9fr) above 1024px that stacks below, with the sample card under the copy on phones. Signed-in pages use a max-w-5xl container; forms narrow to max-w-xl, centred. Trip cards sit in a 2-column grid from 640px with 12px gaps. Vertical rhythm steps 8/12/16/20/32px inside cards and 80-112px between public sections. On phones a fixed bottom tab pill takes the main nav, so pages reserve 112px of bottom padding (pb-28) below md.

## Elevation & Depth

Layered and lifted. Depth comes from white cards over a tinted sky plus soft, long, ink-tinted shadows; nothing is flat grey and nothing has a hard offset.

### Shadow Vocabulary

- **Card** (`0 1px 2px rgb(28 35 51 / 0.04), 0 18px 40px -18px rgb(28 35 51 / 0.18)`): every bordered white card and the desktop app bar.
- **Float** (`0 2px 6px rgb(28 35 51 / 0.05), 0 30px 60px -24px rgb(28 35 51 / 0.28)`): the hero sample card, the home trust panel, the phone tab bar.
- **Coral pill** (`0 10px 22px -12px rgb(207 68 22 / 0.7)`, hover `0 14px 26px -12px rgb(207 68 22 / 0.75)`): primary pills only.

Translucent surfaces (app bar at white/70, tab bar at white/90, sample card at white/90) add backdrop blur.

### Named Rules

**The Float, Never Stamp Rule.** Shadows are soft, negative-spread and tinted with Night Ink. No hard offset shadows.

## Shapes

Generous, friendly rounding. Fields 14px; inset rows and notices 16px; content cards 24px; form and hero cards 28px; the home trust panel 32px. Every button, chip, nav item and the app bar itself is a full pill (999px). Borders are 1px hairlines in Sand Line or Field Stroke. Seat dots are 10px circles. The only line art is the drawn scenery and the dashed coral-tinted road (#f2c7b5), echoed by the dashed connector between home steps.

## Components

### Buttons

Soft, rounded and confident.

- **Shape:** full pill (999px), enforced globally for the primary class.
- **Primary:** Ember Coral fill, white 600-700 text, 44-52px tall, 24px side padding, coral pill shadow.
- **Hover / Focus:** hover deepens to Kiln Coral and grows the shadow; active presses down 1px; focus-visible shows a 3px Sunrise Glow ring at 55% with 3px offset. Transitions 180ms on the soft ease.
- **Secondary:** white pill with a Field Stroke border; hover warms to #fff7f3 with a slightly darker stroke.

### Chips

- **Style:** pill, 0.75rem/700, 3px 10px padding. Neutral is Chip Sand with Slate Haze text (times, dates).
- **Variants:** Coral (Coral Wash / Kiln Coral) for "Can bring items"; Go (Green Wash / Meadow Green) for confirmed.

### Cards / Containers

- **Corner Style:** 24px for trip and empty-state cards, 28px for form cards, 32px for the home panel.
- **Background:** white; inset rows inside use Morning Sky at 16px radius.
- **Shadow Strategy:** Card shadow by default; Float for hero-level cards.
- **Border:** 1px Sand Line at 90%.
- **Internal Padding:** 20px (trip cards) to 28px (form cards on tablet+).
- **Hover:** linked trip cards lift 2px.

### Inputs / Fields

- **Style:** white fill, 1px Field Stroke, 14px radius, 44-48px tall, 12-16px side padding; placeholders #8a92a0. File buttons are white pills.
- **Focus:** border turns Sunrise Glow with a 4px Sunrise Glow halo at 15%; no outline.
- **Checkbox / radio:** native, accent Ember Coral.

### Navigation

- **Desktop app bar:** a floating white/70 blurred pill (max 61rem wide) with Card shadow; wordmark left, nav pills centre, Alerts/Settings/Sign out right. Pills are 40px, 0.875rem/600 Slate Haze; hover white/70; current page white fill with ink text and a small shadow.
- **Phone tab bar:** fixed 12px from the bottom edges, white/90 blurred pill with Float shadow, four equal tabs 44px tall; the current tab fills Night Ink with white text.

### Seat Dots (signature)

A row of 10px circles, one per seat: open seats in Sunrise Glow, taken seats in neutral grey, with an aria-label stating seats left. Used on the sample lineup and every trip card.

### Leaving Campus Soon card (signature)

The home hero's floating 28px white/90 card: title plus a live IST time chip, four Morning Sky inset rows (tabular time, destination, seats line, seat dots) that rise in with staggered delays, and a caption stating the rows are a sample.

### Scenery

Three gradient hill bands (blush to sand, mint to cream, deep mint to Morning Sky) and a white road with a dashed coral-tinted centre line, anchored to the bottom 62% of public heroes and fading into the page.

## Do's and Don'ts

### Do:

- **Do** open every page title with a short Bodoni serif phrase followed by bold Manrope.
- **Do** put content on white rounded cards (24-28px) with the Card shadow over the sky.
- **Do** use exactly one coral pill for the main action; make secondary actions white pills.
- **Do** show seats as Seat Dots and times as tabular numerals in IST.
- **Do** let cards rise in once on first paint (700ms, translateY 14px plus 4px blur, ease cubic-bezier(0.22, 1, 0.36, 1)) and stagger list items; respect reduced motion.
- **Do** use green only for confirmed or verified states.

### Don't:

- **Don't** return to the fest-poster screenprint look or a grey SaaS dashboard (owner rejected both).
- **Don't** use hard offset shadows or flat, borderless grey panels.
- **Don't** put text in Sunrise Glow or on blush, peach or mint fills.
- **Don't** use square or small-radius buttons; every button is a pill.
- **Don't** add institute logos or crests, or anything implying official IIT Indore endorsement.
- **Don't** set body copy or full sentences in the serif.
