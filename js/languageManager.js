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
    // --- DEBUG LOG --- 
    console.log(`[initializeLanguage] Determined initialLang: ${initialLang}. Awaiting setLanguage...`);
    // --- END DEBUG LOG ---
    await setLanguage(initialLang); // Await the async setLanguage
    // --- DEBUG LOG --- 
    console.log(`[initializeLanguage] setLanguage finished. currentTranslations should be populated now.`);
    // --- END DEBUG LOG ---
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

    // 0. Load translations for the selected language FIRST
    await loadLanguage(lang); // Await loading
    console.log(`[setLanguage] loadLanguage awaited for ${lang}. currentTranslations should be ready.`);

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
    if (currentTranslations && Object.keys(currentTranslations).length > 0) { // Check if translations are loaded
        updateStaticText(currentTranslations);
    } else {
        console.error(`[setLanguage] Cannot call updateStaticText because currentTranslations is empty or invalid after loading ${lang}.`);
    }
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
    const rootId = rootElement.id || rootElement.tagName;
    // --- DEBUGGING START ---
    console.log(`[updateStaticText] Called for root: ${rootId}`);
    if (!langData) {
        console.error(`[updateStaticText] ERROR: langData is null/undefined for root: ${rootId}`);
        return; // Stop if no language data
    }
    // --- DEBUGGING END ---
    
    rootElement.querySelectorAll('[data-translate]').forEach(element => {
        // *** ADD THIS CHECK ***
        // Skip elements inside modals if doing a full-document scan
        if (rootElement === document && element.closest('.modal')) {
            // console.log(`[updateStaticText][${rootId}] Skipping modal element:`, element);
            return; 
        }
        // *** END ADDED CHECK ***

        const key = element.getAttribute('data-translate');
        // --- DEBUGGING START ---
        console.log(`[updateStaticText][${rootId}] Processing key: ${key} for element:`, element);
        // --- DEBUGGING END ---
        const translation = getNestedTranslation(langData, key, rootId);

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
function getNestedTranslation(langData, key, rootId = 'unknown') {
    // --- DEBUG LOG for specific key ---
    if (key === 'exportCsvButtonLabel') {
        console.log(`%c[getNestedTranslation][${rootId}] Attempting lookup for key: ${key}`, 'color: orange;');
        console.log(`%c[getNestedTranslation][${rootId}] langData keys: ${langData ? Object.keys(langData) : 'null/undefined'}`, 'color: orange;');
    }
    // --- END DEBUG LOG ---
    const keys = key.split('.');
    let text = langData;
    let found = true;
    try {
        for (let i = 0; i < keys.length; i++) {
            if (text && typeof text === 'object' && keys[i] in text) {
                text = text[keys[i]];
            } else {
                // --- DEBUG LOG --- 
                console.log(`[getNestedTranslation][${rootId}] Failed lookup at level ${i}, Key part: '${keys[i]}'. Keys in current object: ${text ? Object.keys(text) : 'null/undefined'}`);
                // --- END DEBUG LOG --- 
                found = false;
                break;
            }
        }
    } catch (e) {
        console.error(`[getNestedTranslation][${rootId}] Error during lookup for key '${key}':`, e);
        text = undefined; // Ensure text is undefined if lookup failed
        found = false; // Mark as not found on error
    }
    // --- DEBUG LOG --- 
    // if (!found || typeof text !== 'string') {
    //     console.log(`[getNestedTranslation][${rootId}] Final lookup for key '${key}' resulted in:`, text);
    // }
    // --- END DEBUG LOG --- 
    return found && typeof text === 'string' ? text : undefined;
}

/**
 * Loads translations from a JSON file for the given language.
 * @param {string} lang - The language code to load translations for.
 */
async function loadLanguage(lang) {
    console.log(`[LanguageManager] Attempting to load language file: ${lang}`);
    
    // Map language codes to available translation files
    let mappedLang = lang;
    if (lang === 'zh-Hant' || lang === 'zh-CN' || lang === 'zh-TW') {
        mappedLang = 'zh'; // Map all Chinese variants to zh.json
    }
    
    const filePath = `translations/${mappedLang}.json`; // Corrected path
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            console.error(`[LanguageManager] Failed to fetch ${filePath}: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        currentTranslations = await response.json(); // Assign to currentTranslations
        // --- DEBUG LOG --- 
        console.log(`[loadLanguage] Translations loaded and assigned for ${lang}. Keys in modal:`, currentTranslations.modal ? Object.keys(currentTranslations.modal) : 'modal object missing');
        // --- END DEBUG LOG ---
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
export { setLanguage, loadLanguage, updateStaticText, getCurrentTranslations, getNestedTranslation };
