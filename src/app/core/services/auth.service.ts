// ...existing imports...
import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User, onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
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

  // Resend verification email to current user
  async resendVerificationEmail() {
    const user = this.auth.currentUser;
    if (user) {
      await sendEmailVerification(user);
      console.log('Verification email resent to', user.email);
    } else {
      throw new Error('No user is currently signed in.');
    }
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

  // Sign in with email and password, require email verification
  async signIn(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
    await userCredential.user.reload();
    if (!userCredential.user.emailVerified) {
      // Optionally, you can resend the verification email here
      // await sendEmailVerification(userCredential.user);
      throw { code: 'auth/email-not-verified', message: 'Please verify your email address before logging in.' };
    }
    return userCredential;
  }

  // Create user with email and password, then send verification email
  async signUp(email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    try {
      await sendEmailVerification(userCredential.user);
      console.log('Verification email sent to', userCredential.user.email);
    } catch (verifyError) {
      console.error('Failed to send verification email:', verifyError);
      // proceed — account created even if email send failed
    }
    return userCredential;
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

