// Native fetch is available in Node.js 18+
// Wait, Node 18 has global fetch. I don't need require.

/**
 * Midtrans Utility
 * Handle interaction with Midtrans Snap API
 */

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Sandbox URL
const SNAP_API_URL = IS_PRODUCTION 
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

module.exports = {
    /**
     * Create Snap Transaction
     * @param {object} parameter - Transaction parameters (details, customer, etc.)
     * @returns {Promise<object>} - { token: "...", redirect_url: "..." }
     */
    createTransaction: async (parameter) => {
        if (!SERVER_KEY) {
            throw new Error('MIDTRANS_SERVER_KEY is not defined');
        }

        const authString = Buffer.from(SERVER_KEY + ':').toString('base64');

        try {
            const response = await fetch(SNAP_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Basic ${authString}`
                },
                body: JSON.stringify(parameter)
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error_messages ? data.error_messages.join(', ') : 'Failed to create transaction');
            }

            return data;
        } catch (error) {
            console.error('Midtrans Error:', error);
            throw error;
        }
    },

    getClientKey: () => CLIENT_KEY
};
