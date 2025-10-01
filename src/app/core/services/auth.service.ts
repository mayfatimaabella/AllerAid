import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User, onAuthStateChanged } from 'firebase/auth';
import { firebaseConfig } from './firebase.config';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private authInitialized = false;

  constructor() {
    const app = initializeApp(firebaseConfig);
    this.auth = getAuth(app);
    
    // Listen to auth state changes
    onAuthStateChanged(this.auth, (user) => {
      console.log('Auth state changed:', user?.email || 'No user');
      this.currentUserSubject.next(user);
      this.authInitialized = true;
    });
  }

  // Get current user as observable
  getCurrentUser$(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  // Get current user synchronously (may return null if not initialized)
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  // Get current user email
  getCurrentUserEmail(): string | null {
    const user = this.auth.currentUser;
    return user ? user.email : null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.auth.currentUser !== null;
  }

  // Wait for auth to be initialized and return user
  async waitForAuthInit(): Promise<User | null> {
    return new Promise((resolve) => {
      if (this.authInitialized) {
        resolve(this.auth.currentUser);
        return;
      }
      
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  // Sign in with email and password
  async signIn(email: string, password: string) {
    return await signInWithEmailAndPassword(this.auth, email, password);
  }

  // Create user with email and password
  async signUp(email: string, password: string) {
    return await createUserWithEmailAndPassword(this.auth, email, password);
  }

  // Sign out
  async signOut() {
    try {
      await signOut(this.auth);
      // Reset the user state
      this.currentUserSubject.next(null);
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Get auth instance
  getAuth(): Auth {
    return this.auth;
  }
}

