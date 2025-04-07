/**
 * aiToolManagement.js
 * Handles AI tool management functionality including editing and saving to JSON
 */

import { settings } from './config.js';
// Import the language functions needed
import { getCurrentTranslations, updateStaticText, loadLanguage } from './languageManager.js';

// --- Helper Functions --- //

// Helper function to update Markdown preview (accessible within the module)
function updatePreview(text, previewElementId = 'markdownPreview') {
    const preview = document.getElementById(previewElementId);
    if (!preview) {
        console.error(`[updatePreview] Preview element #${previewElementId} not found.`);
        return;
    }
    if (typeof marked !== 'undefined') {
        preview.innerHTML = marked.parse(text || ""); // Handle null/undefined text
    } else {
        preview.innerHTML = '<p><em>Markdown preview unavailable.</em></p>';
    }
}

// Show the edit AI modal for a specific AI tool
export async function showEditAIModal(aiId) {
    try {
        console.log(`[showEditAIModal] Called for ID: ${aiId}`); // Log entry
        // Get the AI item data (this might call getAllAIItems internally)
        const aiData = await getAIItemById(aiId);
        if (!aiData) {
            console.error(`[showEditAIModal] AI item data not found for ID: ${aiId}`);
            return;
        }
        console.log('[showEditAIModal] Found AI data:', aiData);
        
        // Populate the modal fields using CORRECT IDs
        const modal = document.getElementById('editAIModal'); // CORRECT ID
        const idInput = document.getElementById('editItemId');      // CORRECT ID
        const iconInput = document.getElementById('editItemIcon');    // CORRECT ID
        const descENInput = document.getElementById('editItemDescriptionEN'); // CORRECT ID
        const descZHInput = document.getElementById('editItemDescriptionZH'); // CORRECT ID
        const langSwitchEN = document.getElementById('langSwitchEN');       // FIXED ID (was lang-switch-en)
        const langSwitchZH = document.getElementById('langSwitchZH');       // FIXED ID (was lang-switch-zh)
        const descENContainer = document.getElementById('descENContainer');  // FIXED ID (was desc-en-container)
        const descZHContainer = document.getElementById('descZHContainer');  // FIXED ID (was desc-zh-container)
        const markdownPreview = document.getElementById('markdownPreview'); // CORRECT ID
        // --- Added Name Inputs & Containers ---
        const nameENInput = document.getElementById('editItemNameEN'); 
        const nameZHInput = document.getElementById('editItemNameZH');
        const nameENContainer = document.getElementById('nameENContainer');
        const nameZHContainer = document.getElementById('nameZHContainer');
        const toolWebsiteInput = document.getElementById('editItemToolWebsite');
        // Date inputs
        const releaseMonthInput = document.getElementById('editItemReleaseMonth');
        const releaseYearInput = document.getElementById('editItemReleaseYear');
        const modalContent = modal.querySelector('.modal-content'); // Get modal content div
        const displayNameEN = document.getElementById('displayNameEN');
        const displayNameZH = document.getElementById('displayNameZH');
        const displayIconURL = document.getElementById('displayIconURL');
        // Add potential read-only spans for new fields (optional, depends on HTML)
        const displayToolWebsite = document.getElementById('displayToolWebsite');
        const displayReleaseDate = document.getElementById('displayReleaseDate'); // Read-only span
        
        // Check if all elements were found
        if (!modal || !idInput || !iconInput 
            || !descENInput || !descZHInput || !langSwitchEN || !langSwitchZH 
            || !descENContainer || !descZHContainer || !markdownPreview
            || !nameENInput || !nameZHInput || !nameENContainer || !nameZHContainer
            || !toolWebsiteInput 
            || !releaseMonthInput || !releaseYearInput // New date inputs
            || !modalContent || !displayNameEN || !displayNameZH || !displayIconURL 
            || !displayReleaseDate // Check read-only span too
            ) { 
            console.error('[showEditAIModal] One or more modal elements not found using corrected IDs. Check HTML.');
             // Log which elements are missing
            console.log({ modal, idInput, iconInput, 
                          descENInput, descZHInput, langSwitchEN, langSwitchZH, 
                          descENContainer, descZHContainer, markdownPreview,
                          nameENInput, nameZHInput, nameENContainer, nameZHContainer, 
                          toolWebsiteInput, releaseMonthInput, releaseYearInput, // New date inputs
                          modalContent, displayNameEN, displayNameZH, displayIconURL,
                          displayToolWebsite, displayReleaseDate 
                        });
            return; // Stop if essential elements are missing
        }
        console.log('[showEditAIModal] All modal elements found.');

        idInput.value = aiData.id;
        iconInput.value = aiData.icon || '';
        nameENInput.value = aiData.name_en || '';
        nameZHInput.value = aiData.name_zh || ''; 
        descENInput.value = aiData.description_en || '';
        descZHInput.value = aiData.description_zh || ''; 
        toolWebsiteInput.value = aiData.toolWebsite || ''; 

        // Populate Date Inputs (split YYYY-MM)
        const [year, month] = (aiData.releaseDate || '-').split('-');
        releaseYearInput.value = year || '';
        releaseMonthInput.value = month || '';

        console.log('[showEditAIModal] Populated basic fields.');
        
        // Populate Read-Only Spans
        displayNameEN.textContent = aiData.name_en || 'N/A';
        displayNameZH.textContent = aiData.name_zh || 'N/A';
        displayIconURL.textContent = aiData.icon || 'N/A';
        if (displayToolWebsite) displayToolWebsite.textContent = aiData.toolWebsite || 'N/A';
        // Display date in read-only span (keep YYYY-MM format)
        displayReleaseDate.textContent = aiData.releaseDate || 'N/A'; 

        // Store original data on the modal for cancellation reset
        modal.dataset.originalData = JSON.stringify(aiData);

        // Set initial language state based on localStorage or default to Chinese
        const lastSelectedLang = localStorage.getItem('lastEditAIModalLanguage') || 'ZH';
        modalContent.dataset.language = lastSelectedLang.toLowerCase(); // Set initial data-language attribute
        langSwitchEN.classList.toggle('active', lastSelectedLang === 'EN');
        langSwitchZH.classList.toggle('active', lastSelectedLang === 'ZH');

        // CRITICAL: Actually load the language file that matches the button state
        await loadLanguage(lastSelectedLang.toLowerCase());

        // Set initial preview based on initial language
        const initialDescription = lastSelectedLang === 'EN' ? aiData.description_en : aiData.description_zh;
        updatePreview(initialDescription || ''); 

        // Show the modal
        modalContent.dataset.mode = 'read-only'; // Start in read-only mode
        modal.style.display = 'flex';
        console.log('[showEditAIModal] Modal display set to flex.');
        
        // --- Add translation update call here --- 
        const currentLangData = getCurrentTranslations();
        if (currentLangData) {
            updateStaticText(currentLangData, modal); // Update text within this modal
        } else {
            console.warn('[AIToolManagement] Could not get current translations to update Edit AI modal.');
        }
        // ------------------------------------------

    } catch (error) {
        console.error('Error showing edit AI modal:', error);
    }
}

