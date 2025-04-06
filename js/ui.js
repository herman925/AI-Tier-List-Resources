/**
 * ui.js
 * Handles UI rendering and interactions
 */

import { settings } from './config.js';
import { getCurrentTranslations, updateStaticText, loadLanguage, setLanguage } from './languageManager.js'; 
import { addAIItem } from './aiToolManagement.js'; // Import the addAIItem function

// Render a single AI item
export function renderAIItem(item, container) {
    const aiElement = document.createElement('div');
    aiElement.className = 'ai-item';
    aiElement.setAttribute('draggable', 'true');
    
    // --- Debug log before setting data-id --- 
    console.log('[renderAIItem] Setting data-id for item:', item, 'item.id:', item.id);
    aiElement.setAttribute('data-id', item.id);
    
    const img = document.createElement('img');
    img.src = item.icon || settings.defaultIconUrl;
    img.alt = `${item.name_zh || item.name || 'AI Tool'} Logo`; // Use name_zh, fallback to name, then generic
    
    const name = document.createElement('span');
    name.textContent = item.name_zh || item.name || item.id; // Display name_zh, fallback to old name, then ID
    
    aiElement.appendChild(img);
    aiElement.appendChild(name);
    
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

        // Set initial language based on current app language or default (e.g., 'zh')
        const currentAppLang = document.documentElement.lang || 'zh'; 
        setAddTierLanguage(currentAppLang); 
        // Ensure the correct button is active initially
        if (currentAppLang === 'en') { 
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

// Setup Add Custom AI functionality
export function setupAddCustomAI(aiToolManager) {
    console.log("[setupAddCustomAI] Function called."); // Log: Function entry

    const modal = document.getElementById('add-ai-modal');
    const modalContent = modal.querySelector('.modal-content'); 
    const openModalBtn = document.getElementById('add-custom-ai-btn');
    const closeModalBtn = document.getElementById('cancelAddAI');
    const form = document.getElementById('addAIForm');
    const langSwitchEN = document.getElementById('addAILangSwitchEN');
    const langSwitchZH = document.getElementById('addAILangSwitchZH');
    const nameENContainer = document.getElementById('addItemNameENContainer');
    const nameZHContainer = document.getElementById('addItemNameZHContainer');
    const descENContainer = document.getElementById('addDescENContainer');
    const descZHContainer = document.getElementById('addDescZHContainer');
    const nameENInput = document.getElementById('addItemNameEN');
    const nameZHInput = document.getElementById('addItemNameZH');
    const iconInput = document.getElementById('addItemIcon');
    const descENTextarea = document.getElementById('addItemDescriptionEN');
    const descZHTextarea = document.getElementById('addItemDescriptionZH');
    const markdownPreview = document.getElementById('addMarkdownPreview'); 

    // Log: Element checks (Detailed)
    console.log(`[setupAddCustomAI] modal: ${!!modal}`);
    console.log(`[setupAddCustomAI] openModalBtn: ${!!openModalBtn}`);
    console.log(`[setupAddCustomAI] closeModalBtn: ${!!closeModalBtn}`);
    console.log(`[setupAddCustomAI] form: ${!!form}`);
    console.log(`[setupAddCustomAI] langSwitchEN: ${!!langSwitchEN}`);
    console.log(`[setupAddCustomAI] langSwitchZH: ${!!langSwitchZH}`);
    console.log(`[setupAddCustomAI] nameENContainer: ${!!nameENContainer}`);
    console.log(`[setupAddCustomAI] nameZHContainer: ${!!nameZHContainer}`);
    console.log(`[setupAddCustomAI] descENContainer: ${!!descENContainer}`);
    console.log(`[setupAddCustomAI] descZHContainer: ${!!descZHContainer}`);
    console.log(`[setupAddCustomAI] nameENInput: ${!!nameENInput}`);
    console.log(`[setupAddCustomAI] nameZHInput: ${!!nameZHInput}`);
    console.log(`[setupAddCustomAI] iconInput: ${!!iconInput}`);
    console.log(`[setupAddCustomAI] descENTextarea: ${!!descENTextarea}`);
    console.log(`[setupAddCustomAI] descZHTextarea: ${!!descZHTextarea}`);
    console.log(`[setupAddCustomAI] markdownPreview: ${!!markdownPreview}`);


    if (!modal || !openModalBtn || !closeModalBtn || !form || !langSwitchEN || !langSwitchZH || 
        !nameENContainer || !nameZHContainer || !descENContainer || !descZHContainer || 
        !nameENInput || !nameZHInput || !iconInput || !descENTextarea || !descZHTextarea || !markdownPreview) {
        console.error("Add Custom AI Modal: One or more required elements not found. Aborting setup.");
        return; 
    }

    // --- Helper function to update markdown preview ---
    const updatePreview = (text, previewId) => {
        if (previewId) {
            const previewElement = document.getElementById(previewId);
            if (previewElement) {
                try {
                    previewElement.innerHTML = marked.parse(text || ''); // Use marked.parse
                } catch (error) {
                    console.error('Error parsing markdown:', error);
                    previewElement.innerHTML = '<p style="color: red;">Error rendering preview.</p>';
                }
            }
        }
    };

    // --- NEW Local Language Switching Function (Self-Reliant) ---
    const switchLanguage = async (targetLang) => {
        console.log(`[AddAI Modal switchLanguage] Switching to ${targetLang}`);
        const isEN = targetLang === 'EN';
        const langCode = isEN ? 'en' : 'zh';

        // 1. Update data-language attribute on the modal content for CSS visibility
        if (modalContent) {
            modalContent.dataset.language = langCode;
        } else {
            console.error("[AddAI Modal switchLanguage] modalContent not found!");
            return; // Exit if content area isn't found
        }
        
        // 2. Update THIS modal's button active states DIRECTLY
        langSwitchEN.classList.toggle('active', isEN);
        langSwitchZH.classList.toggle('active', !isEN);

        // 3. Toggle visibility of language-specific containers
        nameENContainer.style.display = isEN ? 'block' : 'none';
        nameZHContainer.style.display = isEN ? 'none' : 'block';
        descENContainer.style.display = isEN ? 'block' : 'none';
        descZHContainer.style.display = isEN ? 'none' : 'block';

        // 4. Update the preview based on the active language's description textarea
        const previewText = isEN ? descENTextarea.value : descZHTextarea.value;
        updatePreview(previewText || '', 'addMarkdownPreview');
        
        // 5. Load the correct language file
        try {
            await loadLanguage(langCode); // Ensures the translations are loaded
        } catch (error) {
            console.error(`[AddAI Modal switchLanguage] Error loading language ${langCode}:`, error);
            // Optionally handle the error, maybe show a message
        }

        // 6. Re-apply translations ONLY to THIS modal
        const currentLangData = getCurrentTranslations(); 
        if (currentLangData) {
            console.log(`[AddAI Modal switchLanguage] Re-applying static text for language: ${langCode}`);
            updateStaticText(currentLangData, modal); // Pass the specific modal element
        } else {
            console.warn(`[AddAI Modal switchLanguage] Could not get translations to update modal for language: ${langCode}`);
        }
    };

    // Add event listeners for language switching (using the NEW local function)
    if (langSwitchEN) {
        langSwitchEN.addEventListener('click', () => switchLanguage('EN'));
    }
    if (langSwitchZH) {
        langSwitchZH.addEventListener('click', () => switchLanguage('ZH'));
    }

    // Add event listeners for real-time markdown preview updates
    descENTextarea.addEventListener('input', () => {
        // Only update preview if English is the active language
        if (modalContent.dataset.language === 'en') {
            updatePreview(descENTextarea.value || '', 'addMarkdownPreview');
        }
    });
    
    descZHTextarea.addEventListener('input', () => {
        // Only update preview if Chinese is the active language
        if (modalContent.dataset.language === 'zh') {
            updatePreview(descZHTextarea.value || '', 'addMarkdownPreview');
        }
    });

    // Real-time preview update on textarea input
    if (descENTextarea) {
        descENTextarea.addEventListener('input', () => {
            if (langSwitchEN.classList.contains('active')) {
                updatePreview(descENTextarea.value, 'addMarkdownPreview');
            }
        });
    }
    if (descZHTextarea) {
        descZHTextarea.addEventListener('input', () => {
            if (langSwitchZH.classList.contains('active')) {
                updatePreview(descZHTextarea.value, 'addMarkdownPreview');
            }
        });
    }

    // Open modal listener
    openModalBtn.addEventListener('click', () => {
        console.log("[setupAddCustomAI] Add Custom AI button clicked!"); // Log: Click detected
        
        form.reset(); 
        updatePreview(''); 
        const globalLang = window.languageManager?.getCurrentLanguage() || 'zh'; 
        console.log(`[setupAddCustomAI] Setting initial language via switchLanguage(${globalLang === 'en' ? 'EN' : 'ZH'})...`); // Log: Before switch
        
        switchLanguage(globalLang === 'en' ? 'EN' : 'ZH').then(() => {
            console.log("[setupAddCustomAI] switchLanguage .then() block executed."); // Log: Success callback
            modal.style.display = 'flex'; // Change to flex for proper centering
            console.log("[setupAddCustomAI] Modal display set to 'flex'."); // Updated log
        }).catch(error => {
            console.error("[setupAddCustomAI] switchLanguage .catch() block executed:", error); // Log: Error callback
            // Still attempt to show the modal 
            modal.style.display = 'flex'; // Change to flex for proper centering
            console.warn("[setupAddCustomAI] Attempted to show modal despite error."); // Log: Error recovery attempt
        });
    });

    // Close modal listener
    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    // Also close if clicking outside the modal content
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Form submission listener
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const newAI = {
            id: `custom_${Date.now()}`, // Simple unique ID
            name_en: nameENInput.value,
            name_zh: nameZHInput.value,
            icon: iconInput.value || settings.defaultIcon, // Use default if empty
            description_en: descENTextarea.value,
            description_zh: descZHTextarea.value,
            tier_id: '', // New items start unranked
            isCustom: true
        };
        
        console.log('Adding new custom AI:', newAI);
        addAIItem(newAI).then(success => {
            if (success) {
                modal.style.display = 'none';
                form.reset();
                // Refresh the UI to show the new item
                window.location.reload(); // Simple refresh for now
            } else {
                alert('Failed to add AI item. Please try again.');
            }
        }).catch(error => {
            console.error('Error adding AI item:', error);
            alert('An error occurred while adding the AI item.');
        });
    });

    console.log("[setupAddCustomAI] Add AI modal listeners attached.");
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
