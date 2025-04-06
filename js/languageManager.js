/**
 * languageManager.js
 * Handles language switching and preference persistence.
 */

const LANG_STORAGE_KEY = 'ai-star-chart-language';
let currentTranslations = {}; // Variable to hold loaded translations
const translationMap = { // Maps translation keys (from JSON) to CSS selectors
    // Header/General UI
    "appName": "header > h1", // Will need special handling for HTML content
    "appSubtitle": "header > p",
    "langZhBtn": "#lang-zh-btn",
    "langEnBtn": "#lang-en-btn",
    // AI Pool
    "unrankedItemsTitle": "#nebula-candidate-area h2", // Special HTML handling
    "addCustomAiButton": "#add-custom-ai-btn",      // Special HTML handling
    // Tier List Section
    "aiToolTierListTitle": "#star-tier-division h2", // Special HTML handling
    // Tier Controls Buttons (if they are brought back)
    "addTierButton": "#add-tier-btn",       // Special HTML handling
    "removeTierButton": "#remove-tier-btn", // Special HTML handling
    // Action Buttons
    "saveChartButton": "#save-chart-btn",   // Special HTML handling
    "shareChartButton": "#share-chart-btn", // Special HTML handling
    "exportImageButton": "#export-image-btn",// Special HTML handling
    "resetChartButton": "#reset-chart-btn", // Special HTML handling
    // Footer
    "footerText": "footer p",
    // Modal titles/labels will be handled separately when modals open
};
// Define which keys expect HTML content
const htmlContentKeys = [
    "appName",
    "unrankedItemsTitle",
    "addCustomAiButton",
    "aiToolTierListTitle",
    "addTierButton",
    "removeTierButton",
    "saveChartButton",
    "shareChartButton",
    "exportImageButton",
    "resetChartButton"
];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => { // Make async
    await initializeLanguage(); // Await initialization
    setupLanguageEventListeners();
});

/**
 * Sets the initial language based on storage or browser preference.
 */
async function initializeLanguage() { // Make async
    const storedLang = localStorage.getItem(LANG_STORAGE_KEY);
    const browserLang = navigator.language.startsWith('zh') ? 'zh' : 'en'; // Basic browser check
    const initialLang = storedLang || browserLang;
    await setLanguage(initialLang); // Await the async setLanguage
}

/**
 * Sets up event listeners for the language buttons.
 */
function setupLanguageEventListeners() {
    const zhBtn = document.getElementById('lang-zh-btn');
    const enBtn = document.getElementById('lang-en-btn');

    if (zhBtn) {
        zhBtn.addEventListener('click', () => setLanguage('zh'));
    } else {
        console.warn('[LanguageManager] ZH language button not found.');
    }

    if (enBtn) {
        enBtn.addEventListener('click', () => setLanguage('en'));
    } else {
        console.warn('[LanguageManager] EN language button not found.');
    }
}

/**
 * Sets the application language, updates UI elements, stores preference, and dispatches event.
 * @param {'zh' | 'en'} lang - The target language code.
 */
async function setLanguage(lang) { // Make async
    if (lang !== 'zh' && lang !== 'en') {
        console.warn(`[LanguageManager] Invalid language code: ${lang}. Defaulting to 'zh'.`);
        lang = 'zh';
    }

    // 0. Load translations for the selected language
    await loadLanguage(lang); // Await loading

    // 1. Set HTML lang attribute
    document.documentElement.lang = lang;

    // 2. Update button active state
    updateButtonStates(lang);

    // 3. Store preference
    localStorage.setItem(LANG_STORAGE_KEY, lang);

    // 4. Dispatch custom event for other modules to listen to
    const langEvent = new CustomEvent('languageChanged', { detail: { lang: lang } });
    document.documentElement.dispatchEvent(langEvent);

    // 5. Update static text elements using loaded translations
    updateStaticText(); // No need to pass lang, uses currentTranslations
    console.log(`[LanguageManager] Language set to: ${lang}`);
}

/**
 * Updates the visual state of the language buttons.
 * @param {'zh' | 'en'} activeLang
 */
function updateButtonStates(activeLang) {
    const zhBtn = document.getElementById('lang-zh-btn');
    const enBtn = document.getElementById('lang-en-btn');

    if (zhBtn) {
        zhBtn.classList.toggle('active-lang', activeLang === 'zh');
    }
    if (enBtn) {
        enBtn.classList.toggle('active-lang', activeLang === 'en');
    }
}

/**
 * Updates text content of static elements based on the selected language.
 */
function updateStaticText() {
    if (!currentTranslations || Object.keys(currentTranslations).length === 0) {
        console.warn("[LanguageManager] updateStaticText called but no translations are loaded.");
        return;
    }

    console.log("[LanguageManager] Updating static text elements...");

    const elements = document.querySelectorAll('[data-translate]'); // Use data-translate
    elements.forEach(elem => {
        const key = elem.dataset.translate; // Get key from data-translate
        const text = currentTranslations[key];

        if (text === undefined) {
            // console.warn(`[LanguageManager] No translation found for key: ${key}`);
            return; // Skip if key not in current translations
        }

        // General case for other elements
        if (htmlContentKeys.includes(key)) {
            elem.innerHTML = text; // Use innerHTML for elements expected to contain HTML
        } else {
            elem.textContent = text; // Use textContent for plain text
        }
    });
}

/**
 * Loads translations from a JSON file for the given language.
 * @param {string} lang - The language code to load translations for.
 */
async function loadLanguage(lang) {
    console.log(`[LanguageManager] Attempting to load language file: ${lang}`);
    const filePath = `translations/${lang}.json`; // Correct path
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            console.error(`[LanguageManager] Failed to fetch ${filePath}: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        currentTranslations = await response.json(); // Assign to currentTranslations
        console.log(`[LanguageManager] Translations loaded for ${lang}:`, currentTranslations);
    } catch (error) {
        console.error(`[LanguageManager] Error loading language file: ${error}`);
        currentTranslations = {}; // Clear translations on error
    }
}