// Get AI item data by ID
export async function getAIItemById(aiId) {
    try {
        // First, try to get from the current state (in memory)
        const aiItems = await getAllAIItems();
        return aiItems.find(item => item.id === aiId);
    } catch (error) {
        console.error('Error getting AI item by ID:', error);
        return null;
    }
}

// Function to load AI items from JSON file or localStorage
export async function getAllAIItems() {
    console.log('[getAllAIItems] Attempting to load AI items...'); // Log start
    try {
        // Check if we have items in localStorage first
        const storedItems = localStorage.getItem('ai-tools-json');
        if (storedItems) {
            console.log('[getAllAIItems] Found items in localStorage');
            const parsedItems = JSON.parse(storedItems);
            console.log('[getAllAIItems] Parsed items from localStorage:', parsedItems);
            return parsedItems;
        }
        
        // If not in localStorage, load from JSON file
        const jsonPath = settings.csvPath.replace('.csv', '.json'); // Use JSON file instead
        console.log(`[getAllAIItems] Fetching from: ${jsonPath}`); // Log URL
        const response = await fetch(jsonPath);
        console.log(`[getAllAIItems] Fetch response status: ${response.status}, ok: ${response.ok}`); // Log status
        
        if (!response.ok) {
            throw new Error(`Failed to load JSON: ${response.status} ${response.statusText}`);
        }
        
        const items = await response.json();
        console.log('[getAllAIItems] JSON data received:', items.length, 'items'); // Log item count
        
        // Save to localStorage for future use
        localStorage.setItem('ai-tools-json', JSON.stringify(items));
        
        return items;
    } catch (error) {
        console.error('[getAllAIItems] Error loading AI items:', error);
        return [];
    }
}

