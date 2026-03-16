import { Injectable } from '@angular/core';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private storage = getStorage(initializeApp(environment.firebaseConfig));

  /* ===============================
   * Firebase upload (UNCHANGED)
   * =============================== */
  async uploadLicense(file: File, userId: string): Promise<string> {
    const fileRef = ref(this.storage, `licenses/${userId}/${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  }

  /* ===============================
   * Recent Scans (LOCAL STORAGE)
   * =============================== */

  private RECENT_SCANS_KEY = 'recent_scans';

  async getRecentScans(): Promise<any[]> {
    const raw = localStorage.getItem(this.RECENT_SCANS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  async addRecentScan(scan: any): Promise<void> {
    let scans = await this.getRecentScans();

    // 1. Find the index of an existing scan with the same barcode 'code'
    const existingIndex = scans.findIndex(s => s.code === scan.code);

    // 2. If it exists, remove it so we can re-insert it at the top
    if (existingIndex !== -1) {
      scans.splice(existingIndex, 1);
    }

    // 3. Add the new scan to the beginning of the array
    scans.unshift({
      ...scan,
      timestamp: Date.now() // Always refresh timestamp for the "Recent" sort order
    });

    // 4. Keep only the latest 10 scans and save
    localStorage.setItem(
      this.RECENT_SCANS_KEY,
      JSON.stringify(scans.slice(0, 10))
    );
  }

  async deleteRecentScan(index: number): Promise<void> {
    const scans = await this.getRecentScans();
    if (index > -1 && index < scans.length) {
      scans.splice(index, 1);
      localStorage.setItem(this.RECENT_SCANS_KEY, JSON.stringify(scans));
    }
  }

  async clearRecentScans(): Promise<void> {
    localStorage.removeItem(this.RECENT_SCANS_KEY);
  }
}