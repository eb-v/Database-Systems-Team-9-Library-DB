const db = require('../db');
const { URL } = require('url');

const DEFAULT_LIMIT = 25;
const PERIOD_TYPES = ['custom', 'month', 'quarter', 'year', 'all'];

const POPULARITY_SORTS = [
    'times_checked_out',
    'borrowing_rate',
    'utilization_rate',
    'unique_borrowers',
    'num_copies',
    'available_copies',
    'checked_out_copies',
    'last_borrow_date',
    'active_holds',
    'demand_ratio',
];
const POPULARITY_ALLOWED_SORTS = [...POPULARITY_SORTS, 'recommended_additional_copies'];

const FEES_SORTS = [
    'unpaid_total',
    'role',
    'unpaid_fee_count',
    'overdue_item_count',
    'avg_fee_amount',
    'largest_fee_amount',
    'max_days_outstanding',
    'avg_days_outstanding',
    'oldest_unpaid_date',
];

const PATRON_SORTS = [
    'role',
    'account_status',
    'borrow_status',
    'borrow_count',
    'borrow_rate',
    'active_holds',
    'unpaid_total',
    'unique_titles_borrowed',
    'unpaid_fee_count',
    'patrons_months',
    'days_since_last_borrow',
    'last_borrow_date',
];

const STOCK_RULES = {
    healthyBorrowingRate: 3,
    healthyUtilization: 60,
    borrowRateStepPerCopy: 4,
    utilizationStepPerCopy: 20,
};

function getSearchParams(req) {
    const host = req.headers.host || 'localhost:3000';
    return new URL(req.url, `http://${host}`).searchParams;
}

function parseInteger(value) {
    const parsed = parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : null;
}

