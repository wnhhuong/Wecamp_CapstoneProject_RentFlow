# First Login and Contract Test Cases

## Preconditions

- Backend and frontend are running against the same database.
- Use an inactive seeded tenant account (for example, room code `C-302`).
- Keep DevTools Network open to inspect `login`, `profile`, `contract-preview`, and `contract` requests.

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| FL-01 | Inactive tenant starts first login | Log in with the inactive tenant username and temporary password. | Login succeeds and redirects to first-login profile; onboarding token is issued; normal dashboard is not opened yet. |
| FL-02 | Required profile fields | Leave one required field empty and submit. | Submission is blocked; the field shows required validation; no profile request is sent. |
| FL-03 | Date of birth format | Enter a valid date using separate `YYYY`, `MM`, and `DD` fields. | The date is accepted and sent as `YYYY-MM-DD`. |
| FL-04 | Invalid date | Enter an impossible date such as `2006/02/31`. | An invalid date message appears and the profile request is not sent. |
| FL-05 | Password mismatch | Enter different values in New password and Confirm new password. | Frontend shows a mismatch message and does not submit the profile. |
| FL-06 | Password visibility | Use the eye button on both password fields. | Each field toggles independently between masked and visible text. |
| FL-07 | Profile confirmation | Fill valid data, leave the confirmation checkbox unchecked, then submit. | Submission is blocked until the confirmation checkbox is checked. |
| FL-08 | Continue confirmation | Fill valid data and click Continue to contract. | A confirmation dialog appears; cancelling stays on profile; confirming calls the profile API and opens contract review. |
| FL-09 | Contract preview request | Open the contract page and inspect `contract-preview`. | Request uses the onboarding token and returns `renderedText`, `user`, `room`, and `draftContract`. |
| FL-10 | Placeholder merge | Inspect the rendered contract. | Placeholders supplied by the backend are replaced with current tenant, room, date, rent, and deposit values; no unresolved known placeholders remain. |
| FL-11 | Contract formatting | Review the contract text. | Paragraphs preserve backend line breaks; important values are bold; wording and values are unchanged. |
| FL-12 | Signature validation | Click Sign without drawing a signature or accepting terms. | Signing is blocked and the user receives a clear validation message. |
| FL-13 | Successful signing | Draw a signature, accept terms, and click Sign & enter account. Confirm the dialog. | `POST /auth/first-login/contract` succeeds; the contract becomes active; the user enters the tenant dashboard. |
| FL-14 | Contract persistence | Refresh the dashboard and inspect Profile & lease or the `contract` response. | The signed contract, signature metadata, and updated tenant profile remain available. |
| FL-15 | Onboarding guard | Open `/first-login/profile` or `/first-login/contract` without a valid onboarding session. | User is redirected to login. |

## Backend response checks

For `contract-preview`, verify that `renderedText` is the template source and that the frontend does not depend on a synthetic `contractID`. For the final `contract` response, verify `success: true`, an active contract, `signature`, and `signedAt`.
