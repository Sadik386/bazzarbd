# 🛡️ Cloudflare Setup Guide for Lumina Commerce

Using Cloudflare will significantly improve your site's speed in Bangladesh by caching files in their **Dhaka Data Center** and protecting your server from attacks.
   
---

## Step 1: Create a Cloudflare Account
1. Go to [Cloudflare.com](https://www.cloudflare.com/) and click **Sign Up**.
2. Enter your email and create a password.
3. Once logged in, click **Add a Site**.
4. Enter your domain name (e.g., `thelagari.com`) and click **Add Site**.

## Step 2: Select a Plan
1. Scroll down to the bottom of the pricing page.
2. Select the **Free** plan ($0/month).
3. Click **Continue**.

## Step 3: Review DNS Records
1. Cloudflare will scan your existing DNS records (from Hostinger/Namecheap).
2. Ensure you see an **A record** pointing to your Hostinger server's IP address.
3. Ensure the **Proxy Status** (the orange cloud icon) is turned **ON** for your main domain and `www` record.
4. Click **Continue**.

## Step 4: Change Nameservers (CRITICAL)
Cloudflare will provide you with two nameservers (e.g., `ashley.ns.cloudflare.com` and `olga.ns.cloudflare.com`).
1. Log in to your domain registrar (where you bought the domain, e.g., Hostinger or GoDaddy).
2. Find the **Nameservers** or **DNS Management** section.
3. Choose **Custom Nameservers**.
4. Replace the existing nameservers with the two provided by Cloudflare.
5. Save changes. 
   > *Note: This can take anywhere from 1 to 24 hours to "propagate" globally, but usually works within 15 minutes.*

## Step 5: Essential Optimization Settings
Once the nameservers are updated, go to the Cloudflare dashboard and configure these settings for maximum speed:

### 1. SSL/TLS Settings
- Go to **SSL/TLS > Overview**.
- Set the encryption mode to **Full (Strict)**. This ensures the connection is secure from the visitor all the way to your Hostinger server.
- Go to **SSL/TLS > Edge Certificates**:
  - **Always use HTTPS**: Turn this **ON** (Enabled). This redirects all insecure `http://` traffic to secure `https://` automatically (vital for SEO and user security).
  - **Minimum TLS Version**: Set to **TLS 1.2**.

### 2. Network & Speed Optimizations
- Go to **Speed > Optimization**:
  - **Auto Minify**: Check HTML, CSS, and JavaScript. This reduces file sizes.
  - **Brotli**: Turn this **ON**. It is a more advanced compression than Gzip.
  - **Rocket Loader**: Turn this **ON**. It improves load time for pages with a lot of JavaScript.
- Go to **Network** (or **Protocols**):
  - **HTTP/2**, **HTTP/3 (with QUIC)**, & **TLS 1.3**: Ensure all are **Enabled** (allows parallel file streaming and faster loading).
  - **0-RTT Connection Resumption**: Turn this **ON** (Enabled). Allows returning visitors to resume secure connections instantly without handshake overhead, saving 50-100ms.

### 3. API Edge Caching Rules (For 500+ Concurrent Users)
By default, Cloudflare **does not** cache API endpoints. To handle massive traffic, we have added `Cache-Control` headers to the backend, but we must tell Cloudflare to respect them:
1. Go to **Caching > Cache Rules** in the Cloudflare dashboard.
2. Click **Create rule**.
3. Name the rule: `Cache Public API`.
4. Under **When incoming requests match...**, select **Custom filter expression**:
   - Field: `URI Path`
   - Operator: `starts with`
   - Value: `/api/products`
   - Click **Or**
   - Field: `URI Path`
   - Operator: `starts with`
   - Value: `/api/categories`
5. Under **Cache eligibility**, select **Eligible for cache**.
6. Under **Edge TTL**, select **Respect origin header**.
7. Click **Deploy**.

> **Note on Delays:** Because of this rule, if you update a product's price or image, it may take up to **60 seconds** for the change to appear to regular users on the storefront. Categories may take up to **5 minutes**. This is the trade-off for supporting thousands of users simultaneously.

---

## Step 6: Verify the Setup
1. Open your website in Chrome.
2. Right-click and select **Inspect** > **Network**.
3. Click on your website name and look at the **Headers**.
4. You should see `cf-cache-status: HIT` or `MISS`.
5. You should also see `server: cloudflare`.

---

### ✅ Benefits for Bangladesh Users:
Without Cloudflare, a user in Dhaka has to connect to a server in the US or Europe. With Cloudflare, the "Static Assets" (your images, logo, CSS) are served from **Cloudflare's Dhaka Edge Server**, reducing the load time from seconds to milliseconds.
