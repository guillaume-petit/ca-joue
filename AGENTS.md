<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tech Stack & Versions

- **Next.js:** 16.2.6 (latest, with breaking changes)
- **React:** 19.2.4 (latest)
- **TypeScript:** 5.x (strict mode enabled)
- **Tailwind CSS:** v4 (uses `@tailwindcss/postcss` plugin, not legacy config)
- **ESLint:** 9.x (flat config format in `eslint.config.mjs`)
- **`@github/models`:** `^0.0.1-beta.2` (installed as dependency; server action uses raw `fetch()` instead of the SDK)

## Key Project Patterns

### Client Components & State Management
- Main app page (`app/page.tsx`) uses `"use client"` directive
- State management via React hooks: `useState`, `useEffect`, `useActionState`
- No external state library (Redux, Zustand, etc.)
- Client-side persistence via `localStorage` (see `app/page.tsx` lines 25-60 for pattern)

### Tailwind CSS v4 Specifics
- Entry file: `app/globals.css` uses `@import "tailwindcss"` (NOT `@tailwind` directives)
- CSS variables for theming: `--background`, `--foreground`, `--font-geist-sans`, `--font-geist-mono`
- Dark mode via `@media (prefers-color-scheme: dark)` in `globals.css`
- Tailwind config via `@theme inline` block in CSS (not separate config file)

### Server Actions & AI Integration
- Directory: `app/actions/` contains `vocabulary.ts` with server functions
- Export interfaces alongside server functions (see `app/actions/vocabulary.ts`)
- Mark files with `"use server"` at top
- **GitHub Models/Copilot Integration:** `getWordSuggestions(word)` calls GitHub Copilot API
  - Requires `GITHUB_TOKEN` environment variable with `copilot` scope
  - Returns: `{ type: string, translation: string, example: string }`
  - Uses `gpt-4o` model by default (configurable in function)
  - API endpoint: `https://models.inference.ai.azure.com/chat/completions`
  - See `COPILOT_SETUP.md` for token setup instructions

### Component Styling
- Use Tailwind utility classes directly (no CSS modules observed)
- Responsive classes: `sm:`, `md:`, `lg:` prefixes common
- Print-specific styles via `print:` prefix (e.g., `print:hidden`, `print:block`)
- Dark mode variants via `dark:` prefix consistently applied

## File Structure

```
app/
  layout.tsx          # Root layout (metadata, fonts, global styles)
  page.tsx            # Main page (667 lines, vocabulary table UI + Copilot integration)
  globals.css         # Global Tailwind & theme CSS
  actions/
    vocabulary.ts     # Server action exports, interfaces, getWordSuggestions() AI function

# Configuration Files
COPILOT_SETUP.md      # GitHub Models API token setup & integration guide
.env.local            # Environment config (GITHUB_TOKEN for Copilot API)
```

## Data Model

```typescript
interface VocabularyItem {
  id: string;        // Random string ID (see page.tsx line 125)
  word: string;      // French word
  type: string;      // Part of speech (noun, verb, etc.)
  translation: string;  // Chinese translation
  example: string;   // Example sentence in French
}
```

## Core Features & Patterns

### localStorage Persistence
- Loads on mount: `localStorage.getItem("vocabulary_items")` → parse JSON
- Auto-saves on change: `localStorage.setItem()` when items array updates
- See `app/page.tsx` lines 60-65 for useEffect dependency chain

### AI-Powered Suggestions (GitHub Copilot)
- **UI Button:** "IA" button appears in word input row (uses Tailwind `bg-purple-600`)
- **State Management:** `loadingSuggestions`, `suggestionsError`, `aiSuggestions` useState hooks
- **Function:** `fetchAiSuggestions()` calls server action `getWordSuggestions(word)`
- **Auto-Fill:** Suggestions automatically populate type, translation, example fields
- **Error Handling:** User sees error message if GITHUB_TOKEN not configured
- **Loading State:** Spinner animation while fetching (disabled button state)
- **User Feedback:** Green success banner appears when suggestions applied
- **Setup Required:** See `COPILOT_SETUP.md` for GitHub token configuration

### CRUD Operations
- **Create:** `handleSaveNew()` generates random ID and clears suggestion state
- **Read:** Filtered via `filteredItems` computed value
- **Update:** `handleSaveEdit()` maps over items array
- **Delete:** `handleDelete()` filters out by ID

### UI Patterns
- Inline editing: toggle `editingItem` state to switch row to edit mode
- Autocomplete suggestions: `typeSuggestions` array, filtered on input; `showSuggestions` state shape `{ field: 'new' | 'edit', visible: boolean }` coordinates which dropdown is open
- Type management: `deleteType(typeToDelete)` removes a type from all items — accessible via delete button in type autocomplete dropdown
- Multi-select: `selectedIds` Set for checkboxes, "select all" toggle
- Auto-resizing textarea: `autoResizeTextarea(e)` adjusts example field height dynamically, capped at 150px; used in both add and edit rows
- Print mode: hidden UI during print via `print:` Tailwind prefix; print block uses `<style jsx global>` with inline `@media print` CSS for A4 card layout (`page-break-after: always`), not Tailwind utilities
- AI suggestions: Purple button with loading spinner, green success feedback

### Fonts & Typography
- Google Fonts integration: `next/font/google` (Geist Sans & Geist Mono)
- Variables injected as CSS: `${geistSans.variable}` → `--font-geist-sans`, `${geistMono.variable}` → `--font-geist-mono` in layout className

## Development Commands

```bash
npm run dev      # Start dev server (auto-reload)
npm run build    # Production build (checks TypeScript)
npm run lint     # ESLint check (uses eslint.config.mjs)
npm start        # Run production build
```

## Important Notes for AI Agents

1. **Next.js 16.2.6 Breaking Changes:** Always check `node_modules/next/dist/docs/` for API changes before assuming standard Next.js behavior.

2. **Tailwind v4:** Do NOT use `@tailwind` directives or legacy config format. Use `@import "tailwindcss"` and `@theme inline` in CSS files.

3. **TypeScript Strict Mode:** Enabled in `tsconfig.json`. All types must be explicit, no `any` without good reason.

4. **Client vs Server:** Main page is client component. Server actions in `app/actions/` export typed functions and interfaces for client use.

5. **localStorage Design:** App assumes single browser/tab. No multi-tab sync or conflict resolution.

6. **French Language:** UI and content in French. Preserve French strings in comments and validation messages.

7. **Path Alias:** `@/*` resolves to project root (TypeScript: `"@/*": ["./*"]`). Use `@/app/...` for imports.

8. **Dark Mode:** Consistently applied via `dark:` prefix on Tailwind classes. Test in both modes.

9. **GitHub Copilot Integration:** 
   - Requires `GITHUB_TOKEN` in `.env.local` with `copilot` scope
   - Server action: `getWordSuggestions(word)` calls GitHub Models API (gpt-4o by default)
   - Client function: `fetchAiSuggestions()` handles loading/error states and auto-fills form
   - Uses fetch API to call `https://models.inference.ai.azure.com/chat/completions`
   - Returns typed `WordSuggestion` interface: `{ type, translation, example }`
   - Graceful fallback if token not configured (empty suggestions, no crash)
   - See `COPILOT_SETUP.md` for complete setup instructions and troubleshooting

