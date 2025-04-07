/**
 * addAIToolModal.js
 * Handles the functionality for the Add Custom AI modal.
 */

import { settings } from './config.js';
import { getCurrentTranslations, updateStaticText, loadLanguage, getNestedTranslation } from './languageManager.js';
import { getAllFeatures } from './featureManagement.js';
import { addAIItem } from './aiToolManagement.js'; // Import the function to actually add the item

// --- Helper Functions (Copied/Adapted from aiToolManagement) --- //

function buildReleaseDate(month, year) {
    if (year && month) {
        return `${year}-${month}`;
    } else if (year) {
        return year;
    } else if (month) {
        return `0000-${month}`;
    }
    return '';
}

function collectFeaturesFromDOM(featureContainer) {
    const features = {};
    if (!featureContainer) return features;
    const rows = featureContainer.querySelectorAll('.feature-row');
    rows.forEach(row => {
        const featureId = row.dataset.featureId;
        const slider = row.querySelector('input[type="range"]');
        if (featureId && slider) {
            features[featureId] = parseInt(slider.value, 10);
        }
    });
    return features;
}

function updatePreview(text, previewElementId) {
    const preview = document.getElementById(previewElementId);
    if (!preview) {
        console.error(`[updatePreview] Preview element #${previewElementId} not found.`);
        return;
    }
    if (typeof marked !== 'undefined') {
        preview.innerHTML = marked.parse(text || "");
    } else {
        preview.innerHTML = '<p><em>Markdown preview unavailable.</em></p>';
    }
}

function findFeatureInsertIndex(container, newFeatureId, allFeatures) {
    const existingRows = Array.from(container.querySelectorAll('.feature-row'));
    const newFeatureOrder = allFeatures.findIndex(f => f.id === newFeatureId);
    let insertBeforeElement = null;
    for (const row of existingRows) {
        const existingFeatureId = row.dataset.featureId;
        const existingFeatureOrder = allFeatures.findIndex(f => f.id === existingFeatureId);
        if (existingFeatureOrder > newFeatureOrder) {
            insertBeforeElement = row;
            break;
        }
    }
    return insertBeforeElement;
}

function createFeatureRowElement(featureId, initialScore, featureDef, isEditMode, currentLang, toolId = null) {
    const featureName = currentLang === 'en' ? featureDef.name_en : featureDef.name_zh;
    const row = document.createElement('div');
    row.className = `feature-row ${isEditMode ? '' : 'read-only'}`.trim();
    row.dataset.featureId = featureId;

    if (isEditMode) {
        const sliderId = `feature-slider-${featureId}-${toolId || 'add'}`;
        const displayId = `feature-score-${featureId}-${toolId || 'add'}`;
        row.innerHTML = `
            <div class="feature-controls">
                <button type="button" class="remove-feature-btn" aria-label="Remove ${featureName}" data-feature-id="${featureId}">-</button>
                <label for="${sliderId}">${featureName}</label>
            </div>
            <div class="feature-slider-container">
                <input type="range" id="${sliderId}" name="${featureId}" min="0" max="100" value="${initialScore}" class="feature-slider">
                <span id="${displayId}" class="feature-score-display">${initialScore}</span>
            </div>
        `;
        const slider = row.querySelector(`#${sliderId}`);
        const display = row.querySelector(`#${displayId}`);
        if (slider && display) {
            slider.addEventListener('input', () => display.textContent = slider.value);
        }
    } else {
         return null; // Add modal doesn't have read-only mode
    }
    return row;
}

