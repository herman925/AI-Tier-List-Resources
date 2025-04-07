/**
 * ui.js
 * Handles UI rendering and interactions
 */

import { settings } from './config.js';
import { getCurrentTranslations, updateStaticText, loadLanguage, setLanguage } from './languageManager.js'; 
import { addAIItem } from './aiToolManagement.js'; // Import the addAIItem function
import { initDragAndDrop } from './dragDrop.js'; // Import initDragAndDrop instead
// Import feature functions
import { getAllFeatures } from './featureManagement.js';
// NEW: Import the setup function for the Add AI modal
import { setupAddAIToolModal } from './addAIToolModal.js';

// Render a single AI item
export function renderAIItem(item, container) {
    const aiElement = document.createElement('div');
    aiElement.className = 'ai-item';
    aiElement.setAttribute('draggable', 'true');
    
    // --- Debug log before setting data-id --- 
    console.log('[renderAIItem] Setting data-id for item:', item, 'item.id:', item.id);
    aiElement.setAttribute('data-id', item.id);
    
    // Get current language
    const currentLang = document.documentElement.lang || 'zh'; // Default to Chinese
    
    const img = document.createElement('img');
    img.src = item.icon || settings.defaultIconUrl;
    
    // Use language-specific name for alt text
    const altText = currentLang === 'en' ? 
        (item.name_en || item.name || 'AI Tool') : 
        (item.name_zh || item.name || 'AI 工具');
    img.alt = `${altText} Logo`;
    
    const name = document.createElement('span');
    // Use language-specific name for display text
    name.textContent = currentLang === 'en' ? 
        (item.name_en || item.name || item.id) : 
        (item.name_zh || item.name || item.id);
    
    // Store both language versions as data attributes for easy switching
    aiElement.setAttribute('data-name-en', item.name_en || item.name || item.id);
    aiElement.setAttribute('data-name-zh', item.name_zh || item.name || item.id);
    
    aiElement.appendChild(img);
    aiElement.appendChild(name);
    
    return aiElement;
}

