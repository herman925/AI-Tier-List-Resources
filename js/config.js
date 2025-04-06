/**
 * config.js
 * Contains configuration data for the AI Star Chart application
 */

// Default tier configuration
export const defaultTiers = [
    {
        id: 'S',
        name: '恆星級',
        color: '#ff7979'
    },
    {
        id: 'A',
        name: '行星級',
        color: '#ffbe76'
    },
    {
        id: 'B',
        name: '衛星級',
        color: '#f6e58d'
    },
    {
        id: 'C',
        name: '彗星級',
        color: '#7ed6df'
    },
    {
        id: 'D',
        name: '隕石級',
        color: '#dff9fb'
    }
];

// Application settings
export const settings = {
    appName: '小赫的AI星辰榜',
    version: '1.0.0',
    storageKey: 'ai-star-chart-data',
    maxCustomAI: 20, // Maximum number of custom AI items allowed
    maxTiers: 10,    // Maximum number of tiers allowed
    minTiers: 2,      // Minimum number of tiers allowed
    defaultIconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-robot" viewBox="0 0 16 16"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.6 26.6 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.93.93 0 0 1-.765.935c-.845.147-2.34.346-4.235.346s-3.39-.2-4.235-.346A.93.93 0 0 1 3 9.219zm4.542-.827a.25.25 0 0 0 .217.065l.92.092c.101.01.19.058.25.137a.25.25 0 0 0 .065.217l-.092.92a.25.25 0 0 0 .137.25l.25.065a.25.25 0 0 0 .217-.065l.92-.092a.25.25 0 0 0 .25-.137.25.25 0 0 0 .065-.217l-.092-.92a.25.25 0 0 0-.137-.25l-.25-.065a.25.25 0 0 0-.217.065zM4.938 9.219a.25.25 0 0 0-.217-.065l-.92-.092a.25.25 0 0 0-.25.137.25.25 0 0 0-.065.217l.092.92a.25.25 0 0 0 .137.25l.25.065a.25.25 0 0 0 .217-.065l.92.092a.25.25 0 0 0 .25-.137.25.25 0 0 0 .065-.217l-.092-.92a.25.25 0 0 0-.137-.25l-.25-.065a.25.25 0 0 0-.217.065z"/><path d="M8 1a1 1 0 0 1 1 1v1.07A4.5 4.5 0 0 1 12.93 6.93a1 1 0 1 1-1.86.74c-.456-1.028-1.284-1.857-2.227-2.228V2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/><path d="M4.12 3.51a.5.5 0 0 0-.838-.192L1.53 5.878a.5.5 0 0 0 .192.838l1.028.456a.5.5 0 0 0 .55-.686zm7.76 0a.5.5 0 0 1 .838-.192l1.75 2.54a.5.5 0 0 1-.192.838l-1.028.456a.5.5 0 0 1-.55-.686z"/></svg>', // Default icon for AI items without an icon
    csvPath: 'data/ai_tools.csv' // Path to the CSV file containing AI tools data
};
