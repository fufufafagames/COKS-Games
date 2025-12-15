/**
 * DiscountManager.js
 * Centralized logic for Game Discounts
 */

class DiscountManager {

    /**
     * Check if today is a "Special Event"
     * Rules:
     * 1. Double Dates (1.1, 2.2, ... 12.12)
     * 2. Holidays (Christmas 25/12, New Year 1/1, etc.)
     * @returns {Object} { isSpecial: boolean, name: string }
     */
    /**
     * Check if today is a "Special Event"
     * @param {Object|null} activeEvent - Event from DB
     * @returns {Object} { isSpecial: boolean, name: string }
     */
    static getEventStatus(activeEvent = null) {
        // 0. DB Active Event (Highest Priority)
        if (activeEvent) {
            return { isSpecial: true, name: activeEvent.title };
        }

        const today = new Date();
        const d = today.getDate();
        const m = today.getMonth() + 1; // 1-12

        // 1. Double Dates (1.1, 2.2, etc.)
        if (d === m) {
            return { isSpecial: true, name: `${d}.${d} Mega Sale` };
        }

        // 2. Specific Holidays (Manual List)
        const holidays = {
            '1-1': 'New Year Sale',
            '17-8': 'Independence Day',
            '25-12': 'Christmas Sale',
            '31-12': 'End Year Sale'
            // Add religious holidays dynamically if needed, 
            // but for now we stick to fixed dates or manual config
        };

        const key = `${d}-${m}`;
        if (holidays[key]) {
            return { isSpecial: true, name: holidays[key] };
        }

        return { isSpecial: false, name: null };
    }

    /**
     * Get the "Daily Deal" Game ID
     * Uses a seeded random based on the date so it stays consistent for 24h
     * @param {number} totalGames - Total number of games in DB
     * @returns {number} Random Index (0 to totalGames-1)
     */
    static getDailyDealIndex(totalGames) {
        if (totalGames === 0) return -1;
        
        const today = new Date();
        // Seed = YYYYMMDD
        const seed = parseInt(
            today.getFullYear().toString() + 
            (today.getMonth() + 1).toString().padStart(2, '0') + 
            today.getDate().toString().padStart(2, '0')
        );

        // Simple Linear Congruential Generator (LCG) for deterministic random
        const a = 1664525;
        const c = 1013904223;
        const m = 4294967296;
        
        const randomVal = (a * seed + c) % m;
        return randomVal % totalGames;
    }

    /**
     * Calculate Discount for a Game
     * @param {Object} game - Game object from DB
     * @param {boolean} isFlashSaleAvailable - If true, 99% logic applies
     * @param {Object|null} activeEvent - Event from DB
     * @returns {Object} { finalPrice, discountType, discountPercent }
     */
    static calculateDiscount(game, isFlashSaleAvailable = false, activeEvent = null) {
        const eventStatus = this.getEventStatus(activeEvent);
        const originalPrice = parseInt(game.price || 0);

        // Rule 1: Special Event (Pro Category Only)
        // Flash Sale (99%) OR Regular Event (25%)
        if (eventStatus.isSpecial && (game.category || '').toLowerCase().includes('pro')) {
            if (isFlashSaleAvailable) {
                return {
                    finalPrice: Math.floor(originalPrice * 0.01), // 99% OFF
                    discountType: 'flash_sale',
                    discountPercent: 99,
                    eventName: eventStatus.name
                };
            } else {
                return {
                    finalPrice: Math.floor(originalPrice * 0.75), // 25% OFF
                    discountType: 'event',
                    discountPercent: 25,
                    eventName: eventStatus.name
                };
            }
        }

        // Rule 2: Daily Deal (10%)
        // Applies if this game is the "chosen one" (Logic handled in Controller usually)
        // matchesDailyDeal flag passed via game object or managed externally
        if (game.isDailyDeal) {
            return {
                finalPrice: Math.floor(originalPrice * 0.90), // 10% OFF
                discountType: 'daily',
                discountPercent: 10,
                eventName: 'Daily Deal'
            };
        }

        // No Discount
        return {
            finalPrice: originalPrice,
            discountType: 'none',
            discountPercent: 0,
            eventName: null
        };
    }
}

module.exports = DiscountManager;