function handleAddFeatureForAddModal(e, targetContainerId, toolId = 'add') {
     const targetContainer = document.getElementById(targetContainerId);
    if (!targetContainer) {
        console.error(`[handleAddFeatureForAddModal] Target container #${targetContainerId} not found.`);
        return;
    }

    const featureSelectModal = document.getElementById('featureSelectionModal');
    const availableFeaturesList = document.getElementById('availableFeaturesList');
    const confirmBtn = document.getElementById('confirmFeatureSelection');
    const cancelBtn = document.getElementById('cancelFeatureSelection');
    const closeBtn = document.getElementById('closeFeatureSelectModal');

    if (!featureSelectModal || !availableFeaturesList || !confirmBtn || !cancelBtn || !closeBtn) {
        console.error('[handleAddFeatureForAddModal] Feature selection modal elements not found.');
        return;
    }

    const allFeatures = getAllFeatures();
    let currentLang = document.getElementById('add-ai-modal').querySelector('.modal-content')?.dataset.language || 'zh';
    
    const existingFeatureRows = targetContainer.querySelectorAll('.feature-row');
    const existingFeatureIds = new Set(Array.from(existingFeatureRows).map(row => row.dataset.featureId));
    const availableFeatures = allFeatures.filter(f => !existingFeatureIds.has(f.id));

    if (availableFeatures.length === 0) {
        alert('All available features have been added.'); 
        return;
    }

    availableFeaturesList.innerHTML = '';
    availableFeatures.forEach(feature => {
        const featureName = currentLang === 'en' ? feature.name_en : feature.name_zh;
        const checkboxId = `select-feature-${feature.id}`;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'feature-select-item';
        itemDiv.innerHTML = `
            <input type="checkbox" id="${checkboxId}" data-feature-id="${feature.id}">
            <label for="${checkboxId}">${featureName}</label>
        `;
        availableFeaturesList.appendChild(itemDiv);
    });

    confirmBtn.dataset.targetContainerId = targetContainerId;
    confirmBtn.dataset.toolId = toolId;
    confirmBtn.dataset.currentLang = currentLang;

    confirmBtn.replaceWith(confirmBtn.cloneNode(true)); 
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    closeBtn.replaceWith(closeBtn.cloneNode(true));

    const newConfirmBtn = document.getElementById('confirmFeatureSelection');
    const newCancelBtn = document.getElementById('cancelFeatureSelection');
    const newCloseBtn = document.getElementById('closeFeatureSelectModal');

    newConfirmBtn.addEventListener('click', handleConfirmFeatureSelectionForAddModal);
    newCancelBtn.addEventListener('click', () => featureSelectModal.style.display = 'none');
    newCloseBtn.addEventListener('click', () => featureSelectModal.style.display = 'none');

    featureSelectModal.style.display = 'flex';
}

function handleConfirmFeatureSelectionForAddModal(e) {
    const confirmBtn = e.target;
    const targetContainerId = confirmBtn.dataset.targetContainerId;
    const toolId = confirmBtn.dataset.toolId;
    const currentLang = confirmBtn.dataset.currentLang;

    const targetContainer = document.getElementById(targetContainerId);
    const featureSelectModal = document.getElementById('featureSelectionModal');
    const availableFeaturesList = document.getElementById('availableFeaturesList');

    if (!targetContainer || !featureSelectModal || !availableFeaturesList) return;

    const selectedCheckboxes = availableFeaturesList.querySelectorAll('input[type="checkbox"]:checked');
    const allFeatures = getAllFeatures();
    const allFeaturesMap = new Map(allFeatures.map(f => [f.id, f]));

    selectedCheckboxes.forEach(checkbox => {
        const featureId = checkbox.dataset.featureId;
        const featureDef = allFeaturesMap.get(featureId);
        if (featureDef) {
            if (!targetContainer.querySelector(`.feature-row[data-feature-id="${featureId}"]`)) {
                const newRow = createFeatureRowElement(featureId, 0, featureDef, true, currentLang, toolId);
                if (newRow) {
                    const featureRowsContainer = targetContainer.querySelector('.feature-rows-container') || targetContainer;
                    const insertBeforeElement = findFeatureInsertIndex(featureRowsContainer, featureId, allFeatures);
                    featureRowsContainer.insertBefore(newRow, insertBeforeElement);
                }
            }
        }
    });
    featureSelectModal.style.display = 'none';
}

