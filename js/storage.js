/**
 * storage.js
 * Handles saving and loading data from localStorage
 */

import { settings } from './config.js';

// Save the current state to localStorage
export function saveState(state) {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem(settings.storageKey, serializedState);
        return true;
    } catch (error) {
        console.error('Error saving state:', error);
        return false;
    }
}

// Load the state from localStorage
export function loadState() {
    try {
        const serializedState = localStorage.getItem(settings.storageKey);
        if (serializedState === null) {
            return null; // No saved state found
        }
        return JSON.parse(serializedState);
    } catch (error) {
        console.error('Error loading state:', error);
        return null;
    }
}

// Clear the saved state from localStorage
export function clearState() {
    try {
        localStorage.removeItem(settings.storageKey);
        return true;
    } catch (error) {
        console.error('Error clearing state:', error);
        return false;
    }
}

// Export the current tier list as an image
export async function exportAsImage() {
    try {
        // We'll use html2canvas library for this
        // First check if the library is loaded
        if (typeof html2canvas === 'undefined') {
            // Load the library dynamically
            await loadHtml2Canvas();
        }
        
        // Capture the tier list
        const tierList = document.getElementById('star-tier-division');
        const canvas = await html2canvas(tierList, {
            backgroundColor: getComputedStyle(document.body).backgroundColor,
            scale: 2, // Higher quality
        });
        
        // Convert to image and trigger download
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `${settings.appName}-${new Date().toISOString().slice(0, 10)}.png`;
        link.click();
        
        return true;
    } catch (error) {
        console.error('Error exporting as image:', error);
        return false;
    }
}

// Load html2canvas library dynamically
async function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Generate a shareable link (basic implementation)
export function generateShareableLink(state) {
    try {
        // For a basic implementation, we'll encode the state in the URL
        // This has limitations on size and isn't secure
        // For a production app, you'd want a server-side solution
        
        const compressedState = compressState(state);
        const base64State = btoa(compressedState);
        
        // Create URL with state as a parameter
        const url = new URL(window.location.href);
        url.searchParams.set('share', base64State);
        
        return url.toString();
    } catch (error) {
        console.error('Error generating shareable link:', error);
        return null;
    }
}

// Load state from a shareable link
export function loadFromShareableLink() {
    try {
        const url = new URL(window.location.href);
        const base64State = url.searchParams.get('share');
        
        if (!base64State) {
            return null;
        }
        
        const compressedState = atob(base64State);
        const state = decompressState(compressedState);
        
        return state;
    } catch (error) {
        console.error('Error loading from shareable link:', error);
        return null;
    }
}

// Helper function to compress state (simplified version)
function compressState(state) {
    // For a real app, you might want to use a proper compression library
    // This is a simple implementation that just removes unnecessary data
    
    // Create a minimal version of the state
    const minimalState = {
        tiers: state.tiers.map(tier => ({
            id: tier.id,
            name: tier.name,
            color: tier.color,
            items: tier.items || []
        })),
        customAIItems: state.customAIItems || []
    };
    
    return JSON.stringify(minimalState);
}

// Helper function to decompress state
function decompressState(compressedState) {
    return JSON.parse(compressedState);
}
