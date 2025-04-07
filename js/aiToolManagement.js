/**
 * aiToolManagement.js
 * Handles AI tool management functionality including editing and saving to JSON
 */

import { settings } from './config.js';
// Import the language functions needed
import { getCurrentTranslations, updateStaticText, loadLanguage, getNestedTranslation } from './languageManager.js';
// Import feature functions
import { getAllFeatures } from './featureManagement.js';

let allAIItems = []; // Cache AI items

// --- Helper Functions --- //

// Helper function to parse 'YYYY-MM' date string
function parseReleaseDate(dateString) {
    if (!dateString || !dateString.includes('-')) {
        return { month: '', year: '' };
    }
    const parts = dateString.split('-');
    return { year: parts[0] || '', month: parts[1] || '' };
}

// Helper function to build 'YYYY-MM' date string
function buildReleaseDate(month, year) {
    if (year && month) {
        return `${year}-${month}`;
    } else if (year) {
        console.warn('Building release date with year only:', year);
        return year; // Or maybe `${year}-00`? Or empty? Decide format.
    } else if (month) {
        console.warn('Building release date with month only:', month);
        return `0000-${month}`; // Or empty? Decide format.
    }
    return ''; // Return empty if either is missing
}

// Helper function to collect feature scores from the DOM sliders
function collectFeaturesFromDOM(featureContainer) {
    const features = {};
    if (!featureContainer) return features;
    const rows = featureContainer.querySelectorAll('.feature-row');
    rows.forEach(row => {
        const featureId = row.dataset.featureId;
        const slider = row.querySelector('input[type="range"]');
        if (featureId && slider) {
            const score = parseInt(slider.value, 10);
            // Decide whether to include 0 scores or not. 
            // For now, let's include them if the row exists.
            features[featureId] = score;
        }
    });
    return features;
}

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

// --- NEW Module-Level Helper Functions for Edit Modal ---

// Helper to populate the entire Edit Form (Inputs)
function populateEditForm(data) {
    const modal = document.getElementById('editAIModal');
    if (!modal) return;

    // Simple value setting for most inputs
    const elementsToPopulate = {
        'editItemId': data.id,
        'editItemIcon': data.icon,
        'editItemNameEN': data.name_en,
        'editItemNameZH': data.name_zh,
        'editItemToolWebsite': data.toolWebsite,
        'editItemDescriptionEN': data.description_en,
        'editItemDescriptionZH': data.description_zh,
    };

    for (const id in elementsToPopulate) {
        const element = document.getElementById(id);
        if (element) {
            element.value = elementsToPopulate[id] || '';
        } else {
            console.warn(`[populateEditForm] Element #${id} not found.`);
        }
    }

    // Populate date
    const { month, year } = parseReleaseDate(data.releaseDate);
    const editItemReleaseMonth = document.getElementById('editItemReleaseMonth');
    const editItemReleaseYear = document.getElementById('editItemReleaseYear');
    if (editItemReleaseMonth) editItemReleaseMonth.value = month || '';
    if (editItemReleaseYear) editItemReleaseYear.value = year || '';

    // Populate features (Requires populateFeaturesForEdit)
    const editFeaturesSectionEdit = document.getElementById('editFeaturesSectionEdit');
    if (typeof populateFeaturesForEdit === 'function') {
        populateFeaturesForEdit(data.features || {}, editFeaturesSectionEdit);
    } else {
        console.warn("[populateEditForm] populateFeaturesForEdit function not found or not available.");
    }
}

// Helper to populate the Feature Sliders in the Edit Form
function populateFeaturesForEdit(featuresData, containerElement) {
    if (!containerElement) return;
    const featureRowsContainer = containerElement.querySelector('.feature-rows-container');
    if (!featureRowsContainer) {
        console.warn("[populateFeaturesForEdit] .feature-rows-container not found in containerElement.");
        return;
    }
    featureRowsContainer.innerHTML = ''; // Clear existing feature rows

    const allFeatures = getAllFeatures();
    const modal = containerElement.closest('.modal');
    const currentLang = modal?.querySelector('.modal-content')?.dataset.language || 'zh';
    const toolId = modal?.querySelector('#editItemId')?.value;

    // Iterate through ALL possible features to create sliders
    allFeatures.forEach(featureDef => {
        const featureId = featureDef.id;
        // Check if this feature exists in the *data* being populated
        if (Object.hasOwnProperty.call(featuresData, featureId)) {
            const score = featuresData[featureId] || 0;
            const editRow = createFeatureRowElement(featureId, score, featureDef, true, currentLang, toolId);
            if (editRow) {
                // Find correct insertion point based on global order
                const insertBeforeElement = findFeatureInsertIndex(featureRowsContainer, featureId, allFeatures);
                featureRowsContainer.insertBefore(editRow, insertBeforeElement);
            }
        }
        // If feature is not in data, don't add a row/slider for it initially
    });
}

