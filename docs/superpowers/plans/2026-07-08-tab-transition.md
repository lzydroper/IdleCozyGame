# Tab Transition Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix tab switch layout shift and replace unnatural fade with slide-up + fade transition

**Architecture:** All 5 tab wrappers always `absolute inset-0 overflow-y-auto`. Active tab gets `opacity-100 translate-y-0 z-10`, inactive gets `opacity-0 translate-y-2 z-0 pointer-events-none`. `transition-all duration-200 ease-out` handles the cross-fade + slide.

**Tech Stack:** Tailwind CSS 4 utility classes, React 19, TypeScript 6

**File:** `src/App.tsx` (lines 448-462)

---
### Task 1: Update tab wrapper classes

**Files:**
- Modify: `src/App.tsx:448-462`

- [ ] **Step 1: Replace tab wrapper className expressions**

Change each of the 5 tab wrapper divs from:
```tsx
<div className={`transition-opacity duration-200 ${activeTab === 'wilderness' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none overflow-y-auto'}`}>
  <WildernessTab />
</div>
```

To:
```tsx
<div className={`absolute inset-0 overflow-y-auto transition-all duration-200 ease-out ${activeTab === 'wilderness' ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-2 z-0 pointer-events-none'}`}>
  <WildernessTab />
</div>
```

Apply the same change to all 5 tabs (wilderness, dreamscape, workshop, log, shelter).

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: No TS errors, Vite build succeeds

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: 32/32 tests pass

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: No new warnings/errors

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "fix: tab switch layout shift + slide-up fade transition"
```

---

## Verification
```bash
npm run build      # No TS errors
npx vitest run     # 32/32 pass
npm run lint       # No new issues
```
