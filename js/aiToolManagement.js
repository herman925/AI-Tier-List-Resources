/**
 * aiToolManagement.js
 * Handles AI tool management functionality including editing and saving to CSV
 */

import { settings } from './config.js';

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
        const modalContent = modal.querySelector('.modal-content'); // Get modal content div
        const displayNameEN = document.getElementById('displayNameEN');
        const displayNameZH = document.getElementById('displayNameZH');
        const displayIconURL = document.getElementById('displayIconURL');
        
        // Check if all elements were found
        if (!modal || !idInput || !iconInput 
            || !descENInput || !descZHInput || !langSwitchEN || !langSwitchZH 
            || !descENContainer || !descZHContainer || !markdownPreview
            || !nameENInput || !nameZHInput || !nameENContainer || !nameZHContainer
            || !modalContent || !displayNameEN || !displayNameZH || !displayIconURL) { 
            console.error('[showEditAIModal] One or more modal elements not found using corrected IDs. Check HTML.');
             // Log which elements are missing
            console.log({ modal, idInput, iconInput, 
                          descENInput, descZHInput, langSwitchEN, langSwitchZH, 
                          descENContainer, descZHContainer, markdownPreview,
                          nameENInput, nameZHInput, nameENContainer, nameZHContainer, 
                          modalContent, displayNameEN, displayNameZH, displayIconURL
                        });
            return; // Stop if essential elements are missing
        }
        console.log('[showEditAIModal] All modal elements found.');

        idInput.value = aiData.id;
        iconInput.value = aiData.icon || '';
        // Populate Bilingual Names
        nameENInput.value = aiData.name_en || '';
        nameZHInput.value = aiData.name_zh || ''; // Use name_zh
        // Populate Bilingual Descriptions
        descENInput.value = aiData.description_en || ''; // Populate EN description
        descZHInput.value = aiData.description_zh || ''; // Populate ZH description
        console.log('[showEditAIModal] Populated basic fields.');
        
        // Populate Read-Only Spans
        displayNameEN.textContent = aiData.name_en || 'N/A';
        displayNameZH.textContent = aiData.name_zh || 'N/A';
        displayIconURL.textContent = aiData.icon || 'N/A';

        // Store original data on the modal for cancellation reset
        modal.dataset.originalData = JSON.stringify(aiData);

        // Set initial language view (e.g., 'EN')
        const initialLang = 'ZH'; // Default to Chinese
        modalContent.dataset.language = initialLang.toLowerCase(); // Set initial data-language attribute
        langSwitchEN.classList.toggle('active', initialLang === 'EN');
        langSwitchZH.classList.toggle('active', initialLang === 'ZH');

        // Set initial preview based on initial language
        const initialDescription = initialLang === 'EN' ? aiData.description_en : aiData.description_zh;
        updatePreview(initialDescription || ''); 

        // Show the modal
        modalContent.dataset.mode = 'read-only'; // Start in read-only mode
        modal.style.display = 'flex';
        console.log('[showEditAIModal] Modal display set to flex.');

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