// Helper to Update Read-Only Display (Non-Feature Fields)
function updateReadOnlyDisplay(data, lang) {
    const modal = document.getElementById('editAIModal');
    if (!modal) return;
    const isEN = lang === 'en';
    const currentLangData = getCurrentTranslations() || {};

    // Get elements (safer to get them here)
    const readOnlyNameLabel = document.getElementById('readOnlyNameLabel');
    const readOnlyName = document.getElementById('readOnlyName');
    const readOnlyReleaseDate = document.getElementById('readOnlyReleaseDate');
    const readOnlyMarkdownPreview = document.getElementById('readOnlyMarkdownPreview');
    const readOnlyIconContainer = modal.querySelector('#readOnlyPairIcon .value-container');
    const readOnlyWebsiteContainer = modal.querySelector('#readOnlyPairToolWebsite .value-container');

    // Update Name (Label and Value)
    const nameLabelKey = isEN ? 'modal.editAI.readOnlyNameEnLabel' : 'modal.editAI.readOnlyNameZhLabel';
    if (readOnlyNameLabel) {
        readOnlyNameLabel.setAttribute('data-translate', nameLabelKey);
        readOnlyNameLabel.textContent = getNestedTranslation(currentLangData, nameLabelKey) || (isEN ? 'AI Name (EN):' : 'AI Name (ZH):');
    }
    if (readOnlyName) readOnlyName.textContent = isEN ? (data.name_en || 'N/A') : (data.name_zh || 'N/A');

    // Update Release Date
    if (readOnlyReleaseDate) readOnlyReleaseDate.textContent = data.releaseDate || 'N/A';

    // Update Icon Display
    if (readOnlyIconContainer) {
        readOnlyIconContainer.innerHTML = ''; // Clear previous
        if (data.icon) {
            const img = document.createElement('img');
            img.src = data.icon;
            img.alt = `${data.name_en || data.name_zh || 'AI Tool'} Icon`;
            img.className = 'read-only-icon-display';
            img.onerror = () => { 
                readOnlyIconContainer.textContent = 'Icon'; 
                img.remove(); 
            };
            readOnlyIconContainer.appendChild(img);
        } else {
            readOnlyIconContainer.textContent = 'Icon'; // Placeholder text
        }
    }

    // Update Tool Website Link
    if (readOnlyWebsiteContainer) {
        const websiteUnavailableText = getNestedTranslation(currentLangData, 'modal.websiteUnavailable') || 'Link not Available';
        readOnlyWebsiteContainer.innerHTML = ''; // Clear previous
        if (data.toolWebsite && (data.toolWebsite.startsWith('http://') || data.toolWebsite.startsWith('https://'))) {
            const link = document.createElement('a');
            link.href = data.toolWebsite;
            link.textContent = data.toolWebsite;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.className = 'read-only-website-link';
            readOnlyWebsiteContainer.appendChild(link);
        } else {
            readOnlyWebsiteContainer.textContent = websiteUnavailableText;
        }
    }

    // Update Read-Only Markdown Preview
    if (readOnlyMarkdownPreview) {
        const description = isEN ? (data.description_en || '') : (data.description_zh || '');
        readOnlyMarkdownPreview.innerHTML = marked.parse(description); // Use marked library
    }
}

// Function to Update Edit Mode Markdown Preview
function updateEditPreview(text) {
    const editMarkdownPreview = document.getElementById('editMarkdownPreview');
    if (editMarkdownPreview) {
         editMarkdownPreview.innerHTML = marked.parse(text || '');
    } else {
         console.warn('[updateEditPreview] Edit markdown preview element not found.')
    }
}

// Helper function to update Markdown preview (accessible within the module)
// function updatePreview(text, previewElementId = 'markdownPreview') { // Keep old one just in case?
//     const preview = document.getElementById(previewElementId);
//     if (!preview) {
//         console.error(`[updatePreview] Preview element #${previewElementId} not found.`);
//         return;
//     }
//     if (typeof marked !== 'undefined') {
//         preview.innerHTML = marked.parse(text || ""); // Handle null/undefined text
//     } else {
//         preview.innerHTML = '<p><em>Markdown preview unavailable.</em></p>';
//     }
// }

// --- Core Functions --- //

