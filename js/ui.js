/**
 * ui.js
 * Handles UI rendering and interactions
 */

import { settings } from './config.js';

// Render a single AI item
export function renderAIItem(item, container) {
    const aiElement = document.createElement('div');
    aiElement.className = 'ai-item';
    aiElement.setAttribute('draggable', 'true');
    aiElement.setAttribute('data-id', item.id);
    
    const img = document.createElement('img');
    img.src = item.icon || settings.defaultIconUrl;
    img.alt = `${item.name} Logo`;
    
    const name = document.createElement('span');
    name.textContent = item.name;
    
    aiElement.appendChild(img);
    aiElement.appendChild(name);
    container.appendChild(aiElement);
    
    return aiElement;
}

// Render all AI items in the pool
export function renderAIPool(items, container) {
    container.innerHTML = ''; // Clear existing items
    items.forEach(item => renderAIItem(item, container));
}

// Render a single tier row
export function renderTier(tier, container) {
    const tierRow = document.createElement('div');
    tierRow.className = 'tier-row';
    tierRow.setAttribute('data-tier', tier.id);
    
    // Create label container
    const labelContainer = document.createElement('div');
    labelContainer.className = 'tier-label-container';
    labelContainer.style.backgroundColor = tier.color;
    
    // Create tier label - show the name instead of the ID
    const tierLabel = document.createElement('span');
    tierLabel.className = 'tier-label';
    tierLabel.textContent = tier.name; // Use name instead of ID
    tierLabel.style.backgroundColor = tier.color;
    tierLabel.style.color = getContrastColor(tier.color);
    
    // Create tier name input (hidden by default)
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'tier-name-input';
    nameInput.value = tier.name;
    nameInput.style.display = 'none';
    nameInput.style.backgroundColor = tier.color;
    nameInput.style.color = getContrastColor(tier.color);
    
    // Create edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-tier-btn';
    editBtn.innerHTML = '&#x270f;&#xfe0f;';
    editBtn.addEventListener('click', function() {
        // Toggle display of name input and color picker
        const isEditing = nameInput.style.display === 'none';
        nameInput.style.display = isEditing ? 'block' : 'none';
        colorPicker.style.display = isEditing ? 'block' : 'none';
        tierLabel.style.display = isEditing ? 'none' : 'block';
        
        if (isEditing) {
            nameInput.focus();
        } else {
            // Apply changes
            tier.name = nameInput.value;
            tierLabel.textContent = tier.name; // Update the displayed name
            tier.color = colorPicker.value;
            labelContainer.style.backgroundColor = tier.color;
            tierLabel.style.backgroundColor = tier.color;
            tierLabel.style.color = getContrastColor(tier.color);
            nameInput.style.backgroundColor = tier.color;
            nameInput.style.color = getContrastColor(tier.color);
        }
    });
    
    // Create color picker (hidden by default)
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.className = 'tier-color-picker';
    colorPicker.value = tier.color;
    colorPicker.style.display = 'none';
    
    // Create dropzone for AI items
    const dropzone = document.createElement('div');
    dropzone.className = 'tier-dropzone';
    
    // Assemble the tier row
    labelContainer.appendChild(tierLabel);
    labelContainer.appendChild(nameInput);
    labelContainer.appendChild(editBtn);
    labelContainer.appendChild(colorPicker);
    
    tierRow.appendChild(labelContainer);
    tierRow.appendChild(dropzone);
    
    container.appendChild(tierRow);
    
    return tierRow;
}

// Render all tiers
export function renderTiers(tiers, container) {
    container.innerHTML = ''; // Clear existing tiers
    tiers.forEach(tier => renderTier(tier, container));
}

// Show modal dialog
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Hide modal dialog
export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Setup modal close buttons
export function setupModals() {
    const closeButtons = document.querySelectorAll('.close-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modal when clicking outside of modal content
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(event) {
            if (event.target === this) {
                this.style.display = 'none';
            }
        });
    });
}

// Setup Add Custom AI functionality
export function setupAddCustomAI(callback) {
    const addBtn = document.getElementById('add-custom-ai-btn');
    const confirmBtn = document.getElementById('confirm-add-ai-btn');
    
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            showModal('add-ai-modal');
        });
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            const nameInput = document.getElementById('custom-ai-name');
            const iconInput = document.getElementById('custom-ai-icon');
            
            if (nameInput && nameInput.value.trim() !== '') {
                const newAI = {
                    id: 'custom-' + Date.now(),
                    name: nameInput.value.trim(),
                    icon: iconInput && iconInput.value.trim() !== '' 
                        ? iconInput.value.trim() 
                        : settings.defaultIconUrl
                };
                
                if (callback && typeof callback === 'function') {
                    callback(newAI);
                }
                
                // Clear inputs
                nameInput.value = '';
                if (iconInput) iconInput.value = '';
                
                // Hide modal
                hideModal('add-ai-modal');
            }
        });
    }
}

// Setup tier control buttons (add/remove tier)
export function setupTierControls(addCallback, removeCallback) {
    const addTierBtn = document.getElementById('add-tier-btn');
    const removeTierBtn = document.getElementById('remove-tier-btn');
    
    if (addTierBtn && typeof addCallback === 'function') {
        addTierBtn.addEventListener('click', addCallback);
    }
    
    if (removeTierBtn && typeof removeCallback === 'function') {
        removeTierBtn.addEventListener('click', removeCallback);
    }
}

// Setup action buttons (save, share, export, reset)
export function setupActionButtons({
    saveCallback,
    shareCallback,
    exportCallback,
    resetCallback
}) {
    const saveBtn = document.getElementById('save-chart-btn');
    const shareBtn = document.getElementById('share-chart-btn');
    const exportBtn = document.getElementById('export-image-btn');
    const resetBtn = document.getElementById('reset-chart-btn');
    
    if (saveBtn && typeof saveCallback === 'function') {
        saveBtn.addEventListener('click', saveCallback);
    }
    
    if (shareBtn && typeof shareCallback === 'function') {
        shareBtn.addEventListener('click', shareCallback);
    }
    
    if (exportBtn && typeof exportCallback === 'function') {
        exportBtn.addEventListener('click', exportCallback);
    }
    
    if (resetBtn && typeof resetCallback === 'function') {
        resetBtn.addEventListener('click', resetCallback);
    }
}

// Helper function to determine text color (black or white) based on background color
function getContrastColor(hexColor) {
    if (!hexColor) return '#ffffff'; // Default to white if color is invalid

    // Remove # if present
    hexColor = hexColor.replace('#', '');

    // Convert hex to RGB
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);

    // Calculate perceived brightness (YIQ formula)
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

    // Return black for light backgrounds, white for dark backgrounds
    return (yiq >= 128) ? '#000000' : '#ffffff';
}
