/**
 * tierManagement.js
 * Handles all tier-related functionality
 */

import { settings } from './config.js';

// Add a new tier
export function addTier(state, updateUI) {
    // Check if we've reached the maximum number of tiers
    if (state.tiers.length >= settings.maxTiers) {
        alert(`You can't add more than ${settings.maxTiers} tiers.`);
        return false;
    }
    
    // Generate a new tier ID (next letter in alphabet)
    const lastTier = state.tiers[state.tiers.length - 1];
    const nextId = String.fromCharCode(lastTier.id.charCodeAt(0) + 1);
    
    // Create new tier
    const newTier = {
        id: nextId,
        name: `Tier ${nextId}`,
        color: getRandomColor(),
        items: []
    };
    
    // Add to state
    state.tiers.push(newTier);
    
    // Update UI if callback provided
    if (updateUI && typeof updateUI === 'function') {
        updateUI();
    }
    
    return true;
}

// Remove the last tier
export function removeTier(state, updateUI) {
    // Check if we've reached the minimum number of tiers
    if (state.tiers.length <= settings.minTiers) {
        alert(`You must have at least ${settings.minTiers} tiers.`);
        return false;
    }
    
    // Get the last tier
    const lastTier = state.tiers[state.tiers.length - 1];
    
    // Remove from state
    state.tiers.pop();
    
    // Update UI if callback provided
    if (updateUI && typeof updateUI === 'function') {
        updateUI();
    }
    
    return true;
}

// Edit tier name and color
export function editTier(state, tierId, newName, newColor, updateUI) {
    const tier = state.tiers.find(t => t.id === tierId);
    if (!tier) return false;
    
    if (newName) tier.name = newName;
    if (newColor) tier.color = newColor;
    
    // Update UI if callback provided
    if (updateUI && typeof updateUI === 'function') {
        updateUI();
    }
    
    return true;
}

// Move an AI item to a specific tier
export function moveItemToTier(state, itemId, tierId, updateUI) {
    // First remove the item from any tier it might be in
    state.tiers.forEach(tier => {
        tier.items = tier.items.filter(id => id !== itemId);
    });
    
    // Add to the specified tier
    if (tierId) {
        const targetTier = state.tiers.find(tier => tier.id === tierId);
        if (targetTier) {
            if (!targetTier.items) targetTier.items = [];
            targetTier.items.push(itemId);
        } else {
            return false; // Target tier not found
        }
    }
    
    // Update UI if callback provided
    if (updateUI && typeof updateUI === 'function') {
        updateUI();
    }
    
    return true;
}

// Helper function to generate a random color
export function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
