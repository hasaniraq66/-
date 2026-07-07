# Security Specification: Financial Management & Sub-user Authorization

This specification describes the security invariants, validation rules, threat payloads ("Dirty Dozen"), and validation protocols designed to secure the application against identity spoofing, value poisoning, and privilege escalation.

## 1. Core Data Invariants

1. **Identity Isolation (Owner Guard)**: No authenticated user may read or write another user's personal financial documents unless they are explicitly authorized as a registered Sub-user of that primary account.
2. **Sub-user Integrity**: A Sub-user record under `/users/{userId}/subUsers/{subUserId}` can only be created, modified, or deleted by the primary owner of `{userId}`. Sub-users are strictly forbidden from managing permissions or other sub-users.
3. **Relational Field Alignment**: All documents written inside a subcollection of `/users/{userId}` must have their internal `userId` field match `{userId}` to prevent cross-account injection and orphaned records.
4. **Value Range Enforcement**: Numeric financial properties (`amount`, `paidAmount`, `monthlyLimit`, `salary`, `budget`) must be non-negative numbers to prevent integer underflow/overflow or negative credit attacks.
5. **No Blind Updates (State/Value Hardening)**: Modifying a record must adhere to strict schemas. For example, modifying a sub-user's fields must validate that they are only modifying allowable keys and types.

---

## 2. The "Dirty Dozen" Threat Payloads

Below are twelve malicious payloads designed to attempt to violate system constraints, all of which must result in a `PERMISSION_DENIED` error.

### Payload 1: PII Theft / Blanket Read
- **Target**: `/users/admin_user_abc/debts/debt_123`
- **Actor**: `malicious_unauth_user`
- **Action**: Read
- **Threat**: Reading other users' private debts without being a sub-user.

### Payload 2: Sub-user Privilege Escalation (Self-Permission)
- **Target**: `/users/admin_user_abc/subUsers/my_sub_uid`
- **Actor**: `my_sub_uid`
- **Action**: Update (`allowedTabs: ['dashboard', 'debts', 'budget', 'projects', 'reports', 'alerts', 'backup']`)
- **Threat**: A sub-user attempts to grant themselves all access, including backup/restore permissions.

### Payload 3: Cross-Tenant User Account Hijacking
- **Target**: `/users/other_admin_xyz`
- **Actor**: `malicious_user_123`
- **Action**: Create/Update (injecting their own `adminId`)
- **Threat**: Spoofing profile structures to claim ownership of another account.

### Payload 4: Negative Debt Underflow Attack
- **Target**: `/users/admin_user_abc/debts/debt_123`
- **Actor**: `admin_user_abc` (or auth sub-user)
- **Action**: Create (`amount: -1000000`)
- **Threat**: Injecting negative amounts to confuse ledger summaries.

### Payload 5: Orphaned Debt (Cross-Account Owner ID Spoofing)
- **Target**: `/users/admin_user_abc/debts/debt_123`
- **Actor**: `admin_user_abc`
- **Action**: Create (`userId: "victim_user_xyz"`)
- **Threat**: Injecting cross-account owner fields to leak or orphan entries.

### Payload 6: Unauthenticated Profile Seizure
- **Target**: `/users/admin_user_abc`
- **Actor**: Unauthenticated Client
- **Action**: Write
- **Threat**: Writing profile configurations without signing in.

### Payload 7: Shadow Update Ghost Field Injection
- **Target**: `/users/admin_user_abc/projects/project_123`
- **Actor**: `admin_user_abc`
- **Action**: Update (`isVerifiedSuperuser: true` / shadow fields)
- **Threat**: Injecting unmapped properties into schema objects.

### Payload 8: Negative Employee Salary Poisoning
- **Target**: `/users/admin_user_abc/employees/emp_123`
- **Actor**: `sub_user_abc`
- **Action**: Create (`salary: -5000`)
- **Threat**: Poisoning contractor registry with negative wage vectors.

### Payload 9: Sub-User Creation of Other Sub-Users
- **Target**: `/users/admin_user_abc/subUsers/sub_user_new`
- **Actor**: `sub_user_existing`
- **Action**: Create
- **Threat**: Delegated sub-users creating secondary accounts to bypass audit paths.

### Payload 10: Negative Budget Limit Attack
- **Target**: `/users/admin_user_abc/budgets/budget_123`
- **Actor**: `admin_user_abc`
- **Action**: Create (`monthlyLimit: -500`)
- **Threat**: Breaking limits calculation loops with negative budget caps.

### Payload 11: Future Payment Spoofing
- **Target**: `/users/admin_user_abc/salaryPayments/pay_123`
- **Actor**: `sub_user_abc`
- **Action**: Create (`amount: "One Million"`)
- **Threat**: Injecting non-numeric string values as a payment amount to break rendering.

### Payload 12: Rogue Project State Transition
- **Target**: `/users/admin_user_abc/projects/project_123`
- **Actor**: `sub_user_abc`
- **Action**: Update (`status: "malicious_unsupported_status"`)
- **Threat**: Bypassing defined state enums to break downstream reporting.

---

## 3. Test Runner Specification

The test assertions in `firestore.rules.test.ts` (using the Firebase Rules Unit Testing SDK) are mapped to verify all of these vectors are blocked.

```ts
// firestore.rules.test.ts mockup assertions
// - expect(unauth.read(debtDoc)).toFail();
// - expect(subUser.update(subUserPermissionsDoc, { allowedTabs: [...] })).toFail();
// - expect(owner.create(debtDocWithNegativeAmount)).toFail();
// - expect(owner.create(debtDocWithMismatchedUserId)).toFail();
```