function parsePositiveInt(value, fallback = DEFAULT_LIMIT) {
    const parsed = parseInteger(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(value, fallback = 0) {
    const parsed = parseInteger(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseOptionalInt(value) {
    if (value == null || value === '') {
        return null;
    }

    return parseInteger(value);
}

function parseOptionalNumber(value) {
    if (value == null || value === '') {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value) {
    return value === 'true' || value === '1';
}

function parsePeriodType(value) {
    return PERIOD_TYPES.includes(value) ? value : 'quarter';
}

function formatSqlDate(date) {
    return date.toISOString().slice(0, 10);
}

function getCurrentYear() {
    return new Date().getFullYear();
}

function getCurrentQuarter() {
    return Math.floor(new Date().getMonth() / 3) + 1;
}

function parsePeriodValue(periodType, value) {
    if (periodType === 'custom' || periodType === 'all') {
        return null;
    }

    const parsed = parseOptionalInt(value);

    if (periodType === 'month') {
        return parsed >= 1 && parsed <= 12 ? parsed : new Date().getMonth() + 1;
    }

    if (periodType === 'quarter') {
        return parsed >= 1 && parsed <= 4 ? parsed : getCurrentQuarter();
    }

    if (periodType === 'year') {
        const currentYear = getCurrentYear();
        return parsed >= 2000 && parsed <= currentYear ? parsed : currentYear;
    }

    return null;
}

function parseOptionalDate(value) {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : formatSqlDate(parsed);
}

function getPeriodDateRange(periodType, periodValue) {
    const currentYear = getCurrentYear();
    let start = null;
    let end = null;

    if (periodType === 'month') {
        start = new Date(currentYear, periodValue - 1, 1);
        end = new Date(currentYear, periodValue, 0);
    } else if (periodType === 'quarter') {
        const startMonth = (periodValue - 1) * 3;
        start = new Date(currentYear, startMonth, 1);
        end = new Date(currentYear, startMonth + 3, 0);
    } else if (periodType === 'year') {
        start = new Date(periodValue, 0, 1);
        end = new Date(periodValue, 11, 31);
    }

    return {
        periodStart: start ? formatSqlDate(start) : null,
        periodEnd: end ? formatSqlDate(end) : null,
    };
}

function pickSort(searchParams, validSorts, fallback) {
    const requested = searchParams.get('sort');
    return validSorts.includes(requested) ? requested : fallback;
}

function parseSortDirection(value) {
    return value === 'asc' ? 'ASC' : 'DESC';
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

function getPeriodFilters(searchParams) {
    const periodType = parsePeriodType(searchParams.get('periodType'));
    const customStart = parseOptionalDate(searchParams.get('customStart'));
    const customEnd = parseOptionalDate(searchParams.get('customEnd'));
    const periodValue = parsePeriodValue(periodType, searchParams.get('periodValue'));
    const { periodStart, periodEnd } =
        periodType === 'custom'
            ? {
                periodStart: customStart,
                periodEnd: customEnd,
            }
            : getPeriodDateRange(periodType, periodValue);

    return {
        periodType,
        periodValue,
        customStart,
        customEnd,
        periodStart,
        periodEnd,
    };
}

function getPopularityFilters(searchParams) {
    return {
        ...getPeriodFilters(searchParams),
        type: parseOptionalInt(searchParams.get('type')),
        limit: parsePositiveInt(searchParams.get('limit')),
        orderBy: pickSort(searchParams, POPULARITY_ALLOWED_SORTS, 'times_checked_out'),
        orderDirection: parseSortDirection(searchParams.get('direction')),
    };
}

function getFeesFilters(searchParams) {
    return {
        ...getPeriodFilters(searchParams),
        role: parseOptionalInt(searchParams.get('role')),
        minTotal: parseOptionalNumber(searchParams.get('minTotal')) ?? 0,
        minFeeCount: parseNonNegativeInt(searchParams.get('minFeeCount')),
        minDaysOutstanding: parseNonNegativeInt(searchParams.get('minDaysOutstanding')),
        limit: parsePositiveInt(searchParams.get('limit')),
        orderBy: pickSort(searchParams, FEES_SORTS, 'unpaid_total'),
        orderDirection: parseSortDirection(searchParams.get('direction')),
    };
}

function getPatronFilters(searchParams) {
    return {
        ...getPeriodFilters(searchParams),
        role: parseOptionalInt(searchParams.get('role')),
        minBorrows: parseNonNegativeInt(searchParams.get('minBorrows')),
        withUnpaidOnly: parseBoolean(searchParams.get('withUnpaidOnly')),
        limit: parsePositiveInt(searchParams.get('limit')),
        orderBy: pickSort(searchParams, PATRON_SORTS, 'borrow_count'),
        orderDirection: parseSortDirection(searchParams.get('direction')),
    };
}

function addStockRecommendation(row) {
    const borrowPressure = getBorrowRatePressure(row);
    const utilizationPressure = getUtilizationPressure(row);
    const holdPressure = getHoldPressure(row);
    const additionalCopies = Math.max(borrowPressure, utilizationPressure, holdPressure);
    const reasons = getRecommendationReasons(borrowPressure, utilizationPressure, holdPressure);

    return {
        ...row,
        recommended_additional_copies: additionalCopies,
        recommendation_tone: additionalCopies > 0 ? 'warn' : 'ok',
        recommendation_summary:
            additionalCopies > 0
                ? `Increase by ${additionalCopies} ${additionalCopies === 1 ? 'copy' : 'copies'}`
                : 'Stock looks healthy',
        recommendation_detail:
            additionalCopies > 0
                ? `Triggered by ${reasons.join(', ')}.`
                : 'No increase recommended right now.',
    };
}

function getRecommendationReasons(borrowPressure, utilizationPressure, holdPressure) {
    const reasons = [];

    if (borrowPressure > 0) reasons.push('high borrow rate');
    if (utilizationPressure > 0) reasons.push('high utilization');
    if (holdPressure > 0) reasons.push('hold pressure');

    return reasons;
}

function getBorrowRatePressure(row) {
    const borrowingRate = Number(row.borrowing_rate ?? 0);

    if (borrowingRate <= STOCK_RULES.healthyBorrowingRate) {
        return 0;
    }

    return Math.ceil(
        (borrowingRate - STOCK_RULES.healthyBorrowingRate) / STOCK_RULES.borrowRateStepPerCopy
    );
}

function getUtilizationPressure(row) {
    const utilizationRate = Number(row.utilization_rate ?? 0);

    if (utilizationRate <= STOCK_RULES.healthyUtilization) {
        return 0;
    }

    return Math.ceil(
        (utilizationRate - STOCK_RULES.healthyUtilization) / STOCK_RULES.utilizationStepPerCopy
    );
}

function getHoldPressure(row) {
    const activeHolds = Number(row.active_holds ?? 0);
    const availableCopies = Number(row.available_copies ?? 0);

    return activeHolds > availableCopies ? activeHolds - availableCopies : 0;
}

function sortRows(rows, sortKey, sortDirection) {
    const directionMultiplier = sortDirection === 'ASC' ? 1 : -1;

    return [...rows].sort((left, right) => {
        const leftValue = getSortValue(left, sortKey);
        const rightValue = getSortValue(right, sortKey);

        if (leftValue == null && rightValue == null) return 0;
        if (leftValue == null) return 1;
        if (rightValue == null) return -1;

        if (typeof leftValue === 'string' || typeof rightValue === 'string') {
            return String(leftValue).localeCompare(String(rightValue), undefined, {
                numeric: true,
                sensitivity: 'base',
            }) * directionMultiplier;
        }

        if (leftValue < rightValue) return -1 * directionMultiplier;
        if (leftValue > rightValue) return 1 * directionMultiplier;
        return 0;
    });
}

function getSortValue(row, sortKey) {
    if (sortKey === 'last_borrow_date' || sortKey === 'oldest_unpaid_date') {
        return row[sortKey] ? new Date(row[sortKey]).getTime() : null;
    }

    return row[sortKey];
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
                COALESCE(copy_stats.checked_out_copies, 0) AS checked_out_copies,
                COALESCE(borrow_stats.times_checked_out, 0) AS times_checked_out,
                COALESCE(borrow_stats.unique_borrowers, 0) AS unique_borrowers,
                COALESCE(borrow_stats.copies_used_in_period, 0) AS copies_used_in_period,
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
                        (COALESCE(borrow_stats.copies_used_in_period, 0) * 100.0) /
                        NULLIF(copy_stats.num_copies, 0),
                        1
                    ),
                    0.0
                ) AS utilization_rate,
                COALESCE(
                    ROUND(
                        (
                            COALESCE(hold_stats.active_holds, 0) +
                            COALESCE(borrow_stats.times_checked_out, 0)
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
                    SUM(CASE WHEN Copy_status = 2 THEN 1 ELSE 0 END) AS checked_out_copies
                FROM Copy
                GROUP BY Item_ID
            ) copy_stats ON i.Item_ID = copy_stats.Item_ID
            LEFT JOIN (
                SELECT
                    cp.Item_ID,
                    COUNT(DISTINCT bi.BorrowedItem_ID) AS times_checked_out,
                    COUNT(DISTINCT bi.Person_ID) AS unique_borrowers,
                    COUNT(DISTINCT bi.Copy_ID) AS copies_used_in_period,
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
                WHERE h.hold_status <> 0
                  AND (? IS NULL OR h.hold_date >= ?)
                  AND (? IS NULL OR h.hold_date <= ?)
                GROUP BY cp.Item_ID
            ) hold_stats ON i.Item_ID = hold_stats.Item_ID
            WHERE (? IS NULL OR i.Item_type = ?)`,
            [
                filters.periodStart, filters.periodStart,
                filters.periodEnd, filters.periodEnd,
                filters.periodStart, filters.periodStart,
                filters.periodEnd, filters.periodEnd,
                filters.type, filters.type,
            ]
        );

        const rowsWithRecommendations = rows.map(addStockRecommendation);
        const sortedRows = sortRows(
            rowsWithRecommendations,
            filters.orderBy,
            filters.orderDirection
        );

        sendJson(res, 200, sortedRows.slice(0, filters.limit));
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
                MAX(DATEDIFF(CURDATE(), DATE(f.date_owed))) AS max_days_outstanding,
                COALESCE(ROUND(AVG(DATEDIFF(CURDATE(), DATE(f.date_owed))), 1), 0.0) AS avg_days_outstanding
            FROM FeeOwed f
            JOIN Person p
                ON f.Person_ID = p.Person_ID
            LEFT JOIN FeePayment fp
                ON f.Fine_ID = fp.Fine_ID
            WHERE fp.Fine_ID IS NULL
              AND (? IS NULL OR DATE(f.date_owed) >= ?)
              AND (? IS NULL OR DATE(f.date_owed) <= ?)
              AND (? IS NULL OR p.role = ?)
            GROUP BY
                f.Person_ID,
                p.First_name,
                p.Last_name,
                p.role
            HAVING COALESCE(SUM(f.fee_amount), 0) >= ?
               AND COUNT(*) >= ?
               AND MAX(DATEDIFF(CURDATE(), DATE(f.date_owed))) >= ?
            ORDER BY ${filters.orderBy} ${filters.orderDirection}, unpaid_total DESC
            LIMIT ?`,
            [
                filters.periodStart,
                filters.periodStart,
                filters.periodEnd,
                filters.periodEnd,
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
                COALESCE(borrow_stats.borrow_count, 0) AS borrow_count,
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
                    ROUND(COALESCE(borrow_stats.borrow_count, 0) /
                        NULLIF(
                            CASE
                                WHEN ? = 'month' THEN 1
                                WHEN ? = 'quarter' THEN 3
                                WHEN ? = 'year' THEN 12
                                ELSE TIMESTAMPDIFF(MONTH, p.signup_date, CURDATE())
                            END,
                            0
                        ),
                        2
                    ),
                    0.00
                ) AS borrow_rate
            FROM Person p
            LEFT JOIN (
                SELECT
                    bi.Person_ID,
                    COUNT(DISTINCT bi.BorrowedItem_ID) AS borrow_count,
                    COUNT(DISTINCT cp.Item_ID) AS unique_titles_borrowed,
                    MAX(bi.borrow_date) AS last_borrow_date
                FROM BorrowedItem bi
                LEFT JOIN Copy cp
                    ON bi.Copy_ID = cp.Copy_ID
                WHERE (? IS NULL OR bi.borrow_date >= ?)
                  AND (? IS NULL OR bi.borrow_date <= ?)
                GROUP BY bi.Person_ID
            ) borrow_stats ON p.Person_ID = borrow_stats.Person_ID
            LEFT JOIN (
                SELECT
                    Person_ID,
                    COUNT(DISTINCT Hold_ID) AS active_holds
                FROM HoldItem
                WHERE hold_status = 1
                  AND (? IS NULL OR hold_date >= ?)
                  AND (? IS NULL OR hold_date <= ?)
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
                  AND (? IS NULL OR DATE(f.date_owed) >= ?)
                  AND (? IS NULL OR DATE(f.date_owed) <= ?)
                GROUP BY f.Person_ID
            ) fee_stats ON p.Person_ID = fee_stats.Person_ID
            WHERE (? IS NULL OR p.role = ?)
              AND p.signup_date IS NOT NULL
              AND COALESCE(borrow_stats.borrow_count, 0) >= ?
              AND (? = 0 OR COALESCE(fee_stats.unpaid_total, 0) > 0)
            ORDER BY ${filters.orderBy} ${filters.orderDirection}, p.Last_name ASC, p.First_name ASC
            LIMIT ?`,
            [
                filters.periodType,
                filters.periodType,
                filters.periodType,
                filters.periodStart,
                filters.periodStart,
                filters.periodEnd,
                filters.periodEnd,
                filters.periodStart,
                filters.periodStart,
                filters.periodEnd,
                filters.periodEnd,
                filters.periodStart,
                filters.periodStart,
                filters.periodEnd,
                filters.periodEnd,
                filters.role,
                filters.role,
                filters.minBorrows,
                filters.withUnpaidOnly ? 1 : 0,
                filters.limit,
            ]
        );

        sendJson(res, 200, rows);
    } catch (err) {
        sendReportError(res, 'patrons activity report', err);
    }
}

module.exports = { getPopularityReport, getFinesReport, getPatronsActivityReport };
