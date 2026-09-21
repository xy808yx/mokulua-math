# Mokulua Math: Icon & Economy Revamp Spec

## Problem Statement

The current UI has two mangos visible simultaneously:
1. **Mango Avatar** (top-left) - customizable character with costumes
2. **Mango Points Icon** (stats row) - showing score

Additionally, the **watermelon streak icon** is not intuitive to kids. They don't understand what either fruit represents as a stat.

## Solution Overview

| Current | New |
|---------|-----|
| Mango = avatar + points icon | Mango = avatar only |
| Watermelon = streak icon | Watermelon = selectable avatar |
| Points shown with mango | Points shown with **gold coin** |
| Streak shown with watermelon | Streak shown with **fire/flame** |
| No spending mechanism | **Coin shop** for costumes & power-ups |

---

## 1. New Icon System

### 1.1 Points: Gold Coins

**Visual:** Pixel art gold coin matching the existing mango/watermelon art style (chibi, cute, 16x16 base scaled up).

**Behavior:**
- Displays in stats row where mango icon currently appears
- Shows current coin count (replaces "score")
- Coins persist across sessions (localStorage)
- Tapping the coin counter opens the Shop

**Technical:**
- New SVG symbol: `#pixel-coin`
- Update `<div class="stat-item">` to use coin icon
- Add `onclick="openShopModal()"` to coin stat

### 1.2 Streak: Fire/Flame

**Visual:** Pixel art flame matching existing style. Orange/red gradient, animated flicker optional.

**Behavior:**
- Displays in stats row where watermelon icon currently appears
- Shows current streak count
- Resets to 0 on wrong answer (unchanged behavior)

**Technical:**
- New SVG symbol: `#pixel-fire`
- Update streak `<div class="stat-item">` to use fire icon
- Optional: CSS animation for subtle flicker when streak > 0

### 1.3 Streak Celebrations

**Current:** `🍉 X STREAK! 🍉` (emoji-based)

**New:** Fire-themed celebration that doesn't clutter the math area.

Options (choose during implementation):
- Small fire icon appears briefly next to streak counter with pulse animation
- Streak counter gets orange glow/pulse at milestones
- Subtle fire particle effect around the streak number

**Key constraint:** Must not distract from the math problem area.

---

## 2. Avatar System Expansion

### 2.1 Selectable Avatars

**Initial roster:**
- Mango (default)
- Watermelon (unlocked by default)

**Design for expansion:** System should easily support adding new fruit avatars in the future (strawberry, pineapple, etc.)

### 2.2 Avatar Data Structure

```javascript
const avatars = {
  mango: {
    id: 'mango',
    name: 'Mango',
    svgId: 'pixel-mango',
    unlocked: true // default
  },
  watermelon: {
    id: 'watermelon',
    name: 'Watermelon',
    svgId: 'pixel-watermelon',
    unlocked: true // default for now
  }
  // Future: strawberry, pineapple, etc.
};
```

### 2.3 Avatar Selection UI

**Location:** New "Avatar" tab in the costume modal (first tab, before Hats/Outfits/Accessories).

**Layout:**
- Grid of available avatars (similar to costume grid)
- Locked avatars show lock icon + unlock requirement
- Selected avatar has gold border (same as equipped costumes)

### 2.4 Costume Compatibility

- **Universal unlocks:** Unlock a costume once, use on any avatar
- **Shared costumes:** Same hats/outfits/accessories work on all avatars
- **Technical:** Costume layers overlay the base avatar SVG

### 2.5 Watermelon Avatar Adaptation

The existing `#pixel-watermelon` SVG needs costume layer support:
- Same three layers as mango: hat, outfit, accessory
- Costume positioning may need per-avatar offsets

---

## 3. Coin Economy

### 3.1 Earning Coins

| Source | Amount |
|--------|--------|
| Correct answer | 1 coin (base) |
| Combo multiplier | 1 × combo (max 5) |
| Mystery box bonus | 2-5 coins |
| Boss defeat | 10-25 coins (variable) |

**Persistence:** Coins saved to localStorage, never reset.

### 3.2 Spending Coins

Coins are spent in the **Shop** on:
1. Shop-exclusive costumes
2. Power-ups

---

## 4. Shop System

### 4.1 Shop Access

**Location:** New shop button in header/settings area (not inside costume modal).

**Visual:** Pixel art shop icon or treasure chest icon.

**Behavior:** Opens shop modal.

### 4.2 Shop Modal Layout

```
┌─────────────────────────────────────┐
│  SHOP                    [X Close]  │
│  💰 Your coins: 247                 │
├─────────────────────────────────────┤
│  [Costumes] [Power-Ups]  ← tabs     │
├─────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ hat │ │outfit│ │ acc │           │
│  │ 150 │ │ 300 │ │ 200 │           │
│  └─────┘ └─────┘ └─────┘           │
│  ... more items in grid ...         │
└─────────────────────────────────────┘
```

### 4.3 Shop Inventory

**Costumes Tab:**
- Shop-exclusive items ONLY (not obtainable via achievements/bosses)
- Show item preview, name, and price
- Purchased items show checkmark, no re-purchase

**Power-Ups Tab:**
- Consumable items (can buy multiple)
- Show icon, name, description, price
- Show quantity owned

### 4.4 Pricing Philosophy

Items should be **expensive** - kids should grind to afford them.

**Suggested price ranges:**

| Item Type | Price Range |
|-----------|-------------|
| Common costume | 200-400 coins |
| Rare costume | 500-800 coins |
| Legendary costume | 1000+ coins |
| Power-up (single use) | 50-150 coins |

*Note: At ~5 coins/correct answer average, a 500-coin item requires ~100 correct answers.*

---

## 5. Power-Ups

