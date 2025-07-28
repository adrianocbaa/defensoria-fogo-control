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
    // Create a simple DIF logo using canvas if no image is available
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    
    // Draw simple DIF logo
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 120, 40);
    ctx.fillStyle = '#007B3C';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('DIF', 10, 25);
    
    const logoImg = new Image();
    logoImg.src = canvas.toDataURL();
    return new Promise((resolve) => {
      logoImg.onload = () => resolve(logoImg);
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
      
      // Draw green translucent bar at bottom
      const barHeight = Math.max(50, image.height * 0.08);
      ctx.fillStyle = 'rgba(0, 123, 60, 0.8)';
      ctx.fillRect(0, image.height - barHeight, image.width, barHeight);
      
      // Draw logo in bottom right corner
      const logoWidth = Math.min(120, image.width * 0.3);
      const logoHeight = (logoWidth / logo.width) * logo.height;
      const logoX = image.width - logoWidth - 20;
      const logoY = image.height - logoHeight - 10;
      
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