/**
 * tierManagement.js
 * Handles loading, displaying, and managing dynamic tiers from tiers.csv
 */

import { settings } from './config.js'; // Import settings for minTiers
import { initDragAndDrop } from './dragDrop.js'; // Import drag and drop setup

// --- Globals ---
let loadedTiers = []; // Holds the array of tier objects { id, name_zh, name_en, color }
const tierListContainer = document.getElementById('tier-list-container');
const TIER_CSV_PATH = 'data/tiers.csv';
const TIERS_STORAGE_KEY = 'ai-star-chart-tiers'; // Local Storage Key

// --- Initialization ---
/* // Commenting out internal DOMContentLoaded listener as main.js will orchestrate initialization
document.addEventListener('DOMContentLoaded', async () => {
    if (!tierListContainer) {
        console.error("[TierManagement] Tier list container '#tier-list-container' not found!");
        return;
    }
    await loadTiers(); 
    renderTiers(loadedTiers);
    setupEventListeners(); // Setup listeners for add/save etc.

    // TODO: Add listener for language change events to update tier labels
});
*/

// --- Core Functions ---

/**
 * Fetches and parses the tiers.csv file.
 * This is used as a fallback if Local Storage is empty.
 */
async function loadTiersFromCSV() {
    try {
        const response = await fetch(TIER_CSV_PATH);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        parseTiersCSV(csvText);
        console.log("[TierManagement] Tiers loaded from CSV:", loadedTiers);
    } catch (error) {
        console.error("[TierManagement] Error loading or parsing tiers.csv:", error);
        // Optionally load default tiers or show an error message
        loadedTiers = []; // Reset tiers on error
    }
}

/**
 * Parses CSV text into the loadedTiers array.
 * Assumes CSV format: tier_id,tier_name_zh,tier_name_en,tier_color
 * @param {string} csvText - The raw CSV text content.
 */
function parseTiersCSV(csvText) {
    // console.log("[TierManagement] Parsing CSV Text:", csvText.substring(0, 100) + "..."); // Debug: Show beginning of CSV
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        console.warn("[TierManagement] tiers.csv is empty or has only a header.");
        loadedTiers = [];
        return; // No data rows
    }

    const headers = lines[0].split(',').map(h => h.trim());
    // Very basic validation - adjust indices if header order changes
    const idIndex = headers.indexOf('tier_id');
    const zhIndex = headers.indexOf('tier_name_zh');
    const enIndex = headers.indexOf('tier_name_en');
    const colorIndex = headers.indexOf('tier_color');

    if (idIndex === -1 || zhIndex === -1 || enIndex === -1 || colorIndex === -1) {
        console.error('[TierManagement] tiers.csv header is missing required columns (tier_id, tier_name_zh, tier_name_en, tier_color). Found:', headers);
        loadedTiers = [];
        return;
    }

    loadedTiers = lines.slice(1).map(line => {
        const values = line.split(','); // Simple split, doesn't handle quoted commas
        if (values.length === headers.length) {
            return {
                id: values[idIndex].trim(),
                name_zh: values[zhIndex].trim(),
                name_en: values[enIndex].trim(),
                color: values[colorIndex].trim(),
                items: [] // Initialize empty items array for each tier
            };
        } else {
            console.warn(`[TierManagement] Skipping malformed CSV line: ${line}`);
            return null; // Skip malformed lines
        }
    }).filter(tier => tier !== null); // Remove null entries from skipped lines
}

/**
 * Renders the provided tier data into the DOM.
 * @param {Array<object>} tiers - Array of tier objects to render.
 */