// Save AI item changes
export async function saveAIItemChanges(aiId, newData, updateUICallback) {
    try {
        // Get all AI items
        const allItems = await getAllAIItems();
        
        // Find the item to update
        const itemIndex = allItems.findIndex(item => item.id === aiId);
        if (itemIndex === -1) {
            throw new Error(`AI item with ID ${aiId} not found`);
        }
        
        // Update the item in the array
        const updatedItem = { ...allItems[itemIndex], ...newData };
        allItems[itemIndex] = updatedItem;
        
        // Save back to JSON/localStorage
        await saveAllAIItems(allItems);
        
        // Call the update UI callback if provided, passing the full updated item data
        if (updateUICallback && typeof updateUICallback === 'function') {
            // Ensure the ID is passed along with the newData
            updateUICallback(updatedItem); 
        }
        
        return true;
    } catch (error) {
        console.error('Error saving AI item changes:', error);
        return false;
    }
}

// Save all AI items back to JSON
export async function saveAllAIItems(items) {
    try {
        // Get headers from the first item
        if (!items || items.length === 0) {
            throw new Error('No items to save');
        }
        
        // Create JSON content
        const jsonContent = JSON.stringify(items, null, 2);
        
        // Save to file using fetch and a server endpoint
        // For local development, we'll need to use a different approach
        // This is a placeholder for a real implementation
        console.log('JSON content to save:', jsonContent);
        
        // For now, we'll simulate saving by updating localStorage
        localStorage.setItem('ai-tools-json', jsonContent);
        
        return true;
    } catch (error) {
        console.error('Error saving AI items to JSON:', error);
        return false;
    }
}

// Setup edit AI modal event handlers
let originalDataBeforeEdit = {}; // Store data when entering edit mode

