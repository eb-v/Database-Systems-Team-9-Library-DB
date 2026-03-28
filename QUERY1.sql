-- map Item_type to book, cd, device for visibility?
SELECT  i.Item_ID, i.Item_name,  i.Item_type, COUNT(*) AS times_checked_out
FROM BorrowedItem bi 
LEFT JOIN Copy c ON bi.Copy_ID = c.Copy_ID 
LEFT JOIN Item i ON c.Item_ID = i.Item_ID
-- group by item_ID and then order by which item was checked out the most
GROUP BY i.Item_ID, i.Item_name
ORDER BY times_checked_out DESC;