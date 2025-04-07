/**
 * featureManagement.js
 * Handles loading and accessing feature definitions.
 */

import { settings } from './config.js';

let loadedFeatures = [];

/**
 * Loads feature definitions from the JSON file.
 * @returns {Promise<Array<Object>>} A promise that resolves with the array of feature objects.
 */
export async function loadFeatures() {
    if (loadedFeatures.length > 0) {
        return loadedFeatures; // Return cached if already loaded
    }

    const featuresPath = settings.featuresPath || 'data/features.json'; // Use config or default
    console.log(`[featureManagement] Fetching features from: ${featuresPath}`);

    try {
        const response = await fetch(featuresPath);
        if (!response.ok) {
            throw new Error(`Failed to load features: ${response.status} ${response.statusText}`);
        }
        const features = await response.json();
        loadedFeatures = features;
        console.log(`[featureManagement] Features loaded successfully (${features.length} features).`);
        return loadedFeatures;
    } catch (error) {
        console.error('[featureManagement] Error loading features:', error);
        loadedFeatures = []; // Ensure it's empty on error
        return []; // Return empty array on error
    }
}

/**
 * Returns the currently loaded feature definitions.
 * @returns {Array<Object>} The array of feature objects.
 */
export function getAllFeatures() {
    if (loadedFeatures.length === 0) {
        console.warn('[featureManagement] getAllFeatures called before features were loaded or load failed. Returning empty array.');
    }
    return loadedFeatures;
} 