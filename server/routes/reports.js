const db = require('../db');
const { URL } = require('url');

async function getPopularityReport(req, res) {
    try {
        console.log("reports hit:", req.url);

        const { searchParams } = new URL(req.url, 'http://localhost');
        const type = searchParams.get('type');
        const genre = searchParams.get('genre');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const limitRaw = parseInt(searchParams.get('limit'), 10);
        const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? limitRaw : 25;

        const validSorts = [
            'times_checked_out',
            'demand_ratio',
            'active_holds',
            'borrowing_rate'
        ];

        const sort = searchParams.get('sort');
        const orderBy = validSorts.includes(sort) ? sort : 'times_checked_out';

        const [rows] = await db.query(
            `SELECT
                i.Item_ID,
                i.Item_name,
                i.Item_type,
                COALESCE(b.genre, cd.genre) AS genre,
                b.author_firstName,
                b.author_lastName,
                COUNT(DISTINCT bi.BorrowedItem_ID) AS times_checked_out,
                COUNT(DISTINCT cp.Copy_ID) AS num_copies,
                SUM(CASE WHEN cp.Copy_status = 1 THEN 1 ELSE 0 END) AS available_copies,
                SUM(CASE WHEN cp.Copy_status <> 1 THEN 1 ELSE 0 END) AS unavailable_copies,
                COALESCE(
                    ROUND(
                        COUNT(DISTINCT bi.BorrowedItem_ID) /
                        NULLIF(COUNT(DISTINCT cp.Copy_ID), 0),
                        2
                    ),
                    0.00
                ) AS borrowing_rate
            FROM Item i
            LEFT JOIN Book b ON i.Item_ID = b.Item_ID
            LEFT JOIN CD cd ON i.Item_ID = cd.Item_ID
            LEFT JOIN Copy cp ON i.Item_ID = cp.Item_ID
            LEFT JOIN BorrowedItem bi
                ON cp.Copy_ID = bi.Copy_ID
                AND (? IS NULL OR bi.borrow_date >= ?)
                AND (? IS NULL OR bi.borrow_date <= ?)
            LEFT JOIN HoldItem h
                ON cp.Copy_ID = h.Copy_ID
                AND h.hold_status = 1
            WHERE (? IS NULL OR i.Item_type = ?)
              AND (? IS NULL OR COALESCE(b.genre, cd.genre) = ?)
            GROUP BY
                i.Item_ID,
                i.Item_name,
                i.Item_type,
                b.genre,
                cd.genre,
                b.author_firstName,
                b.author_lastName
            ORDER BY ${orderBy} DESC
            LIMIT ?`,
            [from, from, to, to, type, type, genre, genre, limit]
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        console.error('Failed to generate popularity report:', err);
        res.writeHead(500);
        res.end(JSON.stringify({
            error: 'Failed to generate report',
            details: err.message
        }));
    }
}

async function getFinesReport(req, res) {
    try {
        console.log("fees report hit:", req.url);

        const { searchParams } = new URL(req.url, 'http://localhost');
        const role = searchParams.get('role');
        const minTotal = searchParams.get('minTotal');

        const limitRaw = parseInt(searchParams.get('limit'), 10);
        const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? limitRaw : 25;

        const validSorts = [
            'unpaid_total',
            'unpaid_fee_count',
            'oldest_unpaid_date'
        ];

        const sort = searchParams.get('sort');
        const orderBy = validSorts.includes(sort) ? sort : 'unpaid_total';

        const [rows] = await db.query(
            `SELECT
                f.Person_ID,
                p.First_name,
                p.Last_name,
                p.role,
                COUNT(f.Fine_ID) AS unpaid_fee_count,
                COALESCE(SUM(f.fee_amount), 0) AS unpaid_total,
                MIN(f.date_owed) AS oldest_unpaid_date,
                MAX(f.date_owed) AS latest_unpaid_date,
                COUNT(DISTINCT f.BorrowedItem_ID) AS overdue_item_count
            FROM feeowed f
            LEFT JOIN person p
                ON f.Person_ID = p.Person_ID
            LEFT JOIN borroweditem bi
                ON f.BorrowedItem_ID = bi.BorrowedItem_ID
            LEFT JOIN feepayment fp
                ON f.Fine_ID = fp.Fine_ID
            WHERE fp.Fine_ID IS NULL
              AND bi.returnBy_date < CURDATE()
              AND (? IS NULL OR p.role = ?)
            GROUP BY
                f.Person_ID,
                p.First_name,
                p.Last_name,
                p.role
            HAVING (? IS NULL OR COALESCE(SUM(f.fee_amount), 0) >= ?)
            ORDER BY ${orderBy} DESC, unpaid_fee_count DESC
            LIMIT ?`,
            [role, role, minTotal, minTotal, limit]
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        console.error('Failed to generate fees report:', err);
        res.writeHead(500);
        res.end(JSON.stringify({
            error: 'Failed to generate fees report',
            details: err.message
        }));
    }
}

async function getPatronsActivityReport(req, res) {
    try {
        console.log("patrons activity report hit:", req.url);

        const { searchParams } = new URL(req.url, 'http://localhost');
        const role = searchParams.get('role');

        const limitRaw = parseInt(searchParams.get('limit'), 10);
        const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? limitRaw : 25;

        const validSorts = [
            'lifetime_borrows',
            'lifetime_borrow_rate',
            'patrons_months',
            'active_holds',
            'unpaid_total'
        ];

        const sort = searchParams.get('sort');
        const orderBy = validSorts.includes(sort) ? sort : 'lifetime_borrow_rate';

        const [rows] = await db.query(
            `SELECT
                p.Person_ID,
                p.First_name,
                p.Last_name,
                p.role,
                p.signup_date,
                TIMESTAMPDIFF(MONTH, p.signup_date, CURDATE()) AS patrons_months,
                COUNT(DISTINCT bi.BorrowedItem_ID) AS lifetime_borrows,
                MAX(bi.borrow_date) AS last_borrow_date,
                COUNT(DISTINCT CASE WHEN h.hold_status = 1 THEN h.Hold_ID END) AS active_holds,
                COALESCE(SUM(DISTINCT CASE WHEN fp.Fine_ID IS NULL THEN f.fee_amount END), 0) AS unpaid_total,
                COALESCE(
                    ROUND(
                        COUNT(DISTINCT bi.BorrowedItem_ID) /
                        NULLIF(TIMESTAMPDIFF(MONTH, p.signup_date, CURDATE()), 0),
                        2
                    ),
                    0.00
                ) AS lifetime_borrow_rate
            FROM person p
            LEFT JOIN borroweditem bi
                ON p.Person_ID = bi.Person_ID
            LEFT JOIN holditem h
                ON p.Person_ID = h.Person_ID
            LEFT JOIN feeowed f
                ON p.Person_ID = f.Person_ID
            LEFT JOIN feepayment fp
                ON f.Fine_ID = fp.Fine_ID
            WHERE (? IS NULL OR p.role = ?)
              AND p.signup_date IS NOT NULL
            GROUP BY
                p.Person_ID,
                p.First_name,
                p.Last_name,
                p.role,
                p.signup_date
            ORDER BY ${orderBy} DESC
            LIMIT ?`,
            [role, role, limit]
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        console.error('Failed to generate patrons activity report:', err);
        res.writeHead(500);
        res.end(JSON.stringify({
            error: 'Failed to generate patrons activity report',
            details: err.message
        }));
    }
}

module.exports = { getPopularityReport, getFinesReport, getPatronsActivityReport };