// Show the edit AI modal for a specific AI tool
export async function showEditAIModal(aiId) {
    // --- DEBUG LOG --- 
    console.log(`%c[showEditAIModal START] Called for ID: ${aiId}. Checking modal and key internal elements...`, 'color: blue; font-weight: bold;');
    const modalCheck = document.getElementById('editAIModal');
    const idInputCheck = document.getElementById('editItemId'); // Check exists
    const featuresEditCheck = document.getElementById('editFeaturesSectionEdit'); // Check exists
    console.log(`[showEditAIModal START] Results:`, { modalCheck, idInputCheck, featuresEditCheck });
    if (!modalCheck || !idInputCheck || !featuresEditCheck) {
        console.error("[showEditAIModal START] CRITICAL: Modal or key internal element(s) not found in DOM at function start!");
        return; 
    }
    // --- END DEBUG LOG ---
    try {
        console.log(`[showEditAIModal] Called for ID: ${aiId}`);
        const aiData = await getAIItemById(aiId);
        if (!aiData) {
            console.error(`[showEditAIModal] AI item data not found for ID: ${aiId}`);
            return;
        }
        console.log('[showEditAIModal] Found AI data:', aiData);
        
        // Get feature definitions
        const allFeatures = getAllFeatures(); 
        if (!allFeatures || allFeatures.length === 0) {
             console.warn("[showEditAIModal] Features not loaded or empty. Cannot display features section.");
        }

        // Get Modal Element References (Using CORRECT IDs for restructured HTML)
        const modal = document.getElementById('editAIModal');
        const modalContent = modal.querySelector('.modal-content');
        
        // Edit Mode Elements
        const editForm = document.getElementById('editAIForm');
        const editItemId = document.getElementById('editItemId');
        const editItemIcon = document.getElementById('editItemIcon');
        const editItemNameEN = document.getElementById('editItemNameEN');
        const editItemNameZH = document.getElementById('editItemNameZH');
        const editItemReleaseMonth = document.getElementById('editItemReleaseMonth');
        const editItemReleaseYear = document.getElementById('editItemReleaseYear');
        const editItemToolWebsite = document.getElementById('editItemToolWebsite');
        const editItemDescriptionEN = document.getElementById('editItemDescriptionEN');
        const editItemDescriptionZH = document.getElementById('editItemDescriptionZH');
        const editFeaturesSectionEdit = document.getElementById('editFeaturesSectionEdit'); // Already checked at start
        const editMarkdownPreview = document.getElementById('editMarkdownPreview');
        const editLangSwitchEN = document.getElementById('editLangSwitchEN'); // For setting initial state
        const editLangSwitchZH = document.getElementById('editLangSwitchZH'); // For setting initial state

        // Read Only Display Elements
        const readOnlyNameLabel = document.getElementById('readOnlyNameLabel');
        const readOnlyName = document.getElementById('readOnlyName');
        const readOnlyReleaseDate = document.getElementById('readOnlyReleaseDate');
        const readOnlyFeaturesSection = document.getElementById('readOnlyFeaturesSection');
        const readOnlyMarkdownPreview = document.getElementById('readOnlyMarkdownPreview');
        const readOnlyIconContainer = modal.querySelector('#readOnlyPairIcon .value-container');
        const readOnlyWebsiteContainer = modal.querySelector('#readOnlyPairToolWebsite .value-container');
        const readOnlyLangSwitchEN = document.getElementById('readOnlyLangSwitchEN'); // For setting initial state
        const readOnlyLangSwitchZH = document.getElementById('readOnlyLangSwitchZH'); // For setting initial state

        // Check if all REQUIRED elements were found
        const requiredElementsCheck = {
            modal, modalContent, editForm,
            editItemId, editItemIcon, editItemNameEN, editItemNameZH, editItemReleaseMonth, editItemReleaseYear, 
            editItemToolWebsite, editItemDescriptionEN, editItemDescriptionZH, editFeaturesSectionEdit, editMarkdownPreview,
            editLangSwitchEN, editLangSwitchZH,
            readOnlyNameLabel, readOnlyName, readOnlyReleaseDate, readOnlyFeaturesSection, readOnlyMarkdownPreview,
            readOnlyIconContainer, readOnlyWebsiteContainer,
            readOnlyLangSwitchEN, readOnlyLangSwitchZH
        };
        let allFoundCheck = true;
        for (const key in requiredElementsCheck) {
            if (!requiredElementsCheck[key]) {
                console.error(`[showEditAIModal] Element missing during setup: ${key}`);
                allFoundCheck = false;
            }
        }
        if (!allFoundCheck) {
            console.error('[showEditAIModal] One or more modal elements not found using corrected IDs. Aborting modal display setup.');
            // Detailed log of what was found/missing
            console.log("Element check results:", requiredElementsCheck);
            return; 
        }
        console.log('[showEditAIModal] All necessary modal elements found for population.');

        // --- Populate Edit Form Fields (Hidden Initially) ---
        editItemId.value = aiData.id;
        editItemIcon.value = aiData.icon || '';
        editItemNameEN.value = aiData.name_en || '';
        editItemNameZH.value = aiData.name_zh || ''; 
        editItemDescriptionEN.value = aiData.description_en || '';
        editItemDescriptionZH.value = aiData.description_zh || ''; 
        editItemToolWebsite.value = aiData.toolWebsite || ''; 
        // Populate date inputs
        const { month, year } = parseReleaseDate(aiData.releaseDate);
        editItemReleaseMonth.value = month || '';
        editItemReleaseYear.value = year || '';
        console.log('[showEditAIModal] Populated edit form fields.');

        // Store original data on the modal for cancellation reset
        modal.dataset.originalData = JSON.stringify(aiData);
        originalDataBeforeEdit = { ...aiData }; // Update module-level variable too

        // --- Set Initial Language State ---
        // Use localStorage value or default to 'zh'
        const lastSelectedLangCode = localStorage.getItem('lastEditAIModalLanguage') || 'zh';
        modalContent.dataset.language = lastSelectedLangCode; // Set initial data-language attribute
        // Update BOTH sets of language buttons
        readOnlyLangSwitchEN.classList.toggle('active', lastSelectedLangCode === 'en');
        readOnlyLangSwitchZH.classList.toggle('active', lastSelectedLangCode === 'zh');
        editLangSwitchEN.classList.toggle('active', lastSelectedLangCode === 'en');
        editLangSwitchZH.classList.toggle('active', lastSelectedLangCode === 'zh');
        console.log(`[showEditAIModal] Initial language set to: ${lastSelectedLangCode}`);

        // --- Populate Features (Edit Mode - Sliders/Buttons) ---
        editFeaturesSectionEdit.innerHTML = ''; // Clear previous edit features
        const featuresHeader = modal.querySelector('.features-header'); // *** Find the new header div ***
        const addFeatureButton = document.createElement('button');
        addFeatureButton.type = 'button';
        addFeatureButton.textContent = '+ Add Feature'; // Needs translation later
        addFeatureButton.className = 'add-feature-btn btn-secondary btn-small'; // Add classes
        addFeatureButton.addEventListener('click', (e) => handleAddFeature(e, 'editFeaturesSectionEdit', aiData.id));
        // *** Append button to header, only if it doesn't exist ***
        if (featuresHeader) {
            if (!featuresHeader.querySelector('.add-feature-btn')) {
                featuresHeader.appendChild(addFeatureButton);
            } else {
                 console.warn("[showEditAIModal] Add Feature button already exists in header. Not adding another.");
             }
        }
        // Add container for rows INSIDE editFeaturesSectionEdit
        const featureRowsContainerEdit = document.createElement('div');
        featureRowsContainerEdit.className = 'feature-rows-container';
        editFeaturesSectionEdit.appendChild(featureRowsContainerEdit);
        // Populate existing features
        allFeatures.forEach(featureDef => {
            const featureId = featureDef.id;
            if (Object.hasOwnProperty.call(aiData.features || {}, featureId)) {
                const score = aiData.features[featureId] || 0;
                const editRow = createFeatureRowElement(featureId, score, featureDef, true, lastSelectedLangCode, aiData.id);
                if (editRow) {
                    featureRowsContainerEdit.appendChild(editRow);
                }
            }
        });
        console.log('[showEditAIModal] Populated Edit Features Section.');

        // --- Populate Read-Only Display ---
        // Populate read-only features section
        readOnlyFeaturesSection.innerHTML = ''; // Clear previous
        allFeatures.forEach(featureDef => {
            const featureId = featureDef.id;
            // Use || {} to handle cases where aiData.features might be missing
            if (Object.hasOwnProperty.call(aiData.features || {}, featureId)) { 
                const score = aiData.features[featureId] || 0;
                // *** Call NEW function for read-only bars ***
                const readBarElement = createReadOnlyFeatureBarElement(featureId, score, featureDef, lastSelectedLangCode);
                if (readBarElement) { // Function returns null for score 0
                    readOnlyFeaturesSection.appendChild(readBarElement);
                }
            }
        });
        if (readOnlyFeaturesSection.children.length === 0) {
            readOnlyFeaturesSection.innerHTML = '<p><i>No features rated.</i></p>';
        }
        // Now call the MODULE-LEVEL helper for the rest of the read-only fields
        updateReadOnlyDisplay(aiData, lastSelectedLangCode); // Uses the function defined outside
        console.log('[showEditAIModal] Populated Read Only Display Section.');
        
        // --- Load Translations and Apply --- 
        await loadLanguage(lastSelectedLangCode); // Load the language file
        const currentLangData = getCurrentTranslations();
        if (currentLangData) {
            updateStaticText(currentLangData, modal); // Update text within this modal
            // Update the Add Feature button text using translations
            // TODO: Add 'modal.editAI.addFeatureButton' key to JSON files
            // addFeatureButton.textContent = getNestedTranslation(currentLangData, 'modal.editAI.addFeatureButton') || '+ Add Feature';
            const addFeatureBtnElement = modal.querySelector('.features-header .add-feature-btn');
            if (addFeatureBtnElement) {
                addFeatureBtnElement.textContent = getNestedTranslation(currentLangData, 'modal.editAI.addFeatureButton') || '+ Add Feature';
            }
        } else {
            console.warn('[showEditAIModal] Could not get current translations to update modal text.');
        }

        // --- Set Initial Mode and Show Modal ---
        modalContent.dataset.mode = 'read-only'; // Start in read-only mode
        modal.querySelectorAll('.read-only-element').forEach(el => el.style.display = 'block'); // Or 'flex' etc.
        modal.querySelectorAll('.edit-mode-element').forEach(el => el.style.display = 'none');
        if (editForm) editForm.style.display = 'none'; // Ensure form is hidden initially (Use the variable)

        modal.style.display = 'flex'; // Show the modal
        console.log('[showEditAIModal] Modal display set to flex, initial mode set to read-only.');

    } catch (error) {
        console.error('[showEditAIModal] Error showing edit AI modal:', error);
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
export async function saveAIItemChanges(aiId, updateUICallback) {
    console.log(`[saveAIItemChanges] Saving changes for ID: ${aiId}`);
    const modal = document.getElementById('editAIModal');
    const iconInput = document.getElementById('editItemIcon');
    const descENInput = document.getElementById('editItemDescriptionEN');
    const descZHInput = document.getElementById('editItemDescriptionZH');
    const nameENInput = document.getElementById('editItemNameEN');
    const nameZHInput = document.getElementById('editItemNameZH');
    const toolWebsiteInput = document.getElementById('editItemToolWebsite');
    const releaseMonthInput = document.getElementById('editItemReleaseMonth');
    const releaseYearInput = document.getElementById('editItemReleaseYear');
    const featuresEditContainer = document.getElementById('editFeaturesSectionEdit'); // Container for sliders

    if (!modal || !iconInput || !descENInput || !descZHInput || !nameENInput || !nameZHInput 
        || !toolWebsiteInput || !releaseMonthInput || !releaseYearInput || !featuresEditContainer) {
        console.error('[saveAIItemChanges] Critical modal element not found during save.');
        alert('Error saving: Modal elements missing.'); // User feedback
        return null; // Return null if required elements are missing
    }

    try { // Start of the try block
        // --- REVISED Feature Data Collection ---
        const newFeatures = {};
        const featureRows = featuresEditContainer.querySelectorAll('.feature-row'); // Get only rows added by user
        featureRows.forEach(row => {
            const featureId = row.dataset.featureId;
            const slider = row.querySelector(`input[type="range"][name="${featureId}"]`);
            if (featureId && slider) {
                const score = parseInt(slider.value, 10);
                 newFeatures[featureId] = score;
            }
        });
        console.log('[saveAIItemChanges] Collected features:', newFeatures);
    
        const newData = {
            id: aiId, // Keep the original ID
            icon: iconInput.value.trim(),
            name_en: nameENInput.value.trim(),
            name_zh: nameZHInput.value.trim(),
            description_en: descENInput.value.trim(),
            description_zh: descZHInput.value.trim(),
            toolWebsite: toolWebsiteInput.value.trim(),
            releaseDate: `${releaseYearInput.value || ''}-${releaseMonthInput.value || ''}`.replace(/^-$/, ''), // Format YYYY-MM, handle empty
            features: newFeatures // Use the newly collected features
        };
    
        // Find the item in the cached list and update it
        const allItems = await getAllAIItems();
        const itemIndex = allItems.findIndex(item => item.id === aiId);
        if (itemIndex === -1) {
            // Throw error if item not found to be caught below
            throw new Error(`AI item with ID ${aiId} not found`);
        }
            
        // Update the item in the array
        const updatedItem = { ...allItems[itemIndex], ...newData };
        allItems[itemIndex] = updatedItem;
            
        // Save back to JSON/localStorage
        await saveAllAIItems(allItems);
            
        // Call the update UI callback if provided, passing the full updated item data
        if (updateUICallback && typeof updateUICallback === 'function') {
            updateUICallback(updatedItem);
        }
            
        return updatedItem; // Return the updated object on success
        
    } catch (error) { // Catch block starts here
        console.error(`[saveAIItemChanges] Error updating item ${aiId}:`, error);
        alert(`Error saving changes for ${aiId}. Check console.`);
        return null; // Return null on failure
    } // End of catch block
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
    if (!modal) { console.error("[setupEditModalListeners] Edit AI Modal not found!"); return; }

    const modalContent = modal.querySelector('.modal-content');
    const closeButton = document.getElementById('closeEditModal');
    const editForm = document.getElementById('editAIForm');
    const cancelEditButton = document.getElementById('cancelEdit');
    const editModeBtn = document.getElementById('editModeBtn');
    const saveButton = modal.querySelector('.modal-actions button[type="submit"]');
    
    // Language Switches
    const readOnlyLangSwitchEN = document.getElementById('readOnlyLangSwitchEN');
    const readOnlyLangSwitchZH = document.getElementById('readOnlyLangSwitchZH');
    const editLangSwitchEN = document.getElementById('editLangSwitchEN');
    const editLangSwitchZH = document.getElementById('editLangSwitchZH');
    
    // Edit Mode Input Fields
    const editItemId = document.getElementById('editItemId');
    const editItemIcon = document.getElementById('editItemIcon');
    const editItemNameEN = document.getElementById('editItemNameEN');
    const editItemNameZH = document.getElementById('editItemNameZH');
    const editItemReleaseMonth = document.getElementById('editItemReleaseMonth');
    const editItemReleaseYear = document.getElementById('editItemReleaseYear');
    const editItemToolWebsite = document.getElementById('editItemToolWebsite');
    const editItemDescriptionEN = document.getElementById('editItemDescriptionEN');
    const editItemDescriptionZH = document.getElementById('editItemDescriptionZH');
    const editFeaturesSectionEdit = document.getElementById('editFeaturesSectionEdit');
    const editMarkdownPreview = document.getElementById('editMarkdownPreview');

    // Edit Mode Language-Specific Containers
    const editNameENContainer = document.getElementById('editNameENContainer');
    const editNameZHContainer = document.getElementById('editNameZHContainer');
    const editDescENContainer = document.getElementById('editDescENContainer');
    const editDescZHContainer = document.getElementById('editDescZHContainer');

    // Read Only Display Elements
    const readOnlyNameLabel = document.getElementById('readOnlyNameLabel'); // The label itself
    const readOnlyName = document.getElementById('readOnlyName'); // The span inside the value-container
    const readOnlyReleaseDate = document.getElementById('readOnlyReleaseDate');
    const readOnlyFeaturesSection = document.getElementById('readOnlyFeaturesSection');
    const readOnlyMarkdownPreview = document.getElementById('readOnlyMarkdownPreview');
    const readOnlyIconContainer = modal.querySelector('#readOnlyPairIcon .value-container');
    const readOnlyWebsiteContainer = modal.querySelector('#readOnlyPairToolWebsite .value-container');

    // Check if all required elements are found
    const requiredElements = {
        modal, modalContent, closeButton, editForm, cancelEditButton, editModeBtn, saveButton,
        readOnlyLangSwitchEN, readOnlyLangSwitchZH, editLangSwitchEN, editLangSwitchZH,
        editItemId, editItemIcon, editItemNameEN, editItemNameZH, editItemReleaseMonth, editItemReleaseYear,
        editItemToolWebsite, editItemDescriptionEN, editItemDescriptionZH, editFeaturesSectionEdit, editMarkdownPreview,
        editNameENContainer, editNameZHContainer, editDescENContainer, editDescZHContainer,
        readOnlyNameLabel, readOnlyName, readOnlyReleaseDate, readOnlyFeaturesSection, readOnlyMarkdownPreview,
        readOnlyIconContainer, readOnlyWebsiteContainer
    };

    let allFound = true;
    for (const key in requiredElements) {
        if (!requiredElements[key]) {
            console.error(`[setupEditModalListeners] Element not found: ${key}`);
            allFound = false;
        }
    }

    if (!allFound) {
        console.error("[setupEditModalListeners] Aborting setup due to missing elements.");
        return;
    }
    console.log("[setupEditModalListeners] All required elements found.");

    // --- Language Switching Logic (Combined for Read-Only and Edit) --- 
    const switchLanguage = async (targetLangCode) => {
        console.log(`[Edit Modal switchLanguage] Switching to ${targetLangCode}`);
        const isEN = targetLangCode === 'en';
        const currentMode = modalContent.dataset.mode || 'read-only'; // Default to read-only

        // 1. Update data-language attribute
        modalContent.dataset.language = targetLangCode;
        
        // 2. Update button active states (both sets)
        readOnlyLangSwitchEN.classList.toggle('active', isEN);
        readOnlyLangSwitchZH.classList.toggle('active', !isEN);
        editLangSwitchEN.classList.toggle('active', isEN);
        editLangSwitchZH.classList.toggle('active', !isEN);

        // 3. Toggle visibility of language-specific containers in EDIT MODE
        editNameENContainer.style.display = isEN ? 'block' : 'none';
        editNameZHContainer.style.display = isEN ? 'none' : 'block';
        editDescENContainer.style.display = isEN ? 'block' : 'none';
        editDescZHContainer.style.display = isEN ? 'none' : 'block';
        
        // 4. Reload translations if needed
        await loadLanguage(targetLangCode);
        const currentLangData = getCurrentTranslations();

        // 5. Update Read-Only Display or Edit Preview based on mode
        if (currentMode === 'read-only') {
             try {
                 const originalData = JSON.parse(modal.dataset.originalData || '{}');
                // Call MODULE-LEVEL helper
                updateReadOnlyDisplay(originalData, targetLangCode); // Pass lang code
                // Re-populate read-only features (since helper doesn't handle them)
                readOnlyFeaturesSection.innerHTML = ''; // Clear
                const allFeatures = getAllFeatures();
                 allFeatures.forEach(featureDef => {
                    const featureId = featureDef.id;
                    if (Object.hasOwnProperty.call(originalData.features || {}, featureId)) {
                        const score = originalData.features[featureId] || 0;
                        // *** Pass targetLangCode, NOT originalData's lang ***
                        const readRow = createReadOnlyFeatureBarElement(featureId, score, featureDef, targetLangCode);
                        if (readRow) { readOnlyFeaturesSection.appendChild(readRow); }
                    }
                 });
                 if (readOnlyFeaturesSection.children.length === 0) { readOnlyFeaturesSection.innerHTML = '<p><i>No features rated.</i></p>'; }

            } catch(e) { console.error("Error parsing original data for read-only display update:", e); }
        } else {
            // Call MODULE-LEVEL helper
            const previewText = isEN ? editItemDescriptionEN.value : editItemDescriptionZH.value;
            updateEditPreview(previewText || '');
        }

        // 6. Update all translatable text within the modal
        if (currentLangData) {
            console.log(`[Edit Modal switchLanguage] Re-applying static text for language: ${targetLangCode}`);
            updateStaticText(currentLangData, modal); // Apply to the whole modal
            // *** ALSO UPDATE DYNAMICALLY ADDED BUTTON TEXT ***
            const addFeatureBtnElement = modal.querySelector('.features-header .add-feature-btn');
            if (addFeatureBtnElement) {
                 addFeatureBtnElement.textContent = getNestedTranslation(currentLangData, 'modal.editAI.addFeatureButton') || '+ Add Feature';
            }
        } else {
            console.warn(`[Edit Modal switchLanguage] Could not get translations for ${targetLangCode}`);
        }
    };

    // Attach listeners to BOTH sets of language buttons
    readOnlyLangSwitchEN.addEventListener('click', () => switchLanguage('en'));
    readOnlyLangSwitchZH.addEventListener('click', () => switchLanguage('zh'));
    editLangSwitchEN.addEventListener('click', () => switchLanguage('en'));
    editLangSwitchZH.addEventListener('click', () => switchLanguage('zh'));

    // --- Real-time Markdown Preview Update (Only in Edit Mode) ---
    editItemDescriptionEN.addEventListener('input', () => {
        if (modalContent.dataset.mode === 'edit' && modalContent.dataset.language === 'en') {
            updateEditPreview(editItemDescriptionEN.value); // Use module-level helper
        }
    });
    editItemDescriptionZH.addEventListener('input', () => {
        if (modalContent.dataset.mode === 'edit' && modalContent.dataset.language === 'zh') {
            updateEditPreview(editItemDescriptionZH.value); // Use module-level helper
        }
    });

    // --- Mode Switching Logic ---
    editModeBtn.addEventListener('click', () => {
        console.log("[Edit Modal] Switching to Edit Mode");
        modalContent.dataset.mode = 'edit'; // Set mode
        modal.querySelectorAll('.read-only-element').forEach(el => el.style.display = 'none');
        modal.querySelectorAll('.edit-mode-element').forEach(el => el.style.display = 'block'); 
        editForm.style.display = 'block';
        
        const currentLang = modalContent.dataset.language || 'zh';
        editLangSwitchEN.classList.toggle('active', currentLang === 'en');
        editLangSwitchZH.classList.toggle('active', currentLang === 'zh');

        editNameENContainer.style.display = currentLang === 'en' ? 'block' : 'none';
        editNameZHContainer.style.display = currentLang === 'en' ? 'none' : 'block';
        editDescENContainer.style.display = currentLang === 'en' ? 'block' : 'none';
        editDescZHContainer.style.display = currentLang === 'en' ? 'none' : 'block';

        // Trigger preview update using MODULE-LEVEL helper
        const previewText = currentLang === 'en' ? editItemDescriptionEN.value : editItemDescriptionZH.value;
        updateEditPreview(previewText || '');
    });

    cancelEditButton.addEventListener('click', () => {
        console.log("[Edit Modal] Cancelling Edit - Reverting to Read Only");
        modalContent.dataset.mode = 'read-only';
        modal.querySelectorAll('.read-only-element').forEach(el => el.style.display = 'block');
        modal.querySelectorAll('.edit-mode-element').forEach(el => el.style.display = 'none');
        editForm.style.display = 'none';
        
        // Restore original data using MODULE-LEVEL helper
        populateEditForm(originalDataBeforeEdit); 
        
        const currentLang = modalContent.dataset.language || 'zh';
        readOnlyLangSwitchEN.classList.toggle('active', currentLang === 'en');
        readOnlyLangSwitchZH.classList.toggle('active', currentLang === 'zh');

        // Re-render read-only display using MODULE-LEVEL helper
        updateReadOnlyDisplay(originalDataBeforeEdit, currentLang); // Pass lang code
        // Re-populate read-only features
        readOnlyFeaturesSection.innerHTML = ''; 
        const allFeatures = getAllFeatures();
         allFeatures.forEach(featureDef => {
            const featureId = featureDef.id;
            if (Object.hasOwnProperty.call(originalDataBeforeEdit.features || {}, featureId)) {
                const score = originalDataBeforeEdit.features[featureId] || 0;
                // *** Pass currentLang to createReadOnlyFeatureBarElement ***
                const readRow = createReadOnlyFeatureBarElement(featureId, score, featureDef, currentLang);
                if (readRow) { readOnlyFeaturesSection.appendChild(readRow); }
            }
         });
         if (readOnlyFeaturesSection.children.length === 0) { readOnlyFeaturesSection.innerHTML = '<p><i>No features rated.</i></p>'; }
    });
    
    // --- Form Submission Logic ---
    editForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log("[Edit Modal] Form submitted.");
        
        const itemId = editItemId.value;
        if (!itemId) {
            console.error("[Edit Modal] Cannot save, item ID is missing.");
            return;
        }
        
        // Collect data from form fields
        const formData = {
            id: itemId,
            name_en: editItemNameEN.value.trim(),
            name_zh: editItemNameZH.value.trim(),
            icon: editItemIcon.value.trim(),
            releaseDate: buildReleaseDate(editItemReleaseMonth.value, editItemReleaseYear.value),
            toolWebsite: editItemToolWebsite.value.trim(),
            description_en: editItemDescriptionEN.value.trim(),
            description_zh: editItemDescriptionZH.value.trim(),
            features: collectFeaturesFromDOM(editFeaturesSectionEdit)
        };

        console.log("[Edit Modal] Collected form data:", formData);

        // Update the item in the main data store using the correct async function
        const updatedItem = await saveAIItemChanges(itemId, updateUICallback);

        if (updatedItem) { // Check if we got the updated item back (not null)
            console.log(`[Edit Modal] AI item ${itemId} updated successfully.`);
            originalDataBeforeEdit = { ...updatedItem }; // Use the DEFINITIVE updated data
            modal.dataset.originalData = JSON.stringify(originalDataBeforeEdit);

            // Switch back to read-only mode
            modalContent.dataset.mode = 'read-only';
            modal.querySelectorAll('.read-only-element').forEach(el => el.style.display = 'block');
            modal.querySelectorAll('.edit-mode-element').forEach(el => el.style.display = 'none');
            editForm.style.display = 'none';
            
            // Re-render read-only display using MODULE-LEVEL helper and DEFINITIVE data
            const currentLang = modalContent.dataset.language || 'zh';
            updateReadOnlyDisplay(updatedItem, currentLang);
            // Re-populate read-only features using DEFINITIVE data
            readOnlyFeaturesSection.innerHTML = '';
            const allFeatures = getAllFeatures();
            allFeatures.forEach(featureDef => {
                const featureId = featureDef.id;
                if (Object.hasOwnProperty.call(updatedItem.features || {}, featureId)) { // Use updatedItem.features
                    const score = updatedItem.features[featureId] || 0;
                    const readRow = createReadOnlyFeatureBarElement(featureId, score, featureDef, currentLang);
                    if (readRow) { readOnlyFeaturesSection.appendChild(readRow); }
                }
            });
            if (readOnlyFeaturesSection.children.length === 0) { readOnlyFeaturesSection.innerHTML = '<p><i>No features rated.</i></p>'; }
            
        } else {
            console.error(`[Edit Modal] Failed to update AI item ${itemId}. Save function returned null.`);
            alert('Error saving changes. Please check console.');
        }
    });

    // --- Feature Row Remove Button Listener (Event Delegation) ---
    editFeaturesSectionEdit.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-feature-btn')) {
            const button = event.target;
            const featureRow = button.closest('.feature-row');
            if (featureRow) {
                featureRow.remove();
                console.log(`[Edit Modal] Removed feature row for ID: ${button.dataset.featureId}`);
            }
        }
    });

    // --- Close Button --- 
    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

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
        return newAI; // <-- Return the complete object with the ID
    } catch (error) {
        console.error('[addAIItem] Error adding AI item:', error);
        return false; // Keep returning false on error
    }
}

