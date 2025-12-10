const crypto = require('crypto');
const axios = require('axios');

const DOKU_CONFIG = {
  clientId: process.env.DOKU_CLIENT_ID,
  secretKey: process.env.DOKU_SECRET_KEY,
  isProduction: process.env.DOKU_IS_PRODUCTION === 'true',
  baseUrl: process.env.DOKU_IS_PRODUCTION === 'true' 
    ? 'https://api.doku.com' 
    : 'https://api-sandbox.doku.com'
};

if (!DOKU_CONFIG.clientId || !DOKU_CONFIG.secretKey) {
    console.error("⚠️ DOKU CONFIG MISSING: Client ID or Secret Key is not set in .env!");
}

/**
 * Generate Signature for DOKU API V2
 * Component Signature = HMAC-SHA256(Client-Secret, StringToSign)
 * StringToSign = "Client-Id:" + Client-Id + "\n" + "Request-Id:" + Request-Id + "\n" + "Request-Timestamp:" + Request-Timestamp + "\n" + "Request-Target:" + Request-Target + "\n" + "Digest:" + Digest
 */
function generateSignature(clientId, requestId, timestamp, requestTarget, digest, secretKey) {
  const stringToSign = 
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${timestamp}\n` +
    `Request-Target:${requestTarget}\n` + // Target path e.g. /checkout/v1/payment
    `Digest:${digest}`;

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(stringToSign)
    .digest('base64');
  
  return 'HMACSHA256=' + signature;
}

function generateDigest(requestBody) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(requestBody))
    .digest('base64');
}

// Create payment request
async function createPayment(data) {
  const requestId = `REQ-${Date.now()}`;
  const timestamp = new Date().toISOString();
  // Ensure timestamp format is ISO8601 extended (YYYY-MM-DDTHH:mm:ssZ)
  // JS .toISOString() is correct.
  
  const requestTarget = '/checkout/v1/payment';
  
  // Ensure strict consistency between Digest and Payload
  const jsonBody = JSON.stringify(data);
  const digest = crypto.createHash('sha256').update(jsonBody).digest('base64');
  
  const signature = generateSignature(
    DOKU_CONFIG.clientId,
    requestId,
    timestamp,
    requestTarget,
    digest,
    DOKU_CONFIG.secretKey
  );
  
  try {
    const response = await axios.post(
      `${DOKU_CONFIG.baseUrl}${requestTarget}`,
      jsonBody, // Send the exact string we hashed
      {
        headers: {
          'Client-Id': DOKU_CONFIG.clientId,
          'Request-Id': requestId,
          'Request-Timestamp': timestamp,
          'Signature': signature,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('DOKU Payment Error Details:', error.response?.data);
    throw error;
  }
}

// Check payment status
async function checkPaymentStatus(invoiceNumber) {
  const requestId = `REQ-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const requestTarget = `/v1/payment/status`; // Note: Adjust if using different endpoint for status
  // Wait, DOKU V2 endpoint for status check by Invoice is usually different or requires specific target.
  // Standard V2 Status Check: GET /v1/connection/check or POST /v1/payment/status ??
  // Let's stick to POST /v1/payment/status if that's what we used, but fix signature.
  // Correction: If using Checkout API, we might need specific Checkout status API or General V2 Status API.
  // Let's assume standard V2 `POST /v1/payment/status` is correct for now but fix signature.
  
  const requestBody = { invoice_number: invoiceNumber };
  const digest = generateDigest(requestBody);
  
  const signature = generateSignature(
    DOKU_CONFIG.clientId,
    requestId,
    timestamp,
    requestTarget,
    digest,
    DOKU_CONFIG.secretKey
  );
  
  try {
    const response = await axios.post(
      `${DOKU_CONFIG.baseUrl}${requestTarget}`,
      requestBody,
      {
        headers: {
          'Client-Id': DOKU_CONFIG.clientId,
          'Request-Id': requestId,
          'Request-Timestamp': timestamp,
          'Signature': signature,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('DOKU Status Check Error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  DOKU_CONFIG,
  createPayment,
  checkPaymentStatus
};
