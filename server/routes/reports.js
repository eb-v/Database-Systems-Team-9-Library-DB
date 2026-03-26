const db = require('../db');

// query 1: 
// implement: within past 5 years, column for rate of borrowing?
async function getPopularityReport(req, res) {
    try {
        const [rows] = await db.query(
            `SELECT i.Item_ID, i.Item_name, i.Item_type, COUNT(*) AS times_checked_out
            FROM BorrowedItem bi 
            LEFT JOIN Copy c ON bi.Copy_ID = c.Copy_ID 
            LEFT JOIN Item i ON c.Item_ID = i.Item_ID
            GROUP BY i.Item_ID, i.Item_name
            ORDER BY times_checked_out DESC`
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to generate report', details: err.message }));
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
        res.end(JSON.stringify({ error: 'Failed to generate report', details: err.message }));
    }
}

module.exports = { getPopularityReport, getFinesReport };