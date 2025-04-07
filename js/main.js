/**
 * main.js
 * Main entry point for the AI Star Chart application
 */

// Import from other modules
import { settings } from './config.js';
import { renderAIPool, renderTiers as renderUITiers, setupModals, setupAddCustomAI, setupTierControls, setupActionButtons, renderAIItem } from './ui.js';
import { initDragAndDrop } from './dragDrop.js';
import { saveState, loadState, clearState, exportAsImage, generateShareableLink, loadFromShareableLink } from './storage.js';
import { loadTiers, getLoadedTiers, handleAddTier as importedHandleAddTier, saveTiersToFile } from './tierManagement.js'; 
import { loadFeatures } from './featureManagement.js';
import { setupEditModalListeners, getAllAIItems, showEditAIModal } from './aiToolManagement.js';
import { exportStateToCSV } from './exportManager.js'; // Import the updated export function

// Application state
const state = {
    aiItems: [], // Will be loaded from CSV
    customAIItems: [], // User-added AI items
    tiers: [], // Tiers will be loaded asynchronously
    onStateChange: null // Will be set to a function that handles state changes
};

// Initialize the application
async function init() {
    try {
        // Load essential data concurrently
        await Promise.all([
            getAllAIItems(), // Load AI tools data
            loadTiers(),     // Load tier definitions
            loadFeatures()   // Load feature definitions
        ]);

        // Get loaded data
        let aiItems = await getAllAIItems(); // Already loaded, just get the array
        state.tiers = getLoadedTiers();
        // Features are loaded into featureManagement module, no need to store in state here
        console.log("[main.js] AI Items, Tiers, and Features loaded.");

        // Try to load saved state from localStorage
        const savedState = loadState();
        if (savedState) {
            // Merge saved state with default state
            mergeState(savedState);
        }
        
        // Check if there's a shared state in the URL
        const sharedState = loadFromShareableLink();
        if (sharedState) {
            // Use the shared state instead
            mergeState(sharedState);
        }

        // Set up modals (including Add Tier modal logic which needs the callback)
        // Pass handleAddTier from tierManagement
        setupModals(importedHandleAddTier); 

        // Populate tiers and the unranked pool based on the tier_id property of AI items.
        populateInitialItems(aiItems); 
        console.log("[main.js] Initial items populated.");

        // Initialize Drag and Drop after items and tiers are rendered
        // Use setTimeout to ensure DOM updates from populateInitialItems are complete
        setTimeout(() => {
            initDragAndDrop({
                aiItems: aiItems,
                tiers: getLoadedTiers() || []  // Get current tiers
            });
            console.log("[main.js] Drag and Drop initialized (after timeout).");
        }, 0); // Delay of 0 pushes to next event loop tick

        // Set up state change handler
        state.onStateChange = handleStateChange;
        
        // Set up event listeners
        setupEventListeners();
        
        // Setup edit modal listeners separately
        setupEditModalListeners(updateSingleItemDisplay); 
        
    } catch (error) {
        console.error('Error initializing application:', error);
        alert('There was an error loading the application. Please try refreshing the page.');
    }
}

// Load AI items from CSV file
async function loadAIItemsFromCSV() {
    try {
        const items = await getAllAIItems();
        if (items && items.length > 0) {
            state.aiItems = items;
        } else {
            console.warn('No items found in CSV or CSV format is invalid');
        }
    } catch (error) {
        console.error('Error loading AI items from CSV:', error);
        // Fallback to empty array if CSV loading fails
        state.aiItems = [];
    }
}

// Merge saved or shared state with default state
function mergeState(savedState) {
    // Merge custom AI items
    if (savedState.customAIItems) {
        state.customAIItems = savedState.customAIItems;
    }
    
    // Merge tiers
    if (savedState.tiers) {
        // Update existing tiers
        savedState.tiers.forEach(savedTier => {
            const existingTier = state.tiers.find(t => t.id === savedTier.id);
            if (existingTier) {
                existingTier.name = savedTier.name;
                existingTier.color = savedTier.color;
                existingTier.items = savedTier.items || [];
            } else {
                // Add new tier if it doesn't exist
                state.tiers.push({
                    ...savedTier,
                    items: savedTier.items || []
                });
            }
        });
    }
}

// Render the UI based on current state
function renderUI(aiItems, itemElementMap) {
    // Render AI pool
    const aiPoolContainer = document.getElementById('ai-items');
    if (aiPoolContainer) {
        // Ensure aiItems is an array
        const itemsArray = Array.isArray(aiItems) ? aiItems : [];
        // Combine default and custom AI items
        const allItems = [...itemsArray, ...state.customAIItems];
        renderAIPool(allItems, aiPoolContainer);
    }
    
    // Render tiers
    const tiersContainer = document.getElementById('tiers-container');
    if (tiersContainer) {
        renderUITiers(state.tiers, tiersContainer);
    }
}

