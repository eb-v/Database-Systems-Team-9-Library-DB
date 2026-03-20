const db = require('../db');

async function addItem(req, res) {
    let body = '';

    // collect incoming request data in chunks, then process once fully received
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const {
                item_name, item_type,
                // book fields
                author_firstName, author_lastName, publisher, language, year_published, book_damage_fine, book_loss_fine,
                // cd fields
                cd_type, rating, release_date, cd_damage_fine, cd_loss_fine,
                // device fields
                device_type, device_damage_fine, device_loss_fine,
                // number of copies to add
                num_copies
            } = JSON.parse(body);

            // step 1 — insert into Item table first, get back the new Item_ID
            const [itemResult] = await db.query(
                `INSERT INTO Item (Item_name, Item_type) VALUES (?, ?)`,
                [item_name, item_type]
            );
            const itemId = itemResult.insertId;

            // step 2 — insert into the correct subtype table based on item_type. item_type 1 = Book, 2 = CD, 3 = Device
            if (item_type === 1) {
                await db.query(
                    `INSERT INTO Book (Item_ID, author_firstName, author_lastName, publisher, language, year_published, Book_damage_fine, Book_loss_fine)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [itemId, author_firstName, author_lastName, publisher, language, year_published, book_damage_fine, book_loss_fine]
                );
            } else if (item_type === 2) {
                await db.query(
                    `INSERT INTO CD (Item_ID, CD_type, rating, release_date, CD_damage_fine, CD_loss_fine)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [itemId, cd_type, rating, release_date, cd_damage_fine, cd_loss_fine]
                );
            } else if (item_type === 3) {
                await db.query(
                    `INSERT INTO Device (Item_ID, Device_type, Device_damage_fine, Device_loss_fine)
                     VALUES (?, ?, ?, ?)`,
                    [itemId, device_type, device_damage_fine, device_loss_fine]
                );
            }

            // step 3 — insert one Copy row per num_copies requested. Copy_status 1 = available
            for (let i = 0; i < num_copies; i++) {
                await db.query(
                    `INSERT INTO Copy (Item_ID, Copy_status) VALUES (?, 1)`,
                    [itemId]
                );
            }

            res.writeHead(201);
            res.end(JSON.stringify({ message: 'Item added successfully', item_id: itemId }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Failed to add item', details: err.message }));
        }
    });
}

module.exports = { addItem };