// --- NEW: Helper to find insertion point based on global order ---
function findFeatureInsertIndex(container, newFeatureId, allFeatures) {
    const existingRows = Array.from(container.querySelectorAll('.feature-row'));
    const newFeatureOrder = allFeatures.findIndex(f => f.id === newFeatureId);

    let insertBeforeElement = null;
    for (const row of existingRows) {
        const existingFeatureId = row.dataset.featureId;
        const existingFeatureOrder = allFeatures.findIndex(f => f.id === existingFeatureId);
        if (existingFeatureOrder > newFeatureOrder) {
            insertBeforeElement = row;
            break;
        }
    }
    return insertBeforeElement; // If null, append at the end
}

// --- NEW: Helper to create a feature row (Edit or Read-ONLY) ---
function createFeatureRowElement(featureId, initialScore, featureDef, isEditMode, currentLang, toolId = null) {
    const featureName = currentLang === 'en' ? featureDef.name_en : featureDef.name_zh;
    const row = document.createElement('div');
    row.className = `feature-row ${isEditMode ? '' : 'read-only'}`.trim();
    row.dataset.featureId = featureId; // Store feature ID for saving and ordering

    if (isEditMode) {
        const sliderId = `feature-slider-${featureId}-${toolId || 'add'}`;
        const displayId = `feature-score-${featureId}-${toolId || 'add'}`;
        row.innerHTML = `
            <div class="feature-controls">
                <button type="button" class="remove-feature-btn" aria-label="Remove ${featureName}" data-feature-id="${featureId}">-</button>
                <label for="${sliderId}">${featureName}</label>
            </div>
            <div class="feature-slider-container">
                <input type="range" id="${sliderId}" name="${featureId}" min="0" max="100" value="${initialScore}" class="feature-slider">
                <span id="${displayId}" class="feature-score-display">${initialScore}</span>
            </div>
        `;

        // Add listener to update score display when slider changes
        const slider = row.querySelector(`#${sliderId}`);
        const display = row.querySelector(`#${displayId}`);
        if (slider && display) {
            slider.addEventListener('input', () => {
                display.textContent = slider.value;
            });
        }

    } else { // Read-Only Mode
         // Only display if score > 0
         if (initialScore > 0) {
            // Compact Structure: Name above bar, no percentage
            row.innerHTML = `
                <div class="w-full">
                  <p class="feature-name text-xs font-medium mb-1">${featureName}</p>
                  <div class="progress h-2" role="progressbar" aria-label="${featureName} Progressbar" aria-valuenow="${initialScore}" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: ${initialScore}%;"></div>
                  </div>
                </div>
            `;
         } else {
             // If score is 0, don't add the row element at all for read-only
             return null;
         }
    }
    return row;
}

