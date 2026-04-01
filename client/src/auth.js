export function getSessionRoleState() {
  const userType = sessionStorage.getItem("userType");
  const userRole = Number(sessionStorage.getItem("userRole"));
  const staffRole = Number(sessionStorage.getItem("staffRole"));

  if (userType === "admin" || (userRole === 1 && staffRole === 1)) {
    return {
      userType: "admin",
      isAdmin: true,
      isStaff: true,
      isCustomer: false,
    };
  }

  if (userType === "staff" || (userRole === 1 && staffRole === 2)) {
    return {
      userType: "staff",
      isAdmin: false,
      isStaff: true,
      isCustomer: false,
    };
  }

  if (userType === "customer" || userRole === 2) {
    return {
      userType: "customer",
      isAdmin: false,
      isStaff: false,
      isCustomer: true,
    };
  }

  return {
    userType,
    isAdmin: false,
    isStaff: false,
    isCustomer: false,
  };
}

export function getSessionUserType() {
  return getSessionRoleState().userType;
}