### 5.1 Available Power-Ups

| Power-Up | Price | Effect |
|----------|-------|--------|
| **Celebration Dance** | 75 coins | Avatar does a happy dance after each correct answer for 30 seconds |
| **Golden Problems** | 100 coins | Next 5 problems award 2× coins (visual gold shimmer on problems) |
| **Boss Summoner** | 150 coins | Instantly triggers a boss battle (with loot chance) |
| **Mystery Magnet** | 50 coins | Next mystery box appears in half the normal time |

### 5.2 Power-Up UX

**Activation:** Tap power-up in shop (if owned) or dedicated power-up bar during game.

**Active indicator:** Show active power-ups with remaining duration/uses near the stats area.

**Storage:** Power-up quantities saved to localStorage.

---

## 6. Reward Animations

### 6.1 Mystery Box

**Current:** Rains mango icons for bonus points.

**New:** Treasure chest burst animation.

**Behavior:**
1. Chest appears center screen
2. Lid opens with bounce animation
3. Coins burst/fountain out
4. Coins animate toward coin counter
5. Counter updates with new total

**Asset needed:** `#pixel-treasure-chest` (closed and open states)

### 6.2 Boss Defeat

**Current:** "+10 mangoes" text.

**New:** Variable treasure drop.

**Behavior:**
1. Boss defeat animation plays
2. Loot drops:
   - **Always:** 10-25 coins (variable by boss)
   - **75% chance:** Random costume drop (from boss loot table)
3. If costume drops: Show costume preview with "NEW!" badge
4. Coin explosion animation

### 6.3 Boss Loot Tables

Each boss has a loot table of costumes they can drop:

```javascript
const bossLoot = {
  'pirate-captain': {
    coins: { min: 10, max: 15 },
    costumes: ['hat-pirate', 'outfit-armor'] // 75% to drop one
  },
  'kraken': {
    coins: { min: 15, max: 20 },
    costumes: ['hat-wizard', 'acc-tentacle']
  },
  'whale': {
    coins: { min: 20, max: 25 },
    costumes: ['acc-shield', 'outfit-captain']
  }
};
```

---

## 7. Unlock System (Hybrid)

Costumes can be obtained through multiple sources:

| Source | Examples |
|--------|----------|
| **Level unlocks** | hat-crown (Lv.15), outfit-tuxedo (Lv.30) |
| **Achievement unlocks** | hat-flower (10 streak achievement) |
| **Boss drops** | hat-wizard (75% from Kraken) |
| **Shop purchase** | Shop-exclusive items only |

**Rule:** If a costume is obtainable via achievement/boss, it is NOT in the shop. Shop has exclusive items only.

---

## 8. Data Persistence

### 8.1 New localStorage Keys

```javascript
// Existing
localStorage.setItem('mathBlasterLevel', level);
localStorage.setItem('mathBlasterXP', xp);
localStorage.setItem('mathBlasterCostume', JSON.stringify(equippedCostume));

// New
localStorage.setItem('mathBlasterCoins', coins);
localStorage.setItem('mathBlasterAvatar', selectedAvatarId);
localStorage.setItem('mathBlasterPowerUps', JSON.stringify(ownedPowerUps));
localStorage.setItem('mathBlasterShopPurchases', JSON.stringify(purchasedItems));
```

### 8.2 Migration

On first load after update:
1. Check if `mathBlasterCoins` exists
2. If not, initialize to 0 (or optionally grant starting bonus)
3. Default avatar to 'mango'

---

## 9. New Pixel Art Assets Required

| Asset | ID | Description |
|-------|-------|-------------|
| Gold Coin | `#pixel-coin` | Cute chibi coin, gold with shine, matches mango/watermelon style |
| Fire/Flame | `#pixel-fire` | Orange/red flame, cute style, optional animation frames |
| Treasure Chest | `#pixel-treasure-chest` | Closed and open states for animation |
| Shop Icon | `#pixel-shop` | Small shop/store icon for header button |

**Style guide:** Match existing assets - 16x16 base, chibi proportions, black outlines, gradient fills, cute faces optional on objects.

---

## 10. Technical Notes

### 10.1 Architecture

Maintain single-file architecture (index.html with inline CSS/JS).

### 10.2 Key Code Changes

1. **Stats display:** Replace mango/watermelon icons with coin/fire
2. **Score variable:** Rename to `coins`, add persistence
3. **Avatar system:** Add avatar selection, store selected avatar
4. **Costume modal:** Add Avatar tab, restructure tabs
5. **Shop modal:** New modal with tabs for costumes/power-ups
6. **Power-up system:** Track owned power-ups, activation logic
7. **Mystery box:** Replace mango rain with treasure chest animation
8. **Boss rewards:** Add variable coins + costume drop logic
9. **Celebration text:** Replace watermelon emoji with fire-themed alternative

### 10.3 Removed/Changed

| Removed | Replacement |
|---------|-------------|
| Mango as points icon | Coin icon |
| Watermelon as streak icon | Fire icon |
| `🍉 X STREAK! 🍉` text | Fire-themed celebration |
| Mango rain in mystery box | Treasure chest burst |
| Fixed boss rewards | Variable loot drops |

---

## 11. Out of Scope

The following are explicitly NOT part of this spec:
- Environment/background unlocks (separate spec)
- New avatar fruits beyond mango + watermelon
- Refactoring to multiple files
- Real-money purchases

---

## 12. Success Criteria

1. No more duplicate mango confusion - avatar and points are visually distinct
2. Kids intuitively understand coins = points, fire = streak
3. Shop provides long-term goals that motivate grinding
4. Power-ups feel fun and desirable
5. Existing features (levels, achievements, bosses) continue working
6. All progress persists correctly across sessions
