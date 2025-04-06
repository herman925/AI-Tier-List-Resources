/**
 * aiToolManagement.js
 * Handles AI tool management functionality including editing and saving to CSV
 */

import { settings } from './config.js';

// Setup click handlers using event delegation
export function setupAIItemClickHandlers() {
    const aiPoolContainer = document.getElementById('ai-items');
    const tiersContainer = document.getElementById('tiers-container');

    const handleClick = (event) => {
        const aiItem = event.target.closest('.ai-item');
        if (aiItem && !aiItem.classList.contains('dragging')) {
            const aiId = aiItem.getAttribute('data-id');
            if (aiId) {
                showEditAIModal(aiId);
                // event.stopPropagation(); // No longer needed with delegation on specific parents
            }
        }
    };

    if (aiPoolContainer) {
        // Remove previous listener if any (optional, for safety)
        aiPoolContainer.removeEventListener('click', handleClick);
        // Add new listener
        aiPoolContainer.addEventListener('click', handleClick);
    }

    if (tiersContainer) {
        // Remove previous listener if any (optional, for safety)
        tiersContainer.removeEventListener('click', handleClick);
        // Add new listener
        tiersContainer.addEventListener('click', handleClick);
    }
}

// Show the edit AI modal for a specific AI tool
export async function showEditAIModal(aiId) {
    try {
        // Get the AI item data
        const aiData = await getAIItemById(aiId);
        if (!aiData) {
            console.error(`AI item with ID ${aiId} not found`);
            return;
        }
        
        // Populate the modal fields
        const modal = document.getElementById('edit-ai-modal');
        const idInput = document.getElementById('edit-ai-id');
        const nameInput = document.getElementById('edit-ai-name');
        const iconInput = document.getElementById('edit-ai-icon');
        const descInput = document.getElementById('edit-ai-description');
        
        if (modal && idInput && nameInput && iconInput && descInput) {
            idInput.value = aiData.id;
            nameInput.value = aiData.name;
            iconInput.value = aiData.icon || '';
            descInput.value = aiData.description || '';
            
            // Show the modal
            modal.style.display = 'flex';
            
            // Focus on the name input
            nameInput.focus();
        }
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
    try {
        const response = await fetch(settings.csvPath);
        if (!response.ok) {
            throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error('Error loading AI items from CSV:', error);
        return [];
    }
}

// Parse CSV text into array of objects
function parseCSV(csvText) {
    // Handle UTF-8 BOM if present
    const text = csvText.charCodeAt(0) === 0xFEFF ? csvText.slice(1) : csvText;
    
    // Split into lines
    const lines = text.split('\n');
    if (lines.length < 2) return []; // Need at least header + one data row
    
    // Get headers
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Parse data rows
    const items = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const values = line.split(',');
        if (values.length !== headers.length) {
            console.warn(`Skipping line ${i+1}: column count mismatch`);
            continue;
        }
        
        const item = {};
        headers.forEach((header, index) => {
            item[header] = values[index].trim();
        });
        
        items.push(item);
    }
    
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
export function setupEditAIModalHandlers(updateUICallback) {
    const confirmBtn = document.getElementById('confirm-edit-ai-btn');
    const cancelBtn = document.getElementById('cancel-edit-ai-btn');
    const modal = document.getElementById('edit-ai-modal');
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async function() {
            const aiId = document.getElementById('edit-ai-id').value;
            const name = document.getElementById('edit-ai-name').value;
            const icon = document.getElementById('edit-ai-icon').value;
            const description = document.getElementById('edit-ai-description').value;
            
            if (name.trim() === '') {
                alert('名稱不能為空！');
                return;
            }
            
            const success = await saveAIItemChanges(aiId, { name, icon, description }, updateUICallback);
            
            if (success) {
                // Hide the modal
                if (modal) modal.style.display = 'none';
            }
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            // Hide the modal
            if (modal) modal.style.display = 'none';
        });
    }
    
    // Close button
    const closeBtn = modal ? modal.querySelector('.close-btn') : null;
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Close when clicking outside the modal content
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}
