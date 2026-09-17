// ============================================================
// audit.js
// Writes one row to audit_logs
// ============================================================

async function logAudit(userId, action, tableName, recordId, description) {
    const { error } = await supabaseClient
        .from("audit_logs")
        .insert([
            {
                user_id: userId,
                action: action,
                table_name: tableName,
                record_id: recordId,
                description: description
            }
        ]);

    if (error) {
        // Do not block the user's action if audit logging fails
        console.error("Audit log failed:", error);
    }
}