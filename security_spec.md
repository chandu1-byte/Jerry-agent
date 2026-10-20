# Security Specification: JERRY AI Accountant

## 1. Data Invariants

1. **Identity & Authentication**:
   - Only authenticated users with valid Google sessions may read or write accounting records.
   - Initial bootstrapped admin is verified email `premdhfa@gmail.com` with `email_verified == true`.
   - Admin roles cannot be self-assigned or spoofed.

2. **Personal vs Project Isolation**:
   - Every transaction belongs to either `personal` or `project` accountType.
   - For Personal A/c: Payment modes (CASH, HDFC, SBI, UNION or splits) must be specified.
   - For Project A/c: Payment modes are optional, but `who` and `particulars` must be recorded.
   - Linked personal-to-project investment transactions share a unique `linkedTxId` referencing both ledger sides without double-counting.

3. **Immutability of Audit Trails**:
   - `auditLogs` records are append-only and cannot be modified or deleted once created.
   - `createdBy` and `createdAt` on transactions are immutable once committed.

4. **Input Boundaries & Denial-of-Wallet Prevention**:
   - IDs must be alphanumeric strings `<= 128` characters.
   - Transaction text fields are capped (`particulars` <= 500 chars, `remarks` <= 1000 chars, `who` <= 200 chars).
   - Amounts must be positive numbers (`amount > 0` and `amount <= 10000000000`).

---

## 2. The "Dirty Dozen" Threat Payloads

1. **D1: Unauthenticated Read**: An unauthenticated client attempting to list all `/transactions` must be denied with PERMISSION_DENIED.
2. **D2: Spoofed Admin Email**: A user presenting `email: 'premdhfa@gmail.com'` with `email_verified: false` must not be granted admin rights.
3. **D3: Self-Assigned Role Escalation**: A standard user attempting to create/update `/users/{uid}` with `role: "admin"` must be blocked.
4. **D4: Negative Transaction Amount**: Attempting to insert a transaction with `amount: -5000` must be rejected.
5. **D5: Zero Transaction Amount**: Attempting to insert a transaction with `amount: 0` must be rejected.
6. **D6: Oversized Payload Attack**: An attacker attempting to write a `remarks` string of 500KB must be blocked by size boundaries.
7. **D7: Path Variable ID Poisoning**: Attempting to write to `/transactions/{junk}` with 2KB junk character ID must be rejected by `isValidId`.
8. **D8: Tampering with Immutable CreatedAt**: Updating an existing transaction and altering `createdBy` or `createdAt` must be blocked.
9. **D9: Modifying Audit History**: Attempting to update or delete any document in `/auditLogs` must be blocked.
10. **D10: Ghost Field Injection**: Writing an undeclared privileged field like `isVerified: true` into a transaction must fail schema validation.
11. **D11: Unverified Email Write**: Write attempts from accounts with unverified emails must be rejected.
12. **D12: Deleting Project Ledger**: Standard accountants or partners attempting to delete a project document must be blocked (admin-only).

---

## 3. Test Runner Design (`firestore.rules.test.ts`)
The test runner asserts that all 12 dirty payloads fail validation and generate `PERMISSION_DENIED`, while valid owner and accountant operations succeed.