// --- Initialise Edit Modal --- 
export function setupEditModalListeners(updateUICallback) {
    console.log("[setupEditModalListeners] Setting up listeners...");
    const modal = document.getElementById('editAIModal');
    const modalContent = modal.querySelector('.modal-content');
    const closeButton = document.getElementById('closeEditModal');
    const editForm = document.getElementById('editAIForm');
    const cancelEditButton = document.getElementById('cancelEdit');
    const editModeBtn = document.getElementById('editModeBtn');
    const langSwitchEN = document.getElementById('langSwitchEN');
    const langSwitchZH = document.getElementById('langSwitchZH');
    const descENContainer = document.getElementById('descENContainer');
    const descZHContainer = document.getElementById('descZHContainer');
    const descENTextarea = document.getElementById('editItemDescriptionEN');
    const descZHTextarea = document.getElementById('editItemDescriptionZH');
    const markdownPreview = document.getElementById('markdownPreview');
    const nameENContainer = document.getElementById('nameENContainer');
    const nameZHContainer = document.getElementById('nameZHContainer');
    const nameENInput = document.getElementById('editItemNameEN');
    const nameZHInput = document.getElementById('editItemNameZH');
    const iconInput = document.getElementById('editItemIcon'); // Get icon input
    const idInput = document.getElementById('editItemId');     // Get id input
    const toolWebsiteInput = document.getElementById('editItemToolWebsite');
    // Date inputs
    const releaseMonthInput = document.getElementById('editItemReleaseMonth');
    const releaseYearInput = document.getElementById('editItemReleaseYear');

    // Read-only spans
    const displayNameEN = document.getElementById('displayNameEN');
    const displayNameZH = document.getElementById('displayNameZH');
    const displayIconURL = document.getElementById('displayIconURL');
    // Add potential read-only spans for new fields (optional)
    const displayToolWebsite = document.getElementById('displayToolWebsite');
    const displayReleaseDate = document.getElementById('displayReleaseDate');

    // Helper to update read-only display spans
    const updateReadOnlyDisplay = (data) => {
        displayNameEN.textContent = data.name_en || 'N/A';
        displayNameZH.textContent = data.name_zh || 'N/A';
        displayIconURL.textContent = data.icon || 'N/A';
        if (displayToolWebsite) displayToolWebsite.textContent = data.toolWebsite || 'N/A';
        if (displayReleaseDate) displayReleaseDate.textContent = data.releaseDate || 'N/A'; // Display YYYY-MM
    };

    // --- Language Switching Logic ---
    const switchLanguage = async (targetLang) => { // Made async to await loadLanguage
        console.log(`[switchLanguage] Switching to ${targetLang}`);
        const isEN = targetLang === 'EN';
        const currentMode = modalContent.dataset.mode;

        // Update data-language attribute for CSS rules to work
        modalContent.dataset.language = isEN ? 'en' : 'zh';
        
        // Save the selected language to localStorage for persistence
        localStorage.setItem('lastEditAIModalLanguage', targetLang);
        
        // Update button active states
        langSwitchEN.classList.toggle('active', isEN);
        langSwitchZH.classList.toggle('active', !isEN);

        // Toggle visibility of language-specific containers
        if (nameENContainer && nameZHContainer) {
            // In edit mode, toggle display
            if (currentMode === 'edit') {
                nameENContainer.style.display = isEN ? 'block' : 'none';
                nameZHContainer.style.display = isEN ? 'none' : 'block';
            }
        }
        
        // Toggle description containers visibility
        if (descENContainer && descZHContainer) {
            descENContainer.style.display = isEN ? 'block' : 'none';
            descZHContainer.style.display = isEN ? 'none' : 'block';
        }

        // Update preview based on the corresponding description textarea
        // Use original data if read-only, current input if editing
        let previewText = '';
        if (currentMode === 'read-only') {
             try {
                 const originalData = JSON.parse(modal.dataset.originalData || '{}');
                 previewText = isEN ? originalData.description_en : originalData.description_zh;
             } catch(e) { console.error("Error parsing original data for preview:", e); }
        } else { // Edit mode
             previewText = isEN ? descENTextarea.value : descZHTextarea.value;
        }
        updatePreview(previewText || ''); // Ensure preview update has a default
        
        // --- Re-apply translations to the whole modal ---
        // CRITICAL FIX: Actually load the correct language file instead of using whatever is current
        const langCode = isEN ? 'en' : 'zh';
        await loadLanguage(langCode); // Load the specific language file
        const currentLangData = getCurrentTranslations(); 
        if (currentLangData) {
            console.log(`[switchLanguage] Re-applying static text for language: ${langCode}`);
            updateStaticText(currentLangData, modal); // Pass the specific modal element
        } else {
            console.warn(`[switchLanguage] Could not get translations to update modal for language: ${langCode}`);
        }
        // --------------------------------------------------
        
        // Debug log for state
        console.log(`[switchLanguage] Mode: ${currentMode}, Lang: ${modalContent.dataset.language}, Preview updated.`);
    };

    langSwitchEN.addEventListener('click', () => switchLanguage('EN'));
    langSwitchZH.addEventListener('click', () => switchLanguage('ZH'));

    // --- Real-time Markdown Preview Update (Only in Edit Mode) ---
    descENTextarea.addEventListener('input', () => {
        if (modalContent.dataset.mode === 'edit' && langSwitchEN.classList.contains('active')) {
            updatePreview(descENTextarea.value);
        }
    });
    descZHTextarea.addEventListener('input', () => {
        if (modalContent.dataset.mode === 'edit' && langSwitchZH.classList.contains('active')) {
            updatePreview(descZHTextarea.value);
        }
    });

    // --- Description Textarea Event Listeners for Real-time Preview ---
    // English description textarea
    descENTextarea.addEventListener('input', () => {
        // Only update preview if English is the active language
        if (modalContent.dataset.language === 'en') {
            updatePreview(descENTextarea.value || '');
        }
    });
    
    // Chinese description textarea
    descZHTextarea.addEventListener('input', () => {
        // Only update preview if Chinese is the active language
        if (modalContent.dataset.language === 'zh') {
            updatePreview(descZHTextarea.value || '');
        }
    });

    // --- Edit Button Logic ---
    editModeBtn.addEventListener('click', () => {
        console.log('[Edit Button Click] Switching to edit mode.');
        modalContent.dataset.mode = 'edit';

        // Store current values from inputs/spans before user potentially changes them
        // Combine date fields for storage
        const month = releaseMonthInput.value;
        const year = releaseYearInput.value;
        let currentReleaseDate = '';
        if (year && month) {
            currentReleaseDate = `${year}-${month}`;
        }

        originalDataBeforeEdit = {
            id: idInput.value,
            name_en: nameENInput.value,
            name_zh: nameZHInput.value,
            icon: iconInput.value,
            toolWebsite: toolWebsiteInput.value,
            releaseDate: currentReleaseDate, // Store combined date
            description_en: descENTextarea.value,
            description_zh: descZHTextarea.value
        };
        console.log('[Edit Button Click] Stored data before edit:', originalDataBeforeEdit);

        // Re-apply language switch visibility based on current active button
        switchLanguage(langSwitchEN.classList.contains('active') ? 'EN' : 'ZH'); 

        // Focus the first visible input
        if (langSwitchEN.classList.contains('active')) {
            nameENInput.focus();
        } else {
            nameZHInput.focus();
        }
    });

    // --- Cancel Edit Button Logic ---
    cancelEditButton.addEventListener('click', () => {
        console.log('[Cancel Button Click] Reverting changes and switching to read-only mode.');
        // Restore fields from data stored when entering edit mode
        nameENInput.value = originalDataBeforeEdit.name_en || '';
        nameZHInput.value = originalDataBeforeEdit.name_zh || '';
        iconInput.value = originalDataBeforeEdit.icon || '';
        toolWebsiteInput.value = originalDataBeforeEdit.toolWebsite || '';
        // Restore Date (Split YYYY-MM)
        const [year, month] = (originalDataBeforeEdit.releaseDate || '-').split('-');
        releaseYearInput.value = year || '';
        releaseMonthInput.value = month || '';
        //---
        descENTextarea.value = originalDataBeforeEdit.description_en || '';
        descZHTextarea.value = originalDataBeforeEdit.description_zh || '';

        modalContent.dataset.mode = 'read-only';
        // Update preview based on reverted (original) data
        switchLanguage(langSwitchEN.classList.contains('active') ? 'EN' : 'ZH'); 
    });
    
    // --- Form Submission Logic ---
    editForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission which reloads page
        console.log("[Form Submit] Attempting to save changes...");

        const aiId = idInput.value;

        // Combine date fields for saving
        const month = releaseMonthInput.value;
        const year = releaseYearInput.value;
        let releaseDate = '';
        if (year && month) {
            releaseDate = `${year}-${month}`;
        } else if (year || month) {
            // If only one is provided, maybe alert the user or clear both?
            // For now, only save if both are present.
            console.warn('Release month or year missing, saving releaseDate as empty.');
        }

        const updatedData = {
            name_en: nameENInput.value.trim(),
            name_zh: nameZHInput.value.trim(),
            icon: iconInput.value.trim(),
            toolWebsite: toolWebsiteInput.value.trim(),
            releaseDate: releaseDate, // Use combined date
            description_en: descENTextarea.value.trim(),
            description_zh: descZHTextarea.value.trim()
        };

        if (updatedData.name_en === '' || updatedData.name_zh === '') {
            alert('English and Chinese names cannot be empty!');
            return;
        }
        
        console.log("[Form Submit] Saving data:", updatedData);

        // Call the save function (assuming it handles backend/JSON update)
        const success = await saveAIItemChanges(aiId, updatedData, updateUICallback);

        if (success) {
            console.log("[Form Submit] Save successful. Updating UI and switching to read-only mode.");
            // Update the display spans with the new data
            updateReadOnlyDisplay(updatedData);
            
            // Update the stored original data to reflect the save
            // Need to fetch the full item again or construct it to include ID etc.
            // For simplicity, let's construct it:
            const savedItemData = {
                id: aiId,
                ...updatedData
            };
            modal.dataset.originalData = JSON.stringify(savedItemData);

            // Switch back to read-only mode
            modalContent.dataset.mode = 'read-only';
            
            // Re-sync preview after save
            switchLanguage(langSwitchEN.classList.contains('active') ? 'EN' : 'ZH'); 
        } else {
            console.error("[Form Submit] Save failed.");
            alert('Failed to save changes. Please check the console for errors.');
        }
    });

    // --- Close Modal Button --- 
    closeButton.addEventListener('click', () => {
        modal.style.display = 'none'; // Hide the modal
        console.log("[Close Button Click] Modal closed.");
    });

    // Add checks for the new pair containers and inputs
    const readOnlyPairZH = document.getElementById('readOnlyPairZH');
    const readOnlyPairEN = document.getElementById('readOnlyPairEN');
    const readOnlyPairIcon = document.getElementById('readOnlyPairIcon');
    // Add new read-only pairs (optional)
    const readOnlyPairToolWebsite = document.getElementById('readOnlyPairToolWebsite');
    const readOnlyPairReleaseDate = document.getElementById('readOnlyPairReleaseDate');

    // Check if all required elements exist
    if (!modal || !modalContent || !closeButton || !editForm || !cancelEditButton || !editModeBtn || // Core modal elements
        !langSwitchEN || !langSwitchZH || !descENContainer || !descZHContainer ||
        !descENTextarea || !descZHTextarea || !markdownPreview || !nameENContainer || !nameZHContainer ||
        !nameENInput || !nameZHInput || !iconInput || !idInput ||
        !toolWebsiteInput || !releaseMonthInput || !releaseYearInput || // New inputs
        !displayNameEN || !displayNameZH || !displayIconURL || // Read mode value spans
        !readOnlyPairZH || !readOnlyPairEN || !readOnlyPairIcon || // Read mode pairs
        !displayReleaseDate || !readOnlyPairReleaseDate // New read-only pair + span
        // Optional new read-only pairs
        // || !readOnlyPairToolWebsite || !readOnlyPairReleaseDate
    ) {
        console.error('[setupEditModalListeners] Could not find one or more required modal elements. Aborting listener setup.');
        // Log missing elements for easier debugging
        console.log({ modal, modalContent, closeButton, editForm, cancelEditButton, editModeBtn,
                      langSwitchEN, langSwitchZH, descENContainer, descZHContainer,
                      descENTextarea, descZHTextarea, markdownPreview, nameENContainer, nameZHContainer,
                      nameENInput, nameZHInput, iconInput, idInput,
                      toolWebsiteInput, releaseMonthInput, releaseYearInput, // New inputs
                      displayNameEN, displayNameZH, displayIconURL,
                      readOnlyPairZH, readOnlyPairEN, readOnlyPairIcon,
                      displayReleaseDate, readOnlyPairReleaseDate, // New
                      // Optional new read-only pairs
                      readOnlyPairToolWebsite, readOnlyPairReleaseDate
                     });
        return;
    }
    console.log('[setupEditModalListeners] All required elements found.');
}

