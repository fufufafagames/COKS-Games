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
 * Generate Digest for DOKU API V2 - CORRECT VERSION
 * Based on DOKU official documentation
 */
function generateDigest(jsonBody) {
  // Hash the JSON string with SHA-256 and get RAW BINARY (not base64 yet)
  let jsonStringHash256 = crypto
    .createHash('sha256')
    .update(jsonBody, "utf-8")
    .digest(); // Returns Buffer with raw binary
  
  // Convert to base64
  let bufferFromJsonStringHash256 = Buffer.from(jsonStringHash256);
  return bufferFromJsonStringHash256.toString('base64');
}

/**
 * Generate Signature for DOKU API V2 - CORRECT VERSION
 * Component Signature = HMAC-SHA256(Client-Secret, StringToSign)
 * StringToSign = "Client-Id:" + Client-Id + "\n" + "Request-Id:" + Request-Id + "\n" + "Request-Timestamp:" + Request-Timestamp + "\n" + "Request-Target:" + Request-Target + "\n" + "Digest:" + Digest
 */
function generateSignature(clientId, requestId, timestamp, requestTarget, digest, secretKey) {
  // Prepare component signature - NO \n at the end!
  const componentSignature = 
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${timestamp}\n` +
    `Request-Target:${requestTarget}\n` +
    `Digest:${digest}`;

  // Debug logging
  console.log('\n----- SIGNATURE COMPONENTS -----');
  console.log(componentSignature);
  console.log('--------------------------------\n');

  // Calculate HMAC-SHA256 - need RAW BINARY (true parameter)
  const signatureHash = crypto
    .createHmac('sha256', secretKey)
    .update(componentSignature, 'utf-8')
    .digest(); // Get raw binary
  
  // Convert to base64
  const signatureBase64 = Buffer.from(signatureHash).toString('base64');
  
  return 'HMACSHA256=' + signatureBase64;
}

// Create payment request
async function createPayment(data) {
  const requestId = `REQ-${Date.now()}`;
  const timestamp = new Date().toISOString().slice(0, 19) + "Z";
  const requestTarget = '/checkout/v1/payment';
  
  // Convert to JSON string ONCE - this is what we'll send and hash
  const jsonBody = JSON.stringify(data);
  
  // Generate digest from the exact JSON string we're sending
  const digest = generateDigest(jsonBody);
  
  console.log('\n===== DOKU API REQUEST DEBUG =====');
  console.log('Request ID:', requestId);
  console.log('Timestamp:', timestamp);
  console.log('Request Target:', requestTarget);
  console.log('Digest:', digest);
  
  // Generate signature
  const signature = generateSignature(
    DOKU_CONFIG.clientId,
    requestId,
    timestamp,
    requestTarget,
    digest,
    DOKU_CONFIG.secretKey
  );
  
  console.log('Signature:', signature);
  console.log('==================================\n');
  
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
    console.error('\n===== DOKU API ERROR =====');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Request Headers:', error.config?.headers);
    console.error('Request Body:', error.config?.data);
    console.error('==========================\n');
    throw error;
  }
}

// Check payment status
async function checkPaymentStatus(invoiceNumber) {
  const requestId = `REQ-${Date.now()}`;
  const timestamp = new Date().toISOString();
  
  // DOKU Checkout status endpoint
  const requestTarget = `/checkout/v1/payment/${invoiceNumber}`;
  
  // For GET requests, NO request body and NO digest
  const componentSignature = 
    `Client-Id:${DOKU_CONFIG.clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${timestamp}\n` +
    `Request-Target:${requestTarget}`;
  
  const signatureHash = crypto
    .createHmac('sha256', DOKU_CONFIG.secretKey)
    .update(componentSignature, 'utf-8')
    .digest();
  
  const signature = 'HMACSHA256=' + Buffer.from(signatureHash).toString('base64');
  
  try {
    const response = await axios.get(
      `${DOKU_CONFIG.baseUrl}${requestTarget}`,
      {
        headers: {
          'Client-Id': DOKU_CONFIG.clientId,
          'Request-Id': requestId,
          'Request-Timestamp': timestamp,
          'Signature': signature
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