// Get all AI items from CSV
export async function getAllAIItems() {
    console.log('[getAllAIItems] Attempting to load CSV...'); // Log start
    try {
        console.log(`[getAllAIItems] Fetching from: ${settings.csvPath}`); // Log URL
        const response = await fetch(settings.csvPath);
        console.log(`[getAllAIItems] Fetch response status: ${response.status}, ok: ${response.ok}`); // Log status
        
        if (!response.ok) {
            throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log('[getAllAIItems] Raw CSV text received:', csvText.substring(0, 200) + '...'); // Log raw text (truncated)
        
        const parsedItems = parseCSV(csvText);
        console.log('[getAllAIItems] Parsed items:', parsedItems); // Log parsed items
        return parsedItems;
    } catch (error) {
        console.error('[getAllAIItems] Error loading AI items from CSV:', error); // Log error
        return [];
    }
}

// Parse CSV text into array of objects
function parseCSV(csvText) {
    // Handle UTF-8 BOM if present
    const text = csvText.charCodeAt(0) === 0xFEFF ? csvText.slice(1) : csvText;
    
    // Split into lines
    const rows = text.trim().split(/\r?\n/); // Use regex for cross-platform line breaks and trim whitespace
    if (rows.length < 2) return []; // Need at least header + one data row
    
    // Dynamically create objects based on headers
    const headers = rows[0].split(',').map(header => header.trim());
    console.log('[parseCSV] Using headers:', headers); // Log headers

    const items = rows.slice(1).map((row, index) => {
        const values = row.split(','); // Basic split, assumes no commas within fields
        let item = {};
        try {
            headers.forEach((header, i) => {
                // Basic handling for fields potentially containing commas if quoted
                // A proper CSV parser would be more robust
                let value = (values[i] || '').trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1);
                }
                // Map CSV headers to object keys
                // Ensure correct mapping for new/old name fields
                if (header === 'name_zh' || (header === 'name' && !item.hasOwnProperty('name_zh'))) {
                    item.name_zh = value;
                } else if (header === 'name_en') {
                    item.name_en = value;
                } else if (header === 'description_zh' || (header === 'description' && !item.hasOwnProperty('description_zh'))) {
                     item.description_zh = value; // Keep existing description mapping as fallback
                } else if (header === 'description_en') {
                    item.description_en = value;
                } else {
                    item[header] = value;
                }
            });
            // Ensure essential fields exist, even if empty
            item.id = item.id || `temp_id_${index}`;
            item.name_zh = item.name_zh || item.name || ''; // Fallback for old 'name' column
            item.name_en = item.name_en || ''; 
            item.icon = item.icon || '';
            item.description_zh = item.description_zh || item.description || ''; // Fallback for old 'description'
            item.description_en = item.description_en || '';
            return item;
        } catch (e) {
            console.error(`[parseCSV] Error parsing row ${index + 1}: ${row}`, e);
            return null;
        }
    }).filter(Boolean); // Remove any null items
    
    return items;
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
        
        // Update the item
        allItems[itemIndex] = { ...allItems[itemIndex], ...newData };
        
        // Save back to CSV
        await saveAllAIItems(allItems);
        
        // Call the update UI callback if provided
        if (updateUICallback && typeof updateUICallback === 'function') {
            updateUICallback();
        }
        
        return true;
    } catch (error) {
        console.error('Error saving AI item changes:', error);
        return false;
    }
}

