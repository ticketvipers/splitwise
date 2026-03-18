# Splitwise Design System

A lightweight design system for consistent UX across web and mobile (React Native / future).

---

## 1. Navigation & Information Architecture

### Core Routes (Web)

| Route | Screen | Description |
|-------|--------|-------------|
| `/` | Dashboard | Overview: balances, recent activity |
| `/groups` | Groups | List of groups the user belongs to |
| `/groups/[id]` | Group Detail | Expenses and members for a group |
| `/groups/[id]/expense/new` | Add Expense | Form to add expense to a group |
| `/login` | Login | Email/password authentication |
| `/signup` | Sign Up | Account creation |
| `/profile` | Profile | User settings & account info |

### Hierarchy

```
App
├── Auth
│   ├── /login
│   └── /signup
└── Main (authenticated)
    ├── /               ← Dashboard (default landing)
    ├── /groups         ← Group list
    │   └── /groups/[id]  ← Group detail
    │       └── /groups/[id]/expense/new
    └── /profile
```

### Navigation Patterns
- **Web**: Top nav bar with links to Dashboard and Groups; user avatar/name + logout on the right.
- **Mobile**: Bottom tab bar: Dashboard | Groups | Profile.
- Active route is visually distinguished (brand underline on web, filled icon on mobile).

---

## 2. Component Inventory

### Primitives
| Component | Purpose |
|-----------|---------|
| `Button` | Primary, secondary, destructive, ghost variants; size sm/md/lg |
| `Input` | Text input with label, placeholder, error state |
| `Textarea` | Multi-line input with same pattern as Input |
| `Select` | Dropdown select, same styling as Input |
| `Checkbox` | Boolean toggle with label |
| `Badge` | Status chips (e.g. "You owe", "Settled") |

### Composite
| Component | Purpose |
|-----------|---------|
| `Card` | Container with consistent padding/shadow |
| `Modal` | Overlay dialog with backdrop, close button, title/body/footer slots |
| `Toast` | Temporary notification (success, error, info, warning) |
| `Avatar` | Circular user avatar with initials fallback |
| `Divider` | Horizontal rule with optional label |

### State Components
| Component | Purpose |
|-----------|---------|
| `EmptyState` | Placeholder for lists with no data; icon + heading + optional CTA |
| `LoadingSpinner` | Animated spinner for async operations |
| `ErrorState` | Inline error message with retry action |
| `SkeletonLoader` | Content placeholder while data loads |

---

## 3. Design Tokens

All tokens are defined as CSS custom properties in `app/globals.css` and mapped in Tailwind.

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-brand` | `#5BC5A7` | Primary actions, active states, links |
| `--color-brand-dark` | `#4aaf93` | Hover state for brand |
| `--color-brand-light` | `#e8f8f4` | Tinted backgrounds, badges |
| `--color-danger` | `#E53E3E` | Errors, destructive actions |
| `--color-danger-light` | `#FFF5F5` | Error backgrounds |
| `--color-warning` | `#DD6B20` | Warnings |
| `--color-warning-light` | `#FFFAF0` | Warning backgrounds |
| `--color-success` | `#38A169` | Success states |
| `--color-success-light` | `#F0FFF4` | Success backgrounds |
| `--color-info` | `#3182CE` | Informational |
| `--color-info-light` | `#EBF8FF` | Info backgrounds |
| `--color-gray-50` | `#F9FAFB` | Page backgrounds |
| `--color-gray-100` | `#F3F4F6` | Card backgrounds, borders |
| `--color-gray-200` | `#E5E7EB` | Dividers |
| `--color-gray-400` | `#9CA3AF` | Placeholder text |
| `--color-gray-600` | `#4B5563` | Secondary text |
| `--color-gray-800` | `#1F2937` | Primary text |
| `--color-gray-900` | `#111827` | Headings |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-sans` | Geist Sans, system-ui | Body and UI text |
| `--font-mono` | Geist Mono | Code, amounts |
| `--text-xs` | `0.75rem / 1.125rem` | Captions, labels |
| `--text-sm` | `0.875rem / 1.25rem` | Body small, secondary |
| `--text-base` | `1rem / 1.5rem` | Default body |
| `--text-lg` | `1.125rem / 1.75rem` | Subheadings |
| `--text-xl` | `1.25rem / 1.75rem` | Section headings |
| `--text-2xl` | `1.5rem / 2rem` | Page headings |

### Spacing

Uses Tailwind's default 4px base scale. Key values:

| Scale | px | Usage |
|-------|----|-------|
| 1 | 4px | Icon gaps |
| 2 | 8px | Inner padding tight |
| 3 | 12px | Input padding |
| 4 | 16px | Default padding |
| 6 | 24px | Section gap |
| 8 | 32px | Page sections |
| 12 | 48px | Empty state spacing |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded` | `0.25rem` | Small elements (badges) |
| `rounded-lg` | `0.5rem` | Buttons, inputs, cards |
| `rounded-xl` | `0.75rem` | Modals |
| `rounded-full` | `9999px` | Avatars |

