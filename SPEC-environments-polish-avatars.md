# Mokulua Math: Environments, Polish & Avatar Redesign

## Overview

Three improvements:
1. **Environment Shop** - Buy/unlock beach scenes with coins
2. **Polish Items** - Fire flicker, coin animations, power-up indicators
3. **Avatar Redesign** - Replace emoji costumes with pixel art SVG pieces

---

## 1. Environment/Background Shop

### Current State
- 12 scene variations exist (beach, tidepools, sunset, etc.)
- Unlocked only via player level (unlockLevel property)
- Selected in Theme Picker modal

### New Features

**Shop Integration:**
- Environments purchasable with coins (alternative to level unlock)
- Price scales with unlock level: `price = unlockLevel * 20`
- Example: Sunset (L20) = 400 coins, Underwater (L35) = 700 coins

**UI Changes:**
- Add "Environments" tab to Shop modal
- Show locked environments with price OR level requirement
- "Unlock with coins" button for affordable ones
- Already-unlocked environments show checkmark

**Data:**
```javascript
let purchasedEnvironments = []; // localStorage: mathblaster_environments
```

**Environment unlock check:**
```javascript
function isEnvironmentUnlocked(env) {
    return playerLevel >= env.unlockLevel || purchasedEnvironments.includes(env.id);
}
```

---

## 2. Polish Items

### 2.1 Fire Flicker Animation

**When:** streak > 0
**Effect:** Subtle orange glow pulse on fire icon

```css
@keyframes fireFlicker {
    0%, 100% { filter: drop-shadow(0 0 2px #ff6600); }
    50% { filter: drop-shadow(0 0 6px #ff9900); }
}
.pixel-fire.active {
    animation: fireFlicker 0.5s infinite;
}
```

**Trigger:** Add/remove `.active` class when streak changes

### 2.2 Coin Animation (Mystery Box)

**Current:** Static coins appear in mystery box modal
**New:** Coins burst up then fly to coin counter

**Implementation:**
1. Create coin elements with random positions
2. Animate upward burst (CSS transform)
3. After burst, animate toward coin counter position
4. Increment counter as each coin arrives

```css
@keyframes coinBurst {
    0% { transform: translateY(0) scale(1); opacity: 1; }
    50% { transform: translateY(-30px) scale(1.2); }
    100% { transform: translateY(-20px) scale(1); opacity: 1; }
}
@keyframes coinFlyToCounter {
    to { transform: translate(var(--target-x), var(--target-y)) scale(0.5); opacity: 0; }
}
```

### 2.3 Active Power-Up Indicator

**Location:** Below stats row, above progress bars
**Show:** Currently active power-ups with remaining duration/uses

```html
<div class="active-powerups" id="activePowerUps">
    <!-- Dynamically populated -->
    <div class="powerup-active">✨ Golden: 3 left</div>
</div>
```

```css
.active-powerups {
    display: flex;
    justify-content: center;
    gap: 10px;
    font-size: 0.75rem;
    color: var(--accent);
    min-height: 20px;
}
.powerup-active {
    background: rgba(255,217,61,0.2);
    padding: 2px 8px;
    border-radius: 10px;
    animation: pulse 2s infinite;
}
```

**Update:** Call `updateActivePowerUps()` when power-ups activate/deplete

---

## 3. Avatar Customization Redesign

### Problem
Current system overlays emoji icons on pixel art avatars. This looks bad:
- Emojis don't match pixel art style
- Positioning is hacky (absolute positioned divs)
- Visual inconsistency

### Solution
Replace all costume items with pixel art SVG overlays that:
- Match the 16x16 pixel art style
- Layer properly on avatar SVGs
- Use `<use>` references like other game elements

### New Costume System

**Structure:**
```javascript
const COSTUMES = {
    hats: [
        { id: 'hat-none', name: 'None', svgId: null, unlockLevel: 1 },
        { id: 'hat-pirate', name: 'Pirate Hat', svgId: 'costume-hat-pirate', unlockLevel: 5 },
        { id: 'hat-crown', name: 'Crown', svgId: 'costume-hat-crown', unlockLevel: 15 },
        // ...
    ],
    outfits: [
        { id: 'outfit-none', name: 'None', svgId: null, unlockLevel: 1 },
        { id: 'outfit-bowtie', name: 'Bow Tie', svgId: 'costume-outfit-bowtie', unlockLevel: 8 },
        // ...
    ],
    accessories: [
        { id: 'acc-none', name: 'None', svgId: null, unlockLevel: 1 },
        { id: 'acc-sunglasses', name: 'Sunglasses', svgId: 'costume-acc-sunglasses', unlockLevel: 3 },
        // ...
    ]
};
```

