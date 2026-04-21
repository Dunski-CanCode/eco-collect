export type UserRole = "collector" | "business" | "branch";

export function getAvatarConfig(role: UserRole) {
  switch (role) {
    case "collector":
      return {
        shape: "circle",
        bg: "#E8F5E2",
        border: "#4A6741",
        icon: "collector",
        label: "Collector",
      };
    case "business":
      return {
        shape: "rounded-square",
        bg: "#FDF3E3",
        border: "#8C6D51",
        icon: "business",
        label: "Business",
      };
    case "branch":
      return {
        shape: "rounded-square",
        bg: "#EAF0FD",
        border: "#5C7FC2",
        icon: "branch",
        label: "Branch",
      };
  }
}