// Render all AI items in the pool
export function renderAIPool(items, container) {
    container.innerHTML = ''; // Clear existing items
    items.forEach(item => {
        const itemElement = renderAIItem(item); // Get the element
        container.appendChild(itemElement);      // Append it!
    }); 
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
    
    // Get current language
    const currentLang = document.documentElement.lang || 'zh'; // Default to Chinese
    
    // Create tier label - show the name based on current language
    const tierLabel = document.createElement('span');
    tierLabel.className = 'tier-label';
    // Use language-specific name
    tierLabel.textContent = currentLang === 'en' ? tier.name_en : tier.name_zh;
    tierLabel.setAttribute('data-tier-name-en', tier.name_en); // Store both names as data attributes
    tierLabel.setAttribute('data-tier-name-zh', tier.name_zh); // for easy language switching
    tierLabel.style.backgroundColor = tier.color;
    tierLabel.style.color = getContrastColor(tier.color);
    
    // Create tier name input (hidden by default)
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'tier-name-input';
    nameInput.value = currentLang === 'en' ? tier.name_en : tier.name_zh; // Use language-specific name
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
            // Apply changes based on current language
            if (currentLang === 'en') {
                tier.name_en = nameInput.value;
                tierLabel.setAttribute('data-tier-name-en', nameInput.value);
            } else {
                tier.name_zh = nameInput.value;
                tierLabel.setAttribute('data-tier-name-zh', nameInput.value);
            }
            
            // Update the displayed name
            tierLabel.textContent = nameInput.value;
            
            // Update color
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

// Setup modal close buttons and Add Tier form submission
export function setupModals(addTierCallback) { 
    // --- General Modal Closing Logic --- 
    const closeButtons = document.querySelectorAll('.close-button'); 
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                 // If it's the add tier modal, reset the form on close
                if (modal.id === 'addTierModal') {
                    const form = modal.querySelector('#addTierForm');
                    if (form) form.reset();
                }
            }
        });
    });
    
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(event) {
            if (event.target === this) {
                this.style.display = 'none';
                // If it's the add tier modal, reset the form on close
                if (modal.id === 'addTierModal') {
                    const form = modal.querySelector('#addTierForm');
                    if (form) form.reset();
                }
            }
        });
    });

    // --- Add Tier Modal Specific Logic ---
    const addTierModal = document.getElementById('addTierModal');
    const addTierForm = document.getElementById('addTierForm');

    if (addTierModal && addTierForm && typeof addTierCallback === 'function') {
        addTierForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent default form submission

            // Get form data
            const tierIdInput = document.getElementById('new-tier-id');
            const tierNameZhInput = document.getElementById('new-tier-name-zh');
            const tierNameEnInput = document.getElementById('new-tier-name-en');
            const tierColorInput = document.getElementById('new-tier-color');

            // Basic check if elements exist
            if (!tierIdInput || !tierNameZhInput || !tierNameEnInput || !tierColorInput) {
                console.error('[UI] Could not find all input fields in Add Tier form.');
                alert('Error adding tier. Please try again.');
                return;
            }
            
            // Create the new tier object
            const newTier = {
                id: tierIdInput.value.trim(),
                name_zh: tierNameZhInput.value.trim(),
                name_en: tierNameEnInput.value.trim(),
                color: tierColorInput.value.trim(),
                items: [] // New tiers start with no items
            };

            // Call the callback function (handleAddTier from tierManagement.js)
            const success = addTierCallback(newTier); 

            if (success) {
                addTierForm.reset(); // Clear the form
                addTierModal.style.display = 'none'; // Close the modal
            }
            // If addTierCallback returns false (e.g., validation failed), the modal stays open
            // allowing the user to correct the input. The callback should handle showing alerts.
        });

        // --- Add Tier Modal Language Switching ---
        const addTierModalContent = addTierModal?.querySelector('.modal-content');
        const addTierLangEN = document.getElementById('addTierLangSwitchEN');
        const addTierLangZH = document.getElementById('addTierLangSwitchZH');
        const addTierNameENContainer = document.getElementById('addTierNameENContainer');
        const addTierNameZHContainer = document.getElementById('addTierNameZHContainer');

        const setAddTierLanguage = async (lang) => {
            if (!addTierModalContent || !addTierLangEN || !addTierLangZH || !addTierNameENContainer || !addTierNameZHContainer) {
                console.warn('[UI] Add Tier modal language elements not found.');
                return;
            }
            const isEN = lang === 'en';
            addTierModalContent.setAttribute('data-language', lang);
            addTierLangEN.classList.toggle('active', isEN);
            addTierLangZH.classList.toggle('active', !isEN);
            
            // Save the selected language to localStorage for persistence
            localStorage.setItem('lastAddTierModalLanguage', lang);
            
            // Toggle visibility of language-specific containers
            addTierNameENContainer.style.display = isEN ? 'block' : 'none';
            addTierNameZHContainer.style.display = isEN ? 'none' : 'block';
            
            // CRITICAL FIX: Actually load the correct language file and update translations
            console.log(`[setAddTierLanguage] Loading language file for: ${lang}`);
            await loadLanguage(lang);
            const currentLangData = getCurrentTranslations();
            if (currentLangData) {
                console.log(`[setAddTierLanguage] Re-applying static text for language: ${lang}`);
                updateStaticText(currentLangData, addTierModal); // Pass the specific modal element
            } else {
                console.warn(`[setAddTierLanguage] Could not get translations for language: ${lang}`);
            }
        };

        if (addTierLangEN) {
            addTierLangEN.addEventListener('click', () => {
                setAddTierLanguage('en');
            });
        }
        if (addTierLangZH) {
            addTierLangZH.addEventListener('click', () => {
                setAddTierLanguage('zh');
            });
        }

        // Set initial language based on localStorage or current app language
        const lastAddTierLang = localStorage.getItem('lastAddTierModalLanguage') || document.documentElement.lang || 'zh';
        setAddTierLanguage(lastAddTierLang);
        // Ensure the correct button is active initially
        if (lastAddTierLang === 'en') { 
            // Removed manual classList changes
        } else {
            // Removed manual classList changes
        }
        // ---------
    } else {
         if (!addTierModal) console.warn("[UI] Add Tier modal '#addTierModal' not found.");
         if (!addTierForm) console.warn("[UI] Add Tier form '#addTierForm' not found.");
         if (typeof addTierCallback !== 'function') console.warn("[UI] addTierCallback function not provided to setupModals.");
    }
}

// NEW setupAddCustomAI - delegates to the new module
export function setupAddCustomAI(addCallback) {
    console.log("[ui.js setupAddCustomAI] Delegating setup to addAIToolModal.js...");
    
    // Call the setup function from the new module
    setupAddAIToolModal(addCallback);

    // --- Open Modal Button Listener (remains here as it's outside the modal) ---
    const openModalBtn = document.getElementById('add-custom-ai-btn');
    const modal = document.getElementById('add-ai-modal');
    
    if (openModalBtn && modal) {
        openModalBtn.addEventListener('click', () => {
            console.log("[ui.js setupAddCustomAI] Add Custom AI button clicked!");
            // Optionally reset form state here before showing?
            // const form = document.getElementById('addAIForm');
            // if (form) form.reset(); 
            // Set default language maybe?
            
            modal.style.display = 'flex'; // Show the modal
        });
    } else {
        console.error('[ui.js setupAddCustomAI] Could not find Add AI button or modal element.');
    }
}

