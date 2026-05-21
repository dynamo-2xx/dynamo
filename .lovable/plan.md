## Goal

Replace the top profile display on three surfaces — Home (`/`), Profile (`/profile`), and Edit Profile (`/profile/edit`) — with a single, shared "ID card" component styled in the minimal DYNAMO aesthetic. The Home card keeps its fade-in transition. The Edit card is the only one with inline editing.

## Data model

No schema changes. All fields already exist on `profiles`:

- `display_name` → Name
- `friend_code` (unique) → Friend code + QR target
- `created_at` → Join date
- `avatar_url` → Portrait field
- `banner_url` → Background

QR encodes a stable share URL: `${window.location.origin}/u/${friend_code}` (or `/profile/${friend_code}` — using whichever route already resolves; if no such route exists yet we encode the friend code string as plain text — to be confirmed in implementation).

## New component

`src/components/profile/ProfileIdCard.tsx`

Single component with one prop surface:

```ts
interface ProfileIdCardProps {
  variant: "display" | "edit";
  // Edit-only callbacks (ignored when variant="display")
  onAvatarClick?: () => void;
  onBannerClick?: () => void;
  onNameChange?: (v: string) => void;
  uploading?: "avatar" | "banner" | null;
  // Overrides for live-editing preview (Edit page passes form state)
  overrides?: { display_name?: string; avatar_url?: string | null; banner_url?: string | null };
}
```

It reads `user` + `profile` from `useAuth()` and renders the ID card. The display version is read-only; the edit version shows a Camera button on banner, a Camera button on avatar, and an inline `<Input>` for the display name. All other ID-card fields (username/handle, join date, friend code, QR) are always read-only — friend code is system-issued and join date is immutable.

### Visual structure (DYNAMO minimal, ID-card metaphor)

```text
┌──────────────────────────────────────────────────────────┐
│  [banner image — full bleed, ~aspect-[5/2]]              │
│                                          [Banner ⌃]      │  ← edit only
│  ┌──────────┐                                            │
│  │ avatar   │   Display Name (Instrument Serif)          │
│  │ (round)  │   @handle                  · Joined May 26 │
│  └──────────┘                                            │
│ ─────────────────────────────────────────────────────── │
│  FRIEND CODE                                  ┌────────┐ │
│  D-A4F7-9K2Q  (mono, tracked)                 │  QR    │ │
│  Tap to copy                                  │ 72×72  │ │
│                                               └────────┘ │
└──────────────────────────────────────────────────────────┘
```

Tokens: `bg-card border border-border rounded-2xl overflow-hidden`. Friend code uses `font-mono tracking-[0.2em] tabular-nums`. Section divider is `border-t border-border/60`. Joined date format: `Joined {Mon YYYY}`. Tap-to-copy on the friend code triggers a `toast.success("Friend code copied")`.

QR rendering uses the existing `qrcode` package via `src/lib/qr.ts → makeQrDataUrl`. Generated once per friend-code value with `useEffect`.

## Wiring

### 1. `src/components/home/GreetingHeader.tsx`

Inside the `AnimatePresence` "header" branch, **replace** the banner + avatar + name block with `<ProfileIdCard variant="display" />`. Keep:

- The greeting → header fade (`AnimatePresence`, 1000ms delay, existing transition props).
- The logged-out welcome banner (unchanged).
- The Avg score badge stays in its current position **outside** the ID card, floating top-right of the card region (preserves the current layout intent). If it would crowd the QR, we relocate it just below the card — to be decided visually during implementation.

### 2. `src/pages/ProfilePage.tsx`

Replace the existing avatar/name/email block (lines ~76–92, the `<div className="bg-background border border-border rounded-lg p-4 sm:p-6 mb-6 flex items-center gap-4 sm:gap-5">…`) with `<ProfileIdCard variant="display" />`. Everything below (Activity list, Account list, Admin, Sign Out, Published Takes) is unchanged.

### 3. `src/pages/EditProfilePage.tsx`

Replace the current "Banner + Avatar" section (lines ~286–362) with:

```tsx
<ProfileIdCard
  variant="edit"
  overrides={{ display_name: form.display_name, avatar_url: form.avatar_url, banner_url: form.banner_url }}
  uploading={uploading}
  onBannerClick={() => bannerInputRef.current?.click()}
  onAvatarClick={() => avatarInputRef.current?.click()}
  onNameChange={(v) => setForm((f) => ({ ...f, display_name: v }))}
/>
```

The hidden `<input type="file">` elements and `handleUpload` stay in the page (they own the form state). The "Display name" field is **removed** from the Basic info section because it now lives inside the card. Affiliation, Location, Role, Public toggle, Save/Cancel, Delete/Export — all unchanged.  
  
My extra input: Make everything suitable for mobile. no missing or overlapping buttons. no horizontal scroll wheel EVER for desktop or mobile. 

## Out of scope

- No new routes, no friend-code regeneration UI, no friend-code redemption flow.
- No changes to the Avg badge logic.
- No changes to logged-out home banner.
- No backend/RLS changes.  


## Files touched

- **add** `src/components/profile/ProfileIdCard.tsx`
- **edit** `src/components/home/GreetingHeader.tsx`
- **edit** `src/pages/ProfilePage.tsx`
- **edit** `src/pages/EditProfilePage.tsx`  
