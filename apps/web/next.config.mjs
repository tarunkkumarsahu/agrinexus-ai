/** @type {import('next').NextConfig} */
const nextConfig = {
  // Same-origin development API proxy. FastAPI stays bound to 127.0.0.1;
  // the browser never has to call the laptop loopback from a separate phone.
  // Use a trusted private Wi-Fi only; this demo has no authentication.
  async rewrites() {
    return [{ source: "/api/:path*", destination: "http://127.0.0.1:8000/:path*" }];
  },
};
export default nextConfig;