// Setup tier control buttons (add/remove tier)
export function setupTierControls() { 
    const addTierBtn = document.getElementById('add-tier-btn');
    const addTierModal = document.getElementById('addTierModal');

    if (addTierBtn && addTierModal) {
        addTierBtn.addEventListener('click', () => {
            addTierModal.style.display = 'flex'; // Show the modal using flex for centering
            
            // Get the current language and set it for the Add Tier modal
            const currentLang = window.languageManager?.getCurrentLanguage() || 'zh';
            
            // Find the setAddTierLanguage function and call it
            const addTierLangEN = document.getElementById('addTierLangSwitchEN');
            const addTierLangZH = document.getElementById('addTierLangSwitchZH');
            
            // Set the active class directly if we can't access the function
            if (addTierLangEN && addTierLangZH) {
                const isEN = currentLang === 'en';
                addTierLangEN.classList.toggle('active', isEN);
                addTierLangZH.classList.toggle('active', !isEN);
                
                // Set the data-language attribute on the modal content
                const modalContent = addTierModal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.setAttribute('data-language', currentLang);
                }
            }
            
            // Explicitly update text *inside the specific modal* after it becomes visible
            const currentLangData = getCurrentTranslations();
            if (currentLangData) {
                updateStaticText(currentLangData, addTierModal); // Pass modal element as root
            } else {
                console.warn('[UI] Could not get current translations to update Add Tier modal.');
            }
        });
    } else {
        if (!addTierBtn) console.warn("[UI] Add Tier button '#add-tier-btn' not found.");
        if (!addTierModal) console.warn("[UI] Add Tier modal '#addTierModal' not found.");
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

// Function to setup event listeners specific to the Edit AI Modal
export function setupEditModalListeners() {
    const modal = document.getElementById('editAIModal');
    if (!modal) return; // Only proceed if modal exists

    const langSwitchEN = document.getElementById('langSwitchEN');
    const langSwitchZH = document.getElementById('langSwitchZH');
    const descENContainer = document.getElementById('descENContainer');
    const descZHContainer = document.getElementById('descZHContainer');
    const descENTextarea = document.getElementById('editItemDescriptionEN');
    const descZHTextarea = document.getElementById('editItemDescriptionZH');
    const markdownPreview = document.getElementById('markdownPreview');

    // Check if all elements exist
    if (!langSwitchEN || !langSwitchZH || !descENContainer || !descZHContainer || !descENTextarea || !descZHTextarea || !markdownPreview) {
        console.error('[setupEditModalListeners] Missing one or more elements for edit modal interactions.');
        return;
    }
    
    // Helper function to update markdown preview
    const updatePreview = (text) => {
        console.log(`[updatePreview] Called with text: "${text}"`);
        if (typeof marked !== 'undefined') {
            const parsedHtml = marked.parse(text || '');
            console.log(`[updatePreview] Parsed HTML: "${parsedHtml}"`); // Log the result
            markdownPreview.innerHTML = parsedHtml;
        } else {
            console.warn('[updatePreview] marked.js not loaded.');
            markdownPreview.innerHTML = '<p><em>Markdown preview unavailable.</em></p>';
        }
    };

    // Language switch logic
    langSwitchEN.addEventListener('click', () => {
        // Trigger global language change
        if (window.languageManager) {
            window.languageManager.setLanguage('en');
        }
        // Update local visibility based on the new state set by languageManager
        // Removed manual classList changes
        // Removed targeted updateStaticText(editModal)
    });

    langSwitchZH.addEventListener('click', () => {
        // Trigger global language change
        if (window.languageManager) {
            window.languageManager.setLanguage('zh');
        }
        // Update local visibility based on the new state set by languageManager
        // Removed manual classList changes
        // Removed targeted updateStaticText(editModal)
    });

    // Real-time preview update on textarea input
    descENTextarea.addEventListener('input', () => {
        // Only update if this textarea is currently visible
        if (descENContainer.style.display === 'block') {
            updatePreview(descENTextarea.value);
        }
    });

    descZHTextarea.addEventListener('input', () => {
        // Only update if this textarea is currently visible
        if (descZHContainer.style.display === 'block') {
            updatePreview(descZHTextarea.value);
        }
    });
    
    // Add listener for the Cancel button
    const cancelBtn = document.getElementById('cancelEdit');
    if(cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none'; // Simply hide the modal
        });
    }

    // Add listener for the main close button (top right 'x')
    const closeBtn = document.getElementById('closeEditModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none'; // Simply hide the modal
        });
    }

    // --- Prevent closing when clicking inside the modal content ---
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.addEventListener('click', (event) => {
            event.stopPropagation(); // Stop click from reaching the modal background
        });
    }
    // ---------

    console.log('[setupEditModalListeners] Edit modal listeners attached.');
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
