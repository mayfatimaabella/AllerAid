import { Component, ViewChild } from '@angular/core';
import { ProductService } from '../../core/services/product.service';
import { BarcodeService } from '../../core/services/barcode.service';
import { ScanResultComponent } from './scan-result/scan-result.component';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
  standalone: false,
})
export class ScanPage {
  @ViewChild('scanResultModal') scanResultModal!: ScanResultComponent;
  @ViewChild('recentScansModal') recentScansModal!: any;

  manualBarcode: string = '';
  productInfo: any = null;
  allergenStatus: 'safe' | 'warning' | null = null;
  ingredientsToWatch: string[] = [];
  recentScans: any[] = [];
  isManualInputModalOpen: boolean = false;
  isRecentScansModalOpen: boolean = false;

  constructor(
    private productService: ProductService,
    private barcodeService: BarcodeService,
  ) {}

  scanAndFetchProduct(barcode: string) {
    if (!barcode || barcode.trim() === '') {
      alert('Please enter a valid barcode.');
      return;
    }

    // Reset display state
    this.productInfo = null;
    this.allergenStatus = null;
    this.ingredientsToWatch = [];

    this.productService.getProduct(barcode).subscribe(async (data: any) => {
      if (data.status === 1) {
        const product = data.product;

        // Smarter product name selection
        const productName =
          product.product_name ||
          product.product_name_en ||
          product.generic_name ||
          product.product_name_de ||
          product.product_name_fr ||
          'Unnamed Product';

        // Set productInfo with fallback name
        this.productInfo = {
          ...product,
          product_name: productName,
        };

        // Example user allergen list (later replace with Firestore user data)
        const userAllergens: string[] = ['milk', 'peanut', 'soy', 'egg', 'wheat', 'shellfish', 'tree nut'];

        // Extract ingredient/allergen data
        const ingredientsText = product.ingredients_text?.toLowerCase() || '';
        const allergensFromAPI = (product.allergens_tags || []).map((tag: string) =>
          tag.replace('en:', '').toLowerCase()
        );

        // Detect allergens from ingredients or API
        const matchedAllergens = userAllergens.filter(allergen =>
          ingredientsText.includes(allergen) || allergensFromAPI.includes(allergen)
        );

        // Determine allergen status
        if (matchedAllergens.length > 0) {
          this.allergenStatus = 'warning';
          this.ingredientsToWatch = matchedAllergens;
        } else if (!ingredientsText && allergensFromAPI.length === 0) {
          this.allergenStatus = 'warning';
          this.ingredientsToWatch = ['Unknown — insufficient data'];
        } else {
          this.allergenStatus = 'safe';
          this.ingredientsToWatch = [];
        }

        // Add to Recent Scans
        const scanEntry = {
          code: product.code || barcode,
          product_name: productName,
          brand: product.brands || 'Unknown Brand',
          status: this.allergenStatus,
          allergens: this.ingredientsToWatch,
          date: new Date().toISOString(),
          image_url: product.image_url || 'assets/img/placeholder.png',
        };

        // Add to temporary recent scans (in-memory)
        this.recentScans.unshift(scanEntry);
        this.recentScans = this.recentScans.slice(0, 10); // limit to last 10

        // Open the modal with the scan result
        this.openScanResultModal();

        // Debug logs
        console.log('Product:', productName);
        console.log('Matched Allergens:', this.ingredientsToWatch);
        console.log('Status:', this.allergenStatus);
        console.log('Recent Scans:', this.recentScans);

      } else {
        alert('Product not found in OpenFoodFacts.');
        this.productInfo = null;
        this.allergenStatus = null;
        this.ingredientsToWatch = [];
      }
    });
  }

  // Open the scan result modal
  openScanResultModal() {
    if (this.scanResultModal) {
      this.scanResultModal.openModal();
    }
  }

  // Camera scanning
  async startCameraScan() {
    try {
      console.log('=== SCAN PAGE: Starting camera scan ===');

      const scannedBarcode = await this.barcodeService.scanBarcode();

      if (scannedBarcode) {
        console.log('=== SCAN PAGE: Scanned barcode received ===', scannedBarcode);
        this.scanAndFetchProduct(scannedBarcode);
        this.manualBarcode = scannedBarcode;
      } else {
        console.log('=== SCAN PAGE: No barcode scanned or scan cancelled ===');
      }
    } catch (error) {
      console.error('=== SCAN PAGE: Error during barcode scan ===', error);
    }
  }

  viewScan(scan: any) {
    this.productInfo = {
      product_name: scan.product_name,
      brands: scan.brand,
      ingredients_text: 'Ingredients unavailable — viewed from recent scans.',
      image_url: scan.image_url,
    };
    this.allergenStatus = scan.status;
    this.ingredientsToWatch = scan.allergens || [];

    // Open the modal
    this.openScanResultModal();
  }

  openManualInputModal() {
    this.isManualInputModalOpen = true;
  }

  viewRecentScans() {
    if (this.recentScansModal) {
      this.recentScansModal.openModal();
    }
  }

  onBarcodeSubmitted(barcode: string) {
    this.scanAndFetchProduct(barcode);
    this.isManualInputModalOpen = false;
  }

  onRecentScanSelected(scan: any) {
    this.viewScan(scan);
    this.recentScansModal.onDismiss();
  }
}
