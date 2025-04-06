/**
 * exportManager.js
 * Handles exporting the current application state (AI tools, Tiers)
 * as JSON for AI tools and CSV for tiers.
 */

// Import necessary functions from other modules
import { getAllAIItems } from './aiToolManagement.js'; // Function to get current AI item data
import { getLoadedTiers } from './tierManagement.js';   // Function to get current tier definitions
import { getCurrentLanguageTranslations } from './languageManager.js';

// Helper function to safely format CSV fields (handles commas, quotes, newlines)
function formatCsvField(field) {
    if (field === null || field === undefined) {
        return '';
    }
    const stringField = String(field);
    // If the field contains a comma, double quote, or newline, enclose in double quotes
    if (stringField.includes(",") || stringField.includes("\"") || stringField.includes("\n")) {
        // Escape existing double quotes by doubling them
        const escapedField = stringField.replace(/"/g, '""');
        return `"${escapedField}"`;
    }
    return stringField;
}

// Helper function to trigger the download of a file
function triggerDownload(filename, content, type = 'text/csv') {
    console.log(`[ExportManager] Triggering download for ${filename}...`);
    const bom = type === 'text/csv' ? "\uFEFF" : ""; // Add BOM for CSV files (Excel compatibility)
    const blob = new Blob([bom + content], { type: `${type};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up
    console.log(`[ExportManager] Download initiated for ${filename}.`);
}

// Main export function - generates and triggers downloads for ai_tools.json and tiers.csv
export async function exportStateToCSV() { // Function name kept for backward compatibility
    console.log("[ExportManager] Starting state export...");

    try {
        // --- 1. Generate tiers.csv (Unchanged) --- 
        const currentTiers = getLoadedTiers(); // Assumes this returns the array of tier objects (without items inside)
        const tiersHeader = "tier_id,tier_name_zh,tier_name_en,tier_color";
        const tiersRows = currentTiers.map(tier => [
            formatCsvField(tier.id),
            formatCsvField(tier.name_zh),
            formatCsvField(tier.name_en),
            formatCsvField(tier.color)
        ].join(','));
        const tiersCsvContent = tiersHeader + "\n" + tiersRows.join("\n");
        triggerDownload("tiers.csv", tiersCsvContent, 'text/csv');

        // --- 2. Generate ai_tools.json with current placements --- 
        const allAIItemsData = await getAllAIItems(); // Get base data
        const currentItemStates = new Map(); // Map to store current tier_id per item

        // Get current placements from DOM
        // From Tiers
        document.querySelectorAll('.tier-row .tier-dropzone .ai-item').forEach(itemElement => {
            const itemId = itemElement.dataset.id;
            // Find the parent tier row and get its data-tier attribute
            const tierRow = itemElement.closest('.tier-row');
            const tierId = tierRow ? tierRow.dataset.tier : null; // Get tier ID from .tier-row
            if (itemId && tierId) {
                currentItemStates.set(itemId, tierId);
            } else {
                console.warn(`[ExportManager] Could not determine tier for item in tier list. Item ID: ${itemId}, Tier Row:`, tierRow);
            }
        });

        // From Unranked Pool
        document.querySelectorAll('#ai-items .ai-item').forEach(itemElement => {
            const itemId = itemElement.dataset.id;
            if (itemId) {
                currentItemStates.set(itemId, ''); // Represent unranked with empty string
            } else {
                console.warn(`[ExportManager] Skipping unranked item due to missing ID. Item:`, itemElement);
            }
        });

        // Combine base data with current placements
        const updatedAIItems = allAIItemsData.map(item => {
            const currentTierId = currentItemStates.has(item.id) ? currentItemStates.get(item.id) : ''; // Default to unranked if not found in DOM
            return {
                ...item,
                tier_id: currentTierId // Use the current tier ID from DOM
            };
        });

        // Format as pretty JSON with 2-space indentation
        const jsonContent = JSON.stringify(updatedAIItems, null, 2);
        triggerDownload("ai_tools.json", jsonContent, 'application/json');

        console.log("[ExportManager] AI Tools (JSON) and Tiers (CSV) exports initiated.");

    } catch (error) {
        console.error("[ExportManager] Error during export:", error);
        // Optionally show a user-friendly error message
        const errorMsg = getCurrentLanguageTranslations()?.alertExportError || "An error occurred during export.";
        alert(errorMsg);
    }
}