function renderTiers(tiers) {
    console.log("[TierManagement Debug] renderTiers called with:", JSON.stringify(tiers)); // Log input tiers
    if (!tierListContainer) {
        console.error("[TierManagement Debug] Cannot render tiers, container '#tier-list-container' not found!");
        return;
    }
    console.log("[TierManagement Debug] Found tierListContainer:", tierListContainer);
    tierListContainer.innerHTML = ''; // Clear existing tiers

    // Determine current language (example - needs integration with actual language state)
    const currentLang = document.documentElement.lang || 'zh'; // Default to 'zh'
    console.log(`[TierManagement Debug] Current language: ${currentLang}`);

    tiers.forEach(tier => {
        const tierRow = document.createElement('div');
        tierRow.className = 'tier-row';
        tierRow.id = `tier-${tier.id}`;
        tierRow.setAttribute('data-tier', tier.id); // Use data-tier for consistency with main.js

        const tierLabel = document.createElement('div');
        tierLabel.className = 'tier-label';
        tierLabel.style.backgroundColor = tier.color;
        tierLabel.setAttribute('data-tier', tier.id); // Use data-tier for consistency
        
        // Store language-specific names as data attributes for easy language switching
        tierLabel.setAttribute('data-name-en', tier.name_en);
        tierLabel.setAttribute('data-name-zh', tier.name_zh);

        const tierNameSpan = document.createElement('span');
        // Display based on language
        const displayName = currentLang === 'en' ? tier.name_en : tier.name_zh;
        tierNameSpan.textContent = displayName;
        console.log(`[TierManagement Debug] Tier ${tier.id} name (${currentLang}): ${displayName}`);

        // Apply text color based on background
        const textColor = getTextColorForBackground(tier.color);
        tierLabel.style.color = textColor;

        // Remove the tier removal button - no longer needed
        // const removeBtn = document.createElement('button');
        // removeBtn.textContent = '❌';
        // removeBtn.className = 'remove-tier-btn';
        // removeBtn.title = `Remove Tier ${tier.id}`;
        // removeBtn.style.marginLeft = '10px';
        // removeBtn.style.cursor = 'pointer';
        // removeBtn.style.border = 'none';
        // removeBtn.style.background = 'none';
        // removeBtn.onclick = (event) => {
        //     event.stopPropagation();
        //     removeTier(event);
        // };

        tierLabel.appendChild(tierNameSpan);
        // tierLabel.appendChild(removeBtn); // No longer appending the remove button

        const tierItems = document.createElement('div');
        tierItems.className = 'tier-items tier-dropzone'; // Add tier-dropzone class for drag/drop
        tierItems.setAttribute('data-tier', tier.id); // Use data-tier for consistency

        tierRow.appendChild(tierLabel);
        tierRow.appendChild(tierItems);
        tierListContainer.appendChild(tierRow);
    });

    // No need to check for minimum tiers or enable/disable remove buttons
    // since we're removing the remove tier functionality

    console.log(`[TierManagement Debug] Tier rendering loop finished. ${tiers.length} tiers processed.`);
}

/**
 * Sets up event listeners for tier management controls.
 */
function setupEventListeners() {
    // Event listeners for Add/Remove Tier buttons are likely handled by ui.js/setupTierControls
    // which receives handleAddTier and removeTier functions from main.js.

    // Listener for Save Tiers button
    const saveTiersButton = document.getElementById('save-tiers-btn');

    // Remove listener setup for add tier button, it will be handled via modal/ui.js
    // const addTierButton = document.getElementById('add-tier-btn'); 
    // if (addTierButton) { ... }

    if (saveTiersButton) {
        saveTiersButton.addEventListener('click', saveTiersToFile); // Use renamed function
    } else {
         console.warn("[TierManagement] Save Tiers button '#save-tiers-btn' not found.");
    }

    // Add listener for language changes
    document.documentElement.addEventListener('languageChanged', (event) => {
        console.log(`[TierManagement] Language changed to: ${event.detail.lang}. Updating tier labels.`);
        
        const currentLang = event.detail.lang;
        const tierLabels = document.querySelectorAll('#tier-list-container .tier-label');
        
        tierLabels.forEach(label => {
            // Get stored language-specific names from data attributes
            const nameEn = label.getAttribute('data-name-en');
            const nameZh = label.getAttribute('data-name-zh');
            
            // Find the span element containing the tier name
            const nameSpan = label.querySelector('span');
            if (nameSpan && nameEn && nameZh) {
                // Update the displayed text based on current language
                nameSpan.textContent = currentLang === 'en' ? nameEn : nameZh;
                console.log(`[TierManagement] Updated tier label to: ${nameSpan.textContent}`);
            }
        });
    });
}

