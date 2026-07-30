export class ImageProcessor {
  private static async loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  private static async loadLogo(): Promise<HTMLImageElement> {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = '/lovable-uploads/1e60d86b-4ca2-4886-89a4-0622c8b88e79.png';
    return new Promise((resolve, reject) => {
      logoImg.onload = () => resolve(logoImg);
      logoImg.onerror = reject;
    });
  }

  static async processImageWithWatermark(file: File): Promise<Blob> {
    try {
      // Create object URL for the file
      const imageUrl = URL.createObjectURL(file);
      
      // Load the image and logo
      const [image, logo] = await Promise.all([
        this.loadImage(imageUrl),
        this.loadLogo()
      ]);

      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Set canvas size to image size
      canvas.width = image.width;
      canvas.height = image.height;
      
      // Draw the original image
      ctx.drawImage(image, 0, 0);
      
      // Draw green translucent bar at bottom (faixa mais fina)
      const barHeight = Math.max(36, image.height * 0.055);
      ctx.fillStyle = 'rgba(0, 123, 60, 0.8)';
      ctx.fillRect(0, image.height - barHeight, image.width, barHeight);

      // Draw logo in bottom right corner (maior e centralizado na faixa)
      const padding = barHeight * 0.14;
      const maxLogoHeight = barHeight - padding * 2;
      const byWidth = Math.min(image.width * 0.22, 260);
      let logoWidth = byWidth;
      let logoHeight = (logoWidth / logo.width) * logo.height;
      if (logoHeight > maxLogoHeight) {
        logoHeight = maxLogoHeight;
        logoWidth = (logoHeight / logo.height) * logo.width;
      }
      const logoX = image.width - logoWidth - barHeight * 0.4;
      const logoY = image.height - barHeight + (barHeight - logoHeight) / 2;

      ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);

      
      // Convert canvas to blob
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(imageUrl);
          resolve(blob!);
        }, 'image/jpeg', 0.9);
      });
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  }
}