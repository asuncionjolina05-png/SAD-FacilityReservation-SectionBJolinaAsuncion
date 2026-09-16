// ============================================================
// facilities.js
// Step 5 / Part 15: facility status + admin add/edit/delete
// Used by: facilities.html and the reservation form's facility dropdown
// ============================================================

async function loadFacilities() {
    const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .order("facility_name", { ascending: true });

    if (error) {
        console.error(error);
        return [];
    }
    return data;
}

function statusBadgeClass(status) {
    const map = {
        "Active": "tag tag-active",
        "Maintenance": "tag tag-maintenance",
        "Inactive": "tag tag-inactive",
        "Pending": "tag tag-pending",
        "Approved": "tag tag-approved",
        "Rejected": "tag tag-rejected",
        "Scheduled": "tag tag-scheduled",
        "In Use": "tag tag-inuse",
        "Completed": "tag tag-completed",
        "Cancelled": "tag tag-cancelled"
    };
    return map[status] || "tag";
}

// Populates a <select> with Active facilities only (for the reservation form).
async function populateFacilitySelect(selectEl) {
    const facilities = await loadFacilities();
    selectEl.innerHTML = '<option value="">Select a facility</option>';
    facilities
        .filter(f => f.status === "Active")
        .forEach(f => {
            const opt = document.createElement("option");
            opt.value = f.id;
            opt.textContent = `${f.facility_name} (capacity ${f.capacity ?? "—"})`;
            selectEl.appendChild(opt);
        });
}

// ---------- Administrator: add / edit / delete ----------

async function createFacility(profile, payload) {
    const { data, error } = await supabase
        .from("facilities")
        .insert([payload])
        .select()
        .single();

    if (error) {
        alert(error.message);
        return null;
    }

    await logAudit(
        profile.id,
        "FACILITY_UPDATED",
        "facilities",
        data.id,
        `Administrator created facility "${data.facility_name}".`
    );

    return data;
}

async function updateFacility(profile, facilityId, payload) {
    const { data, error } = await supabase
        .from("facilities")
        .update(payload)
        .eq("id", facilityId)
        .select()
        .single();

    if (error) {
        alert(error.message);
        return null;
    }

    await logAudit(
        profile.id,
        "FACILITY_UPDATED",
        "facilities",
        facilityId,
        "Administrator updated facility information."
    );

    return data;
}

async function deleteFacility(profile, facilityId) {
    const { error } = await supabase
        .from("facilities")
        .delete()
        .eq("id", facilityId);

    if (error) {
        alert(error.message);
        return false;
    }

    await logAudit(
        profile.id,
        "FACILITY_DELETED",
        "facilities",
        facilityId,
        "Administrator deleted a facility."
    );

    return true;
}