/**
 * Handles adding a new tier object to the list.
 * @param {object} newTier - The tier object {id, name_zh, name_en, color, items:[]}.
 * @returns {boolean} - True if the tier was added successfully, false otherwise.
 */
export function handleAddTier(newTier) {
    console.log("[TierManagement] handleAddTier called with:", newTier);
    // --- Basic Validation ---
    if (!newTier || typeof newTier !== 'object') {
        console.error("[TierManagement] Invalid newTier object received.");
        alert("Internal error: Invalid tier data received.");
        return false; // Indicate failure
    }

    if (!newTier.id || typeof newTier.id !== 'string' || newTier.id.trim() === '') {
        alert(document.documentElement.lang === 'zh' ? "層級 ID 不能为空。" : "Tier ID cannot be empty.");
        return false;
    }
    newTier.id = newTier.id.trim(); // Ensure trimmed ID is used for comparison

    if (loadedTiers.some(t => t.id.toLowerCase() === newTier.id.toLowerCase())) {
        alert((document.documentElement.lang === 'zh' ? `層級 ID '${newTier.id}' 已存在。請使用唯一的 ID。` : `Tier ID '${newTier.id}' already exists. Please use a unique ID.`));
        return false;
    }
    if ((!newTier.name_zh || newTier.name_zh.trim() === '') && (!newTier.name_en || newTier.name_en.trim() === '')) {
         alert(document.documentElement.lang === 'zh' ? "必須提供至少一個層級名稱（中文或英文）。" : "At least one Tier Name (ZH or EN) must be provided.");
         return false;
    }
     if (!newTier.color || typeof newTier.color !== 'string' || newTier.color.trim() === '') {
         alert(document.documentElement.lang === 'zh' ? "必須選擇層級顏色。" : "Tier color must be selected.");
         return false;
    }
    // Ensure names are trimmed
    newTier.name_zh = newTier.name_zh ? newTier.name_zh.trim() : '';
    newTier.name_en = newTier.name_en ? newTier.name_en.trim() : '';
    // --- End Validation ---

    // Add items property if it's missing (should be added by ui.js, but good safety check)
    if (!newTier.items) {
        newTier.items = [];
    }

    loadedTiers.push(newTier); // Add to the in-memory array
    renderTiers(loadedTiers); // Re-render the list including the new tier
    saveTiersToLocalStorage(); // Save updated tiers to Local Storage

    console.log("[TierManagement] Added new tier:", newTier);
    return true; // Indicate success
}

/**
 * Handles removing a tier by its ID.
 * @param {string|Event} tierId - The ID of the tier to remove or the event object.
 */
export function removeTier(tierId) {
    // Check if tierId is an event object and extract the actual ID if needed
    let actualTierId = tierId;
    if (tierId && typeof tierId === 'object' && tierId.currentTarget) {
        // Extract tier ID from the data-tier attribute of the closest tier-row
        const tierRow = tierId.currentTarget.closest('.tier-row');
        if (tierRow && tierRow.dataset.tier) {
            actualTierId = tierRow.dataset.tier;
        }
    }

    console.log(`[TierManagement] Attempting to remove tier: ${actualTierId}`);

    // Prevent removing below min tiers (use default if settings not loaded)
    const minTiers = (typeof settings !== 'undefined' && settings.minTiers) ? settings.minTiers : 2;
    if (loadedTiers.length <= minTiers) {
        alert(document.documentElement.lang === 'zh' ? `無法移除層級，至少需要 ${minTiers} 個層級。` : `Cannot remove tier. Minimum of ${minTiers} tiers required.`);
        return;
    }

    // Find the tier index
    const tierIndex = loadedTiers.findIndex(tier => tier.id === actualTierId);
    if (tierIndex !== -1) {
        // Remove the tier from the array
        loadedTiers.splice(tierIndex, 1);

        // Re-render the tier list (this also removes the old row)
        renderTiers(loadedTiers);
        saveTiersToLocalStorage();
        console.log(`[TierManagement] Tier removed: ${actualTierId}`);
    } else {
        console.error(`[TierManagement] Tier not found for removal: ${actualTierId}`);
    }
}

/**
 * Handles saving the current tiers back to a CSV file download.
 */
