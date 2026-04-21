export function getAuthError(code: string): { field: string; message: string } {
  switch (code) {
    case "auth/email-already-in-use":
      return { field: "email", message: "This email is already connected to an account. Try logging in instead." };
    case "auth/invalid-email":
      return { field: "email", message: "Please enter a valid email address." };
    case "auth/user-not-found":
      return { field: "email", message: "We couldn't find an account with this email." };
    case "auth/wrong-password":
      return { field: "password", message: "Your email or password is incorrect. Please try again." };
    case "auth/too-many-requests":
      return { field: "banner", message: "Too many failed attempts. Please wait a few minutes before trying again." };
    case "auth/network-request-failed":
      return { field: "banner", message: "It seems you're offline. Check your connection and try again." };
    case "auth/user-disabled":
      return { field: "banner", message: "This account is no longer active. Please contact support." };
    case "auth/weak-password":
      return { field: "password", message: "Please choose a stronger password." };
    default:
      return { field: "banner", message: "Something went wrong on our end. Please try again." };
  }
}

export function getBranchError(type: string): { field: string; message: string } {
  switch (type) {
    case "not-found":
      return { field: "branchId", message: "We couldn't find a branch with that ID. Check with your company admin." };
    case "wrong-password":
      return { field: "branchPassword", message: "That password is incorrect. Note: this is not your personal account password." };
    case "company-mismatch":
      return { field: "companyName", message: "This company name doesn't match the branch ID provided." };
    case "inactive":
      return { field: "banner", message: "This branch account is currently inactive." };
    default:
      return { field: "banner", message: "Something went wrong. Please try again." };
  }
}