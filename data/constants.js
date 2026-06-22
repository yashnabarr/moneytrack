/**
 * Application constants
 * Pure data only — no DOM, no state, no side-effects.
 * Loaded first; every other module may depend on this.
 */

/** localStorage keys */
const KEYS = {
  transactions: "mt_transactions",
  budgets:      "mt_budgets",
  goals:        "mt_goals",
  recurring:    "mt_recurring",   // Phase 1: recurring transactions
  splits:       "mt_splits",      // Phase 2: split expense tracker
  auth:         "mt_auth",
  country:      "mt_country",
};

/** Recurring-transaction frequencies. */
const RECURRING_FREQS = [
  { v: "daily",   l: "Daily",   icon: "today",          adv: { unit: "day",   n: 1 } },
  { v: "weekly",  l: "Weekly",  icon: "view_week",      adv: { unit: "day",   n: 7 } },
  { v: "monthly", l: "Monthly", icon: "calendar_month", adv: { unit: "month", n: 1 } },
  { v: "yearly",  l: "Yearly",  icon: "event_repeat",   adv: { unit: "year",  n: 1 } },
];

/** Transaction categories grouped by type */
const CATEGORIES = {
  income:  ["Salary", "Freelance", "Investment", "Gift", "Other Income"],
  expense: ["Groceries", "Dining", "Transport", "Utilities", "Shopping", "Entertainment", "Health", "Rent", "Other"],
};

/** Material icon name per category */
const CAT_ICON = {
  Salary: "work", Freelance: "laptop_mac", Investment: "trending_up", Gift: "card_giftcard", "Other Income": "payments",
  Groceries: "shopping_cart", Dining: "restaurant", Transport: "directions_car", Utilities: "bolt",
  Shopping: "shopping_bag", Entertainment: "movie", Health: "favorite", Rent: "home", Other: "category",
};

/** Available payment methods */
const PAYMENTS = ["Cash", "Credit Card", "Debit Card", "Bank Transfer", "UPI", "Other"];

/** Goal card colors */
const GOAL_COLORS = [
  { id: "emerald", hex: "#006c49", tint: "#d7f0e4" },
  { id: "blue",    hex: "#005ac2", tint: "#d8e6ff" },
  { id: "purple",  hex: "#6d40d8", tint: "#e7ddff" },
  { id: "amber",   hex: "#b45309", tint: "#fceccf" },
];

/** Goal icon options */
const GOAL_ICONS = [
  { v: "savings", l: "Savings" }, { v: "health_and_safety", l: "Emergency" },
  { v: "flight", l: "Travel" }, { v: "smartphone", l: "Gadget" },
  { v: "school", l: "Education" }, { v: "home", l: "Home" },
  { v: "directions_car", l: "Vehicle" }, { v: "celebration", l: "Event" },
];

/** Sidebar navigation items */
const NAV = [
  { id: "dashboard",    label: "Dashboard",     icon: "dashboard" },
  { id: "transactions", label: "Transactions",  icon: "swap_horiz" },
  { id: "recurring",    label: "Recurring",      icon: "autorenew" },
  { id: "splits",       label: "Splits",          icon: "group" },
  { id: "budgets",      label: "Budgets",        icon: "donut_small" },
  { id: "goals",        label: "Savings Goals",  icon: "flag" },
  { id: "analytics",    label: "Analytics",      icon: "monitoring" },
  { id: "reports",      label: "Reports",        icon: "description" },
  { id: "settings",     label: "Settings",       icon: "settings" },
  { id: "help",         label: "Help & Support", icon: "help" },
];

/** Page titles shown in the top bar */
const TAB_TITLES = {
  dashboard: "Dashboard", transactions: "Transactions", recurring: "Recurring",
  splits: "Split Expenses", budgets: "Budgets", goals: "Savings Goals",
  analytics: "Analytics", reports: "Reports",
  settings: "Settings", help: "Help & Support",
};

/** Donut/bar/line chart color palette */
const CHART_COLORS = ["#006c49", "#005ac2", "#6d40d8", "#b45309", "#0e7490", "#be185d", "#15803d", "#a16207", "#64748b"];

/** Transactions per page (pagination) */
const PER_PAGE = 6;

/**
 * Country -> currency mapping (flag, name, ISO code, currency code, symbol, locale).
 * Used by the onboarding popup and the money formatter.
 */
