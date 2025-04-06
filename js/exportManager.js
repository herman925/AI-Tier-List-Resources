/**
 * exportManager.js
 * Handles exporting the current tier list item placements to a CSV file.
 */

// Function to gather current item placements and trigger CSV download
export function exportPlacementsToCSV() {
    console.log("[ExportManager] Starting CSV export...");
    const placements = [];
    const header = "item_id,tier_id"; // CSV header

    // Get items from tier rows
    document.querySelectorAll('.tier-row .tier-items .ai-item').forEach(item => {
        const itemId = item.dataset.id;
        const tierId = item.closest('.tier-items')?.dataset.tierId;
        if (itemId && tierId) {
            placements.push(`${itemId},${tierId}`);
        } else {
            console.warn(`[ExportManager] Skipping item in tier row due to missing ID. Item:`, item);
        }
    });

    // Get items from the unranked pool
    document.querySelectorAll('#unranked-items .ai-item').forEach(item => {
        const itemId = item.dataset.id;
        if (itemId) {
            placements.push(`${itemId},UNRANKED`); // Use "UNRANKED" or similar for pool items
        } else {
            console.warn(`[ExportManager] Skipping item in unranked pool due to missing ID. Item:`, item);
        }
    });

    if (placements.length === 0) {
        console.warn("[ExportManager] No items found to export.");
        // Optionally show a message to the user
        alert(getCurrentLanguageTranslations()?.['alertNoItemsToExport'] || "No items found to export.");
        return;
    }

    const csvContent = header + "\n" + placements.join("\n");
    console.log("[ExportManager] CSV content generated:", csvContent);

    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tier_placements.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up

    console.log("[ExportManager] CSV export initiated.");
}

// Helper function (assuming languageManager.js provides this)
// You might need to adjust this based on how languageManager exposes translations
function getCurrentLanguageTranslations() {
    // This is a placeholder - replace with actual call to get translations
    // from languageManager if needed for alerts.
    return window.currentTranslations || {};
}

// Note: An event listener needs to be added in main.js
// to call exportPlacementsToCSV() when the export button is clicked.