// --- NEW/REVISED: Add Feature Button Handler using Modal ---
function handleAddFeature(e, targetContainerId, toolId = null) {
    const targetContainer = document.getElementById(targetContainerId);
    if (!targetContainer) {
        console.error(`[handleAddFeature] Target container #${targetContainerId} not found.`);
        return;
    }

    const featureSelectModal = document.getElementById('featureSelectionModal');
    const availableFeaturesList = document.getElementById('availableFeaturesList');
    const confirmBtn = document.getElementById('confirmFeatureSelection');
    const cancelBtn = document.getElementById('cancelFeatureSelection');
    const closeBtn = document.getElementById('closeFeatureSelectModal');

    if (!featureSelectModal || !availableFeaturesList || !confirmBtn || !cancelBtn || !closeBtn) {
        console.error('[handleAddFeature] Feature selection modal elements not found. Check HTML IDs.');
        return;
    }

    // Find available features
    const allFeatures = getAllFeatures();
    // --- Determine language context more reliably ---
    let currentLang = 'zh'; // Default
    const parentModal = targetContainer.closest('.modal');
    if (parentModal) {
        const parentModalContent = parentModal.querySelector('.modal-content');
        if (parentModalContent && parentModalContent.dataset.language) {
            currentLang = parentModalContent.dataset.language;
        } else {
             console.warn('[handleAddFeature] Could not determine language from parent modal content.');
        }
    } else {
        console.warn('[handleAddFeature] Could not find parent modal for target container.');
        // Fallback to checking edit modal explicitly as before, just in case
        const editModalContent = document.getElementById('editAIModal')?.querySelector('.modal-content');
        if (editModalContent && editModalContent.dataset.language) {
            currentLang = editModalContent.dataset.language;
        }
    }
    console.log('[handleAddFeature] Determined language:', currentLang);
    // --- End language context determination ---

    const existingFeatureRows = targetContainer.querySelectorAll('.feature-row');
    const existingFeatureIds = new Set(
        Array.from(existingFeatureRows).map(row => row.dataset.featureId)
    );

    const availableFeatures = allFeatures.filter(f => !existingFeatureIds.has(f.id));

    if (availableFeatures.length === 0) {
        alert('All available features have been added.'); // Consider a less intrusive notification
        return;
    }

    // Populate the selection modal list
    availableFeaturesList.innerHTML = ''; // Clear previous list
    availableFeatures.forEach(feature => {
        const featureName = currentLang === 'en' ? feature.name_en : feature.name_zh;
        const checkboxId = `select-feature-${feature.id}`;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'feature-select-item';
        itemDiv.innerHTML = `
            <input type="checkbox" id="${checkboxId}" data-feature-id="${feature.id}">
            <label for="${checkboxId}">${featureName}</label>
        `;
        availableFeaturesList.appendChild(itemDiv);
    });

    // Store context for the confirm button handler
    confirmBtn.dataset.targetContainerId = targetContainerId;
    confirmBtn.dataset.toolId = toolId || '';
    confirmBtn.dataset.currentLang = currentLang;

    // Remove previous listeners to prevent duplicates if modal is reused
    confirmBtn.replaceWith(confirmBtn.cloneNode(true)); 
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    closeBtn.replaceWith(closeBtn.cloneNode(true));

    // Get fresh references after cloning
    const newConfirmBtn = document.getElementById('confirmFeatureSelection');
    const newCancelBtn = document.getElementById('cancelFeatureSelection');
    const newCloseBtn = document.getElementById('closeFeatureSelectModal');

    // Attach event listeners for the selection modal
    newConfirmBtn.addEventListener('click', handleConfirmFeatureSelection);
    newCancelBtn.addEventListener('click', () => featureSelectModal.style.display = 'none');
    newCloseBtn.addEventListener('click', () => featureSelectModal.style.display = 'none');

    // Show the modal
    featureSelectModal.style.display = 'flex';
}