const COUNTRIES = [
  { code: "IN", name: "India",          flag: "🇮🇳", currency: "INR", symbol: "₹",  locale: "en-IN" },
  { code: "US", name: "United States",  flag: "🇺🇸", currency: "USD", symbol: "$",  locale: "en-US" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP", symbol: "£",  locale: "en-GB" },
  { code: "CA", name: "Canada",         flag: "🇨🇦", currency: "CAD", symbol: "$",  locale: "en-CA" },
  { code: "AU", name: "Australia",      flag: "🇦🇺", currency: "AUD", symbol: "$",  locale: "en-AU" },
  { code: "DE", name: "Germany",        flag: "🇩🇪", currency: "EUR", symbol: "€",  locale: "de-DE" },
  { code: "JP", name: "Japan",          flag: "🇯🇵", currency: "JPY", symbol: "¥",  locale: "ja-JP" },
  { code: "FR", name: "France",         flag: "🇫🇷", currency: "EUR", symbol: "€",  locale: "fr-FR" },
  { code: "IT", name: "Italy",          flag: "🇮🇹", currency: "EUR", symbol: "€",  locale: "it-IT" },
  { code: "ES", name: "Spain",          flag: "🇪🇸", currency: "EUR", symbol: "€",  locale: "es-ES" },
  { code: "NL", name: "Netherlands",    flag: "🇳🇱", currency: "EUR", symbol: "€",  locale: "nl-NL" },
  { code: "BE", name: "Belgium",        flag: "🇧🇪", currency: "EUR", symbol: "€",  locale: "nl-BE" },
  { code: "PT", name: "Portugal",       flag: "🇵🇹", currency: "EUR", symbol: "€",  locale: "pt-PT" },
  { code: "IE", name: "Ireland",        flag: "🇮🇪", currency: "EUR", symbol: "€",  locale: "en-IE" },
  { code: "CH", name: "Switzerland",    flag: "🇨🇭", currency: "CHF", symbol: "Fr.", locale: "de-CH" },
  { code: "SE", name: "Sweden",         flag: "🇸🇪", currency: "SEK", symbol: "kr", locale: "sv-SE" },
  { code: "NO", name: "Norway",         flag: "🇳🇴", currency: "NOK", symbol: "kr", locale: "nb-NO" },
  { code: "DK", name: "Denmark",        flag: "🇩🇰", currency: "DKK", symbol: "kr", locale: "da-DK" },
  { code: "FI", name: "Finland",        flag: "🇫🇮", currency: "EUR", symbol: "€",  locale: "fi-FI" },
  { code: "PL", name: "Poland",         flag: "🇵🇱", currency: "PLN", symbol: "zł", locale: "pl-PL" },
  { code: "CZ", name: "Czechia",        flag: "🇨🇿", currency: "CZK", symbol: "Kč", locale: "cs-CZ" },
  { code: "RU", name: "Russia",         flag: "🇷🇺", currency: "RUB", symbol: "₽",  locale: "ru-RU" },
  { code: "TR", name: "Türkiye",        flag: "🇹🇷", currency: "TRY", symbol: "₺",  locale: "tr-TR" },
  { code: "AE", name: "UAE",            flag: "🇦🇪", currency: "AED", symbol: "د.إ", locale: "ar-AE" },
  { code: "SA", name: "Saudi Arabia",   flag: "🇸🇦", currency: "SAR", symbol: "﷼",  locale: "ar-SA" },
  { code: "IL", name: "Israel",         flag: "🇮🇱", currency: "ILS", symbol: "₪",  locale: "he-IL" },
  { code: "ZA", name: "South Africa",   flag: "🇿🇦", currency: "ZAR", symbol: "R",  locale: "en-ZA" },
  { code: "NG", name: "Nigeria",        flag: "🇳🇬", currency: "NGN", symbol: "₦",  locale: "en-NG" },
  { code: "KE", name: "Kenya",          flag: "🇰🇪", currency: "KES", symbol: "KSh", locale: "en-KE" },
  { code: "EG", name: "Egypt",          flag: "🇪🇬", currency: "EGP", symbol: "E£", locale: "ar-EG" },
  { code: "BR", name: "Brazil",         flag: "🇧🇷", currency: "BRL", symbol: "R$", locale: "pt-BR" },
  { code: "MX", name: "Mexico",         flag: "🇲🇽", currency: "MXN", symbol: "$",  locale: "es-MX" },
  { code: "AR", name: "Argentina",      flag: "🇦🇷", currency: "ARS", symbol: "$",  locale: "es-AR" },
  { code: "CL", name: "Chile",          flag: "🇨🇱", currency: "CLP", symbol: "$",  locale: "es-CL" },
  { code: "CO", name: "Colombia",       flag: "🇨🇴", currency: "COP", symbol: "$",  locale: "es-CO" },
  { code: "PE", name: "Peru",           flag: "🇵🇪", currency: "PEN", symbol: "S/", locale: "es-PE" },
  { code: "CN", name: "China",          flag: "🇨🇳", currency: "CNY", symbol: "¥",  locale: "zh-CN" },
  { code: "HK", name: "Hong Kong",      flag: "🇭🇰", currency: "HKD", symbol: "HK$", locale: "en-HK" },
  { code: "TW", name: "Taiwan",         flag: "🇹🇼", currency: "TWD", symbol: "NT$", locale: "zh-TW" },
  { code: "KR", name: "South Korea",    flag: "🇰🇷", currency: "KRW", symbol: "₩",  locale: "ko-KR" },
  { code: "SG", name: "Singapore",      flag: "🇸🇬", currency: "SGD", symbol: "S$", locale: "en-SG" },
  { code: "MY", name: "Malaysia",       flag: "🇲🇾", currency: "MYR", symbol: "RM", locale: "ms-MY" },
  { code: "TH", name: "Thailand",       flag: "🇹🇭", currency: "THB", symbol: "฿",  locale: "th-TH" },
  { code: "ID", name: "Indonesia",      flag: "🇮🇩", currency: "IDR", symbol: "Rp", locale: "id-ID" },
  { code: "PH", name: "Philippines",    flag: "🇵🇭", currency: "PHP", symbol: "₱",  locale: "en-PH" },
  { code: "VN", name: "Vietnam",        flag: "🇻🇳", currency: "VND", symbol: "₫",  locale: "vi-VN" },
  { code: "PK", name: "Pakistan",       flag: "🇵🇰", currency: "PKR", symbol: "₨",  locale: "en-PK" },
  { code: "BD", name: "Bangladesh",     flag: "🇧🇩", currency: "BDT", symbol: "৳",  locale: "bn-BD" },
  { code: "LK", name: "Sri Lanka",      flag: "🇱🇰", currency: "LKR", symbol: "Rs", locale: "en-LK" },
  { code: "NZ", name: "New Zealand",    flag: "🇳🇿", currency: "NZD", symbol: "$",  locale: "en-NZ" },
];

/** Countries surfaced as quick-pick chips in the onboarding popup */
const POPULAR_CODES = ["IN", "US", "GB", "CA", "AU", "DE", "JP"];
