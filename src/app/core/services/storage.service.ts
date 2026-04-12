import { Injectable } from '@angular/core';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private storage = getStorage(initializeApp(environment.firebaseConfig));

  async uploadLicense(file: File, userId: string): Promise<string> {
    const fileRef = ref(this.storage, `licenses/${userId}/${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  }
}
  