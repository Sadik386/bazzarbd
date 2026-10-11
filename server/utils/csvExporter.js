/**
 * Converts an array of objects to a CSV string.
 * @param {Array<Object>} data - The data to convert
 * @param {Array<string>} fields - The fields to include in the CSV
 * @returns {string}
 */
export const convertToCSV = (data, fields) => {
  if (!data || !data.length) return "";

  const header = fields.join(",");
  const rows = data.map(obj => {
    return fields.map(field => {
      // Handle nested fields like "shipping_address.city"
      const value = field.split('.').reduce((acc, part) => acc && acc[part], obj);
      
      // Escape quotes and commas
      let stringValue = value !== undefined && value !== null ? String(value) : "";
      if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
        stringValue = `"${stringValue.replace(/"/g, "\"\"")}"`;
      }
      return stringValue;
    }).join(",");
  });

  return [header, ...rows].join("\n");
};