// --- Language Update ---+

/**
 * Updates the text content of labels and buttons within the AI tool modal
 * based on the selected language.
 * @param {'zh' | 'en'} lang The target language.
 */
function updateModalLanguage(lang) {
    const isZh = lang === 'zh';

    const translations = {
        // Edit Mode Labels
        '#nameENContainer label': { zh: '名稱 (英): ', en: 'Name (English): ' },
        '#nameZHContainer label': { zh: 'AI工具名稱: ', en: 'AI Tool Name (ZH): ' },
        '#editItemIcon + label': { zh: '圖示 URL:', en: 'Icon URL:' }, // Assuming label follows input
        '#descENContainer label': { zh: '描述 (英): ', en: 'Description (EN): ' },
        '#descZHContainer label': { zh: '工具描述: ', en: 'Tool Description (ZH): ' },
        // Read-Only Labels
        '#readOnlyPairZH label': { zh: 'AI工具名稱: ', en: 'AI Tool Name (ZH): ' },
        '#readOnlyPairEN label': { zh: 'Tool Name:', en: 'Tool Name (EN): ' },
        '#readOnlyPairIcon label': { zh: '圖示:', en: 'Icon:' },
        // Modal Buttons (using actual IDs/selectors)
        '#editModeBtn': { zh: '編輯', en: 'Edit' }, // Read-only mode edit button
        '#editAIForm button[type="submit"]' : { zh: '儲存變更', en: 'Save Changes' }, // Edit mode save button
        '#cancelEdit': { zh: '取消', en: 'Cancel' } // Edit mode cancel button
    };

    for (const selector in translations) {
        const elem = document.querySelector(selector);
        if (elem) {
            elem.textContent = isZh ? translations[selector].zh : translations[selector].en;
        } else {
            // Don't warn for buttons that might not exist in all states (like save/edit)
            if (!selector.includes('-btn') && !selector.includes('button[')) {
                console.warn(`[AIToolManagement] Modal element not found for language update: ${selector}`);
            }
        }
    }

    // Potentially update placeholders if needed
    // const nameENInput = document.getElementById('editItemNameEN');
    // if(nameENInput) nameENInput.placeholder = isZh ? '輸入英文名稱' : 'Enter English Name';
    // ... add more placeholders ...

    console.log(`[AIToolManagement] Modal language updated to ${lang}`);
}

