import axios from 'axios';

let cachedToken = null;
let tokenExpiry = null;

const getPathaoBaseUrl = () => {
  const env = process.env.PATHAO_ENV || 'sandbox';
  const url = env === 'production' 
    ? 'https://api-hermes.pathao.com'
    : 'https://courier-api-sandbox.pathao.com';
  console.log(`[Pathao] Using base URL: ${url} (env: ${env})`);
  return url;
};

// Helper to extract array from various Pathao response shapes
const extractArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  return [];
};

/**
 * Helper to fetch dynamic access token from Pathao API (with in-memory caching)
 */
export const getPathaoAccessToken = async () => {
  // Check if we have a valid cached token (give a 1-minute buffer)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const clientId = process.env.PATHAO_CLIENT_ID;
  const clientSecret = process.env.PATHAO_CLIENT_SECRET;
  const username = process.env.PATHAO_USERNAME;
  const password = process.env.PATHAO_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error('Pathao API credentials are not fully configured in .env');
  }

  const baseUrl = getPathaoBaseUrl();

  try {
    const response = await axios.post(`${baseUrl}/aladdin/api/v1/issue-token`, {
      client_id: clientId,
      client_secret: clientSecret,
      username: username,
      password: password,
      grant_type: 'password'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const tokenData = response.data;
    console.log('[Pathao] Token response keys:', Object.keys(tokenData || {}));
    const token = tokenData?.access_token || tokenData?.data?.access_token;
    if (token) {
      cachedToken = token;
      const expiresInMs = ((tokenData?.expires_in || tokenData?.data?.expires_in) || 2592000) * 1000;
      tokenExpiry = Date.now() + expiresInMs;
      console.log('[Pathao] Token issued, expires in', Math.round(expiresInMs/3600000), 'hours');
      return cachedToken;
    } else {
      throw new Error('Failed to issue access token from Pathao');
    }
  } catch (error) {
    console.error('Pathao Authentication Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message || 'Pathao authentication failed');
  }
};

/**
 * Fetches the merchant's list of stores to verify store setup or use in dropdowns
 */
export const getPathaoStores = async () => {
  const token = await getPathaoAccessToken();
  const baseUrl = getPathaoBaseUrl();

  try {
    const response = await axios.get(`${baseUrl}/aladdin/api/v1/stores`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    console.log('[Pathao] Stores raw response:', JSON.stringify(response.data).slice(0, 300));
    return extractArray(response.data);
  } catch (error) {
    console.error('Pathao Stores Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch Pathao stores');
  }
};

/**
 * Fetches the list of active cities in Pathao's service coverage
 */
export const getPathaoCities = async () => {
  const token = await getPathaoAccessToken();
  const baseUrl = getPathaoBaseUrl();

  try {
    const response = await axios.get(`${baseUrl}/aladdin/api/v1/cities`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    console.log('[Pathao] Cities raw response:', JSON.stringify(response.data).slice(0, 300));
    const cities = extractArray(response.data);
    console.log('[Pathao] Cities parsed count:', cities.length);
    return cities;
  } catch (error) {
    console.error('Pathao Cities Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch Pathao cities');
  }
};

/**
 * Fetches zones within a given city ID
 */
export const getPathaoZones = async (cityId) => {
  const token = await getPathaoAccessToken();
  const baseUrl = getPathaoBaseUrl();

  try {
    const response = await axios.get(`${baseUrl}/aladdin/api/v1/cities/${cityId}/zones`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    return response.data?.data?.data || [];
  } catch (error) {
    console.error(`Pathao Zones Error for City ${cityId}:`, error.response?.data || error.message);
    throw new Error('Failed to fetch Pathao zones');
  }
};

/**
 * Fetches areas within a given zone ID
 */
export const getPathaoAreas = async (zoneId) => {
  const token = await getPathaoAccessToken();
  const baseUrl = getPathaoBaseUrl();

  try {
    const response = await axios.get(`${baseUrl}/aladdin/api/v1/zones/${zoneId}/areas`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    return response.data?.data?.data || [];
  } catch (error) {
    console.error(`Pathao Areas Error for Zone ${zoneId}:`, error.response?.data || error.message);
    throw new Error('Failed to fetch Pathao areas');
  }
};

/**
 * Creates a shipment order on Pathao Aladdin
 */
export const createPathaoOrder = async (orderData) => {
  const token = await getPathaoAccessToken();
  const baseUrl = getPathaoBaseUrl();

  const payload = {
    store_id: Number(orderData.store_id || process.env.PATHAO_STORE_ID),
    merchant_order_id: orderData.merchant_order_id,
    recipient_name: orderData.recipient_name,
    recipient_phone: orderData.recipient_phone,
    recipient_address: orderData.recipient_address,
    delivery_type: Number(orderData.delivery_type || 48), // Default: 48 hours delivery
    item_type: Number(orderData.item_type || 2), // Default: 2 = Parcel
    special_instruction: orderData.special_instruction || 'Handle with care',
    item_quantity: Number(orderData.item_quantity || 1),
    item_weight: Number(orderData.item_weight || 0.5), // Kg
    amount_to_collect: Number(orderData.amount_to_collect || 0), // COD amount
    item_description: orderData.item_description || 'E-commerce items'
  };

  if (!payload.store_id) {
    throw new Error('Pathao Store ID is required. Configure PATHAO_STORE_ID in .env or provide a valid store.');
  }

  try {
    const response = await axios.post(`${baseUrl}/aladdin/api/v1/orders`, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (response.data && response.data.code === 200) {
      return {
        success: true,
        consignment_id: response.data.data.consignment_id,
        tracking_code: response.data.data.consignment_id,
        status: response.data.data.order_status,
        raw: response.data
      };
    } else {
      throw new Error(response.data?.message || 'Failed to create Pathao order');
    }
  } catch (error) {
    console.error('Pathao API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message || 'Pathao integration error');
  }
};
