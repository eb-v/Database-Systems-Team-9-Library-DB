SELECT f.Person_ID, p.First_name, p.Last_name, p.role, COUNT(f.Fine_ID) AS unpaid_fee_count, SUM(f.fee_amount) AS unpaid_total
FROM feeowed f
LEFT JOIN person p ON f.Person_ID = p.Person_ID -- link a person to the feesowed
LEFT JOIN feepayment fp ON f.Fine_ID = fp.Fine_ID -- link that person to their fine
WHERE fp.Payment_Date > f.date_owed OR fp.Fine_ID IS NULL --check if it's paid late or not paid at all (can split into either condition for backend)
GROUP BY f.Person_ID, p.First_name, p.Last_name
ORDER BY unpaid_total DESC, unpaid_fee_count DESC;