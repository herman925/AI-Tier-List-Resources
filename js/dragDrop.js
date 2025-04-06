/**
 * dragDrop.js
 * Handles all drag and drop functionality for the tier list
 */

import { saveState } from './storage.js'; // Assuming saveState handles the logic

let draggedItem = null;
let originalParent = null;
let appState = null; // Declare appState at the module level

/**
 * Initializes drag and drop functionality, passing the application state.
 * @param {object} state - The main application state.
 */
export function initDragAndDrop(state) {
    console.log("[DragDrop] Initializing with state...");
    appState = state; // Assign the passed state to the module-level variable
    if (!appState || !appState.tiers || !appState.aiItems) {
        console.error("[DragDrop] Initialization failed: State object or its properties are missing.", appState);
        return { setup: () => console.error("[DragDrop] Setup skipped due to initialization failure.") };
    }

    // Initialize drag and drop functionality
    function setupDragListeners() {
        // Get all AI items (both in pool and in tiers)
        const aiItems = document.querySelectorAll('.ai-item'); // SIMPLIFIED SELECTOR
        console.log(`[DragDrop Debug] Found ${aiItems.length} draggable items (.ai-item) to attach listeners to.`); // UPDATED DEBUG LOG
        
        aiItems.forEach(item => {
            // --- ADDED: Log mousedown event --- 
            item.addEventListener('mousedown', (e) => {
                console.log('[DragDrop Debug] mousedown event fired on item:', e.currentTarget.dataset.id);
            });
            // -----------
            
            // Drag start event
            item.addEventListener('dragstart', handleDragStart);
            // Drag end event
            item.addEventListener('dragend', handleDragEnd);
        });
        
        // Get all dropzones
        const dropzones = document.querySelectorAll('.tier-items, .tier-dropzone, .item-grid'); // Include tier-dropzone
        console.log(`[DragDrop Debug] Found ${dropzones.length} dropzones (.tier-items, .tier-dropzone, .item-grid) to attach listeners to.`); // ADDED DEBUG LOG
        
        dropzones.forEach(zone => {
            // Drag over event (needed to allow dropping)
            zone.addEventListener('dragover', handleDragOver);
            // Drag enter event (visual feedback)
            zone.addEventListener('dragenter', handleDragEnter);
            // Drag leave event (remove visual feedback)
            zone.addEventListener('dragleave', handleDragLeave);
            // Drop event (handle the actual drop)
            zone.addEventListener('drop', handleDrop);
        });
    }
    
    // --- CALL THE SETUP FUNCTION --- 
    setupDragListeners();
    // ----------------------------
    
    // Handle drag start
    function handleDragStart(e) {
        console.log('[DragDrop Debug] handleDragStart triggered for item:', e.target.dataset.id); // ADDED DEBUG LOG
        
        // Find the closest ancestor which is the draggable item
        const item = e.target.closest('.ai-item');
        
        if (!item) {
            // console.log("[DragDrop] DragStart ignored: Target or ancestor is not an .ai-item");
            e.preventDefault(); // Prevent unexpected drag operations
            return; // Ignore if the drag didn't start on a draggable item or its child
        }
        
        console.log("[DragDrop] DragStart detected on item:", item);
        
        // Set the dragged item reference
        draggedItem = item;
        originalParent = draggedItem.parentNode;
        const itemId = draggedItem.getAttribute('data-id');
        
        console.log(`[DragDrop] DragStart: Setting draggedItem to ID: ${itemId}`, draggedItem);
        console.log(`[DragDrop] DragStart: Original parent:`, originalParent);
        
        // Add dragging class for visual feedback
        setTimeout(() => {
            this.classList.add('dragging');
        }, 0);
        
        // Set data transfer properties
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.getAttribute('data-id'));
        
        // Create a ghost image for dragging (optional)
        // const ghostElement = this.cloneNode(true);
        // ghostElement.style.opacity = '0.5';
        // document.body.appendChild(ghostElement);
        // e.dataTransfer.setDragImage(ghostElement, 0, 0);
    }
    
    // Handle drag over (prevent default to allow drop)
    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        
        e.dataTransfer.dropEffect = 'move';
        return false;
    }
    
    // Handle drag enter (add visual feedback)
    function handleDragEnter(e) {
        this.classList.add('over');
    }
    
    // Handle drag leave (remove visual feedback)
    function handleDragLeave(e) {
        // Check if the mouse is leaving the dropzone entirely, not just moving over a child
        if (!this.contains(e.relatedTarget)) {
            this.classList.remove('over');
        }
    }
    
    // Handle drop
    function handleDrop(e) { 
        if (e.stopPropagation) {
            e.stopPropagation(); // Ensure event doesn't bubble up
        }
        
        // --- Check if an item is actually being dragged ---
        if (!draggedItem) {
            console.warn("[DragDrop] handleDrop called but draggedItem is null. Aborting drop.");
            this.classList.remove('over'); // Still remove hover effect
            return false;
        }
        
        // Remove visual feedback
        this.classList.remove('over');
        
        // Don't do anything if dropping on the original container
        // Check originalParent *before* removing, as parentNode changes after appendChild
        if (originalParent === this) { 
            return false;
        }
        
        // Move the dragged item to the new container
        console.log(`[DragDrop Debug] Attempting to drop item ID: ${draggedItem.getAttribute('data-id')} into dropzone:`, this);
 
        // Add to new parent (this = dropzone)
        this.appendChild(draggedItem);
        console.log(`[DragDrop Debug] Appended child. Current parentNode of item:`, draggedItem.parentNode);
 
        // Update the state AFTER the item is successfully moved
        console.log(`[DragDrop Debug] Calling updateStateAfterDrop...`);
        let newTierId = null; // Default to null for pool
        let sourceTierId = null;

        // Check if dropped in a tier's dropzone or the unranked pool
        if (this.classList.contains('tier-items')) { // Use .tier-items
            // Find the parent .tier-row to get the tier ID
            const tierRow = this.closest('.tier-row');
            newTierId = tierRow ? tierRow.getAttribute('data-tier-id') : null;
        } else if (this.id === 'ai-items') { // Dropped directly in the main #ai-items pool
            newTierId = null; // Represent unranked/pool with null
        }
        // else: dropped somewhere unexpected? Keep as unranked or log error.

        // Find the source tier
        if (originalParent.classList.contains('tier-items')) {
            const sourceTierRow = originalParent.closest('.tier-row');
            sourceTierId = sourceTierRow ? sourceTierRow.getAttribute('data-tier-id') : null;
        }

        updateStateAfterDrop(draggedItem.getAttribute('data-id'), newTierId, sourceTierId);
        
        // Clean up reference for safety, handleDragEnd might not fire reliably in all cases
        // draggedItem = null; 
        // originalParent = null;
        
        return false;
    }
    
    // Handle drag end
    function handleDragEnd(e) {
        // Important: Reset state variables regardless of drop success
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
        }
        // Remove dragging class
        
        // Remove 'over' class from all potential drop targets
        const dropzones = document.querySelectorAll('.tier-items, .tier-dropzone, .item-grid');
        dropzones.forEach(zone => {
            zone.classList.remove('over');
        });
 
        // Reset global drag state
        console.log("[DragDrop] DragEnd: Clearing draggedItem and originalParent");
        draggedItem = null;
        originalParent = null;
    }
    
    /**
     * Updates the application state after an item is dropped into a tier.
     * @param {string} itemId - The ID of the item being dropped.
     * @param {string|null} targetTierId - The ID of the tier the item is dropped into (null if into the pool).
     * @param {string|null} sourceTierId - The ID of the tier the item came from (null if from the pool).
     */
    function updateStateAfterDrop(itemId, targetTierId, sourceTierId) {
        if (!appState || !appState.tiers || !appState.aiItems) {
             console.error("[DragDrop] Cannot update state: Critical state properties (appState, tiers, aiItems) missing.");
             return;
         }
 
         console.log(`[DragDrop] Updating state: Moving item ${itemId} from source ${sourceTierId || 'pool'} to target ${targetTierId || 'pool'}`);
 
         // 1. Find the target tier
        let targetTier = null;
        if (!targetTierId) { // If moving to the pool, no need to find a target tier
            console.log(`[DragDrop] Item ${itemId} moved to the pool, no tier to update.`);
        } else {
            targetTier = appState.tiers.find(tier => tier.id === targetTierId);
            if (!targetTier) {
                console.error(`[DragDrop] Target tier ${targetTierId} not found in state.`);
                return;
            }
        }
 
         // 2. Find the source tier (if applicable) and remove the item
         if (sourceTierId) {
             const sourceTier = appState.tiers.find(tier => tier.id === sourceTierId);
             if (sourceTier && sourceTier.items) {
                 const itemIndexInSource = sourceTier.items.indexOf(itemId);
                 if (itemIndexInSource > -1) {
                     sourceTier.items.splice(itemIndexInSource, 1);
                     console.log(`[DragDrop] Removed item ${itemId} from source tier ${sourceTierId}`);
                 } else {
                     console.warn(`[DragDrop] Item ${itemId} not found in source tier ${sourceTierId}'s items array.`);
                 }
             } else {
                  console.warn(`[DragDrop] Source tier ${sourceTierId} not found or has no items array.`);
             }
         } else {
             // Item came from the pool - no removal needed from a tier's items array
             console.log(`[DragDrop] Item ${itemId} came from the pool.`);
         }
 
         // 3. Add the item to the target tier's items array (if not already present)
         if (targetTier && targetTier.items && !targetTier.items.includes(itemId)) {
             targetTier.items.push(itemId);
             console.log(`[DragDrop] Added item ${itemId} to target tier ${targetTierId}`);
         } else if (targetTier && !targetTier.items) {
              console.error(`[DragDrop] Target tier ${targetTierId} is missing the 'items' array!`);
              // Don't return here, might still need to update item's tierId and save state
         } else if (targetTier) {
             console.log(`[DragDrop] Item ${itemId} already present in target tier ${targetTierId}.`);
         } else {
             console.log(`[DragDrop] Item ${itemId} moved to the pool, no tier array to update.`);
         }
 
         // 4. (Optional) Update item's tier property if needed (depends on data model)
         // Find the item (in aiItems or customAIItems) and update its tierId if you store it there.
         const itemInState = appState.aiItems.find(item => item.id === itemId) || appState.customAIItems.find(item => item.id === itemId);
         if (itemInState) {
             itemInState.tierId = targetTierId; // Assign the target tier ID (will be null if moved to pool)
             console.log(`[DragDrop] Updated tierId property on item ${itemId} to ${targetTierId || 'null (pool)'}`);
         }
 
         // 5. Save the updated state
         console.log("[DragDrop] State after update:", JSON.parse(JSON.stringify(appState))); // Deep copy log
         saveState(appState);
    }

    // Public API
    return {
        setup: setupDragListeners,
        // Additional methods could be added here if needed
    };
}
