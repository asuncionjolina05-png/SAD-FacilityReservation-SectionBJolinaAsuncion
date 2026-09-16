// ============================================================
// auth.js
// ============================================================

async function getCurrentUserProfile() {
    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    console.log("Authenticated user:", user);
    console.log("User error:", userError);

    if (userError || !user) {
        return null;
    }

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    console.log("Profile data:", data);
    console.log("Profile error:", error);

    if (error) {
        console.error("Error fetching profile:", error);
        return null;
    }

    return data;
}

async function requireLogin() {
    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
        window.location.href = "login.html";
        return null;
    }

    return user;
}

async function requireRole(allowedRoles) {
    const profile = await getCurrentUserProfile();

    if (!profile) {
        window.location.href = "login.html";
        return null;
    }

    if (!profile.is_active) {
        alert("Your account has been deactivated.");
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
        return null;
    }

    if (!allowedRoles.includes(profile.role)) {
        alert("Access denied.");
        window.location.href = "login.html";
        return null;
    }

    return profile;
}

function dashboardUrlForRole(role) {
    if (role === "administrator") {
        return "admin-dashboard.html";
    }

    if (role === "facility_staff") {
        return "staff-dashboard.html";
    }

    if (role === "requester") {
        return "requester-dashboard.html";
    }

    return "login.html";
}

async function redirectByRole() {
    console.log("Checking user role...");

    const profile = await getCurrentUserProfile();

    console.log("Profile received:", profile);

    if (!profile) {
        alert("Profile not found for this account. Check the profiles table in Supabase.");
        return;
    }

    if (!profile.is_active) {
        alert("Your account has been deactivated.");
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
        return;
    }

    const dashboard = dashboardUrlForRole(profile.role);

    console.log("Redirecting to:", dashboard);

    window.location.href = dashboard;
}

async function signOut() {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
}

function renderUserChrome(profile) {
    document.querySelectorAll("[data-user-name]").forEach((element) => {
        element.textContent = profile.full_name;
    });

    document.querySelectorAll("[data-user-role]").forEach((element) => {
        element.textContent = profile.role.replace("_", " ");
    });

    document.querySelectorAll("[data-signout]").forEach((element) => {
        element.addEventListener("click", signOut);
    });
}