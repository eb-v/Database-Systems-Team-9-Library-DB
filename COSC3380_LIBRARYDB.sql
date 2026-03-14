

CREATE DATABASE IF NOT EXISTS library_db;
USE library_db;


CREATE TABLE IF NOT EXISTS Item (
  Item_ID   INT PRIMARY KEY NOT NULL,
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
  FOREIGN KEY (Item_ID) REFERENCES Item(Item_ID)
);

CREATE TABLE IF NOT EXISTS CD (
  Item_ID         INT PRIMARY KEY NOT NULL,
  CD_type         SMALLINT,
  rating          SMALLINT,
  release_date    DATE,
  CD_damage_fine  DECIMAL(10,2),
  CD_loss_fine    DECIMAL(10,2),
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
  Copy_ID      INT PRIMARY KEY NOT NULL,
  Item_ID      INT NOT NULL,
  Copy_status  SMALLINT,
  FOREIGN KEY (Item_ID) REFERENCES Item(Item_ID)
);


CREATE TABLE IF NOT EXISTS Person (
  Person_ID       INT PRIMARY KEY NOT NULL,
  First_name      VARCHAR(50) NOT NULL,
  Last_name       VARCHAR(50) NOT NULL,
  email           VARCHAR(50) ,
  username        VARCHAR(50) ,
  password        VARCHAR(50) ,
  role            SMALLINT NOT NULL,
  phone_number    INT,
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
  BorrowedItem_ID  INT PRIMARY KEY NOT NULL,
  borrow_date      DATE NOT NULL,
  returnBy_date    DATE NOT NULL,
  Person_ID        INT NOT NULL,
  Copy_ID          INT NOT NULL,
  FOREIGN KEY (Person_ID) REFERENCES Person(Person_ID),
  FOREIGN KEY (Copy_ID) REFERENCES Copy(Copy_ID)
);


CREATE TABLE IF NOT EXISTS HoldItem (
  Hold_ID       INT PRIMARY KEY NOT NULL,
  queue_status  SMALLINT,
  Person_ID     INT NOT NULL,
  Copy_ID       INT NOT NULL,
  FOREIGN KEY (Person_ID) REFERENCES Person(Person_ID),
  FOREIGN KEY (Copy_ID) REFERENCES Copy(Copy_ID)
);

CREATE TABLE IF NOT EXISTS Room (
  Room_ID      INT PRIMARY KEY NOT NULL,
  Room_status  SMALLINT
);


CREATE TABLE IF NOT EXISTS RoomReservation (
  Reservation_ID  INT PRIMARY KEY NOT NULL,
  start_time      DATETIME NOT NULL,
  length          TIME NOT NULL,
  Person_ID       INT NOT NULL,
  Room_ID         INT NOT NULL,
  FOREIGN KEY (Person_ID) REFERENCES Person(Person_ID),
  FOREIGN KEY (Room_ID) REFERENCES Room(Room_ID)
);


CREATE TABLE IF NOT EXISTS FeeOwed (
  Fine_ID          INT PRIMARY KEY NOT NULL,
  date_owed        DATETIME NOT NULL,
  status           SMALLINT NOT NULL,
  late_fee         DECIMAL(10,2),
  Person_ID        INT NOT NULL,
  BorrowedItem_ID  INT NOT NULL,
  FOREIGN KEY (Person_ID) REFERENCES Person(Person_ID),
  FOREIGN KEY (BorrowedItem_ID) REFERENCES BorrowedItem(BorrowedItem_ID)
);


CREATE TABLE IF NOT EXISTS FeePayment (
  Payment_ID    INT PRIMARY KEY NOT NULL,
  Payment_Date  DATE NOT NULL,
  method        SMALLINT,
  Person_ID     INT NOT NULL,
  Fine_ID       INT UNIQUE NOT NULL,
  FOREIGN KEY (Person_ID) REFERENCES Person(Person_ID),
  FOREIGN KEY (Fine_ID) REFERENCES FeeOwed(Fine_ID)
);