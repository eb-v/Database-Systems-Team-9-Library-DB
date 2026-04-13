

CREATE DATABASE IF NOT EXISTS library_db;
USE library_db;


CREATE TABLE IF NOT EXISTS Item (
  Item_ID   INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  Item_name VARCHAR(50),
  Item_type SMALLINT
);

CREATE TABLE IF NOT EXISTS Book (
  Item_ID           INT PRIMARY KEY NOT NULL,
  author_firstName  VARCHAR(50),
  author_lastName   VARCHAR(50),
  publisher         VARCHAR(50),
  language          SMALLINT,
  year_published    DATE,
  Book_damage_fine  DECIMAL(10,2),
  Book_loss_fine    DECIMAL(10,2),
  genre             VARCHAR(50),
  FOREIGN KEY (Item_ID) REFERENCES Item(Item_ID)
);

CREATE TABLE IF NOT EXISTS CD (
  Item_ID         INT PRIMARY KEY NOT NULL,
  CD_type         SMALLINT,
  rating          SMALLINT,
  release_date    DATE,
  CD_damage_fine  DECIMAL(10,2),
  CD_loss_fine    DECIMAL(10,2),
  genre             VARCHAR(50),
  FOREIGN KEY (Item_ID) REFERENCES Item(Item_ID)
);


CREATE TABLE IF NOT EXISTS Device (
  Item_ID              INT PRIMARY KEY NOT NULL,
  Device_type          SMALLINT,
  Device_damage_fine   DECIMAL(10,2),
  Device_loss_fine     DECIMAL(10,2),
  FOREIGN KEY (Item_ID) REFERENCES Item(Item_ID)
);


CREATE TABLE IF NOT EXISTS Copy (
  Copy_ID      INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  Item_ID      INT NOT NULL,
  Copy_status  SMALLINT,
  date_added   DATE DEFAULT (CURDATE()),
  FOREIGN KEY (Item_ID) REFERENCES Item(Item_ID)
);


CREATE TABLE IF NOT EXISTS Person (
  Person_ID       INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  First_name      VARCHAR(50) NOT NULL,
  Last_name       VARCHAR(50) NOT NULL,
  email           VARCHAR(50) ,
  username        VARCHAR(50) ,
  password        VARCHAR(255) ,
  role            SMALLINT NOT NULL,
  phone_number    VARCHAR(20) ,
  birthday        DATE,
  account_status  SMALLINT,
  borrow_status   SMALLINT
);

CREATE TABLE IF NOT EXISTS Staff (
  Person_ID          INT PRIMARY KEY NOT NULL,
  Staff_permissions  SMALLINT NOT NULL,
  FOREIGN KEY (Person_ID) REFERENCES Person(Person_ID)
);


CREATE TABLE IF NOT EXISTS User (
  Person_ID         INT PRIMARY KEY NOT NULL,
  User_permissions  SMALLINT NOT NULL,
  FOREIGN KEY (Person_ID) REFERENCES Person(Person_ID)
);


CREATE TABLE IF NOT EXISTS BorrowedItem (
  BorrowedItem_ID  INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  borrow_date      DATE NOT NULL,
  returnBy_date    DATE NOT NULL,
  Person_ID        INT NOT NULL,
  Copy_ID          INT NOT NULL,
  FOREIGN KEY (Person_ID) REFERENCES Person(Person_ID),
  FOREIGN KEY (Copy_ID) REFERENCES Copy(Copy_ID)
);


CREATE TABLE IF NOT EXISTS HoldItem (
  Hold_ID       INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  queue_status  SMALLINT,
  hold_status   SMALLINT DEFAULT 1,
  hold_date     DATE,
  expiry_date   DATE,
  Person_ID     INT NOT NULL,
  Copy_ID       INT NOT NULL,
  FOREIGN KEY (Person_ID) REFERENCES Person(Person_ID),
  FOREIGN KEY (Copy_ID) REFERENCES Copy(Copy_ID)
);

CREATE TABLE IF NOT EXISTS Room (
  Room_ID      INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  Room_status  SMALLINT
);


