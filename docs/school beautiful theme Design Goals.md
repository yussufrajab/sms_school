I have a Next.js 15 School Management System built with Tailwind CSS v4, shadcn/ui, 
Radix UI, and next-themes. The current theme is plain black and white. 
I want you to transform it into a stunning, modern, light-themed UI that feels 
professional yet friendly for a school environment.

## 🎯 Design Goals
- Light, airy, and energetic — suitable for students, teachers, parents, and admins
- Visually distinct role-based dashboard accents (each role feels personalized)
- Consistent design language across all pages
- No dark backgrounds — light is the primary mode

---

## 🎨 Color Palette to Apply

### Primary Brand Colors
- Primary: Indigo/Violet — `#6366f1` (indigo-500) for main actions, active nav, buttons
- Primary Light: `#eef2ff` (indigo-50) for backgrounds, cards
- Primary Hover: `#4f46e5` (indigo-600)

### Role-Based Accent Colors (apply to dashboard headers & sidebar accents)
- SUPER_ADMIN / IT_ADMIN: Deep Indigo `#4338ca` with gradient to `#7c3aed`
- SCHOOL_ADMIN: Teal `#0d9488` with gradient to `#0891b2`
- TEACHER: Emerald `#059669` with gradient to `#0d9488`
- STUDENT: Sky Blue `#0ea5e9` with gradient to `#6366f1`
- PARENT: Rose `#e11d48` with gradient to `#f97316`
- ACCOUNTANT / FINANCE: Amber `#d97706` with gradient to `#f59e0b`
- LIBRARIAN: Purple `#9333ea` with gradient to `#6366f1`
- RECEPTIONIST: Pink `#ec4899` with gradient to `#f43f5e`

### Neutral / Base
- Page Background: `#f8fafc` (slate-50)
- Card Background: `#ffffff`
- Border: `#e2e8f0` (slate-200)
- Subtle Background: `#f1f5f9` (slate-100)
- Text Primary: `#0f172a` (slate-900)
- Text Secondary: `#64748b` (slate-500)
- Text Muted: `#94a3b8` (slate-400)

### Semantic Colors
- Success: `#10b981` (emerald-500), bg: `#ecfdf5`
- Warning: `#f59e0b` (amber-500), bg: `#fffbeb`
- Error: `#ef4444` (red-500), bg: `#fef2f2`
- Info: `#3b82f6` (blue-500), bg: `#eff6ff`

---

## 🧩 Component Styling Instructions

### Sidebar / Navigation
- Background: white with a subtle left border `border-r border-slate-200`
- Active nav item: indigo-50 background, indigo-600 text, left accent bar `border-l-2 border-indigo-500`
- Hover: slate-50 background
- School logo area: gradient banner matching the current user's role color
- Icons: Use role accent color for active, slate-400 for inactive

### Top Header / Navbar
- Background: white, `shadow-sm border-b border-slate-100`
- Breadcrumbs: slate-500 text
- User avatar: gradient background using role color
- Notification bell: indigo accent with red dot badge

### Dashboard Cards / Stat Cards
- White background, rounded-2xl, subtle shadow: `shadow-sm hover:shadow-md transition-shadow`
- Left colored border OR top gradient strip per card type
- Icon in a soft colored circle (bg-indigo-50, text-indigo-600 etc.)
- Trend indicators: green for positive, red for negative

### Data Tables
- Header row: `bg-slate-50` with `text-slate-600 font-semibold text-xs uppercase tracking-wide`
- Row hover: `hover:bg-indigo-50/40`
- Borders: `divide-y divide-slate-100`
- Action buttons: ghost style with colored icon (edit = indigo, delete = red, view = slate)

### Forms & Inputs
- Input border: `border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100`
- Labels: `text-slate-700 font-medium text-sm`
- Placeholder: `text-slate-400`
- Required asterisk: `text-red-500`

### Buttons
- Primary: `bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm`
- Secondary: `bg-white border border-slate-200 text-slate-700 hover:bg-slate-50`
- Danger: `bg-red-50 text-red-600 border border-red-200 hover:bg-red-100`
- Success: `bg-emerald-50 text-emerald-600 border border-emerald-200`
- All buttons: `transition-all duration-150 font-medium`

### Badges / Status Pills
- Active/Present: `bg-emerald-100 text-emerald-700`
- Inactive/Absent: `bg-red-100 text-red-700`
- Pending: `bg-amber-100 text-amber-700`
- Approved: `bg-sky-100 text-sky-700`
- Paid: `bg-green-100 text-green-700`
- Overdue: `bg-orange-100 text-orange-700`
- All: `rounded-full text-xs font-semibold px-2.5 py-0.5`

### Charts (Recharts)
- Use: `['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6']`
- Grid lines: `#f1f5f9`
- Tooltip: white bg, rounded-lg, shadow-lg

### Modals / Dialogs
- Overlay: `bg-slate-900/40 backdrop-blur-sm`
- Dialog: white, `rounded-2xl shadow-2xl`
- Header: gradient strip or solid indigo header area

### Login Page
- Full-page gradient background: `from-indigo-50 via-white to-sky-50`
- Card: white, `rounded-3xl shadow-2xl p-8`
- Logo area: indigo gradient circle
- Input focus: indigo ring
- Submit button: full-width indigo gradient `from-indigo-600 to-violet-600`

### Toast Notifications (Sonner)
- Success: white card, green left border
- Error: white card, red left border
- Info: white card, blue left border
- Use `richColors` prop

---

## 📐 Layout & Spacing Refinements
- Use `rounded-xl` or `rounded-2xl` for cards and containers (not sharp corners)
- Consistent padding: `p-6` for cards, `px-4 py-3` for table cells
- Section headings: `text-slate-800 font-bold text-lg` with a subtle bottom divider
- Page titles: `text-2xl font-bold text-slate-900` with subtitle in `text-slate-500 text-sm`
- Gap between grid cards: `gap-4` or `gap-6`
- Add subtle `bg-gradient-to-br from-slate-50 to-white` to page backgrounds

---

## 🔧 Implementation Steps

1. **Update `globals.css` / Tailwind CSS v4 theme config**
   - Define CSS custom properties for all colors above
   - Set default background to `#f8fafc`
   - Override shadcn/ui CSS variables for the light theme

2. **Update `components/ui/` shadcn components**
   - Button variants
   - Input, Select, Textarea borders & focus rings
   - Badge colors
   - Card shadows and borders
   - Dialog/Sheet overlay and container

3. **Update Sidebar component**
   - Apply white background, nav item styles, role-based logo banner

4. **Update Dashboard layouts per role**
   - Apply role-based gradient to header/welcome banner
   - Restyle stat cards

5. **Update Tables globally**
   - Apply new header and row styles

6. **Update Login page**
   - Apply gradient background and card design

7. **Update Charts**
   - Pass new color arrays to all Recharts components

8. **Ensure `next-themes` light mode is the default**
   - Set `defaultTheme="light"` and `forcedTheme="light"` if dark mode is not needed,
     OR style both themes beautifully

Please apply these changes systematically across all components and pages, 
starting with the globals/theme config, then shared components, then page layouts.
After each major section, confirm what was changed.