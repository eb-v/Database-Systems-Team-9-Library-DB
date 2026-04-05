USE library_db;

DROP PROCEDURE IF EXISTS seed_fee_payment;

DELIMITER //

CREATE PROCEDURE seed_fee_payment(
    IN pay_ratio_percent INT
)
BEGIN
    DECLARE debtor_total INT DEFAULT 0;
    DECLARE selected_debtor_total INT DEFAULT 0;
    DECLARE payment_rows_inserted INT DEFAULT 0;

    IF pay_ratio_percent < 0 OR pay_ratio_percent > 100 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'pay_ratio_percent must be between 0 and 100.';
    END IF;

    DROP TEMPORARY TABLE IF EXISTS tmp_debtors;
    DROP TEMPORARY TABLE IF EXISTS tmp_selected_debtors;

    CREATE TEMPORARY TABLE tmp_debtors (
        Person_ID INT PRIMARY KEY
    );

    INSERT INTO tmp_debtors (Person_ID)
    SELECT DISTINCT f.Person_ID
    FROM FeeOwed f
    LEFT JOIN FeePayment fp
      ON fp.Fine_ID = f.Fine_ID
    WHERE f.status = 1
      AND fp.Payment_ID IS NULL;

    SELECT COUNT(*) INTO debtor_total
    FROM tmp_debtors;

    IF debtor_total = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No unpaid fees were found to seed payments.';
    END IF;

    SET selected_debtor_total = FLOOR((debtor_total * pay_ratio_percent) / 100);

    IF pay_ratio_percent > 0 AND selected_debtor_total = 0 THEN
        SET selected_debtor_total = 1;
    END IF;

    CREATE TEMPORARY TABLE tmp_selected_debtors (
        Person_ID INT PRIMARY KEY
    );

    INSERT INTO tmp_selected_debtors (Person_ID)
    SELECT d.Person_ID
    FROM tmp_debtors d
    ORDER BY RAND()
    LIMIT selected_debtor_total;

    START TRANSACTION;

    INSERT INTO FeePayment (
        Payment_Date,
        method,
        Person_ID,
        Fine_ID
    )
    SELECT
        DATE_ADD(
            DATE(f.date_owed),
            INTERVAL FLOOR(
                RAND() * (
                    LEAST(GREATEST(DATEDIFF(CURDATE(), DATE(f.date_owed)), 0), 14) + 1
                )
            ) DAY
        ) AS Payment_Date,
        1 + FLOOR(RAND() * 2) AS method,
        f.Person_ID,
        f.Fine_ID
    FROM FeeOwed f
    JOIN tmp_selected_debtors d
      ON d.Person_ID = f.Person_ID
    LEFT JOIN FeePayment fp
      ON fp.Fine_ID = f.Fine_ID
    WHERE f.status = 1
      AND fp.Payment_ID IS NULL;

    SET payment_rows_inserted = ROW_COUNT();

    UPDATE FeeOwed f
    JOIN tmp_selected_debtors d
      ON d.Person_ID = f.Person_ID
    LEFT JOIN FeePayment fp
      ON fp.Fine_ID = f.Fine_ID
    SET f.status = 2
    WHERE f.status = 1
      AND fp.Payment_ID IS NOT NULL;

    COMMIT;

    DROP TEMPORARY TABLE IF EXISTS tmp_debtors;
    DROP TEMPORARY TABLE IF EXISTS tmp_selected_debtors;

    SELECT
        debtor_total AS debtors_with_unpaid_fees,
        selected_debtor_total AS debtors_marked_as_paying,
        payment_rows_inserted AS payment_rows_inserted,
        pay_ratio_percent AS requested_pay_ratio_percent;
END //

DELIMITER ;

/*
Example usage:
  CALL seed_fee_payment(70);

Parameter meaning:
  - 70 = about 70% of people who currently owe unpaid fees will pay them

What this does:
  - finds people with unpaid FeeOwed rows
  - randomly picks the requested percentage of those people
  - inserts one FeePayment row for each unpaid fee those people have
  - updates those FeeOwed rows from status 1 to status 2

Why this matches your rule:
  - the controlled variable is the share of people who pay, not the share of fees
  - if a selected person owes multiple unpaid fees, this procedure pays all of them

Randomized fields:
  - payment method: 1 or 2
  - payment date: a random day from date_owed through today, capped to a 14-day span
*/
