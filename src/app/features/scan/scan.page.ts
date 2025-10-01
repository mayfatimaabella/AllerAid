import { Component } from '@angular/core';
import { ProductService } from '../../core/services/product.service';
import { BarcodeService } from '../../core/services/barcode.service';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
  standalone: false,
})
export class ScanPage {
  manualBarcode: string = '';
  productInfo: any = null;
  allergenStatus: 'safe' | 'warning' | null = null;
  ingredientsToWatch: string[] = [];

  constructor(
    private productService: ProductService,
    private barcodeService: BarcodeService
  ) {}

  scanAndFetchProduct(barcode: string) {
    if (!barcode || barcode.trim() === '') {
      alert('Please enter a valid barcode.');
      return;
    }

    // Show loading state
    this.productInfo = null;
    this.allergenStatus = null;
    this.ingredientsToWatch = [];

    this.productService.getProduct(barcode).subscribe(async (data: any) => {
      if (data.status === 1) {
        const product = data.product;
        this.productInfo = product;

        // TODO: Get user allergens from user profile/settings service
        // For now, skip allergen checking or implement dynamic user allergen retrieval
        const userAllergens: string[] = []; // Empty array - to be populated from user profile
        
        if (userAllergens.length > 0) {
          // Use enhanced allergen detection only if user has configured allergens
          const allergenResult = await this.barcodeService.checkProductForAllergens(barcode, userAllergens);
          
          // Map the new status to your existing UI
          switch (allergenResult.status) {
            case 'safe':
              this.allergenStatus = 'safe';
              this.ingredientsToWatch = [];
              break;
            case 'warning':
            case 'contains_allergen':
              this.allergenStatus = 'warning';
              this.ingredientsToWatch = allergenResult.matchingAllergens;
              break;
          }

          console.log('Allergen Status:', this.allergenStatus);
          console.log('Ingredients to watch:', this.ingredientsToWatch);
          console.log('Detection result:', allergenResult);
        } else {
          // No allergens configured - show product info without allergen checking
          this.allergenStatus = null;
          this.ingredientsToWatch = [];
          console.log('No user allergens configured - skipping allergen check');
        }
      } else {
        alert('Product not found in OpenFoodFacts.');
        this.productInfo = null;
        this.allergenStatus = null;
        this.ingredientsToWatch = [];
      }
    });
  }

  // Function to handle camera scanning
  async startCameraScan() {
    try {
      console.log('=== SCAN PAGE: Starting camera scan ===');
      
      const scannedBarcode = await this.barcodeService.scanBarcode();
      
      if (scannedBarcode) {
        console.log('=== SCAN PAGE: Scanned barcode received ===', scannedBarcode);
        // Use the scanned barcode to fetch product info
        this.scanAndFetchProduct(scannedBarcode);
        // Also update the manual input field with the scanned code
        this.manualBarcode = scannedBarcode;
      } else {
        console.log('=== SCAN PAGE: No barcode scanned or scan cancelled ===');
      }
    } catch (error) {
      console.error('=== SCAN PAGE: Error during barcode scan ===', error);
      // The error is already handled in the barcode service, so no need to show another alert here
    }
  }
}








