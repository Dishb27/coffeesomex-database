/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  images: {
    domains: ["upload.wikimedia.org", "images.unsplash.com"],
  },
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    return config;
  },
  staticPageGenerationTimeout: 300, // ✅ 5 minutes – enough for the first DB connection
};

module.exports = nextConfig;
