const db = require('../db');
const { URL } = require('url');

const DEFAULT_LIMIT = 25;

const POPULARITY_SORTS = [
    'times_checked_out',
    'active_holds',
    'demand_ratio',
    'borrowing_rate',
    'utilization_rate',
];

const FEES_SORTS = [
    'unpaid_total',
    'unpaid_fee_count',
    'overdue_item_count',
    'avg_fee_amount',
    'max_days_outstanding',
];

const PATRON_SORTS = [
    'recent_borrows',
    'lifetime_borrow_rate',
    'lifetime_borrows',
    'active_holds',
    'unpaid_total',
    'unique_titles_borrowed',
];

function getSearchParams(req) {
    return new URL(req.url, 'http://localhost').searchParams;
}

function parsePositiveInt(value, fallback = DEFAULT_LIMIT) {
    const parsed = parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(value, fallback = 0) {
    const parsed = parseInt(value, 10);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseOptionalInt(value) {
    if (value == null || value === '') {
        return null;
    }

    const parsed = parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : null;
}

function parseOptionalNumber(value) {
    if (value == null || value === '') {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalText(value) {
    if (value == null) {
        return null;
    }

    const trimmed = value.trim();
    return trimmed || null;
}

function parseBoolean(value) {
    return value === 'true' || value === '1';
}

function pickSort(searchParams, validSorts, fallback) {
    const requested = searchParams.get('sort');
    return validSorts.includes(requested) ? requested : fallback;
}

function sendJson(res, status, payload) {
    res.writeHead(status);
    res.end(JSON.stringify(payload));
}

function sendReportError(res, label, err) {
    console.error(`Failed to generate ${label}:`, err);
    sendJson(res, 500, {
        error: `Failed to generate ${label}`,
        details: err.message,
    });
}

function getPopularityFilters(searchParams) {
    return {
        type: parseOptionalInt(searchParams.get('type')),
        genre: parseOptionalText(searchParams.get('genre')),
        from: parseOptionalText(searchParams.get('from')),
        to: parseOptionalText(searchParams.get('to')),
        minCheckouts: parseNonNegativeInt(searchParams.get('minCheckouts')),
        minHolds: parseNonNegativeInt(searchParams.get('minHolds')),
        limit: parsePositiveInt(searchParams.get('limit')),
        orderBy: pickSort(searchParams, POPULARITY_SORTS, 'times_checked_out'),
    };
}

function getFeesFilters(searchParams) {
    return {
        role: parseOptionalInt(searchParams.get('role')),
        minTotal: parseOptionalNumber(searchParams.get('minTotal')) ?? 0,
        minFeeCount: parseNonNegativeInt(searchParams.get('minFeeCount')),
        minDaysOutstanding: parseNonNegativeInt(searchParams.get('minDaysOutstanding')),
        limit: parsePositiveInt(searchParams.get('limit')),
        orderBy: pickSort(searchParams, FEES_SORTS, 'unpaid_total'),
    };
}

function getPatronFilters(searchParams) {
    return {
        role: parseOptionalInt(searchParams.get('role')),
        minBorrows: parseNonNegativeInt(searchParams.get('minBorrows')),
        activeWithinDays: parseOptionalInt(searchParams.get('activeWithinDays')),
        withUnpaidOnly: parseBoolean(searchParams.get('withUnpaidOnly')),
        limit: parsePositiveInt(searchParams.get('limit')),
        orderBy: pickSort(searchParams, PATRON_SORTS, 'recent_borrows'),
    };
}

async function getPopularityReport(req, res) {
    const filters = getPopularityFilters(getSearchParams(req));

    try {
        const [rows] = await db.query(
            `SELECT
                i.Item_ID,
                i.Item_name,
                i.Item_type,
                COALESCE(b.genre, cd.genre) AS genre,
                b.author_firstName,
                b.author_lastName,
                COALESCE(copy_stats.num_copies, 0) AS num_copies,
                COALESCE(copy_stats.available_copies, 0) AS available_copies,
                COALESCE(copy_stats.unavailable_copies, 0) AS unavailable_copies,
                COALESCE(borrow_stats.times_checked_out, 0) AS times_checked_out,
                COALESCE(borrow_stats.unique_borrowers, 0) AS unique_borrowers,
                borrow_stats.last_borrow_date,
                COALESCE(hold_stats.active_holds, 0) AS active_holds,
                COALESCE(
                    ROUND(
                        COALESCE(borrow_stats.times_checked_out, 0) /
                        NULLIF(copy_stats.num_copies, 0),
                        2
                    ),
                    0.00
                ) AS borrowing_rate,
                COALESCE(
                    ROUND(
                        (COALESCE(copy_stats.unavailable_copies, 0) * 100.0) /
                        NULLIF(copy_stats.num_copies, 0),
                        1
                    ),
                    0.0
                ) AS utilization_rate,
                COALESCE(
                    ROUND(
                        (
                            COALESCE(hold_stats.active_holds, 0) +
                            COALESCE(copy_stats.unavailable_copies, 0)
                        ) /
                        NULLIF(copy_stats.num_copies, 0),
                        2
                    ),
                    0.00
                ) AS demand_ratio
            FROM Item i
            LEFT JOIN Book b ON i.Item_ID = b.Item_ID
            LEFT JOIN CD cd ON i.Item_ID = cd.Item_ID
            LEFT JOIN (
                SELECT
                    Item_ID,
                    COUNT(*) AS num_copies,
                    SUM(CASE WHEN Copy_status = 1 THEN 1 ELSE 0 END) AS available_copies,
                    SUM(CASE WHEN Copy_status <> 1 THEN 1 ELSE 0 END) AS unavailable_copies
                FROM Copy
                GROUP BY Item_ID
            ) copy_stats ON i.Item_ID = copy_stats.Item_ID
            LEFT JOIN (
                SELECT
                    cp.Item_ID,
                    COUNT(DISTINCT bi.BorrowedItem_ID) AS times_checked_out,
                    COUNT(DISTINCT bi.Person_ID) AS unique_borrowers,
                    MAX(bi.borrow_date) AS last_borrow_date
                FROM Copy cp
                LEFT JOIN BorrowedItem bi
                    ON cp.Copy_ID = bi.Copy_ID
                WHERE (? IS NULL OR bi.borrow_date >= ?)
                  AND (? IS NULL OR bi.borrow_date <= ?)
                GROUP BY cp.Item_ID
            ) borrow_stats ON i.Item_ID = borrow_stats.Item_ID
            LEFT JOIN (
                SELECT
                    cp.Item_ID,
                    COUNT(DISTINCT h.Hold_ID) AS active_holds
                FROM Copy cp
                JOIN HoldItem h
                    ON cp.Copy_ID = h.Copy_ID
                WHERE h.hold_status = 1
                GROUP BY cp.Item_ID
            ) hold_stats ON i.Item_ID = hold_stats.Item_ID
            WHERE (? IS NULL OR i.Item_type = ?)
              AND (? IS NULL OR COALESCE(b.genre, cd.genre) LIKE CONCAT('%', ?, '%'))
              AND COALESCE(borrow_stats.times_checked_out, 0) >= ?
              AND COALESCE(hold_stats.active_holds, 0) >= ?
            ORDER BY ${filters.orderBy} DESC, i.Item_name ASC
            LIMIT ?`,
            [
                filters.from, filters.from,
                filters.to, filters.to,
                filters.type, filters.type,
                filters.genre, filters.genre,
                filters.minCheckouts,
                filters.minHolds,
                filters.limit,
            ]
        );

        sendJson(res, 200, rows);
    } catch (err) {
        sendReportError(res, 'popularity report', err);
    }
}

async function getFinesReport(req, res) {
    const filters = getFeesFilters(getSearchParams(req));

    try {
        const [rows] = await db.query(
            `SELECT
                f.Person_ID,
                p.First_name,
                p.Last_name,
                p.role,
                COUNT(*) AS unpaid_fee_count,
                COUNT(DISTINCT f.BorrowedItem_ID) AS overdue_item_count,
                COALESCE(SUM(f.fee_amount), 0) AS unpaid_total,
                COALESCE(ROUND(AVG(f.fee_amount), 2), 0.00) AS avg_fee_amount,
                COALESCE(MAX(f.fee_amount), 0) AS largest_fee_amount,
                MIN(f.date_owed) AS oldest_unpaid_date,
                MAX(f.date_owed) AS latest_unpaid_date,
                MAX(DATEDIFF(CURDATE(), DATE(f.date_owed))) AS max_days_outstanding,
                COALESCE(ROUND(AVG(DATEDIFF(CURDATE(), DATE(f.date_owed))), 1), 0.0) AS avg_days_outstanding
            FROM FeeOwed f
            JOIN Person p
                ON f.Person_ID = p.Person_ID
            LEFT JOIN FeePayment fp
                ON f.Fine_ID = fp.Fine_ID
            WHERE fp.Fine_ID IS NULL
              AND (? IS NULL OR p.role = ?)
            GROUP BY
                f.Person_ID,
                p.First_name,
                p.Last_name,
                p.role
            HAVING COALESCE(SUM(f.fee_amount), 0) >= ?
               AND COUNT(*) >= ?
               AND MAX(DATEDIFF(CURDATE(), DATE(f.date_owed))) >= ?
            ORDER BY ${filters.orderBy} DESC, unpaid_total DESC
            LIMIT ?`,
            [
                filters.role,
                filters.role,
                filters.minTotal,
                filters.minFeeCount,
                filters.minDaysOutstanding,
                filters.limit,
            ]
        );

        sendJson(res, 200, rows);
    } catch (err) {
        sendReportError(res, 'fees report', err);
    }
}

async function getPatronsActivityReport(req, res) {
    const filters = getPatronFilters(getSearchParams(req));

    try {
        const [rows] = await db.query(
            `SELECT
                p.Person_ID,
                p.First_name,
                p.Last_name,
                p.role,
                p.account_status,
                p.borrow_status,
                p.signup_date,
                TIMESTAMPDIFF(MONTH, p.signup_date, CURDATE()) AS patrons_months,
                COALESCE(borrow_stats.lifetime_borrows, 0) AS lifetime_borrows,
                COALESCE(borrow_stats.recent_borrows, 0) AS recent_borrows,
                COALESCE(borrow_stats.unique_titles_borrowed, 0) AS unique_titles_borrowed,
                borrow_stats.last_borrow_date,
                CASE
                    WHEN borrow_stats.last_borrow_date IS NULL THEN NULL
                    ELSE DATEDIFF(CURDATE(), borrow_stats.last_borrow_date)
                END AS days_since_last_borrow,
                COALESCE(hold_stats.active_holds, 0) AS active_holds,
                COALESCE(fee_stats.unpaid_total, 0) AS unpaid_total,
                COALESCE(fee_stats.unpaid_fee_count, 0) AS unpaid_fee_count,
                COALESCE(
                    ROUND(
                        COALESCE(borrow_stats.lifetime_borrows, 0) /
                        NULLIF(TIMESTAMPDIFF(MONTH, p.signup_date, CURDATE()), 0),
                        2
                    ),
                    0.00
                ) AS lifetime_borrow_rate
            FROM Person p
            LEFT JOIN (
                SELECT
                    bi.Person_ID,
                    COUNT(DISTINCT bi.BorrowedItem_ID) AS lifetime_borrows,
                    COUNT(DISTINCT CASE
                        WHEN bi.borrow_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
                        THEN bi.BorrowedItem_ID
                    END) AS recent_borrows,
                    COUNT(DISTINCT cp.Item_ID) AS unique_titles_borrowed,
                    MAX(bi.borrow_date) AS last_borrow_date
                FROM BorrowedItem bi
                LEFT JOIN Copy cp
                    ON bi.Copy_ID = cp.Copy_ID
                GROUP BY bi.Person_ID
            ) borrow_stats ON p.Person_ID = borrow_stats.Person_ID
            LEFT JOIN (
                SELECT
                    Person_ID,
                    COUNT(DISTINCT Hold_ID) AS active_holds
                FROM HoldItem
                WHERE hold_status = 1
                GROUP BY Person_ID
            ) hold_stats ON p.Person_ID = hold_stats.Person_ID
            LEFT JOIN (
                SELECT
                    f.Person_ID,
                    COUNT(*) AS unpaid_fee_count,
                    COALESCE(SUM(f.fee_amount), 0) AS unpaid_total
                FROM FeeOwed f
                LEFT JOIN FeePayment fp
                    ON f.Fine_ID = fp.Fine_ID
                WHERE fp.Fine_ID IS NULL
                GROUP BY f.Person_ID
            ) fee_stats ON p.Person_ID = fee_stats.Person_ID
            WHERE (? IS NULL OR p.role = ?)
              AND p.signup_date IS NOT NULL
              AND COALESCE(borrow_stats.lifetime_borrows, 0) >= ?
              AND (? = 0 OR COALESCE(fee_stats.unpaid_total, 0) > 0)
              AND (
                    ? IS NULL
                    OR borrow_stats.last_borrow_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                  )
            ORDER BY ${filters.orderBy} DESC, p.Last_name ASC, p.First_name ASC
            LIMIT ?`,
            [
                filters.role,
                filters.role,
                filters.minBorrows,
                filters.withUnpaidOnly ? 1 : 0,
                filters.activeWithinDays,
                filters.activeWithinDays,
                filters.limit,
            ]
        );

        sendJson(res, 200, rows);
    } catch (err) {
        sendReportError(res, 'patrons activity report', err);
    }
}

module.exports = { getPopularityReport, getFinesReport, getPatronsActivityReport };
