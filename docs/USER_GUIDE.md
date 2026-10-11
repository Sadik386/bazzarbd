# Thelagari (Lumina Commerce) — Admin User Manual

A comprehensive guide for store managers, operators, and administrators to manage daily store operations, inventory, orders, customer service, and platform configurations.

---

## 1. Accessing the Admin Dashboard

- **Admin URL**: `https://thelagaribd.com/admin` (or `/master`)
- **Login Credentials**: Use your assigned Administrator email and password.
- **Session Duration**: Sessions remain active for 7 days unless manually logged out.
- **Security Notice**: Always log out when accessing the dashboard from shared workstations.

---

## 2. Order Management (`AdminOrders`)

The order management module allows you to track, filter, process, and fulfill customer orders.

### Order Workflow & Status Transitions
1. **Pending**: New order placed by customer awaiting verification.
2. **Confirmed**: Order reviewed and accepted by operations.
3. **Processing / Packed**: Items picked from warehouse and packaged.
4. **Shipped / In Transit**: Consignment handed over to courier/delivery partner.
5. **Delivered**: Customer received goods and payment confirmed.
6. **Cancelled / Returned**: Order aborted or returned by customer.

### Generating Invoices & Receipts
- Click on any order to view detailed items and shipping address.
- Click **Download Invoice (PDF)** to generate the branded customer invoice with breakdown of subtotal, delivery charges, VAT/taxes, and discounts.

---

## 3. Product Catalog & Inventory (`AdminProductList` & `AdminProductForm`)

### Adding a New Product
1. Navigate to **Products** > **Add New Product**.
2. **Basic Details**: Enter title, URL slug (auto-generated), description, and brand.
3. **Pricing & Stock**:
   - Set **Regular Price** and optional **Discounted Price**.
   - Input **Current Stock Quantity**. (The system will display "Out of Stock" automatically when inventory reaches 0).
4. **Category & Subcategory**: Select appropriate categories for accurate storefront filtering.
5. **Media Upload**:
   - Drag & drop high-resolution product photos.
   - The first photo becomes the primary thumbnail.
   - Images are automatically optimized and served via CDN.
6. **Variants & Sizes**: Add colors, sizes, or specifications.
7. Click **Publish Product**.

### Updating & Editing Existing Products
- Use the search bar in the product table to search by SKU, title, or category.
- Toggle the **Active / Featured** switch to highlight products on the home hero/featured sections.
- Click the edit icon to modify price, stock, or promotional descriptions.

---

## 4. Categories & Subcategories (`AdminCategories`)

- **Root Categories**: Add primary departments (e.g., Electronics, Fashion, Home).
- **Subcategories**: Assign subcategories to parent categories for structured storefront navigation.
- **Category Banners**: Upload optimized banner artwork for category landing pages.

---

## 5. Discount Codes & Campaigns (`AdminCoupons`)

1. Navigate to **Coupons** > **Create Coupon**.
2. Enter the **Coupon Code** (e.g., `SUMMER20`).
3. Select **Discount Type**:
   - **Percentage (%)**: e.g., 15% off.
   - **Fixed Amount ($ / ৳)**: e.g., 200 off total.
4. Set parameters:
   - **Minimum Order Value**: Minimum cart requirement to qualify.
   - **Expiry Date**: Automatic cutoff timestamp.
   - **Usage Limit**: Maximum number of times the coupon can be used site-wide or per user.
5. Click **Save & Activate**.

---

## 6. Customer Care & Inquiries (`AdminSupport` & `AdminReviews`)

### Support Tickets
- Customers submit help tickets via their account portal.
- View ticket status (**Open**, **In Progress**, **Resolved**).
- Respond directly in the ticket thread; customers receive immediate notifications.

### Review Moderation
- Customer product reviews are listed under **Reviews**.
- Review rating and written comments.
- Approve or reject reviews to maintain community quality and prevent spam.

---

## 7. Store Settings & Configuration (`AdminSettings`)

Access general store settings to update platform-wide business logic:
- **Delivery Fees**: Configure inside/outside city shipping rates.
- **Announcement Bar**: Set top banner text for sales, holidays, or urgent notices.
- **Store Contact Info**: Phone number, support email, WhatsApp hotlines, and social links.
- **Payment Switches**: Toggle Cash on Delivery (COD) or Online Payment Gateways.
