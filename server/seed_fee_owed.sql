USE library_db;

DROP PROCEDURE IF EXISTS seed_fee_owed;

DELIMITER //

CREATE PROCEDURE seed_fee_owed(
    IN fee_count INT,
    IN unpaid_count INT
)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE candidate_total INT DEFAULT 0;
    DECLARE actual_fee_count INT DEFAULT 0;
    DECLARE actual_unpaid_count INT DEFAULT 0;
    DECLARE chosen_borrowed_item_id INT;
    DECLARE chosen_person_id INT;
    DECLARE chosen_item_type SMALLINT;
    DECLARE chosen_return_by DATE;
    DECLARE overdue_window INT DEFAULT 0;
    DECLARE fee_date DATETIME;
    DECLARE payment_date DATE;
    DECLARE payment_method SMALLINT;
    DECLARE fee_amount DECIMAL(10, 2);
    DECLARE fee_status SMALLINT;
    DECLARE inserted_fine_id INT;

    DROP TEMPORARY TABLE IF EXISTS tmp_fee_candidates;

    CREATE TEMPORARY TABLE tmp_fee_candidates (
        BorrowedItem_ID INT PRIMARY KEY,
        Person_ID INT NOT NULL,
        Item_type SMALLINT NOT NULL,
        returnBy_date DATE NOT NULL
    );

    INSERT INTO tmp_fee_candidates (
        BorrowedItem_ID,
        Person_ID,
        Item_type,
        returnBy_date
    )
    SELECT
        bi.BorrowedItem_ID,
        bi.Person_ID,
        i.Item_type,
        bi.returnBy_date
    FROM BorrowedItem bi
    JOIN Copy cp
      ON cp.Copy_ID = bi.Copy_ID
    JOIN Item i
      ON i.Item_ID = cp.Item_ID
    LEFT JOIN FeeOwed f
      ON f.BorrowedItem_ID = bi.BorrowedItem_ID
     AND f.fee_type = 1
    WHERE bi.returnBy_date < CURDATE()
      AND cp.Copy_status IN (1, 4)
      AND f.Fine_ID IS NULL
      AND bi.BorrowedItem_ID = (
          SELECT MAX(bi2.BorrowedItem_ID)
          FROM BorrowedItem bi2
          WHERE bi2.Copy_ID = bi.Copy_ID
      );

    SELECT COUNT(*) INTO candidate_total
    FROM tmp_fee_candidates;

    IF fee_count < 0 OR unpaid_count < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'fee_count and unpaid_count must both be zero or greater.';
    END IF;

    IF candidate_total = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No eligible overdue borrow rows were found for fee seeding.';
    END IF;

    SET actual_fee_count = LEAST(fee_count, candidate_total);
    SET actual_unpaid_count = LEAST(unpaid_count, actual_fee_count);

    START TRANSACTION;

    WHILE i < actual_fee_count DO
        SELECT
            BorrowedItem_ID,
            Person_ID,
            Item_type,
            returnBy_date
        INTO
            chosen_borrowed_item_id,
            chosen_person_id,
            chosen_item_type,
            chosen_return_by
        FROM tmp_fee_candidates
        ORDER BY RAND()
        LIMIT 1;

        SET overdue_window = LEAST(DATEDIFF(CURDATE(), chosen_return_by), 14);

        SET fee_date = TIMESTAMP(
            DATE_ADD(
                chosen_return_by,
                INTERVAL (1 + FLOOR(RAND() * overdue_window)) DAY
            ),
            MAKETIME(
                FLOOR(RAND() * 24),
                FLOOR(RAND() * 60),
                FLOOR(RAND() * 60)
            )
        );

        SET fee_amount = CASE chosen_item_type
            WHEN 1 THEN 5.00
            WHEN 2 THEN 10.00
            WHEN 3 THEN 20.00
            ELSE 5.00
        END;

        SET fee_status = CASE
            WHEN i < actual_unpaid_count THEN 1
            ELSE 2
        END;

        INSERT INTO FeeOwed (
            date_owed,
            status,
            Person_ID,
            BorrowedItem_ID,
            fee_amount,
            fee_type
        )
        VALUES (
            fee_date,
            fee_status,
            chosen_person_id,
            chosen_borrowed_item_id,
            fee_amount,
            1
        );

        SET inserted_fine_id = LAST_INSERT_ID();

        IF fee_status = 2 THEN
            SET payment_method = 1 + FLOOR(RAND() * 2);
            SET payment_date = DATE_ADD(
                DATE(fee_date),
                INTERVAL FLOOR(
                    RAND() * (
                        LEAST(GREATEST(DATEDIFF(CURDATE(), DATE(fee_date)), 0), 10) + 1
                    )
                ) DAY
            );

            INSERT INTO FeePayment (
                Payment_Date,
                method,
                Person_ID,
                Fine_ID
            )
            VALUES (
                payment_date,
                payment_method,
                chosen_person_id,
                inserted_fine_id
            );
        END IF;

        DELETE FROM tmp_fee_candidates
        WHERE BorrowedItem_ID = chosen_borrowed_item_id;

        SET i = i + 1;
    END WHILE;

    COMMIT;

    DROP TEMPORARY TABLE IF EXISTS tmp_fee_candidates;

    SELECT
        actual_fee_count AS fee_rows_inserted,
        actual_unpaid_count AS unpaid_fee_rows_inserted,
        (actual_fee_count - actual_unpaid_count) AS paid_fee_rows_inserted,
        candidate_total AS eligible_overdue_borrows_found;
END //

DELIMITER ;

/*
Example usage:
  CALL seed_fee_owed(60, 18);

Parameter meaning:
  - 60 = total late-fee rows to insert
  - 18 = how many of those should stay unpaid
  - the remaining rows are inserted as paid and get matching FeePayment rows

What this does:
  - only creates late fees (fee_type = 1)
  - only uses overdue BorrowedItem rows that do not already have a late fee
  - only uses the latest borrow row per copy, so it matches current copy state better
  - only uses copies with Copy_status 1 or 4, which fit "returned" or "returned damaged"

Fee amounts match the current app logic:
  - book = 5.00
  - CD = 10.00
  - device = 20.00

Why this stays valid:
  - FeeOwed.Person_ID matches BorrowedItem.Person_ID
  - FeeOwed.BorrowedItem_ID points to a real borrow row
  - paid fees get a matching FeePayment row
*/