### Shadows

| Name | Usage |
|------|-------|
| `shadow-sm` | Cards, nav bar |
| `shadow-md` | Modals, dropdowns |

---

## 4. Responsive Layout (Web)

The app uses a single-column, max-width constrained layout.

| Breakpoint | Max Width | Columns |
|------------|-----------|---------|
| Mobile (`< 640px`) | 100% | 1 |
| Tablet (`640–1024px`) | `max-w-2xl` | 1–2 |
| Desktop (`> 1024px`) | `max-w-4xl` | 2–3 grid where appropriate |

### Grid Patterns
- **Dashboard**: Balance summary cards in a responsive 1–3 column grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- **Group list**: Stacked list on mobile, 2-col grid on desktop
- **Forms**: Single column, full width inputs, max-w-lg container
- **Navigation**: Full nav on `md+`, hamburger menu on mobile (future)

### Touch Targets
- Minimum touch target: **44×44px** (WCAG 2.5.5)
- Buttons: min-height `h-10` (40px), use `h-11` (44px) for primary mobile CTAs
- Nav links: padded to at least 44px tall on mobile

---

## 5. Empty / Error / Loading States

### Empty State
Used when a list or page has no data to display.

```
[Icon]
Heading (e.g., "No groups yet")
Subtext (optional)
[CTA Button] (optional)
```

Examples:
- **Groups empty**: 👥 "You're not in any groups yet" → "Create a Group"
- **Expenses empty**: 💸 "No expenses here" → "Add an Expense"
- **Dashboard empty**: ✅ "You're all settled up!"

### Error State
Used for failed API calls or validation errors.

```
[Error Icon or ⚠️]
"Something went wrong"
[error.message or generic message]
[Retry button] (for async errors)
```

### Loading State
- **Page / section load**: `LoadingSpinner` centered in content area
- **Button submitting**: Button becomes disabled, shows spinner inside
- **Lists**: `SkeletonLoader` rows (3–5 placeholder cards)
- **Avoid**: Full-page blocking spinners; prefer skeleton loaders for content

### Toast Notifications
| Type | Trigger | Duration |
|------|---------|----------|
| ✅ Success | Expense added, group created, settled up | 3s |
| ❌ Error | API failure, validation error | 5s (persistent if actionable) |
| ℹ️ Info | Informational updates | 3s |
| ⚠️ Warning | Soft validation, non-blocking issues | 4s |

Toasts appear at **top-right on web**, **top-center on mobile**, stacked.

---

## 6. Accessibility

### Color Contrast
- Normal text on white: minimum **4.5:1** ratio (WCAG AA)
- `--color-brand` (#5BC5A7) on white: 2.5:1 — **do not use for body text**; use for decorative/brand elements and always pair with a non-color indicator
- Primary button text: white on `#5BC5A7` — acceptable for large text (3:1+), use bold weight
- Error red (#E53E3E) on white: 4.6:1 ✅

### Keyboard Navigation (Web)
- All interactive elements reachable via `Tab`
- Focus rings visible: `focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none`
- Modals: trap focus inside modal while open; restore focus on close
- Escape key closes modals and dropdowns

### Screen Readers
- Buttons with icon-only: include `aria-label`
- Form inputs: always associated `<label>` (htmlFor / id)
- Loading states: use `aria-live="polite"` regions for status updates
- Modals: use `role="dialog"` with `aria-labelledby` and `aria-describedby`

### Touch (Mobile)
- All tap targets: minimum 44×44px
- Avoid hover-only affordances
- Sufficient spacing between interactive elements to prevent mis-taps

---

## 7. Component File Locations

```
components/
├── Navbar.tsx              ← Top navigation (web)
└── ui/
    ├── Button.tsx
    ├── Input.tsx
    ├── Card.tsx
    ├── Modal.tsx
    ├── Toast.tsx
    ├── EmptyState.tsx
    ├── LoadingSpinner.tsx
    └── ErrorState.tsx
```
