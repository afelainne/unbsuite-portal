

# Fix: CompactEditor TypeScript Errors

## Problem

3 build errors on lines 179, 540, and 562 of `CompactEditor.tsx`. The `onUpdateMetadata` prop is typed as `(metadata: FontMetadata) => void` (accepts only a plain object), but these 3 lines pass a **function updater** `(prev => ({...prev, ...}))` — which is the correct pattern since the parent passes `setMetadata` (a React setState).

## Root Cause

The interface declaration on line 29:
```
onUpdateMetadata: (metadata: FontMetadata) => void;
```
Does not allow the `SetStateAction<FontMetadata>` pattern (function updater).

## Fix (1 file, 1 line change)

**File:** `src/tools/unbsfont/components/CompactEditor.tsx`

Change line 29 from:
```typescript
onUpdateMetadata: (metadata: FontMetadata) => void;
```
to:
```typescript
onUpdateMetadata: React.Dispatch<React.SetStateAction<FontMetadata>>;
```

Add `import React from 'react'` if not already present (it likely is).

This single type change fixes all 3 errors because the parent already passes `setMetadata` which is `Dispatch<SetStateAction<FontMetadata>>`.

## Verification

The same pattern is already used in other unbsfont files (e.g., `useKerningManager.ts` line 4 uses `Dispatch<SetStateAction<FontMetadata>>`).