// Initializes the AI tool management, loads data, sets up event listeners.
function initializeAIToolManagement() {
    console.log("Initializing AI Tool Management...");
    // loadAIData().then(() => { // Temporarily disable loading/init related to this for diagnostics
         // Add listener for language changes
         document.documentElement.addEventListener('languageChanged', (event) => {
             // --- Temporarily disable this listener's action --- 
             // updateModalLanguage(event.detail.lang);
             console.log(`[AIToolManagement] languageChanged listener triggered for ${event.detail.lang}, but updateModalLanguage call is commented out for testing.`);
             // --------------------------------------------------
         });
 
         // Initial language update for modal when it loads
         // We need to get the current language from the html tag
         // const { currentLang } = getTranslations(); // Get current language
         // --- Temporarily disable this initial call ---
         // updateModalLanguage(currentLang);
         console.log("[AIToolManagement] Initial updateModalLanguage call commented out for testing.");
         // -------------------------------------------
 
         // Original setup calls
         // populateUnrankedPool(aiToolsData); // Also disable dependent calls
         // setupModalEventListeners(); // Also disable dependent calls
    // }); // End of temporarily disabled block
 }

 /**
 * Finds the tier ID for a given AI item ID.
 * @param {string} itemId The ID of the AI item.
 * @returns {string|null} The tier ID or null if not found in a tier.
 */
