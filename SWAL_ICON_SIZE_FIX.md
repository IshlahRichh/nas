# SweetAlert2 Icon Size Fix

## 🎯 Problem
Icon SweetAlert2 terlalu kecil dan tidak terlihat jelas di modal dialog, terutama untuk warning, error, dan confirmation dialogs.

## ✅ Solution

### 1. Custom CSS Class
Menambahkan custom CSS class `swal2-icon-large` di file `src/assets/css/sweetalert.css`:

```css
/* Custom class for larger icons */
.swal2-icon-large {
    width: 100px !important;
    height: 100px !important;
    font-size: 60px !important;
    line-height: 100px !important;
    border-width: 5px !important;
    margin: 20px auto 30px !important;
}
```

**Icon size:**
- Before: 80px × 80px (default)
- After: **100px × 100px** (+25% larger)

### 2. Icon Type Specific Styling

#### Warning Icon
```css
.swal2-icon-large.swal2-warning {
    border-color: #f8bb86 !important;
}

.swal2-icon-large.swal2-warning .swal2-icon-content {
    font-size: 80px !important;
}
```

#### Error Icon
```css
.swal2-icon-large.swal2-error .swal2-x-mark {
    width: 80px !important;
    height: 80px !important;
}

.swal2-icon-large.swal2-error [class^='swal2-x-mark-line'] {
    width: 60px !important;
    height: 8px !important;
}
```

#### Success Icon
```css
.swal2-icon-large.swal2-success .swal2-success-ring {
    width: 100px !important;
    height: 100px !important;
    border: 5px solid rgba(165, 220, 134, 0.3) !important;
}

.swal2-icon-large.swal2-success [class^='swal2-success-line'][class$='tip'] {
    width: 35px !important;
    left: 20px !important;
    top: 56px !important;
}
```

### 3. Usage in RaidConfiguration.tsx

Semua SweetAlert2 dialogs sudah diupdate dengan `customClass`:

```typescript
Swal.fire({
    icon: 'warning',
    title: 'Create RAID Array?',
    html: '...',
    customClass: {
        icon: 'swal2-icon-large'  // ← Add this
    }
});
```

## 📝 Files Modified

### 1. `/src/assets/css/sweetalert.css`
- Added `.swal2-icon-large` base styling
- Added icon-specific overrides for warning, error, success, info, question
- Adjusted internal elements (X marks, checkmarks, etc.)

### 2. `/src/pages/nas-settings/RaidConfiguration.tsx`
Updated all Swal.fire() calls with `customClass`:
- `checkMdadm()` - mdadm not installed warning
- `handleCreateRaid()` - Invalid selection/input warnings
- `handleCreateRaid()` - Create confirmation dialog
- `handleCreateRaid()` - Success/error messages
- `handleDeleteRaid()` - Delete confirmation (simulated)
- `handleDeleteRaid()` - Delete confirmation (real)
- `handleDeleteRaid()` - Success/error messages
- `handleMountToggle()` - Mount/unmount success/error messages
- `loadDisks()` - Error loading disks

## 🎨 Visual Improvements

### Before
```
┌─────────────────┐
│   ⚠️   80px    │  ← Too small
│                 │
│  Warning Title  │
│   Some text     │
└─────────────────┘
```

### After
```
┌─────────────────┐
│                 │
│   ⚠️  100px    │  ← Larger, more visible
│                 │
│  Warning Title  │
│   Some text     │
└─────────────────┘
```

## 🧪 Testing

### Test Icons in Browser
```typescript
// Warning
Swal.fire({
    icon: 'warning',
    title: 'Test Warning',
    customClass: { icon: 'swal2-icon-large' }
});

// Error
Swal.fire({
    icon: 'error',
    title: 'Test Error',
    customClass: { icon: 'swal2-icon-large' }
});

// Success
Swal.fire({
    icon: 'success',
    title: 'Test Success',
    customClass: { icon: 'swal2-icon-large' }
});

// Info
Swal.fire({
    icon: 'info',
    title: 'Test Info',
    customClass: { icon: 'swal2-icon-large' }
});

// Question
Swal.fire({
    icon: 'question',
    title: 'Test Question',
    customClass: { icon: 'swal2-icon-large' }
});
```

## 📊 Icon Size Comparison

| Element | Default | Custom Large | Increase |
|---------|---------|--------------|----------|
| Container | 80px × 80px | 100px × 100px | +25% |
| Border width | 4px | 5px | +25% |
| Font size | 45px | 60px - 80px | +33-78% |
| Margin bottom | 15px | 30px | +100% |

## 🔧 Customization

To adjust icon size globally, modify in `sweetalert.css`:

```css
.swal2-icon-large {
    width: 120px !important;      /* Adjust size */
    height: 120px !important;     /* Adjust size */
    font-size: 70px !important;   /* Adjust content size */
    margin: 25px auto 35px !important; /* Adjust spacing */
}
```

## 💡 Pro Tips

1. **Consistency**: Always use `customClass: { icon: 'swal2-icon-large' }` for all important dialogs
2. **Mobile**: Icon automatically scales on smaller screens (responsive)
3. **Dark Mode**: Icons work correctly in both light and dark themes
4. **Animation**: Icon animations (shake, pulse) still work with larger size

## 🚀 Future Enhancements

- [ ] Add animation variants (pulse, shake) for larger icons
- [ ] Create size presets (small, medium, large, xlarge)
- [ ] Add icon glow effect for critical warnings
- [ ] Implement colored icon backgrounds
