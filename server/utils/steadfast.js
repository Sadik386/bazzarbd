import axios from 'axios';

/**
 * Sends order details to Steadfast Courier API and creates a delivery order
 * Docs: https://portal.steadfast.com.bd/api/doc
 */
export const createSteadfastOrder = async (orderData) => {
  const apiKey = process.env.STEADFAST_API_KEY;
  const secretKey = process.env.STEADFAST_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('Steadfast API credentials are not configured in .env');
  }

  // Base URL (sandbox and production use the same production API URL with different account keys)
  const baseUrl = 'https://portal.packzy.com/api/v1';

  const payload = {
    invoice: orderData.invoice,
    recipient_name: orderData.recipient_name,
    recipient_phone: orderData.recipient_phone,
    recipient_address: orderData.recipient_address,
    cod_amount: orderData.cod_amount,
    note: orderData.note || 'Lumina Commerce order'
  };

  try {
    const response = await axios.post(`${baseUrl}/create_order`, payload, {
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.status === 200) {
      const consignment = response.data.consignment || response.data.order || {};
      const trackingCode = consignment.tracking_code || consignment.consignment_id || consignment.id || response.data.id;
      return {
        success: true,
        consignment_id: consignment.consignment_id || consignment.id || response.data.id,
        tracking_code: trackingCode,
        status: consignment.status,
        raw: response.data
      };
    } else {
      throw new Error(response.data?.message || 'Failed to create Steadfast order');
    }
  } catch (error) {
    console.error('Steadfast API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message || 'Steadfast integration error');
  }
};