function findParentTierId(itemId) {
    // We need access to the current state of tiers. Assuming loadTiers provides this.
    // TODO: Refactor to use a shared state object if loadTiers doesn't reflect runtime changes.
    const currentTiers = loadTiers(); // Assuming this gives the latest tier structure
    const tier = currentTiers.find(t => t.items?.includes(itemId));
    return tier ? tier.id : null;
}

/**
 * Adds a new AI item to the collection.
 * @param {Object} newAI The new AI item to add.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function addAIItem(newAI) {
    try {
        console.log('[addAIItem] Adding new AI item:', newAI);
        
        // Generate a unique ID if not provided
        if (!newAI.id) {
            // Get all existing items to ensure unique ID
            const allItems = await getAllAIItems();
            const lastId = allItems.length > 0 ? 
                allItems[allItems.length - 1].id : 'AI000';
            
            // Extract the numeric part and increment
            const numPart = parseInt(lastId.replace(/\D/g, ''));
            newAI.id = `AI${String(numPart + 1).padStart(3, '0')}`;
        }
        
        // Add the new item to the collection
        const allItems = await getAllAIItems();
        allItems.push(newAI);
        
        // Save the updated collection to localStorage
        localStorage.setItem('ai-tools-json', JSON.stringify(allItems, null, 2));
        
        console.log(`[addAIItem] Successfully added AI item with ID: ${newAI.id}`);
        return true;
    } catch (error) {
        console.error('[addAIItem] Error adding AI item:', error);
        return false;
    }
}