// Save all AI items back to CSV
export async function saveAllAIItems(items) {
    try {
        // Get headers from the first item
        if (!items || items.length === 0) {
            throw new Error('No items to save');
        }
        
        const headers = Object.keys(items[0]);
        
        // Create CSV content
        let csvContent = '\ufeff' + headers.join(',') + '\n';
        
        items.forEach(item => {
            const values = headers.map(header => {
                // Escape commas and quotes in values
                let value = item[header] || '';
                if (value.includes(',') || value.includes('"')) {
                    value = '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            });
            csvContent += values.join(',') + '\n';
        });
        
        // Save to file using fetch and a server endpoint
        // For local development, we'll need to use a different approach
        // This is a placeholder for a real implementation
        console.log('CSV content to save:', csvContent);
        alert('Changes saved! (Note: In a real implementation, this would save to the CSV file)');
        
        // For now, we'll simulate saving by updating localStorage
        localStorage.setItem('ai-tools-csv', csvContent);
        
        return true;
    } catch (error) {
        console.error('Error saving AI items to CSV:', error);
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

    // Read-only spans
    const displayNameEN = document.getElementById('displayNameEN');
    const displayNameZH = document.getElementById('displayNameZH');
    const displayIconURL = document.getElementById('displayIconURL');

    // Helper to update read-only display spans
    const updateReadOnlyDisplay = (data) => {
        displayNameEN.textContent = data.name_en || 'N/A';
        displayNameZH.textContent = data.name_zh || 'N/A';
        displayIconURL.textContent = data.icon || 'N/A';
    };

    // --- Language Switching Logic ---
    const switchLanguage = (targetLang) => { // Removed direct style manipulation
        console.log(`[switchLanguage] Switching to ${targetLang}`);
        const isEN = targetLang === 'EN';
        const currentMode = modalContent.dataset.mode;

        // Update data-language attribute for CSS rules to work
        modalContent.dataset.language = isEN ? 'en' : 'zh';
        
        // Update button active states
        langSwitchEN.classList.toggle('active', isEN);
        langSwitchZH.classList.toggle('active', !isEN);

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
        updatePreview(previewText);
        
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

    // --- Edit Button Logic ---
    editModeBtn.addEventListener('click', () => {
        console.log('[Edit Button Click] Switching to edit mode.');
        modalContent.dataset.mode = 'edit';
        
        // Store current values from inputs/spans before user potentially changes them
        // We get this from the input fields themselves, which were populated by showEditAIModal
        originalDataBeforeEdit = {
            id: idInput.value,
            name_en: nameENInput.value,
            name_zh: nameZHInput.value,
            icon: iconInput.value,
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
        const updatedData = {
            name_en: nameENInput.value.trim(),
            name_zh: nameZHInput.value.trim(),
            icon: iconInput.value.trim(),
            description_en: descENTextarea.value.trim(),
            description_zh: descZHTextarea.value.trim()
        };

        if (updatedData.name_en === '' || updatedData.name_zh === '') {
            alert('English and Chinese names cannot be empty!');
            return;
        }
        
        console.log("[Form Submit] Saving data:", updatedData);

        // Call the save function (assuming it handles backend/CSV update)
        const success = await saveAIItemChanges(aiId, updatedData, updateUICallback);

        if (success) {
            console.log("[Form Submit] Save successful. Updating UI and switching to read-only mode.");
            // Update the display spans with the new data
            updateReadOnlyDisplay(updatedData);
            
            // Update the stored original data to reflect the save
            modal.dataset.originalData = JSON.stringify({ id: aiId, ...updatedData }); 

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

    // Add checks for the new pair containers
    const readOnlyPairZH = document.getElementById('readOnlyPairZH');
    const readOnlyPairEN = document.getElementById('readOnlyPairEN');
    const readOnlyPairIcon = document.getElementById('readOnlyPairIcon');

    // Check if all required elements exist
    if (!modal || !modalContent || !closeButton || !editForm || !cancelEditButton || !editModeBtn || // Core modal elements
        !langSwitchEN || !langSwitchZH || !descENContainer || !descZHContainer || 
        !descENTextarea || !descZHTextarea || !markdownPreview || !nameENContainer || !nameZHContainer ||
        !nameENInput || !nameZHInput || !iconInput || !idInput || // Edit mode inputs
        !displayNameEN || !displayNameZH || !displayIconURL || // Read mode value spans
        !readOnlyPairZH || !readOnlyPairEN || !readOnlyPairIcon // Read mode pairs
    ) {
        console.error('[setupEditModalListeners] Could not find one or more required modal elements. Aborting listener setup.');
        // Log missing elements for easier debugging
        console.log({ modal, modalContent, closeButton, editForm, cancelEditButton, editModeBtn,
                      langSwitchEN, langSwitchZH, descENContainer, descZHContainer, 
                      descENTextarea, descZHTextarea, markdownPreview, nameENContainer, nameZHContainer,
                      nameENInput, nameZHInput, iconInput, idInput, 
                      displayNameEN, displayNameZH, displayIconURL,
                      readOnlyPairZH, readOnlyPairEN, readOnlyPairIcon });
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
    loadAIData().then(() => {
        // Add listener for language changes
        document.documentElement.addEventListener('languageChanged', (event) => {
            updateModalLanguage(event.detail.lang);
        });

        // Initial language update for modal when it loads
        // We need to get the current language from the html tag
        const { currentLang } = getTranslations(); // Get current language
        updateModalLanguage(currentLang);

        // Original setup calls
        populateUnrankedPool(aiToolsData);
        setupModalEventListeners();
    });
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
