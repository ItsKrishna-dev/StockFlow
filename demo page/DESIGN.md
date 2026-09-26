---
name: Aubergine Enterprise Operations
colors:
  surface: '#fbf9f8'
  surface-dim: '#dbd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#4e444a'
  inverse-surface: '#303030'
  inverse-on-surface: '#f2f0f0'
  outline: '#80747a'
  outline-variant: '#d1c3ca'
  surface-tint: '#79526f'
  primary: '#57344f'
  on-primary: '#ffffff'
  primary-container: '#714b67'
  on-primary-container: '#f0bfe0'
  inverse-primary: '#e9b8d9'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#004a31'
  on-tertiary: '#ffffff'
  tertiary-container: '#006443'
  on-tertiary-container: '#56e5a9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd7f1'
  primary-fixed-dim: '#e9b8d9'
  on-primary-fixed: '#2f1029'
  on-primary-fixed-variant: '#5f3b56'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e2'
typography:
  headline-xl:
    fontFamily: Roboto Flex
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-lg:
    fontFamily: Roboto Flex
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  headline-md:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  headline-sm:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Roboto Flex
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Roboto Flex
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Roboto Flex
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
  caption:
    fontFamily: Roboto Flex
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style
The brand voice is focused, systematic, and uncompromisingly utilitarian. Designed for high-velocity enterprise workflow management, ERP operations, and critical business administration, the visual language balances operational density with cognitive clarity. The target users are business operators, accountants, warehouse coordinators, and project managers who require uninterrupted efficiency and immediate visual confirmation of state.

The aesthetic follows a modern enterprise corporate direction: flat surfaces, crisp hairline segmentations, minimal ambient elevation, and calibrated data density. Rather than relying on heavy shadows or decorative gradients, the system utilizes systematic color blocking, standardized status chips, and strict 1px boundaries to structure intricate multi-step forms, kanban boards, and dense tabular data.

## Colors
The palette is anchored by the deep aubergine purple (`#714B67`), applied deliberately to the global top navigation, primary execution buttons, and active context tab indicators. White (`#FFFFFF`) serves as the operational canvas, complemented by neutral wash surfaces (`#F8F9FA`) for alternating table rows, side drawers, and secondary toolbars. Hairline dividers use neutral stone borders (`#E0E0E0`).

Text hierarchies prioritize legibility under dense viewing conditions: primary body copy rests at charcoal (`#4C4C4C`), while secondary descriptors, metadata labels, and placeholders sit at subdued gray (`#8F8F8F`).

State tracking relies on an explicit, non-competing semantic status taxonomy:
- **Draft:** Neutral slate `#6C757D` with 10% tinted container
- **Waiting:** Amber `#F59E0B` with 12% tinted container
- **Ready:** Sky `#0284C7` with 10% tinted container
- **Done:** Emerald `#10B981` with 10% tinted container
- **Late / Alert:** Rose `#EF4444` with 10% tinted container

## Typography
Typography is driven by the structural precision and rhythmic consistency of Roboto Flex across all viewports. The primary workhorse is `body-md` (14px with a 20px line height), engineered for sustained scanning across dense tables, record view forms, and multi-field modals.

Headlines are kept restrained and unembellished. The view title maxes out at 20px–24px, using medium (`500`) to semi-bold (`600`) weights to establish hierarchy without disrupting workspace density. Form labels and table column headers utilize medium weights at 11px–13px to provide unambiguous guidance while preserving vertical space.

## Layout & Spacing
The layout engine employs a fluid responsive frame anchored by a permanent 48px top control bar and a collapsible 240px enterprise sidebar. The central workspace features an operational control ribbon containing breadcrumbs, record status stage-bars, and action toolbars.

Grid columns reflow from 12-column configurations on desktop (≥1280px) down to single-column record sheets on mobile (<768px). Component spacing adheres strictly to a compact 4px base increment, keeping gutters at 16px (`1rem`) and standard padding within forms and table cells between 4px (`space-xs`) and 12px (`space-md`) to ensure critical operational metrics remain above the fold.

