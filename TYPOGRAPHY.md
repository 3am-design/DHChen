# Shared typography

All 23 pages load `typography.css` after `style.css`. Change typography in
`typography.css`; keep component geometry and spacing in `style.css`.

## Size scale

Values below are **rendered CSS pixels**, after the existing page zoom.
Short desktop windows retain the same readable type scale.

| Role | Desktop ≥1280px | Tablet 768–1279px | Mobile ≤767px |
|---|---:|---:|---:|
| Page title | 70 | 56 | 40–48 |
| Section title | 41 | 40 | 32–38 |
| Card / subsection title | 30 | 28 | 26 |
| Introduction / subtitle | 23 | 22 | 20 |
| Body / primary button / controls / breadcrumbs | 17 | 17 | 17 |
| Tags / captions / metadata | 14 | 14 | 14 |

Mobile page and section titles scale fluidly within these bounds. At 390px
wide, they render at 42.9px and 35.1px respectively.

## Families and weights

- Headings: Baskervville, regular 400. Chinese headings use Noto Serif TC.
- Body, subtitles, buttons and labels: Fira Sans, regular 400.
- Main navigation and its submenus: 23px, weight 300 as requested.
- Full-screen mobile menu (≤1023px): the four section headings use the
  section-title tier (32–38px on phones, 40px on tablets); their links stay
  on the 23px menu tier, so the two levels read clearly apart.
- Editorial introductions, quotations and related article titles retain the
  serif family, using the shared size tiers rather than separate sizes.
- The homepage hero and opening motto retain their existing display typography
  and animation. Being / Becoming / Belonging and the landing heading
  “Compassion is not only a value. It is a way of …” use the page-title tier.

## Leading

- Page and section titles: 1.16.
- Card titles, subsections and quotations: 1.25.
- Running copy and introductions: 1.6.
- UI, buttons, labels and metadata: 1.4.
- Navigation: 1.2, retaining the close hover underline.

Page titles, subtitles and `h2`–`h4` headings use `text-wrap: balance`, so a
wrapped heading never leaves one word ("2.0", "Journey") alone on its last
line. The typed homepage heading is excluded so it cannot reflow.

## Adding content

Reuse the matching component class and type token. Avoid page-specific font
sizes, incremental `+2px` adjustments, and `!important` typography overrides.
Use the semantic heading level appropriate to the document; a card's `h2`
still uses the card-title size, rather than the section-title size.

## Verification

The migration was checked across all 23 pages at 390×844, 900×900 and
1920×1000. Nine representative English / Chinese pages were additionally
checked in 14 viewport sizes from 320×740 to 2560×1440, including the
767/768/769 and 1279/1280/1281 breakpoint boundaries and 1600×660.

Checks cover actual rendered type sizes, title / body hierarchy, text and
document overflow, and JavaScript errors. Visual reviews include listings,
articles, homepage, Practices, Values, People, Contact, navigation, search
and the biography dialog. Local evidence is in `output/playwright/`.