// Populates tiers and the unranked pool based on the tier_id property of AI items.
function populateInitialItems(aiItems) {
    console.log("[main.js] Populating initial items based on tier_id...");
    const unrankedPoolContainer = document.getElementById('ai-items');

    if (!unrankedPoolContainer) {
        console.error("[main.js] AI items container (#ai-items) not found!");
        return;
    }
    unrankedPoolContainer.innerHTML = ''; // Clear unranked pool initially

    // Clear existing items from all tier dropzones as well
    document.querySelectorAll('.tier-items').forEach(zone => zone.innerHTML = '');

    aiItems.forEach(item => {
        const itemElement = renderAIItem(item); // Use renderAIItem instead of createAIItemElement
        const targetTierId = item.tier_id;

        if (targetTierId && targetTierId !== 'UNRANKED' && targetTierId !== '') {
            // Attempt to place in a specific tier
            // Look for tier-items with data-tier attribute matching the tier_id
            const targetTierContainer = document.querySelector(`.tier-items[data-tier="${targetTierId}"]`);
            
            if (targetTierContainer) {
                console.log(`[main.js] Placing item ${item.id} into tier ${targetTierId}`);
                targetTierContainer.appendChild(itemElement); // Place in tier
            } else {
                console.warn(`[main.js] Tier container for tier_id "${targetTierId}" not found for item ${item.id}. Placing in unranked.`);
                unrankedPoolContainer.appendChild(itemElement); // Fallback to unranked
            }
        } else {
            // Place in unranked pool
            console.log(`[main.js] Placing item ${item.id} into unranked pool.`);
            unrankedPoolContainer.appendChild(itemElement);
        }
    });
    console.log(`[main.js] Finished populating initial items. ${aiItems.length} items processed.`);
}

// Set up event listeners for buttons and other interactive elements
function setupEventListeners() {
    console.log("[main.js] Setting up event listeners...");
    // Setup Add Custom AI functionality
    setupAddCustomAI(addCustomAI);
    
    // Setup tier control buttons using the IDs from index.html
    // Assuming setupTierControls adds listeners to #add-tier-btn
    setupTierControls(); // No longer needs callbacks passed here
    
    // Setup action buttons
    setupActionButtons({
        saveCallback: saveCurrentState,
        shareCallback: shareChart,
        exportCallback: exportChart,
        resetCallback: resetChart
    });
    
    // Add delegated event listener for clicks on AI items (for modal opening)
    const mainContainer = document.querySelector('main.container'); // Target the main container
    if (mainContainer) {
        mainContainer.addEventListener('click', (event) => {
            const aiItemElement = event.target.closest('.ai-item');
            if (aiItemElement && !aiItemElement.classList.contains('dragging')) {
                const itemId = aiItemElement.dataset.id;
                if (itemId) {
                    showEditAIModal(itemId); // Function from aiToolManagement.js
                }
            }
        });
        console.log("[main.js] Delegated click listener added for .ai-item.");
    } else {
        console.error("[main.js] Could not find main.container to attach delegated click listener.");
    }
}

// Add a custom AI item
function addCustomAI(addedItem) { // The callback now receives the full item with ID
    console.log("[main.js addCustomAI] Callback received with:", addedItem);
    
    if (!addedItem || !addedItem.id) {
        console.error("[main.js addCustomAI] Callback received invalid item data.", addedItem);
        return; // Don't proceed if we didn't get a valid item back
    }

    // Update UI: Add the new item visually to the unranked pool
    const aiPoolContainer = document.getElementById('ai-items');
    if (aiPoolContainer) {
        const newItemElement = renderAIItem(addedItem); // Use the returned item directly
        if (newItemElement) {
            aiPoolContainer.appendChild(newItemElement);
            // TODO: Make the new item draggable (needs access to DragDrop instance/refresh)
            console.log(`[main.js addCustomAI] New item ${addedItem.id} added to pool. Needs DragDrop init.`);
        } else {
            console.error("[main.js addCustomAI] Could not create DOM element for new item:", addedItem);
        }
    } else {
        console.error("[main.js addCustomAI] AI Pool container not found.");
    }
}

// Save current state
function saveCurrentState() {
    const success = saveState(state);
    if (success) {
        alert('Your AI Star Chart has been saved!');
    } else {
        alert('Failed to save your AI Star Chart. Please try again.');
    }
}

// Share the chart (generate a shareable link)
function shareChart() {
    const link = generateShareableLink(state);
    if (link) {
        // Create a temporary input element
        const tempInput = document.createElement('input');
        tempInput.value = link;
        document.body.appendChild(tempInput);
        
        // Select and copy the link
        tempInput.select();
        document.execCommand('copy');
        
        // Remove the temporary input
        document.body.removeChild(tempInput);
        
        alert('Shareable link copied to clipboard!');
    } else {
        alert('Failed to generate a shareable link. Please try again.');
    }
}