// --- NEW: Handler for Confirming Feature Selection --- 
function handleConfirmFeatureSelection(e) {
    const confirmBtn = e.target;
    const targetContainerId = confirmBtn.dataset.targetContainerId;
    const toolId = confirmBtn.dataset.toolId;
    const currentLang = confirmBtn.dataset.currentLang;

    const targetContainer = document.getElementById(targetContainerId);
    const featureSelectModal = document.getElementById('featureSelectionModal');
    const availableFeaturesList = document.getElementById('availableFeaturesList');

    if (!targetContainer || !featureSelectModal || !availableFeaturesList) {
        console.error('[handleConfirmFeatureSelection] Required elements not found.');
        return;
    }

    const selectedCheckboxes = availableFeaturesList.querySelectorAll('input[type="checkbox"]:checked');
    const allFeatures = getAllFeatures(); // Need the full list for ordering
    const allFeaturesMap = new Map(allFeatures.map(f => [f.id, f])); // For easy lookup

    selectedCheckboxes.forEach(checkbox => {
        const featureId = checkbox.dataset.featureId;
        const featureDef = allFeaturesMap.get(featureId);
        if (featureDef) {
            // Check if row already exists (shouldn't happen with current logic, but safe check)
            if (!targetContainer.querySelector(`.feature-row[data-feature-id="${featureId}"]`)) {
                const newRow = createFeatureRowElement(featureId, 0, featureDef, true, currentLang, toolId);
                if (newRow) {
                    // Insert into the correct position based on global order
                    const featureRowsContainer = targetContainer.querySelector('.feature-rows-container') || targetContainer;
                    const insertBeforeElement = findFeatureInsertIndex(featureRowsContainer, featureId, allFeatures);
                    featureRowsContainer.insertBefore(newRow, insertBeforeElement);
                    console.log(`Added feature row for: ${featureId}`);
                }
            }
        } else {
            console.warn(`[handleConfirmFeatureSelection] Feature definition not found for selected ID: ${featureId}`);
        }
    });

    // Hide the selection modal
    featureSelectModal.style.display = 'none';
}

// --- NEW: Helper to create a Read-Only Feature Bar ---
function createReadOnlyFeatureBarElement(featureId, score, featureDef, currentLang) {
    if (score === 0) return null; // Don't display features with 0 score

    const featureName = currentLang === 'en' ? featureDef.name_en : featureDef.name_zh;
    const container = document.createElement('div');
    container.className = 'read-only-feature-item';
    container.dataset.featureId = featureId;

    // Create the structure: label followed by the bar container
    container.innerHTML = `
        <span class="read-only-feature-label">${featureName}</span>
        <div class="read-only-feature-bar-container">
            <div class="read-only-feature-bar" style="width: ${Math.max(0, Math.min(100, score))}%;"></div>
        </div>
    `;

    return container;
}

