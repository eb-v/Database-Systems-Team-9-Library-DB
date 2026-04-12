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

const REVENUE_SORTS = [
    'date_owed', 'fee_amount', 'fee_type', 'fee_status',
    'Payment_Date', 'First_name', 'Last_name', 'role',
    'Item_name', 'Item_type',
];

const STOCK_RULES = {
    healthyBorrowingRate: 3,
    healthyUtilization: 60,
    borrowRateStepPerCopy: 4,
    utilizationStepPerCopy: 20,
};
const PERSON_NAME_SQL = "LOWER(TRIM(CONCAT(COALESCE(p.First_name, ''), ' ', COALESCE(p.Last_name, ''))))";
const AUTHOR_NAME_SQL = `
    LOWER(
        TRIM(
            CONCAT(
                COALESCE(b.author_firstName, ''),
                ' ',
                COALESCE(b.author_lastName, '')
            )
        )
    )
`;

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

function parseOptionalSearch(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
    return normalized || null;
}

function buildLikePattern(value) {
    return value ? `%${value}%` : null;
}

function getDateRangeParams({ periodStart, periodEnd }) {
    return [periodStart, periodStart, periodEnd, periodEnd];
}

function getPeriodRangeClause(column, useDateOnly = false) {
    const expression = useDateOnly ? `DATE(${column})` : column;
    return `(? IS NULL OR ${expression} >= ?) AND (? IS NULL OR ${expression} <= ?)`;
}

function parseMappedInt(value, allowedValues) {
    const parsed = parseOptionalInt(value);
    return allowedValues.includes(parsed) ? parsed : null;
}

function parseMappedIntList(values, allowedValues) {
    return [...new Set(
        values
            .map((value) => parseMappedInt(value, allowedValues))
            .filter((value) => value != null)
    )];
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
    const itemName = parseOptionalSearch(searchParams.get('itemName'));
    const genre = parseOptionalSearch(searchParams.get('genre'));
    const authorName = parseOptionalSearch(searchParams.get('authorName'));

    return {
        ...getPeriodFilters(searchParams),
        types: parseMappedIntList(searchParams.getAll('type'), [1, 2, 3]),
        itemNamePattern: buildLikePattern(itemName),
        genrePattern: buildLikePattern(genre),
        authorNamePattern: buildLikePattern(authorName),
        cdType: parseMappedInt(searchParams.get('cdType'), [1, 2, 3]),
        deviceType: parseMappedInt(searchParams.get('deviceType'), [1, 2, 3]),
        limit: parsePositiveInt(searchParams.get('limit')),
        orderBy: pickSort(searchParams, POPULARITY_ALLOWED_SORTS, 'times_checked_out'),
        orderDirection: parseSortDirection(searchParams.get('direction')),
    };
}

function getFeesFilters(searchParams) {
    const borrowerName = parseOptionalSearch(searchParams.get('borrowerName'));

    return {
        ...getPeriodFilters(searchParams),
        role: parseOptionalInt(searchParams.get('role')),
        borrowerNamePattern: buildLikePattern(borrowerName),
        minTotal: parseOptionalNumber(searchParams.get('minTotal')) ?? 0,
        minFeeCount: parseNonNegativeInt(searchParams.get('minFeeCount')),
        minDaysOutstanding: parseNonNegativeInt(searchParams.get('minDaysOutstanding')),
        limit: parsePositiveInt(searchParams.get('limit')),
        orderBy: pickSort(searchParams, FEES_SORTS, 'unpaid_total'),
        orderDirection: parseSortDirection(searchParams.get('direction')),
    };
}

function getPatronFilters(searchParams) {
    const borrowerName = parseOptionalSearch(searchParams.get('borrowerName'));
    const itemName = parseOptionalSearch(searchParams.get('itemName'));

    return {
        ...getPeriodFilters(searchParams),
        role: parseOptionalInt(searchParams.get('role')),
        borrowerNamePattern: buildLikePattern(borrowerName),
        itemNamePattern: buildLikePattern(itemName),
        minBorrows: parseNonNegativeInt(searchParams.get('minBorrows')),
        withUnpaidOnly: parseBoolean(searchParams.get('withUnpaidOnly')),
        limit: parsePositiveInt(searchParams.get('limit')),
        orderBy: pickSort(searchParams, PATRON_SORTS, 'borrow_count'),
        orderDirection: parseSortDirection(searchParams.get('direction')),
    };
}