// --- Main Setup Function for Add Modal --- //
export function setupAddAIToolModal(addCallback) {
    console.log("[setupAddAIToolModal] Setting up listeners...");
    const modal = document.getElementById('add-ai-modal');
    if (!modal) { console.error("[setupAddAIToolModal] Add AI Modal not found!"); return; }

    const modalContent = modal.querySelector('.modal-content');
    const form = document.getElementById('addAIForm');
    const closeButton = document.getElementById('closeAddAIModal');
    const cancelButton = document.getElementById('cancelAddAI'); // Assuming this is the cancel button ID
    
    // Language Switches
    const langSwitchEN = document.getElementById('addAILangSwitchEN');
    const langSwitchZH = document.getElementById('addAILangSwitchZH');
    
    // Input Fields
    const iconInput = document.getElementById('addItemIcon');
    const nameENInput = document.getElementById('addItemNameEN');
    const nameZHInput = document.getElementById('addItemNameZH');
    const releaseMonthInput = document.getElementById('addItemReleaseMonth');
    const releaseYearInput = document.getElementById('addItemReleaseYear');
    const toolWebsiteInput = document.getElementById('addItemToolWebsite');
    const descENTextarea = document.getElementById('addItemDescriptionEN');
    const descZHTextarea = document.getElementById('addItemDescriptionZH');
    const featuresContainer = document.getElementById('addFeaturesSection');
    const markdownPreview = document.getElementById('addMarkdownPreview');

    // Language-Specific Containers
    const nameENContainer = document.getElementById('addNameENContainer');
    const nameZHContainer = document.getElementById('addNameZHContainer');
    const descENContainer = document.getElementById('addDescENContainer');
    const descZHContainer = document.getElementById('addDescZHContainer');

    // Check elements
    const requiredElements = { 
        modal, modalContent, form, closeButton, cancelButton,
        langSwitchEN, langSwitchZH,
        iconInput, nameENInput, nameZHInput, releaseMonthInput, releaseYearInput,
        toolWebsiteInput, descENTextarea, descZHTextarea, featuresContainer, markdownPreview,
        nameENContainer, nameZHContainer, descENContainer, descZHContainer
    };
    let allFound = true;
    for (const key in requiredElements) {
        if (!requiredElements[key]) {
            console.error(`[setupAddAIToolModal] Element not found: ${key}`);
            allFound = false;
        }
    }
    if (!allFound) return;
    console.log("[setupAddAIToolModal] All required elements found.");

    // Function to reset the form
    const resetForm = () => {
        form.reset();
        featuresContainer.innerHTML = '<div class="feature-rows-container"></div>'; // Reset features
        updatePreview('', 'addMarkdownPreview'); // Clear preview
        // Set default language (e.g., 'zh')
        switchLanguage('zh', true); // Pass true to suppress console logs if desired
    };

    // --- Language Switching --- 
    const switchLanguage = async (targetLangCode, silent = false) => {
        if (!silent) console.log(`[Add AI Modal switchLanguage] Switching to ${targetLangCode}`);
        const isEN = targetLangCode === 'en';
        modalContent.dataset.language = targetLangCode;
        langSwitchEN.classList.toggle('active', isEN);
        langSwitchZH.classList.toggle('active', !isEN);
        nameENContainer.style.display = isEN ? 'block' : 'none';
        nameZHContainer.style.display = isEN ? 'none' : 'block';
        descENContainer.style.display = isEN ? 'block' : 'none';
        descZHContainer.style.display = isEN ? 'none' : 'block';
        
        // Re-render feature labels
        const currentLang = targetLangCode;
        const featureRowsContainer = featuresContainer.querySelector('.feature-rows-container');
        if (featureRowsContainer) {
            const allFeatures = getAllFeatures();
            featureRowsContainer.querySelectorAll('.feature-row').forEach(row => {
                const featureId = row.dataset.featureId;
                const featureDef = allFeatures.find(f => f.id === featureId);
                if(featureDef) {
                    const label = row.querySelector('label');
                    if(label) label.textContent = currentLang === 'en' ? featureDef.name_en : featureDef.name_zh;
                    const removeBtn = row.querySelector('.remove-feature-btn');
                    if(removeBtn) removeBtn.setAttribute('aria-label', `Remove ${currentLang === 'en' ? featureDef.name_en : featureDef.name_zh}`);
                }
            });
        }
        
        // Update Markdown Preview
        const previewText = isEN ? descENTextarea.value : descZHTextarea.value;
        updatePreview(previewText || '', 'addMarkdownPreview');

        // Update static text & Add Feature button
        await loadLanguage(targetLangCode);
        const currentLangData = getCurrentTranslations();
        if (currentLangData) {
            if (!silent) console.log(`[Add AI Modal switchLanguage] Re-applying static text for language: ${targetLangCode}`);
            updateStaticText(currentLangData, modal);
            const addFeatureBtnElement = modal.querySelector('.features-header .add-feature-btn');
            if (addFeatureBtnElement) {
                addFeatureBtnElement.textContent = getNestedTranslation(currentLangData, 'modal.addAI.addFeatureButton') || '+ Add Feature'; // Assuming addAI key exists
            }
        }
    };

    langSwitchEN.addEventListener('click', () => switchLanguage('en'));
    langSwitchZH.addEventListener('click', () => switchLanguage('zh'));

    // --- Add Feature Button --- 
    const featuresHeader = modal.querySelector('.features-header');
    if (featuresHeader) {
        const addFeatureButton = document.createElement('button');
        addFeatureButton.type = 'button';
        addFeatureButton.textContent = '+ Add Feature'; // Set initial text, will be translated
        addFeatureButton.className = 'add-feature-btn btn-secondary btn-small'; 
        addFeatureButton.addEventListener('click', (e) => handleAddFeatureForAddModal(e, 'addFeaturesSection'));
        if (!featuresHeader.querySelector('.add-feature-btn')) {
            featuresHeader.appendChild(addFeatureButton);
        }
        // Create container for rows
        const featureRowsContainer = document.createElement('div');
        featureRowsContainer.className = 'feature-rows-container';
        featuresContainer.appendChild(featureRowsContainer);

    } else {
        console.error('[setupAddAIToolModal] Features header not found, cannot add "Add Feature" button.');
    }

    // --- Real-time Markdown Preview --- 
    descENTextarea.addEventListener('input', () => {
        if (modalContent.dataset.language === 'en') {
            updatePreview(descENTextarea.value, 'addMarkdownPreview');
        }
    });
    descZHTextarea.addEventListener('input', () => {
        if (modalContent.dataset.language === 'zh') {
            updatePreview(descZHTextarea.value, 'addMarkdownPreview');
        }
    });

    // --- Form Submission --- 
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log("[Add AI Modal] Form submitted.");
        
        const newAI = {
            // ID will be generated by addAIItem
            name_en: nameENInput.value.trim(),
            name_zh: nameZHInput.value.trim(),
            icon: iconInput.value.trim(),
            releaseDate: buildReleaseDate(releaseMonthInput.value, releaseYearInput.value),
            toolWebsite: toolWebsiteInput.value.trim(),
            description_en: descENTextarea.value.trim(),
            description_zh: descZHTextarea.value.trim(),
            features: collectFeaturesFromDOM(featuresContainer)
        };

        // Basic validation (e.g., at least one name required)
        if (!newAI.name_en && !newAI.name_zh) {
            alert('Please enter a name in at least one language.');
            return;
        }

        console.log("[Add AI Modal] Collected data:", newAI);
        
        const addedItemResult = await addAIItem(newAI); // Use imported function, capture result

        if (addedItemResult) { // Check if we got the new item object back (not false)
            console.log("[Add AI Modal] Item added successfully:", addedItemResult);
            if (addCallback) {
                 addCallback(addedItemResult); // Pass the full result to the callback
            }
            modal.style.display = 'none'; // Close modal
            resetForm(); // Reset form for next time
        } else {
            console.error("[Add AI Modal] Failed to add AI item (addAIItem returned false).");
            alert('Error adding AI item. Please check console.');
        }
    });

    // --- Feature Row Remove Button Listener --- 
    featuresContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-feature-btn')) {
            const featureRow = event.target.closest('.feature-row');
            if (featureRow) featureRow.remove();
        }
    });

    // --- Cancel/Close Buttons --- 
    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
        resetForm();
    });
    cancelButton.addEventListener('click', () => {
        modal.style.display = 'none';
        resetForm();
    });
    
    console.log("[setupAddAIToolModal] Setup complete.");
} 