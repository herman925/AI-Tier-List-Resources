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
    updateStaticText(currentTranslations); // Pass currentTranslations
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
 * @param {Object} langData - The translation data for the current language.
 * @param {Element} [rootElement=document] - The root element to search within. Defaults to the entire document.
 */
function updateStaticText(langData, rootElement = document) {
    // --- DEBUGGING START ---
    const rootId = rootElement.id || rootElement.tagName;
    console.log(`[updateStaticText] Called for root: ${rootId}`);
    if (!langData) {
        console.error(`[updateStaticText] ERROR: langData is null/undefined for root: ${rootId}`);
        return; // Stop if no language data
    }
    // --- DEBUGGING END ---
    
    rootElement.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        // --- DEBUGGING START ---
        console.log(`[updateStaticText][${rootId}] Processing key: ${key} for element:`, element);
        // --- DEBUGGING END ---
        const translation = getNestedTranslation(langData, key);

        if (translation) {
            // --- DEBUGGING START ---
            console.log(`[updateStaticText][${rootId}] Found translation for ${key}: "${translation}"`);
            // --- DEBUGGING END ---
            // Check if the element is an input/textarea with a placeholder
            if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                element.placeholder = translation;
            } else if (element.tagName === 'TITLE') {
                document.title = translation; // Special handling for page title
            } else {
                element.innerHTML = translation; 
            }
        } else {
            console.warn(`[updateStaticText][${rootId}] Translation key NOT FOUND: ${key}`);
            // Optionally leave the original text or set a default
            // element.innerHTML = element.dataset.defaultText || key; // Example fallback
        }
    });
}

// Function to get nested translation values
function getNestedTranslation(langData, key) {
    const keys = key.split('.');
    let text = langData;
    try {
        for (const k of keys) {
            text = text[k];
            if (text === undefined) throw new Error(`Key part '${k}' not found`);
        }
    } catch (e) {
        text = undefined; // Ensure text is undefined if lookup failed
    }
    return text;
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

// Added getter for currentTranslations
function getCurrentTranslations() {
    return currentTranslations;
}

/**
 * Returns the currently loaded translations.
 * @returns {Object} The current translations object.
 */
export function getCurrentLanguageTranslations() {
    return currentTranslations || {};
}

// Export functions that need to be used by other modules
export { setLanguage, loadLanguage, updateStaticText, getCurrentTranslations };
