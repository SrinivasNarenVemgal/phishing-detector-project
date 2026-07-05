import { query } from "./db";

// ---------- Users ----------

export async function createUser({ name, email, passwordHash, role }) {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name, email, passwordHash, role]
  );
  return rows[0];
}

export async function getUserByEmail(email) {
  const { rows } = await query(`SELECT * FROM users WHERE email = $1`, [email]);
  return rows[0] || null;
}

export async function getUserById(id) {
  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function countUsers() {
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM users`);
  return rows[0].count;
}

export async function getAllUsersWithScanCounts() {
  const { rows } = await query(`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
           COUNT(s.id)::int AS scan_count
    FROM users u
    LEFT JOIN scans s ON s.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at ASC
  `);
  return rows;
}

export async function updateUserRole(userId, role) {
  await query(`UPDATE users SET role = $1 WHERE id = $2`, [role, userId]);
}

// ---------- Scans ----------

export async function createScan({
  userId, scanType, content, result, riskLevel, riskScore, reasons, domainAge, virusTotal,
}) {
  const { rows } = await query(
    `INSERT INTO scans (user_id, scan_type, content, result, risk_level, risk_score, reasons, domain_age, virus_total)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, created_at`,
    [userId, scanType, content, result, riskLevel, riskScore, JSON.stringify(reasons || []),
      domainAge ? JSON.stringify(domainAge) : null, virusTotal ? JSON.stringify(virusTotal) : null]
  );
  return rows[0];
}

export async function getScansByUser(userId) {
  const { rows } = await query(
    `SELECT * FROM scans WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map(mapScanRow);
}

export async function getScanStatsByUser(userId) {
  const { rows } = await query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE risk_level = 'LOW')::int AS safe,
       COUNT(*) FILTER (WHERE risk_level != 'LOW')::int AS suspicious
     FROM scans WHERE user_id = $1`,
    [userId]
  );
  return rows[0];
}

export async function getScanById(id) {
  const { rows } = await query(`SELECT * FROM scans WHERE id = $1`, [id]);
  return rows[0] ? mapScanRow(rows[0]) : null;
}

export async function getAllScansFiltered({ riskLevel, scanType, q, limit = 200 }) {
  const conditions = [];
  const params = [];
  if (riskLevel) {
    params.push(riskLevel);
    conditions.push(`s.risk_level = $${params.length}`);
  }
  if (scanType) {
    params.push(scanType);
    conditions.push(`s.scan_type = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(`s.content ILIKE $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit);

  const { rows } = await query(
    `SELECT s.*, u.name AS user_name, u.email AS user_email
     FROM scans s
     JOIN users u ON u.id = s.user_id
     ${where}
     ORDER BY s.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return rows.map((r) => ({ ...mapScanRow(r), userName: r.user_name, userEmail: r.user_email }));
}

export async function getGlobalStats() {
  const { rows } = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      COUNT(*)::int AS total_scans,
      COUNT(*) FILTER (WHERE scan_type = 'url')::int AS url_scans,
      COUNT(*) FILTER (WHERE scan_type = 'email')::int AS email_scans,
      COUNT(*) FILTER (WHERE risk_level = 'HIGH')::int AS high_risk,
      COUNT(*) FILTER (WHERE risk_level = 'MEDIUM')::int AS medium_risk,
      COUNT(*) FILTER (WHERE risk_level = 'LOW')::int AS low_risk
    FROM scans
  `);
  return rows[0];
}

function mapScanRow(r) {
  return {
    id: r.id,
    userId: r.user_id,
    scanType: r.scan_type,
    content: r.content,
    result: r.result,
    riskLevel: r.risk_level,
    riskScore: r.risk_score,
    reasons: r.reasons || [],
    domainAge: r.domain_age || null,
    virusTotal: r.virus_total || null,
    createdAt: r.created_at,
  };
}

// ---------- Reports ----------

export async function createReport({ userId, scanId, reportType, riskLevel, riskScore, summary, details }) {
  const { rows } = await query(
    `INSERT INTO reports (user_id, scan_id, report_type, risk_level, risk_score, summary, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, created_at`,
    [userId, scanId, reportType, riskLevel, riskScore, summary, JSON.stringify(details)]
  );
  return rows[0];
}

export async function getReportsByUser(userId) {
  const { rows } = await query(
    `SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map(mapReportRow);
}

export async function getAllReportsWithUser() {
  const { rows } = await query(`
    SELECT r.*, u.name AS user_name, u.email AS user_email
    FROM reports r
    JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC
  `);
  return rows.map((r) => ({ ...mapReportRow(r), userName: r.user_name, userEmail: r.user_email }));
}

function mapReportRow(r) {
  return {
    id: r.id,
    userId: r.user_id,
    scanId: r.scan_id,
    reportType: r.report_type,
    riskLevel: r.risk_level,
    riskScore: r.risk_score,
    summary: r.summary,
    details: r.details || {},
    createdAt: r.created_at,
  };
}

// ---------- Custom keywords ----------

export async function getCustomKeywords() {
  const { rows } = await query(`SELECT keyword FROM custom_keywords ORDER BY created_at ASC`);
  return rows.map((r) => r.keyword);
}

export async function addCustomKeyword(keyword) {
  await query(`INSERT INTO custom_keywords (keyword) VALUES ($1) ON CONFLICT DO NOTHING`, [keyword]);
  return getCustomKeywords();
}

export async function removeCustomKeyword(keyword) {
  await query(`DELETE FROM custom_keywords WHERE keyword = $1`, [keyword]);
  return getCustomKeywords();
}
