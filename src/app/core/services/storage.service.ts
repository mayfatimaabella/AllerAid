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
    const scans = await this.getRecentScans();

    // Prevent duplicates (by id or timestamp if available)
    const exists = scans.find(s =>
      (scan.id && s.id === scan.id) ||
      (scan.timestamp && s.timestamp === scan.timestamp)
    );

    if (!exists) {
      scans.unshift({
        ...scan,
        timestamp: scan.timestamp || Date.now()
      });
    }

    // Keep only latest 10 scans
    localStorage.setItem(
      this.RECENT_SCANS_KEY,
      JSON.stringify(scans.slice(0, 10))
    );
  }

  async deleteRecentScan(index: number): Promise<void> {
    const scans = await this.getRecentScans();
    scans.splice(index, 1);
    localStorage.setItem(this.RECENT_SCANS_KEY, JSON.stringify(scans));
  }

  async clearRecentScans(): Promise<void> {
    localStorage.removeItem(this.RECENT_SCANS_KEY);
  }
}