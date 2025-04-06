/**
 * main.js
 * Main entry point for the AI Star Chart application
 */

// Import from other modules
import { settings } from './config.js';
import { renderAIPool, renderTiers as renderUITiers, setupModals, setupAddCustomAI, setupTierControls, setupActionButtons, renderAIItem } from './ui.js';
import { initDragAndDrop } from './dragDrop.js';
import { saveState, loadState, clearState, exportAsImage, generateShareableLink, loadFromShareableLink } from './storage.js';
// Import only exported functions and alias them
import { loadTiers, getLoadedTiers, handleAddTier as importedHandleAddTier, removeTier as importedRemoveTier, saveTiersToFile } from './tierManagement.js'; 
import { setupEditModalListeners, getAllAIItems, showEditAIModal } from './aiToolManagement.js';
import { exportPlacementsToCSV } from './exportManager.js'; // Import the export function

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
        // Load AI items from CSV
        await loadAIItemsFromCSV();
        
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
        
        // Load tiers asynchronously
        try {
            await loadTiers(); // Calls the exported async function
            state.tiers = getLoadedTiers(); // Get the tiers loaded by the module
            console.log("[main.js] Tiers loaded:", state.tiers);
        } catch (error) {
            console.error("[main.js] Error loading tiers:", error);
            // Handle tier loading failure - maybe load defaults or show error state
            state.tiers = []; // Ensure it's an empty array on failure
        }
        
        // Set up state change handler
        state.onStateChange = handleStateChange;
        
        // Render initial UI
        renderUI();
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize drag and drop, passing the state
        const { setup: setupDragDrop } = initDragAndDrop(state); // Pass state here
        setupDragDrop(); // Setup drag/drop AFTER tiers and items are rendered
        console.log("[main.js] Drag and drop setup complete.");
        
        // Set up modals
        setupModals();
        setupEditModalListeners(renderUI); // Setup edit modal listeners
        
        // --- Explicitly hide Edit Modal on init as a safeguard ---
        const editModal = document.getElementById('editAIModal');
        if (editModal) editModal.style.display = 'none';
        // ---------
        
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
function renderUI() {
    // Render AI pool
    const aiPoolContainer = document.getElementById('ai-items');
    if (aiPoolContainer) {
        // Combine default and custom AI items
        const allItems = [...state.aiItems, ...state.customAIItems];
        renderAIPool(allItems, aiPoolContainer);
    }
    
    // Render tiers
    const tiersContainer = document.getElementById('tiers-container');
    if (tiersContainer) {
        renderUITiers(state.tiers, tiersContainer);
    }
    
    // Populate tier dropzones with AI items
    populateTierDropzones();
}

// Populate tier dropzones with AI items based on state
function populateTierDropzones() {
    state.tiers.forEach(tier => {
        const tierRow = document.querySelector(`.tier-row[data-tier="${tier.id}"]`);
        if (!tierRow) return;
        
        const dropzone = tierRow.querySelector('.tier-dropzone');
        if (!dropzone) return;
        
        // Clear existing items
        dropzone.innerHTML = '';
        
        // Add items that belong to this tier
        if (tier.items && tier.items.length > 0) {
            tier.items.forEach(itemId => {
                // Find the item data
                const itemData = [...state.aiItems, ...state.customAIItems].find(item => item.id === itemId);
                if (itemData) {
                    console.log('[populateTierDropzones] Found itemData for itemId:', itemId, 'itemData:', itemData, 'itemData.id:', itemData.id);
                    // Create the AI item element
                    const aiElement = document.createElement('div');
                    aiElement.className = 'ai-item';
                    aiElement.setAttribute('draggable', 'true');
                    console.log('[populateTierDropzones] Setting data-id from itemData.id:', itemData.id);
                    aiElement.setAttribute('data-id', itemData.id);

                    const img = document.createElement('img');
                    img.src = itemData.icon || settings.defaultIconUrl;
                    img.alt = `${itemData.name} Logo`;
                    
                    const name = document.createElement('span');
                    name.textContent = itemData.name;
                    
                    aiElement.appendChild(img);
                    aiElement.appendChild(name);
                    dropzone.appendChild(aiElement);
                }
            });
        }
    });
}

// Set up event listeners for buttons and other interactive elements
function setupEventListeners() {
    console.log("[main.js] Setting up event listeners...");
    // Setup Add Custom AI functionality
    setupAddCustomAI(addCustomAI);
    
    // Setup tier control buttons using the IDs from index.html
    // Assuming setupTierControls adds listeners to #add-tier-btn and #remove-tier-btn
    // And those listeners will eventually call the imported functions.
    setupTierControls(importedHandleAddTier, importedRemoveTier); // Keep passing functions for now
    
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
function addCustomAI(newAI) {
    // Add to state
    state.customAIItems.push(newAI);
    
    // Update UI
    const aiPoolContainer = document.getElementById('ai-items');
    if (aiPoolContainer) {
        renderAIItem(newAI, aiPoolContainer);
    }
    
    // Save state
    handleStateChange(state);
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
        renderUI();
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

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log("[main.js] DOM fully loaded and parsed");

    // Initialize Language Manager and load default/saved language
    // await initializeLanguageManager();

    // Initialize tier management (loads tiers and items)
    // await initializeTiers();

    // Initialize drag and drop functionality AFTER tiers and items are rendered
    // initializeDragAndDrop();

    // Setup button listeners
    // setupButtonListeners();

    // --- Add listener for Export CSV button ---
    const exportCsvButton = document.getElementById('export-csv-button');
    if (exportCsvButton) {
        exportCsvButton.addEventListener('click', () => {
            // Call the imported function directly
            exportPlacementsToCSV();
        });
        console.log("[main.js] Export CSV button listener attached.");
    } else {
        console.warn("[main.js] Export CSV button (#export-csv-button) not found.");
    }
    // --- End Export CSV button listener ---

    init();

    console.log("[main.js] Initialization complete.");
});
