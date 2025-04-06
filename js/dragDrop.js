/**
 * dragDrop.js
 * Handles all drag and drop functionality for the tier list
 */

// Initialize drag and drop functionality
export function initDragAndDrop(state) {
    let draggedItem = null;
    let originalParent = null;
    
    // Find all draggable elements and add event listeners
    function setupDragListeners() {
        // Get all AI items (both in pool and in tiers)
        const aiItems = document.querySelectorAll('.ai-item');
        
        aiItems.forEach(item => {
            // Drag start event
            item.addEventListener('dragstart', handleDragStart);
            // Drag end event
            item.addEventListener('dragend', handleDragEnd);
        });
        
        // Get all dropzones
        const dropzones = document.querySelectorAll('.tier-dropzone, .item-grid');
        
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
    
    // Handle drag start
    function handleDragStart(e) {
        draggedItem = this;
        originalParent = this.parentNode;
        
        // Add dragging class for visual feedback
        setTimeout(() => {
            this.classList.add('dragging');
        }, 0);
        
        // Set data transfer properties
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.getAttribute('data-id'));
        
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
        this.classList.remove('over');
    }
    
    // Handle drop
    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        
        // Remove visual feedback
        this.classList.remove('over');
        
        // Don't do anything if dropping on the original container
        if (draggedItem.parentNode === this) {
            return false;
        }
        
        // Move the dragged item to the new container
        if (draggedItem) {
            // Remove from original parent
            if (originalParent) {
                originalParent.removeChild(draggedItem);
            }
            
            // Add to new parent
            this.appendChild(draggedItem);
            
            // Update the state to reflect the new position
            updateStateAfterDrop(draggedItem, this);
        }
        
        return false;
    }
    
    // Handle drag end
    function handleDragEnd(e) {
        // Remove dragging class
        this.classList.remove('dragging');
        
        // Remove 'over' class from all potential drop targets
        const dropzones = document.querySelectorAll('.tier-dropzone, .item-grid');
        dropzones.forEach(zone => {
            zone.classList.remove('over');
        });
    }
    
    // Update the application state after a successful drop
    function updateStateAfterDrop(item, targetContainer) {
        const aiId = item.getAttribute('data-id');
        
        // Check if dropping into the AI pool
        if (targetContainer.classList.contains('item-grid')) {
            // Remove the AI from any tier it might be in
            state.tiers.forEach(tier => {
                tier.items = tier.items.filter(id => id !== aiId);
            });
        } 
        // Otherwise, it's being dropped into a tier
        else if (targetContainer.classList.contains('tier-dropzone')) {
            const tierId = targetContainer.closest('.tier-row').getAttribute('data-tier');
            
            // Remove from all tiers first (in case it was in another tier)
            state.tiers.forEach(tier => {
                tier.items = tier.items.filter(id => id !== aiId);
            });
            
            // Add to the new tier
            const targetTier = state.tiers.find(tier => tier.id === tierId);
            if (targetTier) {
                if (!targetTier.items) {
                    targetTier.items = [];
                }
                targetTier.items.push(aiId);
            }
        }
        
        // If we have a state change callback, call it
        if (state.onStateChange && typeof state.onStateChange === 'function') {
            state.onStateChange(state);
        }
    }
    
    // Public API
    return {
        setup: setupDragListeners,
        // Additional methods could be added here if needed
    };
}
