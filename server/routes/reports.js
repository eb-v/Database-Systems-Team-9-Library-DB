const db = require('../db');
  const { URL } = require('url');

  async function getPopularityReport(req, res) {
      try {
          const { searchParams } = new URL(req.url, 'http://localhost');
          const type   = searchParams.get('type');
          const genre  = searchParams.get('genre');
          const from   = searchParams.get('from');
          const to     = searchParams.get('to');
          const limit  = parseInt(searchParams.get('limit')) || 25;

          const validSorts = ['times_checked_out', 'demand_ratio', 'active_holds',
  'borrowing_rate'];
          const orderBy = validSorts.includes(searchParams.get('sort')) ?
  searchParams.get('sort') : 'times_checked_out';

          const [rows] = await db.query(
              `SELECT
                  i.Item_ID,
                  i.Item_name,
                  i.Item_type,
                  COALESCE(b.genre, cd.genre)
                AS genre,
                  b.author_firstName,
                  b.author_lastName,
                  COUNT(DISTINCT bi.BorrowedItem_ID)
                AS times_checked_out,
                  COUNT(DISTINCT cp.Copy_ID)
                AS copy_count,
                  SUM(CASE WHEN cp.Copy_status = 1 THEN 1 ELSE 0 END)
               AS available_copies,
                  COUNT(DISTINCT h.Hold_ID)
                AS active_holds,
                  ROUND(COUNT(DISTINCT bi.BorrowedItem_ID) / NULLIF(COUNT(DISTINCT cp.Copy_ID), 0), 2)   AS demand_ratio,
                  ROUND(COUNT(DISTINCT bi.BorrowedItem_ID) / NULLIF(TIMESTAMPDIFF(MONTH, MIN(cp.date_added), CURDATE()), 0), 2) AS borrowing_rate
              FROM Item i
              LEFT JOIN Book b        ON i.Item_ID = b.Item_ID
              LEFT JOIN CD cd         ON i.Item_ID = cd.Item_ID
              LEFT JOIN Copy cp       ON i.Item_ID = cp.Item_ID
              LEFT JOIN BorrowedItem bi ON cp.Copy_ID = bi.Copy_ID
                  AND (? IS NULL OR bi.borrow_date >= ?)
                  AND (? IS NULL OR bi.borrow_date <= ?)
              LEFT JOIN HoldItem h    ON cp.Copy_ID = h.Copy_ID AND h.hold_status = 1       
              WHERE (? IS NULL OR i.Item_type = ?)
                AND (? IS NULL OR COALESCE(b.genre, cd.genre) = ?)
              GROUP BY i.Item_ID, i.Item_name, i.Item_type, b.genre, cd.genre, b.author_firstName, b.author_lastName
              ORDER BY ${orderBy} DESC
              LIMIT ?`,
              [from, from, to, to, type, type, genre, genre, limit]
          );

          res.writeHead(200);
          res.end(JSON.stringify(rows));
      } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Failed to generate report', details: err.message 
  }));
      }
  }

  async function getFinesReport(req, res) {
      try {
          const [rows] = await db.query(
              `SELECT f.Person_ID,  p.First_name, p.Last_name, p.role,
              COUNT(f.Fine_ID) AS unpaid_fee_count,
              SUM(f.fee_amount) AS unpaid_total
              FROM feeowed f
              LEFT JOIN person p ON f.Person_ID = p.Person_ID
              LEFT JOIN feepayment fp ON f.Fine_ID = fp.Fine_ID
              WHERE fp.Payment_Date > f.date_owed OR fp.Fine_ID IS NULL
              GROUP BY f.Person_ID, p.First_name, p.Last_name
              ORDER BY unpaid_total DESC, unpaid_fee_count DESC;`
          );

          res.writeHead(200);
          res.end(JSON.stringify(rows));
      } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Failed to generate report', details: err.message 
  }));
      }
  }

  module.exports = { getPopularityReport, getFinesReport };