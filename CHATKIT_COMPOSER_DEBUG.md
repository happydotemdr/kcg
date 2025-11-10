# ChatKit Composer Debugging Guide

## Issue
The ChatKit composer (input field) is not visible on `/chatgpt` page despite multiple fix attempts.

## What We've Verified Against Official Docs

### ✅ Correct Configuration (Per OpenAI ChatKit Docs)

1. **`useChatKit` configuration is correct:**
   ```typescript
   const { control } = useChatKit({
     api: {
       getClientSecret: async (existing) => { /* ... */ },
       url: '/api/chatkit',
     },
     composer: {
       placeholder: 'ENTER COMMAND...',
       attachments: {
         enabled: true,
         accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
       },
     },
     history: { enabled: false },  // NEW: Explicitly disabled
     header: { enabled: false },   // NEW: Explicitly disabled
   });
   ```

2. **ChatKit component usage is correct:**
   ```typescript
   <ChatKit control={control} className="..." style={{ height: '100%', width: '100%' }} />
   ```

### Changes Made in Latest Fix

**File: `/home/wk/projects/kcg/src/components/gpt/DosChat.tsx`**

1. **Added explicit `history` and `header` config:**
   - `history: { enabled: false }` - Disables built-in sidebar (we have custom DosSidebar)
   - `header: { enabled: false }` - Disables built-in header (we have custom AppHeader)
   - **Reason:** These might interfere with layout when disabled via CSS only

2. **Added inline styles to ChatKit:**
   ```typescript
   style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
   ```
   - **Reason:** Ensures explicit dimensions for flex layout

3. **Added debug logging:**
   - Logs `control` object on mount
   - Logs composer configuration
   - Check browser console for these logs

4. **Simplified composer CSS:**
   - Removed `display/visibility` overrides from main composer rule
   - Added targeted selectors for direct composer children

**New Files Created:**

1. **`/home/wk/projects/kcg/src/components/gpt/DosChat-minimal.tsx`**
   - Minimal ChatKit with ZERO custom CSS
   - Pure test to verify ChatKit works in isolation

2. **`/home/wk/projects/kcg/src/pages/test-chatkit.astro`**
   - Diagnostic page at `/test-chatkit`
   - No styling interference - just raw ChatKit

## Debugging Steps

### Step 1: Test Minimal ChatKit
```bash
npm run dev
```
Visit: **http://localhost:4321/test-chatkit**

**Expected:** Red-bordered container with ChatKit composer visible at bottom

**If composer is visible here:**
- Problem is CSS in DosChat.tsx
- Solution: Remove/adjust CSS overrides

**If composer is NOT visible here:**
- Problem is with ChatKit configuration or API
- Check console for errors
- Verify `/api/chatkit/session` returns valid token

### Step 2: Check Browser Console
Open DevTools and look for:

1. **`[DosChat] ChatKit control object:`** - Should show control object
2. **`[DosChat] Composer config:`** - Should show placeholder and attachments
3. **`[DosChat] ChatKit is ready`** - Confirms initialization
4. **Any errors from ChatKit** - Look for API errors, token issues

### Step 3: Inspect DOM
1. Open DevTools → Elements
2. Find the `<ChatKit>` component (look for `class="chatkit-dos-theme"`)
3. Expand its children - you should see:
   - A thread/messages container
   - A composer container (with input field)

**If composer element exists but is hidden:**
- Problem is CSS `display: none` or `visibility: hidden`
- Check computed styles in DevTools
- Look for which CSS rule is hiding it

**If composer element doesn't exist in DOM:**
- ChatKit didn't render it
- Check `onError` logs in console
- Verify API responses from `/api/chatkit/session`

### Step 4: Verify API Endpoints
Test the session endpoint:
```bash
curl -X POST http://localhost:4321/api/chatkit/session \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-clerk-session-cookie>"
```

**Expected response:**
```json
{
  "client_secret": "chatkit_secret_...",
  "expires_at": "2025-11-10T12:00:00Z"
}
```

## Known ChatKit Behaviors

From official docs and samples:

1. **Composer is enabled by default** - no need to explicitly enable
2. **Composer can be hidden if:**
   - Backend returns errors
   - Token is invalid/expired
   - `history` or `header` interferes with layout
3. **ChatKit expects flex container** with explicit height
4. **CSS overrides can break layout** if too aggressive

## Potential Root Causes

### Most Likely (in order):

1. **CSS Specificity Issue**
   - Our `:global()` selectors might not be targeting the right elements
   - ChatKit's internal class names might have changed
   - Solution: Use browser DevTools to find actual class names

2. **Layout/Height Calculation**
   - Parent container doesn't have proper height
   - Flex layout not working correctly
   - Composer is rendered but has `height: 0`

3. **ChatKit API Error**
   - Backend not responding correctly
   - Token refresh failing
   - Session endpoint returning wrong format

4. **React Hydration Issue**
   - Astro's `client:only="react"` causing problems
   - Component mounting before ChatKit is ready
   - Try `client:load` instead

### Less Likely:

5. **Version Incompatibility**
   - `@openai/chatkit-react` version issue
   - Check `package.json` for version

6. **Content Security Policy**
   - CSP blocking ChatKit's internal scripts
   - Check browser console for CSP errors

## Next Steps

1. **Test `/test-chatkit` page** - This is the definitive test
2. **Check browser console** - Look for all `[DosChat]` logs and any errors
3. **Inspect DOM** - Verify composer element exists
4. **Try removing ALL CSS** - Comment out entire `<style>` block in DosChat.tsx temporarily

## Contact/Support

If issue persists after these steps:
- Capture screenshot of browser DevTools (Console + Elements)
- Copy all console logs
- Note which step revealed the issue
- Check OpenAI ChatKit GitHub issues: https://github.com/openai/chatkit-js/issues
