/**
 * main.js
 * Main entry point for the AI Star Chart application
 */

// Import from other modules
import { defaultTiers, settings } from './config.js';
import { renderAIPool, renderTiers, setupModals, setupAddCustomAI, setupTierControls, setupActionButtons, renderAIItem } from './ui.js';
import { initDragAndDrop } from './dragDrop.js';
import { saveState, loadState, clearState, exportAsImage, generateShareableLink, loadFromShareableLink } from './storage.js';
import { addTier, removeTier, editTier, moveItemToTier } from './tierManagement.js';
import { setupAIItemClickHandlers, setupEditAIModalHandlers, getAllAIItems } from './aiToolManagement.js';

// Application state
const state = {
    aiItems: [], // Will be loaded from CSV
    customAIItems: [], // User-added AI items
    tiers: defaultTiers.map(tier => ({ ...tier, items: [] })), // Initialize tiers with empty items arrays
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
        
        // Set up state change handler
        state.onStateChange = handleStateChange;
        
        // Render initial UI
        renderUI();
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize drag and drop
        const dragDrop = initDragAndDrop(state);
        dragDrop.setup();
        
        // Set up modals
        setupModals();
        
        // Set up edit AI modal handlers
        setupEditAIModalHandlers(renderUI);
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
        renderTiers(state.tiers, tiersContainer);
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
                    // Create the AI item element
                    const aiElement = document.createElement('div');
                    aiElement.className = 'ai-item';
                    aiElement.setAttribute('draggable', 'true');
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
    // Setup Add Custom AI functionality
    setupAddCustomAI(addCustomAI);
    
    // Setup tier control buttons
    setupTierControls(handleAddTier, handleRemoveTier);
    
    // Setup action buttons
    setupActionButtons({
        saveCallback: saveCurrentState,
        shareCallback: shareChart,
        exportCallback: exportChart,
        resetCallback: resetChart
    });
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
    
    // Re-initialize drag and drop for the new item
    const dragDrop = initDragAndDrop(state);
    dragDrop.setup();
    
    // Save state
    handleStateChange(state);
}

// Handle adding a tier
function handleAddTier() {
    // Use the tierManagement module to add a tier
    const success = addTier(state, renderUI);
    
    // Save state if successful
    if (success) {
        handleStateChange(state);
    }
}

// Handle removing a tier
function handleRemoveTier() {
    // Use the tierManagement module to remove a tier
    const success = removeTier(state, renderUI);
    
    // Save state if successful
    if (success) {
        handleStateChange(state);
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
        state.tiers = defaultTiers.map(tier => ({ ...tier, items: [] }));
        
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
document.addEventListener('DOMContentLoaded', () => {
    init();
    // Setup delegated click handlers once after initial load
    setupAIItemClickHandlers(); 
});
