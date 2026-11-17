/** Rounds a money value to 2 decimal places (avoids floating point drift). */
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * UPDATE helper. Column names come only from validated schemas (never from
 * raw user input), values are always bound as parameters.
 */
async function updateById(conn, table, idColumn, id, data) {
  const keys = Object.keys(data);
  if (keys.length === 0) return 0;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const [result] = await conn.query(
    `UPDATE ${table} SET ${setClause} WHERE ${idColumn} = ?`,
    [...keys.map((k) => data[k]), id]
  );
  return result.affectedRows;
}

module.exports = { round2, updateById };
