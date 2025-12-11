require('dotenv').config();
const { createPayment } = require('../config/doku');

async function runTest() {
    console.log("🚀 Starting Atomic DOKU Connection Test...");
    console.log("-----------------------------------------");
    console.log("Client ID:", process.env.DOKU_CLIENT_ID);
    console.log("Is Production:", process.env.DOKU_IS_PRODUCTION);
    console.log("-----------------------------------------");

    const orderId = `TEST-${Date.now()}`;
    
    // THE ATOMIC PAYLOAD
    // No optional fields. No payment methods. No due date.
    const minimalPayload = {
        order: {
            invoice_number: orderId,
            amount: 15000 // Simple integer
        },
        customer: {
            name: "Test User",
            email: "test@example.com"
        }
    };

    console.log("📦 Sending Minimal Payload:", JSON.stringify(minimalPayload, null, 2));

    try {
        const response = await createPayment(minimalPayload);
        console.log("✅ SUCCESS! Connection Verified.");
        console.log("Response:", JSON.stringify(response, null, 2));
    } catch (error) {
        console.error("❌ FAILED. Status Code:", error.response?.status);
        console.error("Error Message:", error.response?.data || error.message);
        
        if (error.response?.status === 500) {
            console.log("\n💡 DIAGNOSIS: 500 Internal Server Error with Minimal Payload means:");
            console.log("1. The endpoint /checkout/v1/payment might be wrong for your specific Merchant ID.");
            console.log("2. Your Sandbox Account might need specific activation.");
        }
    }
}

runTest();
