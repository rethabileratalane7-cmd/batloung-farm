const { pool } = require('../config/db');
const { DEFAULT_LOW_STOCK } = require('../config/constants');

/** AVAILABLE (plenty) | LOW_STOCK (1..threshold) | NOT_AVAILABLE (0 boxes). */
const withStatus = (rows) => rows.map((r) => ({
  ...r,
  stock_status: r.available_quantity === 0 ? 'NOT_AVAILABLE'
    : r.available_quantity <= DEFAULT_LOW_STOCK ? 'LOW_STOCK' : 'AVAILABLE',
}));

const BASE = `
  SELECT f.fruit_id, f.fruit_name, f.status, s.packaging_size,
         s.available_quantity, p.selling_price
  FROM stock s
  JOIN fruits f ON f.fruit_id = s.fruit_id
  JOIN packaging_prices p ON p.packaging_size = s.packaging_size`;
const ORDER = `ORDER BY f.fruit_name, FIELD(s.packaging_size, 'SMALL', 'MEDIUM', 'LARGE')`;

/** Stock for every fruit and packaging size. */
exports.findAll = async () => withStatus((await pool.query(`${BASE} ${ORDER}`))[0]);

exports.findByFruit = async (fruitId) =>
  withStatus((await pool.query(`${BASE} WHERE s.fruit_id = ? ${ORDER}`, [fruitId]))[0]);

/** Active fruits whose stock is at or below the threshold, lowest first. */
exports.findLow = async (threshold) =>
  withStatus((await pool.query(
    `${BASE} WHERE s.available_quantity <= ? AND f.status = 'ACTIVE'
     ORDER BY s.available_quantity ASC, f.fruit_name`,
    [threshold]
  ))[0]);

exports.getPrices = async () =>
  (await pool.query(`SELECT packaging_size, selling_price FROM packaging_prices
                     ORDER BY FIELD(packaging_size, 'SMALL', 'MEDIUM', 'LARGE')`))[0];

exports.setPrice = async (size, price) =>
  (await pool.query('UPDATE packaging_prices SET selling_price = ? WHERE packaging_size = ?', [price, size]))[0].affectedRows;
