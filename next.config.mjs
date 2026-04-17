/** @type {import('next').NextConfig} */
const nextConfig = {
	output: 'export',
	basePath: '/vanta-website',
	assetPrefix: '/vanta-website/',
	images: {
		unoptimized: true,
	},
};

export default nextConfig;
