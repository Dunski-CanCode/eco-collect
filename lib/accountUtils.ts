import { auth, db } from "@/lib/firebase";
import { deleteDoc, doc, collection, query, where, getDocs, updateDoc, addDoc, writeBatch } from "firebase/firestore";
import { deleteUser } from "firebase/auth";

// Mark all open/active chats for a collector as "account_deleted" and put listings back
async function cascadeDeleteCollector(uid: string) {
  const batch = writeBatch(db);

  // Delete all listings owned by this collector
  const listingsSnap = await getDocs(query(collection(db, "listings"), where("userId", "==", uid)));
  for (const listingDoc of listingsSnap.docs) {
    batch.delete(listingDoc.ref);
  }

  // Mark all their chats as account_deleted
  const chatsSnap = await getDocs(query(collection(db, "chats"), where("collectorId", "==", uid)));
  for (const chatDoc of chatsSnap.docs) {
    const data = chatDoc.data();
    if (data.status !== "closed" && data.status !== "account_deleted") {
      batch.update(chatDoc.ref, { status: "account_deleted", deletedParty: "collector" });
    }
  }

  await batch.commit();
}

// Mark all open chats for a branch as "account_deleted" and restore any in-negotiation listings
async function cascadeDeleteBranch(branchDocId: string) {
  const batch = writeBatch(db);

  const chatsSnap = await getDocs(query(collection(db, "chats"), where("initiatingBranchId", "==", branchDocId)));
  for (const chatDoc of chatsSnap.docs) {
    const data = chatDoc.data();
    if (data.status !== "closed" && data.status !== "account_deleted") {
      batch.update(chatDoc.ref, { status: "account_deleted", deletedParty: "branch" });
      // If listing was hidden due to negotiation, restore it
      if (data.listingId && (data.status === "open" || data.status === "close_requested")) {
        batch.update(doc(db, "listings", data.listingId), { status: "available" });
      }
    }
  }

  // Delete the branch doc itself
  batch.delete(doc(db, "branches", branchDocId));

  await batch.commit();
}

export const deleteBranchAccount = async (branchDocId: string, branchName: string): Promise<void> => {
  if (!confirm(`Permanently delete branch "${branchName}"? This cannot be undone.`)) return;
  await cascadeDeleteBranch(branchDocId);
};

export const deleteUserAccount = async (): Promise<void> => {
  if (!confirm("Permanently delete your account? This cannot be undone.")) {
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user logged in");
  }

  try {
    // Load role to decide cascade
    const { getDoc } = await import("firebase/firestore");
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const role = userSnap.exists() ? userSnap.data().role : null;

    if (role === "collector") {
      await cascadeDeleteCollector(user.uid);
    } else if (role === "business") {
      // Delete all branches + their chats
      const branchesSnap = await getDocs(query(collection(db, "branches"), where("parentBusinessId", "==", user.uid)));
      for (const branchDoc of branchesSnap.docs) {
        await cascadeDeleteBranch(branchDoc.id);
      }
    }

    // Delete user data from Firestore
    await deleteDoc(doc(db, "users", user.uid));
    // Delete user from Firebase Auth
    await deleteUser(user);
    // Redirect to home page
    window.location.assign("/");
  } catch (error) {
    alert("Please log in again before deleting your account for security reasons.");
    throw error;
  }
};