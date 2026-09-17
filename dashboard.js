// ============================================================
// dashboard.js
// Step 13: counts shown as the summary tiles on each dashboard.
// ============================================================

async function countByStatus(table, filters = {}) {
    let query = supabaseClient.from(table).select("*", { count: "exact", head: true });
    Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            query = query.in(key, value);
        } else {
            query = query.eq(key, value);
        }
    });
    const { count, error } = await query;
    if (error) {
        console.error(error);
        return 0;
    }
    return count ?? 0;
}

async function loadAdminStats() {
    const [totalFacilities, pending, approved, auditCount] = await Promise.all([
        countByStatus("facilities"),
        countByStatus("reservations", { status: "Pending" }),
        countByStatus("reservations", { status: "Approved" }),
        countByStatus("audit_logs")
    ]);
    return { totalFacilities, pending, approved, auditCount };
}

async function loadStaffStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { count: todayCount } = await supabaseClient
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .gte("start_time", todayStart.toISOString())
        .lte("start_time", todayEnd.toISOString());

    const [approved, inUse, completed] = await Promise.all([
        countByStatus("reservations", { status: ["Approved", "Scheduled"] }),
        countByStatus("reservations", { status: "In Use" }),
        countByStatus("reservations", { status: "Completed" })
    ]);

    return { today: todayCount ?? 0, approved, inUse, completed };
}

async function loadRequesterStats(userId) {
    const [pending, approved, total] = await Promise.all([
        countByStatus("reservations", { requester_id: userId, status: "Pending" }),
        countByStatus("reservations", { requester_id: userId, status: "Approved" }),
        countByStatus("reservations", { requester_id: userId })
    ]);
    const activeFacilities = await countByStatus("facilities", { status: "Active" });
    return { pending, approved, total, activeFacilities };
}