## Elevation & Depth
Depth is produced primarily through flat surface layering and hairline separation rather than heavy diffusion. Base canvases sit on `#FFFFFF`, layered sidepanels and grouping headers employ `#F8F9FA`, and strict 1px solid `#E0E0E0` borders delimit content containers.

Elevations:
- **Surface (Level 0):** Flat `#FFFFFF` with 1px solid `#E0E0E0` border.
- **Subsurface / Striping:** Flat `#F8F9FA` without shadow.
- **Top Bar & Sticky Nav:** `#714B67` background with a subtle border-bottom (`rgba(0, 0, 0, 0.12)`), zero blur.
- **Dropdowns & Popovers (Level 1):** `#FFFFFF` surface with 1px solid `#E0E0E0` and minimal offset ambient shadow (`0 2px 4px rgba(0, 0, 0, 0.06)`).
- **Modals & Dialogs (Level 2):** `#FFFFFF` surface with 1px solid `#D1D5DB` and structured containment shadow (`0 4px 12px rgba(0, 0, 0, 0.10)`), accompanied by a 40% `#000000` backdrop tint.

## Shapes
The shape system operates under Level 1 (Soft), establishing an intentional, engineered feel suitable for serious business data. Standard interactive elements—including buttons, input fields, dropdown menus, and panel frames—adhere to a strict 4px (`0.25rem`) corner radius.

Status pills and stage-bar indicators are the sole exception, applying pill caps (`rounded-full`) to contrast visibly against the rigid rectangular nature of table rows and input grids.

## Components

### Buttons
- **Primary:** Filled `#714B67`, text `#FFFFFF`, 4px border radius. Hover: `#5B3C53`. Active: `#482E42`. Focus: 2px ring `#714B67` with 2px offset.
- **Secondary:** Filled `#FFFFFF`, 1px solid `#E0E0E0`, text `#4C4C4C`. Hover: `#F8F9FA`, border `#D1D5DB`, text `#714B67`.
- **Link / Tertiary:** Transparent background, text `#714B67`, hover with `#F8F9FA` background wash.
- **Size Scale:** Compact enterprise height standard (32px standard, 28px dense table action).

### Status Pills & Chips
- Status indicators feature a 22px height, pill radius, padding `2px 8px`, 11px medium text, and unified tint logic:
  - **Draft:** `#6C757D` text on `#F1F3F5` background.
  - **Waiting:** `#B45309` text on `#FEF3C7` background.
  - **Ready:** `#0284C7` text on `#E0F2FE` background.
  - **Done:** `#047857` text on `#D1FAE5` background.
  - **Late / Blocked:** `#B91C1C` text on `#FEE2E2` background.

### Input Fields & Controls
- **Text Inputs & Selects:** 32px standard height, `#FFFFFF` background, 1px solid `#E0E0E0`, 4px radius, 14px text `#4C4C4C`. Hover: border `#BDBDBD`. Focus: border `#714B67`, box-shadow `0 0 0 1px #714B67`.
- **Checkboxes & Radios:** 16px square/circle, border `#BDBDBD`. Checked: background `#714B67`, border `#714B67`, white checkmark or center pip.

### Tables & Data Grids
- **Header:** `#F8F9FA` surface, text `#8F8F8F`, uppercase 11px font, border-bottom 1px solid `#E0E0E0`.
- **Rows:** 36px row height, alternating zebra background (`#FFFFFF` and `#F8F9FA`), hover row fill `#F1EDF0` (subtle aubergine wash). Border between rows: 1px solid `#F0F0F0`.

### Workflow Status Stage-Bar
- Horizontal chevron progression bar placed at top right of business forms. Active stage: filled `#714B67` with `#FFFFFF` text. Inactive stages: `#F8F9FA` surface, `#8F8F8F` text, right-facing chevron dividers in `#E0E0E0`.