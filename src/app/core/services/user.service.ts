import { Injectable } from '@angular/core';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  avatar?: string;
  phone?: string; // Added for buddy users
  
  // Healthcare professional fields
  license?: string; // Medical license number
  specialty?: string; // Medical specialty
  hospital?: string; // Hospital or practice name
  
  emergencyInstruction?: string;
  emergencyMessage?: {
    name: string;
    allergies: string;
    instructions: string;
    location: string;
    audioUrl?: string; // Optional audio instruction URL
  };
  emergencySettings?: {
    shakeToAlert: boolean;
    powerButtonAlert: boolean;
    audioInstructions: boolean;
  };
  emergencyLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    timestamp: any;
  };
  dateCreated: any;
  lastLogin: any;
  isActive: boolean;
  allergyOnboardingCompleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private db;
  private userProfileCache: Map<string, UserProfile> = new Map(); // Simple cache to reduce API calls

  constructor(
    private firebaseService: FirebaseService,
    private authService: AuthService
  ) {
    this.db = this.firebaseService.getDb();
  }

  // Create user profile in Firestore
  async createUserProfile(uid: string, userData: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }): Promise<void> {
    try {
      const userProfile: UserProfile = {
        uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName || '',
        fullName: `${userData.firstName} ${userData.lastName || ''}`.trim(),
        role: userData.role,
        dateCreated: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isActive: true
      };

      await setDoc(doc(this.db, 'users', uid), userProfile);
      
      // Cache the newly created profile
      this.userProfileCache.set(uid, userProfile);
      
      console.log('User profile created successfully');
      
      // Verify the document was created
      const createdDoc = await getDoc(doc(this.db, 'users', uid));
      if (createdDoc.exists()) {
        console.log('User profile creation verified');
      } else {
        console.error('User profile creation failed - document not found');
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // Get user profile from Firestore
  async getUserProfile(uid: string, useCache: boolean = true): Promise<UserProfile | null> {
    try {
      // Check cache first if enabled
      if (useCache && this.userProfileCache.has(uid)) {
        return this.userProfileCache.get(uid)!;
      }

      const userDoc = await getDoc(doc(this.db, 'users', uid));
      
      if (userDoc.exists()) {
        const profile = userDoc.data() as UserProfile;
        // Cache the profile
        this.userProfileCache.set(uid, profile);
        return profile;
      } else {
        console.log('No user profile found');
        return null;
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      await updateDoc(doc(this.db, 'users', uid), {
        ...updates,
        lastLogin: serverTimestamp()
      });
      
      // Clear cache to ensure fresh data on next request
      this.userProfileCache.delete(uid);
      
      console.log('User profile updated successfully');
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Clear user profile cache (useful for logout or data refresh)
  clearUserProfileCache(uid?: string): void {
    if (uid) {
      this.userProfileCache.delete(uid);
    } else {
      this.userProfileCache.clear();
    }
  }

  // Update last login timestamp
  async updateLastLogin(uid: string): Promise<void> {
    try {
      // First check if user document exists
      const userDoc = await getDoc(doc(this.db, 'users', uid));
      
      if (userDoc.exists()) {
        await updateDoc(doc(this.db, 'users', uid), {
          lastLogin: serverTimestamp()
        });
        console.log('Last login updated successfully');
      } else {
        console.log('User document does not exist, cannot update last login');
      }
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  // Get current user profile
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      const user = this.authService.getCurrentUser();
      if (user) {
        return await this.getUserProfile(user.uid);
      }
      return null;
    } catch (error) {
      console.error('Error getting current user profile:', error);
      throw error;
    }
  }

  // Delete user profile
  async deleteUserProfile(uid: string): Promise<void> {
    try {
      await deleteDoc(doc(this.db, 'users', uid));
      console.log('User profile deleted successfully');
    } catch (error) {
      console.error('Error deleting user profile:', error);
      throw error;
    }
  }

  // Check if user profile exists
  async userProfileExists(uid: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(this.db, 'users', uid));
      return userDoc.exists();
    } catch (error) {
      console.error('Error checking user profile existence:', error);
      return false;
    }
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      const usersRef = collection(this.db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  // Utility method to check and create profile for current user if needed
  async ensureUserProfileExists(): Promise<UserProfile | null> {
    try {
      const user = this.authService.getCurrentUser();
      if (!user) {
        return null;
      }

      let userProfile = await this.getUserProfile(user.uid);
      
      if (!userProfile && user.email) {
        // Create profile for existing auth user
        await this.createUserProfileFromAuth(user.uid, user.email);
        userProfile = await this.getUserProfile(user.uid);
      }

      return userProfile;
    } catch (error) {
      console.error('Error ensuring user profile exists:', error);
      return null;
    }
  }

  // Create buddy user profile (simplified registration)
  async createBuddyProfile(
    uid: string, 
    email: string, 
    firstName: string, 
    lastName: string,
    phone: string
  ): Promise<void> {
    try {
      const userProfile: UserProfile = {
        uid,
        email: email,
        firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
        fullName: `${firstName.charAt(0).toUpperCase() + firstName.slice(1)} ${lastName.charAt(0).toUpperCase() + lastName.slice(1)}`.trim(),
        role: 'buddy', // Buddy role
        phone: phone,
        dateCreated: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isActive: true
      };

      await setDoc(doc(this.db, 'users', uid), userProfile);
      console.log('Buddy profile created successfully');
    } catch (error) {
      console.error('Error creating buddy profile:', error);
      throw error;
    }
  }

  // Create user profile for existing auth users (migration helper)
  async createUserProfileFromAuth(uid: string, email: string): Promise<void> {
    try {
      // Check if profile already exists
      const existingProfile = await this.getUserProfile(uid);
      if (existingProfile) {
        console.log('User profile already exists');
        return;
      }

      // Extract names from email
      const emailParts = email.split('@')[0];
      const firstName = emailParts.split('.')[0] || 'User';
      const lastName = emailParts.split('.')[1] || '';

      const userProfile: UserProfile = {
        uid,
        email: email,
        firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
        fullName: `${firstName.charAt(0).toUpperCase() + firstName.slice(1)} ${lastName.charAt(0).toUpperCase() + lastName.slice(1)}`.trim(),
        role: 'user', // Default role for migrated users
        dateCreated: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isActive: true
      };

      await setDoc(doc(this.db, 'users', uid), userProfile);
      console.log('User profile created from existing auth user');
    } catch (error) {
      console.error('Error creating user profile from auth:', error);
      throw error;
    }
  }

  // Check if user has completed allergy onboarding
  async hasCompletedAllergyOnboarding(uid: string): Promise<boolean> {
    try {
      // First check user profile flag
      const userProfile = await this.getUserProfile(uid);
      if (userProfile && userProfile.allergyOnboardingCompleted) {
        return true;
      }
      
      // Fallback: check if user has any allergies saved
      const userAllergies = await this.getUserAllergies(uid);
      return userAllergies.length > 0;
    } catch (error) {
      console.error('Error checking allergy onboarding status:', error);
      return false;
    }
  }

  // Mark allergy onboarding as completed
  async markAllergyOnboardingCompleted(uid: string): Promise<void> {
    try {
      await updateDoc(doc(this.db, 'users', uid), {
        allergyOnboardingCompleted: true
      });
      console.log('Allergy onboarding marked as completed');
    } catch (error) {
      console.error('Error marking allergy onboarding as completed:', error);
      throw error;
    }
  }

  // Get user allergies (reusing from allergy service logic)
  async getUserAllergies(uid: string): Promise<any[]> {
    try {
      const allergiesRef = collection(this.db, 'allergies');
      const q = query(allergiesRef, where('userId', '==', uid));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting user allergies:', error);
      return [];
    }
  }

  // Update user avatar
  async updateUserAvatar(uid: string, avatarUrl: string): Promise<void> {
    try {
      await updateDoc(doc(this.db, 'users', uid), {
        avatar: avatarUrl
      });
      console.log('User avatar updated successfully');
    } catch (error) {
      console.error('Error updating user avatar:', error);
      throw error;
    }
  }

  // Get all doctors and nurses for doctor visit selection
  async getDoctorsAndNurses(): Promise<(UserProfile & { specialty?: string })[]> {
    try {
      const usersRef = collection(this.db, 'users');
      const q = query(usersRef, where('role', 'in', ['doctor', 'nurse']));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        ...(doc.data() as UserProfile),
        specialty: doc.data()['specialty'] || 'General Medicine'
      }));
    } catch (error) {
      console.error('Error getting doctors and nurses:', error);
      return [];
    }
  }
}

