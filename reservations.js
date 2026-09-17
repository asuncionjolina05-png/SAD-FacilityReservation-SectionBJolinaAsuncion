// ============================================================
// reservations.js
// Implements BR-B4-01 through BR-B4-09 from the lab's business rules.
// ============================================================

// ---------- Shared loaders ----------

async function loadAllReservations() {
    const { data, error } = await supabaseClient
        .from("reservations")
        .select("*, facilities(facility_name), requester:requester_id(email)")
        .order("start_time", { ascending: true });

    if (error) {
        console.error(error);
        return [];
    }
    return data;
}

async function loadOwnReservations(userId) {
    const { data, error } = await supabaseClient
        .from("reservations")
        .select("*, facilities(facility_name)")
        .eq("requester_id", userId)
        .order("start_time", { ascending: true });

    if (error) {
        console.error(error);
        return [];
    }
    return data;
}

// ---------- Step 15-20: Requester submits a reservation ----------

async function submitReservation(profile, { facilityId, purpose, startTime, endTime }) {
    // BR-B4-02: start must precede end
    if (new Date(startTime) >= new Date(endTime)) {
        alert("End time must be later than start time.");
        return null;
    }

    // BR-B4-01 / BR-B4-08: facility must be Active
    const { data: facility, error: facilityError } = await supabase
        .from("facilities")
        .select("status")
        .eq("id", facilityId)
        .single();

    if (facilityError || !facility || facility.status !== "Active") {
        alert("This facility is not available for reservation.");
        return null;
    }

    // BR-B4-03: no overlap with an already-committed reservation
    const { data: conflicts, error: conflictError } = await supabase
        .from("reservations")
        .select("*")
        .eq("facility_id", facilityId)
        .in("status", ["Approved", "Scheduled", "In Use"])
        .lt("start_time", endTime)
        .gt("end_time", startTime);

    if (conflictError) {
        alert(conflictError.message);
        return null;
    }

    if (conflicts && conflicts.length > 0) {
        alert("Conflict detected. This facility is already reserved during that time.");
        return null;
    }

    const { data, error } = await supabase
        .from("reservations")
        .insert([{
            facility_id: facilityId,
            requester_id: profile.id,
            purpose: purpose,
            start_time: startTime,
            end_time: endTime,
            status: "Pending"
        }])
        .select()
        .single();

    if (error) {
        alert(error.message);
        return null;
    }

    await logAudit(
        profile.id,
        "RESERVATION_SUBMITTED",
        "reservations",
        data.id,
        "Requester submitted a reservation request."
    );

    return data;
}

// ---------- Part 12: Administrator approval ----------

async function approveReservation(profile, reservationId) {
    if (profile.role !== "administrator") {
        alert("Only administrators can approve reservations.");
        return false;
    }

    const { data, error } = await supabaseClient
        .from("reservations")
        .update({
            status: "Approved",
            approved_by: profile.id,
            approved_at: new Date().toISOString()
        })
        .eq("id", reservationId)
        .eq("status", "Pending")
        .select()
        .single();

    if (error || !data) {
        alert(error ? error.message : "Reservation could not be approved.");
        return false;
    }

    await logAudit(
        profile.id,
        "RESERVATION_APPROVED",
        "reservations",
        reservationId,
        "Administrator approved reservation."
    );

    return true;
}

async function rejectReservation(profile, reservationId) {
    if (profile.role !== "administrator") {
        alert("Only administrators can reject reservations.");
        return false;
    }

    const { error, data } = await supabaseClient
        .from("reservations")
        .update({ status: "Rejected" })
        .eq("id", reservationId)
        .eq("status", "Pending")
        .select();

    if (error) {
        alert(error.message);
        return false;
    }
    if (!data || data.length === 0) {
        alert("Only Pending reservations can be rejected.");
        return false;
    }

    await logAudit(
        profile.id,
        "RESERVATION_REJECTED",
        "reservations",
        reservationId,
        "Administrator rejected reservation."
    );

    return true;
}

// ---------- Part 13: Facility Staff ----------

async function markInUse(profile, reservationId) {
    if (profile.role !== "facility_staff") {
        alert("Only Facility Staff can mark reservations as In Use.");
        return false;
    }

    const { error, data } = await supabaseClient
        .from("reservations")
        .update({ status: "In Use" })
        .eq("id", reservationId)
        .in("status", ["Approved", "Scheduled"])
        .select();

    if (error) {
        alert(error.message);
        return false;
    }
    if (!data || data.length === 0) {
        alert("Only Approved/Scheduled reservations can be marked In Use.");
        return false;
    }

    await logAudit(
        profile.id,
        "STATUS_CHANGED",
        "reservations",
        reservationId,
        "Facility Staff marked reservation as In Use."
    );

    return true;
}

async function completeReservation(profile, reservationId) {
    // BR-B4-07: Completed reservations cannot be edited further.
    if (profile.role !== "facility_staff") {
        alert("Only Facility Staff can complete reservations.");
        return false;
    }

    const { error, data } = await supabaseClient
        .from("reservations")
        .update({ status: "Completed" })
        .eq("id", reservationId)
        .eq("status", "In Use")
        .select();

    if (error) {
        alert(error.message);
        return false;
    }
    if (!data || data.length === 0) {
        alert("Only reservations currently In Use can be completed.");
        return false;
    }

    await logAudit(
        profile.id,
        "STATUS_CHANGED",
        "reservations",
        reservationId,
        "Facility Staff completed reservation."
    );

    return true;
}

// ---------- Part 14: Requester edit / cancel ----------

async function updateOwnReservation(userId, reservationId, updates) {
    // BR-B4-09: requesters may modify only their own Pending requests.
    const { data, error } = await supabase
        .from("reservations")
        .update(updates)
        .eq("id", reservationId)
        .eq("requester_id", userId)
        .eq("status", "Pending")
        .select();

    if (error) {
        alert(error.message);
        return false;
    }
    if (!data || data.length === 0) {
        alert("You can only edit your own Pending reservations.");
        return false;
    }

    alert("Reservation updated.");
    return true;
}

async function cancelReservation(userId, reservationId) {
    const { data, error } = await supabase
        .from("reservations")
        .update({ status: "Cancelled" })
        .eq("id", reservationId)
        .eq("requester_id", userId)
        .in("status", ["Pending", "Approved"])
        .select();

    if (error) {
        alert(error.message);
        return false;
    }
    if (!data || data.length === 0) {
        alert("This reservation cannot be cancelled.");
        return false;
    }

    await logAudit(
        userId,
        "RESERVATION_CANCELLED",
        "reservations",
        reservationId,
        "Requester cancelled reservation."
    );

    return true;
}