export function saveTiersToFile() {
    if (loadedTiers.length === 0) {
        alert("No tiers to save."); // Consider using a less intrusive notification
        return;
    }

    // Define header row
    const header = ['tier_id', 'tier_name_zh', 'tier_name_en', 'tier_color'];
    // Convert array of objects to CSV string rows
    const csvRows = loadedTiers.map(tier =>
        [tier.id, tier.name_zh, tier.name_en, tier.color].join(',') // Simple join
    );

    // Combine header and rows
    const csvString = [header.join(','), ...csvRows].join('\n');

    // Create blob and download link
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "tiers.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log("[TierManagement] Tiers saved to downloadable tiers.csv");
}

// --- Utility Functions ---

/**
 * Determines if black or white text provides better contrast against a given hex background color.
 * (Simplified version - a more robust solution might consider WCAG contrast ratios)
 * @param {string} hexcolor - Background color in hex format (e.g., "#ff7979").
 * @returns {string} - Returns "#000000" (black) or "#FFFFFF" (white).
 */
function getTextColorForBackground(hexcolor) {
    if (!hexcolor) return '#000000'; // Default to black if color is invalid

    // Remove hash if present
    hexcolor = hexcolor.replace('#', '');

    // Convert hex to RGB
    let r, g, b;
    if (hexcolor.length === 3) {
        r = parseInt(hexcolor.substring(0, 1).repeat(2), 16);
        g = parseInt(hexcolor.substring(1, 2).repeat(2), 16);
        b = parseInt(hexcolor.substring(2, 3).repeat(2), 16);
    } else if (hexcolor.length === 6) {
        r = parseInt(hexcolor.substring(0, 2), 16);
        g = parseInt(hexcolor.substring(2, 4), 16);
        b = parseInt(hexcolor.substring(4, 6), 16);
    } else {
        return '#000000'; // Invalid hex format
    }

    // Calculate luminance (simplified formula)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Choose text color based on luminance threshold (0.5 is a common midpoint)
    return luminance > 0.5 ? '#000000' : '#FFFFFF'; // Black text on light bg, White text on dark bg
}

/**
 * Loads tiers, prioritizing Local Storage then falling back to CSV.
 */
export async function loadTiers() {
    console.log("[TierManagement] Starting loadTiers...");
    const storedTiers = loadTiersFromLocalStorage();
    if (storedTiers && storedTiers.length > 0) {
        loadedTiers = storedTiers;
        console.log("[TierManagement] Tiers loaded from Local Storage:", loadedTiers);
    } else {
        console.log("[TierManagement] No tiers in Local Storage or empty, loading from CSV.");
        await loadTiersFromCSV(); // This updates loadedTiers internally
        // Optionally save the freshly loaded CSV tiers to LocalStorage immediately
        // saveTiersToLocalStorage();
    }
    // Render the tiers *after* they have been loaded into loadedTiers
    renderTiers(loadedTiers);
    // Setup listeners associated with the rendered tiers (like drag/drop on dropzones)
    // setupEventListeners(); // Re-evaluate if this is needed here or called from main
}

/**
 * Saves the current loadedTiers array to Local Storage.
 */
function saveTiersToLocalStorage() {
    try {
        localStorage.setItem(TIERS_STORAGE_KEY, JSON.stringify(loadedTiers));
        console.log("[TierManagement] Tiers saved to Local Storage.");
    } catch (error) {
        console.error("[TierManagement] Error saving tiers to Local Storage:", error);
    }
}

/**
 * Loads tiers from Local Storage.
 * @returns {Array<object>|null} Parsed tiers array or null if not found/error.
 */
function loadTiersFromLocalStorage() {
    try {
        const storedData = localStorage.getItem(TIERS_STORAGE_KEY);
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            // Basic validation: check if it's an array
            if (Array.isArray(parsedData)) {
                 // Optional: Add more validation per tier object if needed
                return parsedData;
            }
             console.warn("[TierManagement] Invalid tier data found in Local Storage, ignoring.");
        }
        return null;
    } catch (error) {
        console.error("[TierManagement] Error loading tiers from Local Storage:", error);
        return null;
    }
}

// Export a function to get the loaded tiers
export function getLoadedTiers() {
    return loadedTiers;
}