### New SVG Costume Pieces

Each costume is a 16x16 SVG symbol designed to overlay the avatar:

**Hats (positioned at top of avatar):**
- `costume-hat-pirate` - Black pirate hat with skull
- `costume-hat-crown` - Golden crown with gems
- `costume-hat-wizard` - Purple wizard hat with stars
- `costume-hat-party` - Colorful party cone hat
- `costume-hat-santa` - Red Santa hat with white trim

**Outfits (positioned at body of avatar):**
- `costume-outfit-bowtie` - Red bow tie
- `costume-outfit-cape` - Red superhero cape
- `costume-outfit-armor` - Silver knight armor chest

**Accessories (positioned to side):**
- `costume-acc-sunglasses` - Cool black sunglasses
- `costume-acc-wand` - Sparkly magic wand
- `costume-acc-sword` - Pixel sword

### Rendering

**Avatar container structure:**
```html
<div class="avatar-container">
    <svg class="avatar-base"><use href="#pixel-mango"/></svg>
    <svg class="avatar-hat"><use href="#costume-hat-pirate"/></svg>
    <svg class="avatar-outfit"><use href="#costume-outfit-bowtie"/></svg>
    <svg class="avatar-accessory"><use href="#costume-acc-sunglasses"/></svg>
</div>
```

**CSS positioning:**
```css
.avatar-container { position: relative; }
.avatar-base, .avatar-hat, .avatar-outfit, .avatar-accessory {
    position: absolute;
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
}
.avatar-hat { top: -20%; }  /* Sits above head */
.avatar-outfit { /* Centered on body */ }
.avatar-accessory { right: -15%; top: 20%; }  /* To the side */
```

### Costume Preview in Modal

Update `updateCostumePreview()` to use SVG layers instead of emoji overlays.

### Costume Grid Display

Show costume SVG preview instead of emoji icon:
```html
<div class="costume-item">
    <svg class="costume-preview"><use href="#costume-hat-pirate"/></svg>
    <div class="costume-name">Pirate Hat</div>
</div>
```

### Reduced Item Count

Focus on quality over quantity. Final costume list:

**Hats (6):**
| ID | Name | Unlock |
|----|------|--------|
| hat-none | None | Default |
| hat-pirate | Pirate Hat | Level 5 |
| hat-crown | Crown | Level 15 |
| hat-wizard | Wizard Hat | Beat Kraken |
| hat-party | Party Hat | Level 25 |
| hat-santa | Santa Hat | Level 40 |

**Outfits (5):**
| ID | Name | Unlock |
|----|------|--------|
| outfit-none | None | Default |
| outfit-bowtie | Bow Tie | Level 8 |
| outfit-cape | Cape | Beat any boss |
| outfit-armor | Knight Armor | Beat Pirate |
| outfit-scarf | Scarf | Level 30 |

**Accessories (5):**
| ID | Name | Unlock |
|----|------|--------|
| acc-none | None | Default |
| acc-sunglasses | Sunglasses | Level 3 |
| acc-wand | Magic Wand | 100 score |
| acc-sword | Sword | Level 20 |
| acc-balloon | Balloon | Level 10 |

### Shop Costumes (Pixel Art)

Update SHOP_COSTUMES to also use SVG:

**Shop Hats:**
- hat-chef (250 coins) - White chef toque
- hat-cowboy (400 coins) - Brown cowboy hat

**Shop Outfits:**
- outfit-knight (600 coins) - Full knight armor

**Shop Accessories:**
- acc-guitar (300 coins) - Red guitar

---

## Implementation Order

1. **Polish items first** (quick wins)
   - Fire flicker CSS animation
   - Active power-up indicator HTML/CSS/JS
   - Coin animation in mystery box

2. **Environment shop** (medium)
   - Add Environments tab to shop
   - purchasedEnvironments persistence
   - Update environment unlock check

3. **Avatar redesign** (largest)
   - Create all costume SVG symbols
   - Update COSTUMES/SHOP_COSTUMES data structures
   - Update avatar rendering (container + layers)
   - Update costume modal display
   - Update costume preview
   - Remove emoji overlay code

---

## localStorage Keys

| Key | Type | Purpose |
|-----|------|---------|
| `mathblaster_environments` | array | Purchased environment IDs |

(Other keys unchanged from previous spec)

---

## Success Criteria

1. Fire icon pulses when streak > 0
2. Mystery box coins animate toward counter
3. Active power-ups shown below stats
4. Environments purchasable in shop with coins
5. All costumes render as pixel art SVGs (no emojis)
6. Costumes look good on both mango and watermelon avatars
7. All existing functionality preserved
