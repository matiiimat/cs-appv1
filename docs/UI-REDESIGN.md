# Aidly UI/UX Redesign Specification

## Design Philosophy

**Aesthetic:** Linear/Raycast-inspired - dark-first, sharp, fast, professional
**Core Principle:** Keyboard-first, mouse-optional, zero-friction workflows

---

## Brand Colors (from palette)

```css
--aidly-blue: #3872B9      /* Primary actions, links */
--aidly-orange: #F38135    /* Secondary/warning, send to review */
--aidly-coral: #B05755     /* Destructive/error states */
--aidly-magenta: #B33275   /* Accent, AI-related elements */
--aidly-slate: #475B88     /* Muted text, borders */
```

## Dark Theme Palette

```css
/* Backgrounds */
--bg-base: #0A0A0B           /* App background */
--bg-elevated: #111113       /* Cards, panels */
--bg-surface: #18181B        /* Hover states, inputs */
--bg-overlay: #1F1F23        /* Modals, dropdowns */

/* Borders */
--border-subtle: #27272A     /* Dividers, card borders */
--border-default: #3F3F46    /* Input borders, focus rings */
--border-strong: #52525B     /* Emphasized borders */

/* Text */
--text-primary: #FAFAFA      /* Headings, primary content */
--text-secondary: #A1A1AA    /* Descriptions, labels */
--text-muted: #71717A        /* Placeholders, disabled */

/* Semantic */
--success: #22C55E           /* Approve, send */
--warning: #F59E0B           /* Review, caution */
--error: #EF4444             /* Delete, destructive */
```

---

## Navigation Structure

### From 5 tabs → 4 tabs

| Old          | New        | Purpose                                    |
|--------------|------------|--------------------------------------------|
| Dashboard    | Queue      | Process queue + Triage (unified view)      |
| Triage       | ↑ (merged) | Fast card-based review                     |
| Inbox        | Inbox      | Detailed case editing with inline AI       |
| Search       | Knowledge  | Search archive + Knowledge base management |
| Settings     | Settings   | Configuration                              |

