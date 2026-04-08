const db = require('../db');
const { URL } = require('url');
const ITEM_FEE_POLICY = require('../config/itemFeePolicy');

async function addItem(req, res) {
    let body = '';

    // collect incoming request data in chunks, then process once fully received
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const {
                item_name, item_type,
                // book fields
                author_firstName, author_lastName, publisher, language, year_published, book_damage_fine, book_loss_fine, book_genre,
                // cd fields
                cd_type, rating, release_date, cd_damage_fine, cd_loss_fine, cd_genre,
                // device fields
                device_type,
                // number of copies to add
                num_copies
            } = JSON.parse(body);
            const policy = ITEM_FEE_POLICY[item_type];

            if (!policy) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Invalid item type' }));
            }

            // step 1 — insert into Item table first, get back the new Item_ID
            const [itemResult] = await db.query(
                `INSERT INTO Item (Item_name, Item_type) VALUES (?, ?)`,
                [item_name, item_type]
            );
            const itemId = itemResult.insertId;

            // step 2 — insert into the correct subtype table based on item_type. item_type 1 = Book, 2 = CD, 3 = Device
            if (item_type === 1) {
                await db.query(
                    `INSERT INTO Book (Item_ID, author_firstName, author_lastName, publisher, language, year_published, Book_damage_fine, Book_loss_fine, genre)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [itemId, author_firstName, author_lastName, publisher, language, year_published, policy.damage, policy.loss, book_genre]
                );
            } else if (item_type === 2) {
                await db.query(
                    `INSERT INTO CD (Item_ID, CD_type, rating, release_date, CD_damage_fine, CD_loss_fine, genre)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [itemId, cd_type, rating, release_date, policy.damage, policy.loss, cd_genre]
                );
            } else if (item_type === 3) {
                await db.query(
                    `INSERT INTO Device (Item_ID, Device_type, Device_damage_fine, Device_loss_fine)
                     VALUES (?, ?, ?, ?)`,
                    [itemId, device_type, policy.damage, policy.loss]
                );
            }

            // step 3 — insert one Copy row per num_copies requested. Copy_status 1 = available
            for (let i = 0; i < num_copies; i++) {
                await db.query(
                    `INSERT INTO Copy (Item_ID, Copy_status, date_added) VALUES (?, 1, CURDATE())`,
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

async function getItems(req, res) {
    try {
        // parse query params from the URL — e.g. /api/items?search=gatsby&type=1
        const { searchParams } = new URL(req.url, 'http://localhost');
        const search = searchParams.get('search');  
        const type = searchParams.get('type');     

        // left join Book, CD, Device so we get subtype details regardless of item type. left join Copy to count total and available copies per item.
        const [rows] = await db.query(
            `SELECT
                i.Item_ID, i.Item_name, i.Item_type,
                b.author_firstName, b.author_lastName, b.publisher, b.language, b.year_published, b.Book_damage_fine, b.Book_loss_fine, b.genre AS book_genre,
                c.CD_type, c.rating, c.release_date, c.CD_damage_fine, c.CD_loss_fine, c.genre AS cd_genre,
                d.Device_type, d.Device_damage_fine, d.Device_loss_fine,
                SUM(CASE WHEN cp.Copy_status != 0 THEN 1 ELSE 0 END) AS total_copies,
                SUM(CASE WHEN cp.Copy_status = 1 THEN 1 ELSE 0 END) AS available_copies
            FROM Item i
            LEFT JOIN Book b ON i.Item_ID = b.Item_ID
            LEFT JOIN CD c ON i.Item_ID = c.Item_ID
            LEFT JOIN Device d ON i.Item_ID = d.Item_ID
            LEFT JOIN Copy cp ON i.Item_ID = cp.Item_ID
            WHERE (? IS NULL OR i.Item_name LIKE ?)
              AND (? IS NULL OR i.Item_type = ?)
            GROUP BY i.Item_ID`,
            [search, search ? `%${search}%` : null, type, type]
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to fetch items', details: err.message }));
    }
}

async function getItemById(req, res) {
    try {
        // extract the item ID from the URL — e.g. /api/items/5 → itemId = 5
        const itemId = req.url.split('/')[3];

        // same joins as getItems but filtered to one specific item. also pull each copy as its own row so the frontend knows individual copy statuses
        const [rows] = await db.query(
            `SELECT
                i.Item_ID, i.Item_name, i.Item_type,
                b.author_firstName, b.author_lastName, b.publisher, b.language, b.year_published, b.Book_damage_fine, b.Book_loss_fine, b.genre AS book_genre,
                c.CD_type, c.rating, c.release_date, c.CD_damage_fine, c.CD_loss_fine, c.genre AS cd_genre,
                d.Device_type, d.Device_damage_fine, d.Device_loss_fine,
                cp.Copy_ID, cp.Copy_status
            FROM Item i
            LEFT JOIN Book b ON i.Item_ID = b.Item_ID
            LEFT JOIN CD c ON i.Item_ID = c.Item_ID
            LEFT JOIN Device d ON i.Item_ID = d.Item_ID
            LEFT JOIN Copy cp ON i.Item_ID = cp.Item_ID
            WHERE i.Item_ID = ?`,
            [itemId]
        );

        // if no rows came back, that item doesn't exist
        if (rows.length === 0) {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: 'Item not found' }));
        }

        // the item info is the same on every row — only the copy columns differ. so pull item details from the first row, then collect all copies into an array
        const item = {
            Item_ID: rows[0].Item_ID,
            Item_name: rows[0].Item_name,
            Item_type: rows[0].Item_type,
            author_firstName: rows[0].author_firstName,
            author_lastName: rows[0].author_lastName,
            publisher: rows[0].publisher,
            language: rows[0].language,
            year_published: rows[0].year_published,
            Book_damage_fine: rows[0].Book_damage_fine,
            Book_loss_fine: rows[0].Book_loss_fine,
            book_genre: rows[0].book_genre,
            CD_type: rows[0].CD_type,
            rating: rows[0].rating,
            release_date: rows[0].release_date,
            CD_damage_fine: rows[0].CD_damage_fine,
            CD_loss_fine: rows[0].CD_loss_fine,
            cd_genre: rows[0].cd_genre,
            Device_type: rows[0].Device_type,
            Device_damage_fine: rows[0].Device_damage_fine,
            Device_loss_fine: rows[0].Device_loss_fine,
            copies: rows
                .filter(r => r.Copy_ID !== null)
                .map(r => ({ Copy_ID: r.Copy_ID, Copy_status: r.Copy_status }))
        };

        res.writeHead(200);
        res.end(JSON.stringify(item));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to fetch item', details: err.message }));
    }
}