// Export the chart as an image
function exportChart() {
    exportAsImage()
        .then(success => {
            if (!success) {
                alert('Failed to export your AI Star Chart. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error exporting chart:', error);
            alert('Failed to export your AI Star Chart. Please try again.');
        });
}

// Reset the chart to default state
function resetChart() {
    if (confirm('Are you sure you want to reset your AI Star Chart? This cannot be undone.')) {
        // Clear saved state
        clearState();
        
        // Reset to default state
        state.customAIItems = [];
        state.tiers = []; // Reset tiers
        
        // Update UI
        renderUI([]);
    }
}

// Handle state changes (save state and update UI)
function handleStateChange(newState) {
    // Update state if needed
    if (newState !== state) {
        Object.assign(state, newState);
    }
    
    // Save state to localStorage
    saveState(state);
}

// NEW: Function to update a single AI item's display in the UI
function updateSingleItemDisplay(updatedData) {
    console.log('[main.js updateSingleItemDisplay] Updating UI for item:', updatedData.id, updatedData);
    const itemElement = document.querySelector(`.ai-item[data-id="${updatedData.id}"]`);

    if (!itemElement) {
        console.warn(`[main.js updateSingleItemDisplay] Could not find item element with ID: ${updatedData.id}`);
        return;
    }

    // Update data attributes (important for language switching etc.)
    if (updatedData.name_en) itemElement.dataset.nameEn = updatedData.name_en;
    if (updatedData.name_zh) itemElement.dataset.nameZh = updatedData.name_zh;
    // Add other data attributes if needed (e.g., descriptions for tooltips, though not currently used)

    // Update visual elements
    const img = itemElement.querySelector('img');
    if (img && updatedData.icon !== undefined) { // Check if icon was part of update
        img.src = updatedData.icon || settings.defaultIconUrl; // Use default if empty
    }

    const nameSpan = itemElement.querySelector('span');
    if (nameSpan) {
        const currentLang = document.documentElement.lang || 'zh'; // Get current language
        const name = currentLang === 'en' ? updatedData.name_en : updatedData.name_zh;
        if (name) { // Ensure name exists before setting
             nameSpan.textContent = name;
        }
        // Update alt text on image too
        if (img && name) {
            img.alt = `${name} Logo`;
        }
    }
    console.log(`[main.js updateSingleItemDisplay] UI updated for ${updatedData.id}`);
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log("[main.js] DOM fully loaded and parsed");

    // Initialize language manager first
    // await initializeLanguage(); // Assuming languageManager handles its own init

    // Add language change event listener early to catch initial language set
    document.documentElement.addEventListener('languageChanged', (event) => {
        console.log("[main.js] Language changed to:", event.detail.lang);
        const currentLang = event.detail.lang;
        
        // Update tier labels
        const tierRows = document.querySelectorAll('.tier-row');
        tierRows.forEach(row => {
            const tierId = row.getAttribute('data-tier');
            const tier = state.tiers.find(t => t.id === tierId);
            if (!tier) return;
            const labelElement = row.querySelector('.tier-label');
            if (labelElement) {
                labelElement.textContent = currentLang === 'en' ? tier.name_en : tier.name_zh;
            }
            // Also update hidden input if it exists (for edit mode in tiers)
            const inputElement = row.querySelector('.tier-name-input');
             if (inputElement) {
                 inputElement.value = currentLang === 'en' ? tier.name_en : tier.name_zh;
             }
        });
        
        // Update AI tool labels
        const aiItems = document.querySelectorAll('.ai-item');
        aiItems.forEach(item => {
            const nameEn = item.getAttribute('data-name-en');
            const nameZh = item.getAttribute('data-name-zh');
            const nameSpan = item.querySelector('span');
            const img = item.querySelector('img');
            if (nameEn && nameZh && nameSpan) {
                const newName = currentLang === 'en' ? nameEn : nameZh;
                nameSpan.textContent = newName;
                 if (img) {
                    img.alt = `${newName} Logo`;
                 }
            }
        });
    }); // End languageChanged listener

    // --- Run Main Initialization --- 
    await init(); // Run the main init function that loads data and sets up UI

    // --- Setup Export CSV Button Listener --- 
    const exportCsvButton = document.getElementById('export-csv-button');
    if (exportCsvButton) {
        exportCsvButton.addEventListener('click', async () => {
            console.log("[main.js] Export button clicked, calling exportStateToCSV...");
            try {
                await exportStateToCSV();
                console.log("[main.js] exportStateToCSV completed.");
            } catch (error) {
                console.error("[main.js] Error during exportStateToCSV call:", error);
            }
        }); // End click listener callback
        console.log("[main.js] Export CSV button listener attached.");
    } else {
        console.warn("[main.js] Export CSV button (#export-csv-button) not found.");
    } // End if exportCsvButton

    console.log("[main.js] Initialization sequence complete."); // Changed log message

}); // End DOMContentLoaded listener