### Navigation Bar Design

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo] Aidly                      Queue  Inbox  Knowledge  Settings │
│                                    ━━━━━                             │
│                                    (active indicator: solid underline)│
└─────────────────────────────────────────────────────────────────────┘
```

**Keyboard shortcuts (global):**
- `G then Q` → Go to Queue
- `G then I` → Go to Inbox
- `G then K` → Go to Knowledge
- `G then S` → Go to Settings
- `⌘K` / `Ctrl+K` → Command palette

---

## Queue View (Dashboard + Triage Merged)

Two states within one view:

### State 1: Processing Mode
Shows when there are unprocessed messages in queue.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │  AI Processing Queue                                     │      │
│   │                                                          │      │
│   │   ┌──────────────┐    ┌──────────────┐                  │      │
│   │   │     247      │    │      12      │                  │      │
│   │   │   Awaiting   │    │    Ready     │                  │      │
│   │   │   AI Review  │    │  for Triage  │                  │      │
│   │   └──────────────┘    └──────────────┘                  │      │
│   │                                                          │      │
│   │   [   50  ] [ 100 ] [ 200 ]    [ Process Queue → ]      │      │
│   │                                                          │      │
│   └─────────────────────────────────────────────────────────┘      │
│                                                                     │
│   ┌──── Quick Stats ────────────────────────────────────────┐      │
│   │  Total: 1,234  │  Avg: 2.3min  │  SLA: 94%  │  Oldest: 2h│     │
│   └─────────────────────────────────────────────────────────┘      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### State 2: Triage Mode
Shows when messages are ready for human review.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   ┌─── Keyboard ───┐                           ┌─── Progress ───┐  │
│   │ →/Space: Send  │                           │   12 remaining │  │
│   │ ←/R: Review    │                           └────────────────┘  │
│   │ E: Quick Edit  │                                               │
│   └────────────────┘                                               │
│                                                                     │
│            ┌────────────────────────────────────────┐              │
│            │  ┌──────────────────────────────────┐  │              │
│            │  │ John Smith                       │  │              │
│            │  │ john@company.com                 │  │              │
│            │  │ ─────────────────────────────────│  │              │
│            │  │ Subject: Can't access my account │  │              │
│            │  │                                  │  │              │
│            │  │ I've been trying to log in...    │  │              │
│            │  │ ─────────────────────────────────│  │              │
│            │  │ ✨ AI Response                   │  │              │
│            │  │                                  │  │              │
│            │  │ Hi John, I understand you're...  │  │              │
│            │  └──────────────────────────────────┘  │              │
│            │         (swipeable / keyboard)         │              │
│            └────────────────────────────────────────┘              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Triage Keyboard Shortcuts:**
- `→` or `Space` → Approve & Send (most common = easiest key)
- `←` or `R` → Send to Inbox for review
- `E` → Open Quick Edit modal (edit before sending)

---

## Quick Edit Modal

Opens when pressing `E` in triage. Focused editing without leaving context.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Quick Edit                            [Esc] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  From: john@company.com                                             │
│  Subject: Can't access my account                                   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Customer message preview (collapsed, expandable)               ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │                                                                ││
│  │ Hi John,                                                       ││
│  │                                                                ││
│  │ I understand you're having trouble accessing your account...   ││
│  │                                                                ││
│  │ [Editable textarea with full AI response]                      ││
│  │                                                                ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ Inline AI ──────────────────────────────────────────────────┐  │
│  │ Select text or type: "make it shorter", "add apology"...     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│           [ Cancel ]                    [ Send →  ⌘Enter ]         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Shortcuts in Quick Edit:**
- `⌘Enter` / `Ctrl+Enter` → Send immediately
- `Esc` → Close and return to triage
- `Tab` → Focus AI input for refinement

---

## Inbox View (Detailed Review)

For cases that need careful editing. Remove always-visible AI panel, replace with inline AI refinement.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌── Cases (8) ──┐  ┌─────────────────────────────────────────────┐│
│  │               │  │  Customer Question                          ││
│  │ ▸ John S.     │  │  ─────────────────────────────────────────  ││
│  │   Billing     │  │  john@company.com · 2 hours ago             ││
│  │   2h          │  │                                             ││
│  │               │  │  I've been trying to log in to my account   ││
│  │   Sarah M.    │  │  for the past 2 days but keep getting an    ││
│  │   Technical   │  │  error message saying...                    ││
│  │   4h          │  │                                             ││
│  │               │  ├─────────────────────────────────────────────┤│
│  │   Mike T.     │  │  Draft Reply                          [AI] ││
│  │   Account     │  │  ─────────────────────────────────────────  ││
│  │   6h          │  │                                             ││
│  │               │  │  Hi John,                                   ││
│  │               │  │                                             ││
│  │               │  │  I understand you're experiencing login     ││
│  │               │  │  difficulties. Let me help you resolve...   ││
│  │               │  │                                             ││
│  │               │  │  [Textarea - editable]                      ││
│  │               │  │                                             ││
│  │               │  │  ─────────────────────────────────────────  ││
│  │               │  │  [...] [ Send → ]                           ││
│  └───────────────┘  └─────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Inline AI Refinement (replaces sidebar):**
- Click [AI] button or press `⌘I` to open AI input
- Type instruction: "make it more empathetic", "translate to Spanish"
- AI response replaces/augments draft inline
- Quick actions available as buttons or keyboard shortcuts

**Keyboard shortcuts:**
- `⌘Enter` → Send
- `⌘I` → Focus AI refinement input
- `⌘⇧I` → Open AI quick actions menu
- `↓` / `↑` → Navigate case list
- `Esc` → Clear focus / close AI input

---

## Command Palette (⌘K)

Global command palette for power users. Searchable, keyboard-navigable.

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 🔍  Type a command or search...                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Navigation                                                         │
│  ──────────────────────────────────────────────────────────────────│
│  ▸ Go to Queue                                              G Q    │
│    Go to Inbox                                              G I    │
│    Go to Knowledge                                          G K    │
│    Go to Settings                                           G S    │
│                                                                     │
│  Actions                                                            │
│  ──────────────────────────────────────────────────────────────────│
│    Process queue (50 messages)                              ⌘P     │
│    Start triage                                             ⌘T     │
│    Search cases...                                          /      │
│                                                                     │
│  Quick Actions (in Triage/Inbox)                                   │
│  ──────────────────────────────────────────────────────────────────│
│    Make response shorter                                    1      │
│    Add empathy                                              2      │
│    Translate to Spanish                                     3      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Knowledge View (was Search)

Renamed to better reflect purpose: search history + manage knowledge base.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Knowledge Base                                    [ + Add Entry ]  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 🔍  Search cases and knowledge entries...            [ / ]     ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ Filters ───────────────────────────────────────────────────────┐│
│  │  [ All Fields ▾ ]  [ Any Status ▾ ]  [ Any Category ▾ ]        ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  Results                                                            │
│  ──────────────────────────────────────────────────────────────────│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ #TKT-1234  ·  Billing  ·  Sent                                 ││
│  │ John Smith · john@company.com                                   ││
│  │ Subject: Refund request for duplicate charge                   ││
│  │ "I noticed I was charged twice for my subscription..."         ││
│  │                                                    [Add to KB] ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Typography

**Font Stack:**
```css
--font-display: "CreatoDisplay", system-ui, sans-serif;  /* Logo, headings */
--font-body: "Geist", -apple-system, sans-serif;         /* Body text */
--font-mono: "Geist Mono", "SF Mono", monospace;         /* Code, shortcuts */
```

**Sizes:**
- Display: 24px / 1.2
- Title: 18px / 1.3
- Body: 14px / 1.5
- Small: 12px / 1.4
- Micro: 11px / 1.3 (keyboard hints, timestamps)

---

## Micro-interactions

**Card transitions:**
- Swipe: physics-based with momentum
- Approve: slide right + fade + green flash
- Review: slide left + fade + orange flash

**Button feedback:**
- Immediate state change (no delay)
- Subtle scale (0.98) on press
- Focus rings only on keyboard navigation

**Keyboard hints:**
- Show keyboard shortcuts inline (muted)
- Flash shortcut on action (200ms highlight)

---

## Mobile Considerations

Only Triage view needs mobile optimization:

**Mobile Triage:**
- Full-screen card
- Swipe gestures primary
- Bottom bar with action buttons as backup
- No keyboard shortcuts (touch-only)

**Other views:**
- Desktop-only is acceptable
- Graceful degradation with horizontal scroll if needed

---

## Implementation Order

1. **Design tokens** - Update globals.css with new dark theme
2. **Navigation** - Rebuild with 4 tabs + keyboard shortcuts
3. **Queue View** - Merge Dashboard + Triage with state switching
4. **Quick Edit Modal** - New component for fast editing
5. **Command Palette** - Global ⌘K component
6. **Keyboard System** - Global shortcut handler
7. **Inbox Redesign** - Remove AI sidebar, add inline refinement
8. **Knowledge View** - Rename and polish
9. **Settings** - Apply new design system
10. **Polish** - Animations, transitions, edge cases