async function updateItem(req, res) {
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            // extract item ID from URL — e.g. /api/items/5 → itemId = 5
            const itemId = req.url.split('/')[3];

            const {
                item_name,
                // book fields
                author_firstName, author_lastName, publisher, language, year_published, book_damage_fine, book_loss_fine, book_genre,
                // cd fields
                cd_type, rating, release_date, cd_damage_fine, cd_loss_fine, cd_genre,
                // device fields
                device_type, device_damage_fine, device_loss_fine
            } = JSON.parse(body);

            // step 1 — check the item exists and get its type so we know which subtype table to update
            const [itemRows] = await db.query(`SELECT Item_type FROM Item WHERE Item_ID = ?`, [itemId]);
            if (itemRows.length === 0) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: 'Item not found' }));
            }
            const item_type = itemRows[0].Item_type;

            // step 2 — update the Item table
            await db.query(`UPDATE Item SET Item_name = ? WHERE Item_ID = ?`, [item_name, itemId]);

            // step 3 — update the correct subtype table
            if (item_type === 1) {
                await db.query(
                    `UPDATE Book SET author_firstName = ?, author_lastName = ?, publisher = ?, language = ?, year_published = ?, Book_damage_fine = ?, Book_loss_fine = ?, genre = ?
                     WHERE Item_ID = ?`,
                    [author_firstName, author_lastName, publisher, language, year_published, book_damage_fine, book_loss_fine, book_genre, itemId]
                );
            } else if (item_type === 2) {
                await db.query(
                    `UPDATE CD SET CD_type = ?, rating = ?, release_date = ?, CD_damage_fine = ?, CD_loss_fine = ?, genre = ?
                     WHERE Item_ID = ?`,
                    [cd_type, rating, release_date, cd_damage_fine, cd_loss_fine, cd_genre, itemId]
                );
            } else if (item_type === 3) {
                await db.query(
                    `UPDATE Device SET Device_type = ?, Device_damage_fine = ?, Device_loss_fine = ?
                     WHERE Item_ID = ?`,
                    [device_type, device_damage_fine, device_loss_fine, itemId]
                );
            }

            res.writeHead(200);
            res.end(JSON.stringify({ message: 'Item updated successfully' }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Failed to update item', details: err.message }));
        }
    });
}

async function deleteCopy(req, res) {
    try {
        // URL is /api/items/:id/copies/:copyId — split gives us ['', 'api', 'items', itemId, 'copies', copyId]
        const parts = req.url.split('/');
        const itemId = parts[3];
        const copyId = parts[5];

        // check the copy exists and belongs to the item
        const [copyRows] = await db.query(
            `SELECT Copy_ID, Copy_status FROM Copy WHERE Copy_ID = ? AND Item_ID = ?`,
            [copyId, itemId]
        );
        if (copyRows.length === 0) {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: 'Copy not found' }));
        }

        if (copyRows[0].Copy_status === 2) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: 'Cannot remove a copy that is currently checked out' }));
        }

        // soft delete — set Copy_status to 0 (removed from circulation) instead of deleting the row
        await db.query(`UPDATE Copy SET Copy_status = 0 WHERE Copy_ID = ?`, [copyId]);

        res.writeHead(200);
        res.end(JSON.stringify({ message: 'Copy removed from circulation' }));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to remove copy', details: err.message }));
    }
}

module.exports = { addItem, getItems, getItemById, updateItem, deleteCopy };