CREATE TABLE IF NOT EXISTS RoomReservation (
  Reservation_ID       INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  start_time           DATETIME NOT NULL,
  length               TIME NOT NULL,
  reservation_status   SMALLINT DEFAULT 1,
  Person_ID            INT NOT NULL,
  Room_ID              INT NOT NULL,
  FOREIGN KEY (Person_ID) REFERENCES Person(Person_ID),
  FOREIGN KEY (Room_ID) REFERENCES Room(Room_ID)
);


CREATE TABLE IF NOT EXISTS FeeOwed (
  Fine_ID          INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  date_owed        DATETIME NOT NULL,
  status           SMALLINT NOT NULL,
  fee_amount       DECIMAL(10,2),
  fee_type         SMALLINT,
  Person_ID        INT NOT NULL,
  BorrowedItem_ID  INT NOT NULL,
  FOREIGN KEY (Person_ID) REFERENCES Person(Person_ID),
  FOREIGN KEY (BorrowedItem_ID) REFERENCES BorrowedItem(BorrowedItem_ID)
);


CREATE TABLE IF NOT EXISTS FeePayment (
  Payment_ID    INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  Payment_Date  DATE NOT NULL,
  method        SMALLINT,
  Person_ID     INT NOT NULL,
  Fine_ID       INT UNIQUE NOT NULL,
  FOREIGN KEY (Person_ID) REFERENCES Person(Person_ID),
  FOREIGN KEY (Fine_ID) REFERENCES FeeOwed(Fine_ID)
);

CREATE TABLE IF NOT EXISTS Notification (
  Notification_ID  INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  Person_ID        INT NOT NULL,
  type             SMALLINT NOT NULL,
  message          VARCHAR(255) NOT NULL,
  is_read          TINYINT(1) NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL,
  Fine_ID          INT DEFAULT NULL,
  Hold_ID          INT DEFAULT NULL,
  KEY (Person_ID),
  KEY (Fine_ID),
  KEY (Hold_ID),
  FOREIGN KEY (Person_ID) REFERENCES Person(Person_ID),
  FOREIGN KEY (Fine_ID) REFERENCES FeeOwed(Fine_ID),
  FOREIGN KEY (Hold_ID) REFERENCES HoldItem(Hold_ID)
);


DELIMITER //

CREATE TRIGGER restrict_borrow_on_fee
AFTER INSERT ON FeeOwed
FOR EACH ROW
BEGIN
  IF NEW.status = 1 THEN
    UPDATE Person
    SET borrow_status = 0
    WHERE Person_ID = NEW.Person_ID;
  END IF;
END //

CREATE TRIGGER unrestrict_borrow_on_payment
AFTER UPDATE ON FeeOwed
FOR EACH ROW
BEGIN
  DECLARE unpaid_count INT;

  IF NEW.status = 2 AND OLD.status = 1 THEN
    SELECT COUNT(*) INTO unpaid_count
    FROM FeeOwed
    WHERE Person_ID = NEW.Person_ID AND status = 1;

    IF unpaid_count = 0 THEN
      UPDATE Person
      SET borrow_status = 1
      WHERE Person_ID = NEW.Person_ID;
    END IF;
  END IF;
END //

CREATE TRIGGER promote_next_hold
AFTER UPDATE ON Copy
FOR EACH ROW
BEGIN
  DECLARE next_hold_id INT;

  IF NEW.Copy_status = 1 AND OLD.Copy_status <> 1 THEN
    SELECT h.Hold_ID INTO next_hold_id
    FROM HoldItem h
    JOIN Copy c ON h.Copy_ID = c.Copy_ID
    WHERE c.Item_ID = NEW.Item_ID
      AND h.hold_status = 1
    ORDER BY h.queue_status ASC, h.hold_date ASC
    LIMIT 1;

    IF next_hold_id IS NOT NULL THEN
      UPDATE HoldItem
      SET hold_status = 2,
          expiry_date = DATE_ADD(CURDATE(), INTERVAL 2 DAY),
          Copy_ID = NEW.Copy_ID
      WHERE Hold_ID = next_hold_id;
    END IF;
  END IF;
END //

DELIMITER ;

