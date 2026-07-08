# Tab Transition Redesign

## Problem
Tab switching in App.tsx has two issues:
1. **Layout shift**: Active tab is in normal document flow, inactive tabs are `absolute inset-0`. Switching causes `<main>` height to change → bottom nav shifts → flicker.
2. **Unnatural fade**: Pure opacity cross-fade at 200ms feels dead and ghostly.

## Root Cause
Asymmetric positioning: `{activeTab === 'x' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`. The element toggles between flow and absolute layout, changing the container's content height.

## Design
All 5 tab wrappers always `absolute inset-0 overflow-y-auto` within `<main>` (which has `flex-1` height from parent, independent of content).

### Transition
| State | opacity | translateY | z-index |
|-------|---------|------------|---------|
| Active | 1 | 0 | 10 |
| Becoming active | 0→1 | 8px→0 | 10 |
| Becoming inactive | 1→0 | 0→8px | 0 |
| Inactive | 0 | 8px | 0 |

- `transition-all duration-200 ease-out` on all tabs
- Entering tab slides up 8px + fades in
- Leaving tab slides down 8px + fades out
- Both run in parallel, creating spatial depth

### Files Changed
- `src/App.tsx` — tab wrapper div classes (lines 448-462)