function getRevenueFilters(searchParams) {
    return {
        ...getPeriodFilters(searchParams),
        role: parseOptionalInt(searchParams.get('role')),
        feeType: parseMappedInt(searchParams.get('feeType'), [1, 2, 3]),
        itemType: parseMappedInt(searchParams.get('itemType'), [1, 2, 3]),
        paidStatus: parseMappedInt(searchParams.get('paidStatus'), [1, 2]),
        limit: parsePositiveInt(searchParams.get('limit')),
        orderBy: pickSort(searchParams, REVENUE_SORTS, 'date_owed'),
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

function sumBy(rows, selector) {
    return rows.reduce((total, row) => total + Number(selector(row) ?? 0), 0);
}

function averageBy(rows, selector, decimals = 2, predicate = () => true) {
    const matchingRows = rows.filter(predicate);

    if (!matchingRows.length) {
        return 0;
    }

    const total = sumBy(matchingRows, selector);
    return Number((total / matchingRows.length).toFixed(decimals));
}

function findTopRow(rows, selector) {
    if (!rows.length) {
        return null;
    }

    return rows.reduce((topRow, currentRow) =>
        Number(selector(currentRow) ?? 0) > Number(selector(topRow) ?? 0) ? currentRow : topRow
    );
}

async function getReportsOverview(req, res) {
    const filters = getPeriodFilters(getSearchParams(req));
    const rangeParams = getDateRangeParams(filters);

    try {
        const [rows] = await db.query(
            `SELECT
                (
                    SELECT COUNT(*)
                    FROM Item
                ) AS total_items,
                (
                    SELECT COUNT(*)
                    FROM Item
                    WHERE Item_type = 1
                ) AS total_books,
                (
                    SELECT COUNT(*)
                    FROM Item
                    WHERE Item_type = 2
                ) AS total_cds,
                (
                    SELECT COUNT(*)
                    FROM Item
                    WHERE Item_type = 3
                ) AS total_devices,
                (
                    SELECT COUNT(DISTINCT bi.BorrowedItem_ID)
                    FROM BorrowedItem bi
                    WHERE ${getPeriodRangeClause('bi.borrow_date')}
                ) AS total_borrowed,
                (
                    SELECT COUNT(DISTINCT bi.BorrowedItem_ID)
                    FROM BorrowedItem bi
                    JOIN Copy cp
                        ON bi.Copy_ID = cp.Copy_ID
                    WHERE cp.Copy_status = 2
                      AND bi.BorrowedItem_ID = (
                          SELECT MAX(bi2.BorrowedItem_ID)
                          FROM BorrowedItem bi2
                          WHERE bi2.Copy_ID = bi.Copy_ID
                      )
                      AND ${getPeriodRangeClause('bi.borrow_date')}
                ) AS total_active_borrows,
                (
                    SELECT COUNT(*)
                    FROM FeeOwed f
                    WHERE ${getPeriodRangeClause('f.date_owed', true)}
                ) AS total_fees,
                (
                    SELECT COALESCE(ROUND(SUM(f.fee_amount), 2), 0.00)
                    FROM FeeOwed f
                    JOIN FeePayment fp
                        ON f.Fine_ID = fp.Fine_ID
                    WHERE ${getPeriodRangeClause('fp.Payment_Date')}
                ) AS total_revenue`,
            [
                ...rangeParams,
                ...rangeParams,
                ...rangeParams,
                ...rangeParams,
            ]
        );

        sendJson(res, 200, rows[0] || {
            total_items: 0,
            total_books: 0,
            total_cds: 0,
            total_devices: 0,
            total_borrowed: 0,
            total_active_borrows: 0,
            total_fees: 0,
            total_revenue: 0,
        });
    } catch (err) {
        sendReportError(res, 'reports overview', err);
    }
}

async function fetchPopularityRows(filters) {
    const borrowRangeParams = getDateRangeParams(filters);
    const holdRangeParams = getDateRangeParams(filters);
    const typeClause = filters.types.length
        ? `i.Item_type IN (${filters.types.map(() => '?').join(', ')})`
        : '1 = 1';

    const [rows] = await db.query(
        `SELECT
            i.Item_ID,
            i.Item_name,
            i.Item_type,
            cd.CD_type,
            dv.Device_type,
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
        LEFT JOIN Device dv ON i.Item_ID = dv.Item_ID
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
            WHERE ${getPeriodRangeClause('bi.borrow_date')}
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
              AND ${getPeriodRangeClause('h.hold_date')}
            GROUP BY cp.Item_ID
        ) hold_stats ON i.Item_ID = hold_stats.Item_ID
        WHERE ${typeClause}
          AND (? IS NULL OR LOWER(i.Item_name) LIKE ?)
          AND (
              ? IS NULL OR
              i.Item_type <> 1 OR
              LOWER(COALESCE(b.genre, '')) LIKE ?
          )
          AND (
              ? IS NULL OR
              i.Item_type <> 1 OR
              ${AUTHOR_NAME_SQL} LIKE ?
          )
          AND (? IS NULL OR i.Item_type <> 2 OR cd.CD_type = ?)
          AND (? IS NULL OR i.Item_type <> 3 OR dv.Device_type = ?)`,
        [
            ...borrowRangeParams,
            ...holdRangeParams,
            ...filters.types,
            filters.itemNamePattern, filters.itemNamePattern,
            filters.genrePattern, filters.genrePattern,
            filters.authorNamePattern, filters.authorNamePattern,
            filters.cdType, filters.cdType,
            filters.deviceType, filters.deviceType,
        ]
    );

    return rows.map(addStockRecommendation);
}

async function fetchTopPopularityBorrower(filters) {
    const borrowRangeParams = getDateRangeParams(filters);
    const typeClause = filters.types.length
        ? `i.Item_type IN (${filters.types.map(() => '?').join(', ')})`
        : '1 = 1';

    const [rows] = await db.query(
        `SELECT
            p.Person_ID,
            p.First_name,
            p.Last_name,
            COUNT(DISTINCT bi.BorrowedItem_ID) AS borrow_count
        FROM BorrowedItem bi
        JOIN Person p
            ON bi.Person_ID = p.Person_ID
        JOIN Copy cp
            ON bi.Copy_ID = cp.Copy_ID
        JOIN Item i
            ON cp.Item_ID = i.Item_ID
        LEFT JOIN Book b
            ON i.Item_ID = b.Item_ID
        LEFT JOIN CD cd
            ON i.Item_ID = cd.Item_ID
        LEFT JOIN Device dv
            ON i.Item_ID = dv.Item_ID
        WHERE ${getPeriodRangeClause('bi.borrow_date')}
          AND ${typeClause}
          AND (? IS NULL OR LOWER(i.Item_name) LIKE ?)
          AND (
              ? IS NULL OR
              i.Item_type <> 1 OR
              LOWER(COALESCE(b.genre, '')) LIKE ?
          )
          AND (
              ? IS NULL OR
              i.Item_type <> 1 OR
              ${AUTHOR_NAME_SQL} LIKE ?
          )
          AND (? IS NULL OR i.Item_type <> 2 OR cd.CD_type = ?)
          AND (? IS NULL OR i.Item_type <> 3 OR dv.Device_type = ?)
        GROUP BY p.Person_ID, p.First_name, p.Last_name
        ORDER BY borrow_count DESC, p.Last_name ASC, p.First_name ASC
        LIMIT 1`,
        [
            ...borrowRangeParams,
            ...filters.types,
            filters.itemNamePattern, filters.itemNamePattern,
            filters.genrePattern, filters.genrePattern,
            filters.authorNamePattern, filters.authorNamePattern,
            filters.cdType, filters.cdType,
            filters.deviceType, filters.deviceType,
        ]
    );

    return rows[0] ?? null;
}

async function fetchPatronRows(filters, includeLimit = true) {
    const borrowRangeParams = getDateRangeParams(filters);
    const holdRangeParams = getDateRangeParams(filters);
    const feeRangeParams = getDateRangeParams(filters);

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
            LEFT JOIN Item i
                ON cp.Item_ID = i.Item_ID
            WHERE ${getPeriodRangeClause('bi.borrow_date')}
              AND (? IS NULL OR LOWER(i.Item_name) LIKE ?)
            GROUP BY bi.Person_ID
        ) borrow_stats ON p.Person_ID = borrow_stats.Person_ID
        LEFT JOIN (
            SELECT
                h.Person_ID,
                COUNT(DISTINCT Hold_ID) AS active_holds
            FROM HoldItem h
            LEFT JOIN Copy cp
                ON h.Copy_ID = cp.Copy_ID
            LEFT JOIN Item i
                ON cp.Item_ID = i.Item_ID
            WHERE hold_status = 1
              AND ${getPeriodRangeClause('hold_date')}
              AND (? IS NULL OR LOWER(i.Item_name) LIKE ?)
            GROUP BY h.Person_ID
        ) hold_stats ON p.Person_ID = hold_stats.Person_ID
        LEFT JOIN (
            SELECT
                f.Person_ID,
                COUNT(*) AS unpaid_fee_count,
                COALESCE(SUM(f.fee_amount), 0) AS unpaid_total
            FROM FeeOwed f
            LEFT JOIN BorrowedItem bi
                ON f.BorrowedItem_ID = bi.BorrowedItem_ID
            LEFT JOIN Copy cp
                ON bi.Copy_ID = cp.Copy_ID
            LEFT JOIN Item i
                ON cp.Item_ID = i.Item_ID
            LEFT JOIN FeePayment fp
                ON f.Fine_ID = fp.Fine_ID
            WHERE fp.Fine_ID IS NULL
              AND ${getPeriodRangeClause('f.date_owed', true)}
              AND (? IS NULL OR LOWER(i.Item_name) LIKE ?)
            GROUP BY f.Person_ID
        ) fee_stats ON p.Person_ID = fee_stats.Person_ID
        WHERE (? IS NULL OR p.role = ?)
          AND (
              ? IS NULL OR
              ${PERSON_NAME_SQL} LIKE ?
          )
          AND p.signup_date IS NOT NULL
          AND COALESCE(borrow_stats.borrow_count, 0) >= ?
          AND (? = 0 OR COALESCE(fee_stats.unpaid_total, 0) > 0)
          AND (
              ? IS NULL OR
              COALESCE(borrow_stats.borrow_count, 0) > 0 OR
              COALESCE(hold_stats.active_holds, 0) > 0 OR
              COALESCE(fee_stats.unpaid_fee_count, 0) > 0
          )
        ORDER BY ${filters.orderBy} ${filters.orderDirection}, p.Last_name ASC, p.First_name ASC
        ${includeLimit ? 'LIMIT ?' : ''}`,
        [
            filters.periodType,
            filters.periodType,
            filters.periodType,
            ...borrowRangeParams,
            filters.itemNamePattern,
            filters.itemNamePattern,
            ...holdRangeParams,
            filters.itemNamePattern,
            filters.itemNamePattern,
            ...feeRangeParams,
            filters.itemNamePattern,
            filters.itemNamePattern,
            filters.role,
            filters.role,
            filters.borrowerNamePattern,
            filters.borrowerNamePattern,
            filters.minBorrows,
            filters.withUnpaidOnly ? 1 : 0,
            filters.itemNamePattern,
            ...(includeLimit ? [filters.limit] : []),
        ]
    );

    return rows;
}

async function getPopularityReport(req, res) {
    const filters = getPopularityFilters(getSearchParams(req));

    try {
        const rowsWithRecommendations = await fetchPopularityRows(filters);
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
    const rangeParams = getDateRangeParams(filters);

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
              AND ${getPeriodRangeClause('f.date_owed', true)}
              AND (? IS NULL OR p.role = ?)
              AND (
                  ? IS NULL OR
                  ${PERSON_NAME_SQL} LIKE ?
              )
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
                ...rangeParams,
                filters.role,
                filters.role,
                filters.borrowerNamePattern,
                filters.borrowerNamePattern,
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
        const rows = await fetchPatronRows(filters);

        sendJson(res, 200, rows);
    } catch (err) {
        sendReportError(res, 'patrons activity report', err);
    }
}

async function getPopularityOverview(req, res) {
    const filters = getPopularityFilters(getSearchParams(req));

    try {
        const rows = await fetchPopularityRows(filters);
        const topTitle = findTopRow(rows, (row) => row.times_checked_out);
        const topBorrower = await fetchTopPopularityBorrower(filters);

        sendJson(res, 200, {
            total_borrows: sumBy(rows, (row) => row.times_checked_out),
            titles_borrowed: rows.filter((row) => Number(row.times_checked_out) > 0).length,
            active_holds: sumBy(rows, (row) => row.active_holds),
            restock_alerts: rows.filter(
                (row) => Number(row.recommended_additional_copies) > 0
            ).length,
            average_borrow_rate: averageBy(
                rows,
                (row) => row.borrowing_rate,
                2,
                (row) => Number(row.num_copies) > 0
            ),
            average_utilization: averageBy(
                rows,
                (row) => row.utilization_rate,
                1,
                (row) => Number(row.num_copies) > 0
            ),
            top_title_name: topTitle?.Item_name ?? null,
            top_title_borrows: Number(topTitle?.times_checked_out ?? 0),
            top_borrower_name: topBorrower
                ? `${topBorrower.First_name} ${topBorrower.Last_name}`
                : null,
            top_borrower_count: Number(topBorrower?.borrow_count ?? 0),
        });
    } catch (err) {
        sendReportError(res, 'popularity overview', err);
    }
}

async function getPatronsOverview(req, res) {
    const filters = getPatronFilters(getSearchParams(req));

    try {
        const rows = await fetchPatronRows(filters, false);
        const topPatron = findTopRow(rows, (row) => row.borrow_count);
        const topUnpaidPatron = findTopRow(rows, (row) => row.unpaid_fee_count);

        sendJson(res, 200, {
            active_patrons: rows.length,
            total_borrows: sumBy(rows, (row) => row.borrow_count),
            total_holds: sumBy(rows, (row) => row.active_holds),
            patrons_with_debt: rows.filter((row) => Number(row.unpaid_total) > 0).length,
            outstanding_balance: sumBy(rows, (row) => row.unpaid_total),
            average_borrow_rate: averageBy(rows, (row) => row.borrow_rate, 2),
            recent_patrons: rows.filter(
                (row) => row.days_since_last_borrow != null && Number(row.days_since_last_borrow) <= 30
            ).length,
            top_patron_name: topPatron
                ? `${topPatron.First_name} ${topPatron.Last_name}`
                : null,
            top_patron_borrows: Number(topPatron?.borrow_count ?? 0),
            top_unpaid_patron_name: topUnpaidPatron
                ? `${topUnpaidPatron.First_name} ${topUnpaidPatron.Last_name}`
                : null,
            top_unpaid_fee_count: Number(topUnpaidPatron?.unpaid_fee_count ?? 0),
        });
    } catch (err) {
        sendReportError(res, 'patrons overview', err);
    }
}

async function getRevenueReport(req, res) {
    const filters = getRevenueFilters(getSearchParams(req));
    const rangeParams = getDateRangeParams(filters);

    try {
        const [rows] = await db.query(
            `SELECT
                f.Fine_ID,
                DATE(f.date_owed) AS date_owed,
                f.fee_type,
                f.fee_amount,
                f.status AS fee_status,
                fp.Payment_Date,
                f.Person_ID,
                p.First_name,
                p.Last_name,
                p.role,
                i.Item_ID,
                i.Item_name,
                i.Item_type
            FROM FeeOwed f
            JOIN Person p ON f.Person_ID = p.Person_ID
            JOIN BorrowedItem bi ON f.BorrowedItem_ID = bi.BorrowedItem_ID
            JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
            JOIN Item i ON cp.Item_ID = i.Item_ID
            LEFT JOIN FeePayment fp ON f.Fine_ID = fp.Fine_ID
            WHERE ${getPeriodRangeClause('f.date_owed', true)}
              AND (? IS NULL OR p.role = ?)
              AND (? IS NULL OR f.fee_type = ?)
              AND (? IS NULL OR i.Item_type = ?)
              AND (? IS NULL OR f.status = ?)
            ORDER BY ${filters.orderBy} ${filters.orderDirection}, f.Fine_ID DESC
            LIMIT ?`,
            [
                ...rangeParams,
                filters.role, filters.role,
                filters.feeType, filters.feeType,
                filters.itemType, filters.itemType,
                filters.paidStatus, filters.paidStatus,
                filters.limit,
            ]
        );
        sendJson(res, 200, rows);
    } catch (err) {
        sendReportError(res, 'revenue report', err);
    }
}

async function getRevenueOverview(req, res) {
    const searchParams = getSearchParams(req);
    const filters = getPeriodFilters(searchParams);
    const rangeParams = getDateRangeParams(filters);
    const role = parseOptionalInt(searchParams.get('role'));
    const feeType = parseMappedInt(searchParams.get('feeType'), [1, 2, 3]);
    const itemType = parseMappedInt(searchParams.get('itemType'), [1, 2, 3]);
    const paidStatus = parseMappedInt(searchParams.get('paidStatus'), [1, 2]);

    // item join/filter only needed when filtering by item type
    const itemJoinSql = itemType !== null
        ? `JOIN BorrowedItem bi ON f.BorrowedItem_ID = bi.BorrowedItem_ID
           JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
           JOIN Item i ON cp.Item_ID = i.Item_ID`
        : '';
    const itemFilterSql = itemType !== null ? `AND i.Item_type = ?` : '';
    const itemParams = itemType !== null ? [itemType] : [];

    try {
        const [[kpis]] = await db.query(
            `SELECT
                COALESCE(SUM(CASE WHEN fp.Fine_ID IS NOT NULL THEN f.fee_amount ELSE 0 END), 0) AS revenue_collected,
                COALESCE(SUM(f.fee_amount), 0) AS revenue_expected,
                COALESCE(SUM(CASE WHEN fp.Fine_ID IS NULL THEN f.fee_amount ELSE 0 END), 0) AS revenue_backlog,
                COUNT(*) AS total_fees,
                COALESCE(SUM(CASE WHEN fp.Fine_ID IS NULL THEN 1 ELSE 0 END), 0) AS unpaid_fee_count
            FROM FeeOwed f
            JOIN Person p ON f.Person_ID = p.Person_ID
            ${itemJoinSql}
            LEFT JOIN FeePayment fp ON f.Fine_ID = fp.Fine_ID
            WHERE ${getPeriodRangeClause('f.date_owed', true)}
              AND (? IS NULL OR p.role = ?)
              AND (? IS NULL OR f.fee_type = ?)
              AND (? IS NULL OR f.status = ?)
              ${itemFilterSql}`,
            [...rangeParams, role, role, feeType, feeType, paidStatus, paidStatus, ...itemParams]
        );

        const [topItemRows] = await db.query(
            `SELECT i.Item_name, COALESCE(SUM(f.fee_amount), 0) AS total_fees_amount
            FROM FeeOwed f
            JOIN Person p ON f.Person_ID = p.Person_ID
            JOIN BorrowedItem bi ON f.BorrowedItem_ID = bi.BorrowedItem_ID
            JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
            JOIN Item i ON cp.Item_ID = i.Item_ID
            LEFT JOIN FeePayment fp ON f.Fine_ID = fp.Fine_ID
            WHERE ${getPeriodRangeClause('f.date_owed', true)}
              AND (? IS NULL OR p.role = ?)
              AND (? IS NULL OR f.fee_type = ?)
              AND (? IS NULL OR f.status = ?)
              AND (? IS NULL OR i.Item_type = ?)
            GROUP BY i.Item_ID, i.Item_name
            ORDER BY total_fees_amount DESC
            LIMIT 1`,
            [...rangeParams, role, role, feeType, feeType, paidStatus, paidStatus, itemType, itemType]
        );

        sendJson(res, 200, {
            revenue_collected: Number(kpis.revenue_collected ?? 0),
            revenue_expected: Number(kpis.revenue_expected ?? 0),
            revenue_backlog: Number(kpis.revenue_backlog ?? 0),
            total_fees: Number(kpis.total_fees ?? 0),
            unpaid_fee_count: Number(kpis.unpaid_fee_count ?? 0),
            top_item_name: topItemRows[0]?.Item_name ?? null,
            top_item_fees: Number(topItemRows[0]?.total_fees_amount ?? 0),
        });
    } catch (err) {
        sendReportError(res, 'revenue overview', err);
    }
}

module.exports = {
    getReportsOverview,
    getPopularityReport,
    getPopularityOverview,
    getFinesReport,
    getPatronsActivityReport,
    getPatronsOverview,
    getRevenueReport,
    getRevenueOverview,
};
