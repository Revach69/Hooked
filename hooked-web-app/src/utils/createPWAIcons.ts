// This utility creates placeholder PWA icons
// In a real production app, you would use proper design tools or libraries

export function createPWAIcon(size: number, text: string = 'H'): string {
  // Create SVG data URL for placeholder icon
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#9333ea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
      <text 
        x="50%" 
        y="50%" 
        text-anchor="middle" 
        dominant-baseline="middle" 
        fill="white" 
        font-size="${size * 0.6}" 
        font-family="Arial, sans-serif" 
        font-weight="bold"
      >${text}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Convert SVG data URL to blob for downloading
export async function svgToBlob(svgDataUrl: string): Promise<Blob> {
  const response = await fetch(svgDataUrl);
  return await response.blob();
}

// Generate all required PWA icons
export const pwaIconSizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 96, name: 'shortcut-join.png' },
  { size: 96, name: 'shortcut-profile.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 256, name: 'icon-256x256.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

export const generateIconsScript = () => {
  console.log('PWA Icons needed:');
  pwaIconSizes.forEach(({ size, name }) => {
    const iconSvg = createPWAIcon(size);
    console.log(`${name}: ${iconSvg.substring(0, 100)}...`);
  });
};