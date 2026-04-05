USE library_db;

DROP PROCEDURE IF EXISTS seed_borrowed_items;

DELIMITER //

CREATE PROCEDURE seed_borrowed_items(
    IN historical_count INT,
    IN active_count INT
)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE patron_total INT DEFAULT 0;
    DECLARE copy_total INT DEFAULT 0;
    DECLARE available_total INT DEFAULT 0;
    DECLARE chosen_person_id INT;
    DECLARE chosen_copy_id INT;
    DECLARE borrow_date DATE;
    DECLARE actual_active_count INT DEFAULT 0;
    DECLARE historical_min_days INT DEFAULT 15;
    DECLARE historical_span_days INT DEFAULT 46;

    DROP TEMPORARY TABLE IF EXISTS tmp_eligible_patrons;
    DROP TEMPORARY TABLE IF EXISTS tmp_all_copies;
    DROP TEMPORARY TABLE IF EXISTS tmp_available_copies;

    CREATE TEMPORARY TABLE tmp_eligible_patrons (
        Person_ID INT PRIMARY KEY
    );

    INSERT INTO tmp_eligible_patrons (Person_ID)
    SELECT p.Person_ID
    FROM Person p
    WHERE p.account_status = 1
      AND p.borrow_status = 1;

    CREATE TEMPORARY TABLE tmp_all_copies (
        Copy_ID INT PRIMARY KEY
    );

    INSERT INTO tmp_all_copies (Copy_ID)
    SELECT cp.Copy_ID
    FROM Copy cp
    WHERE cp.Copy_status <> 0;

    CREATE TEMPORARY TABLE tmp_available_copies (
        Copy_ID INT PRIMARY KEY
    );

    INSERT INTO tmp_available_copies (Copy_ID)
    SELECT cp.Copy_ID
    FROM Copy cp
    WHERE cp.Copy_status = 1;

    SELECT COUNT(*) INTO patron_total FROM tmp_eligible_patrons;
    SELECT COUNT(*) INTO copy_total FROM tmp_all_copies;
    SELECT COUNT(*) INTO available_total FROM tmp_available_copies;

    IF patron_total = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No eligible borrowers found (account_status = 1 and borrow_status = 1).';
    END IF;

    IF copy_total = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No borrowable copies found to seed borrowed items.';
    END IF;

    START TRANSACTION;

    /*
      Historical borrows:
      - Uses copies that are still in circulation
      - Uses any active borrower in Person, which matches the current dump better
      - Generates borrow dates 15 to 60 days in the past so the rows look closer to the dump
      - returnBy_date is always 14 days after borrow_date
      - Does not change copy status, so these act like old completed borrows
    */
    SET i = 0;
    WHILE i < historical_count DO
        SELECT Person_ID
        INTO chosen_person_id
        FROM tmp_eligible_patrons
        ORDER BY RAND()
        LIMIT 1;

        SELECT Copy_ID
        INTO chosen_copy_id
        FROM tmp_all_copies
        ORDER BY RAND()
        LIMIT 1;

        SET borrow_date = DATE_SUB(
            CURDATE(),
            INTERVAL (historical_min_days + FLOOR(RAND() * historical_span_days)) DAY
        );

        INSERT INTO BorrowedItem (borrow_date, returnBy_date, Person_ID, Copy_ID)
        VALUES (
            borrow_date,
            DATE_ADD(borrow_date, INTERVAL 14 DAY),
            chosen_person_id,
            chosen_copy_id
        );

        SET i = i + 1;
    END WHILE;

    /*
      Active borrows:
      - Only uses currently available copies
      - Generates borrow dates within the last 14 days, same as the app checkout logic
      - Updates selected copies to Copy_status = 2 so they appear checked out
      - Removes chosen copies from the temp pool so the same copy is not checked out twice
    */
    SET actual_active_count = LEAST(active_count, available_total);
    SET i = 0;

    WHILE i < actual_active_count DO
        SELECT Person_ID
        INTO chosen_person_id
        FROM tmp_eligible_patrons
        ORDER BY RAND()
        LIMIT 1;

        SELECT Copy_ID
        INTO chosen_copy_id
        FROM tmp_available_copies
        ORDER BY RAND()
        LIMIT 1;

        SET borrow_date = DATE_SUB(
            CURDATE(),
            INTERVAL FLOOR(RAND() * 14) DAY
        );

        INSERT INTO BorrowedItem (borrow_date, returnBy_date, Person_ID, Copy_ID)
        VALUES (
            borrow_date,
            DATE_ADD(borrow_date, INTERVAL 14 DAY),
            chosen_person_id,
            chosen_copy_id
        );

        UPDATE Copy
        SET Copy_status = 2
        WHERE Copy_ID = chosen_copy_id;

        DELETE FROM tmp_available_copies
        WHERE Copy_ID = chosen_copy_id;

        SET i = i + 1;
    END WHILE;

    COMMIT;

    DROP TEMPORARY TABLE IF EXISTS tmp_eligible_patrons;
    DROP TEMPORARY TABLE IF EXISTS tmp_all_copies;
    DROP TEMPORARY TABLE IF EXISTS tmp_available_copies;

    SELECT
        historical_count AS historical_rows_inserted,
        actual_active_count AS active_rows_inserted,
        patron_total AS eligible_borrowers_found,
        copy_total AS borrowable_copies_found;
END //

DELIMITER ;

/*
Example usage:
  CALL seed_borrowed_items(150, 25);

What this does:
  - adds 150 historical borrowed rows
  - adds 25 active borrowed rows
  - marks those 25 selected copies as checked out
  - uses anyone with account_status = 1 and borrow_status = 1 as a valid borrower
  - avoids Copy_status = 0 copies because those are out of circulation

After you are done seeding, you can drop the procedure if you want:
  DROP PROCEDURE IF EXISTS seed_borrowed_items;
*/
