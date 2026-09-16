// ============================================================
// audit.js
// Step 20 (and reused throughout Parts 12-15): write one row to
// audit_logs. Inserting directly from JS is simpler than the RPC
// function for a 3-hour lab, so that's the path used everywhere.
// ============================================================

async function logAudit(userId, action, tableName, recordId, description) {
    const { error } = await supabase
        .from("audit_logs")
        .insert([{
            user_id: userId,
            action: action,
            table_name: tableName,
            record_id: recordId,
            description: description
        }]);

    if (error) {
        // Don't block the user's action just because logging failed —
        // just surface it in the console for debugging.
        console.error("Audit log failed:", error);
    }
}
