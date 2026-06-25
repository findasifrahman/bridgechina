# Auth and Checkout Flow

Customer login and signup UI is centralized in `apps/web/src/components/auth/AuthOtpPanel.vue`.

- `LoginPage.vue`, `RegisterPage.vue`, and checkout all use the same OTP panel.
- Email OTP is active now through `/api/auth/email-code/request` and `/api/auth/email-code/verify`.
- Phone input validation already supports Bangladeshi mobile numbers in `apps/web/src/utils/contact-validation.ts`.
- SMS OTP is intentionally reserved in the shared panel, so enabling SMS later should happen in the component/store rather than separately in each page.
- Checkout collects missing phone and delivery address inline. It should not use a sign-in or address modal for normal customer checkout.
- After order placement, checkout redirects to `/user/orders?upload=<orderId>` so the payment slip dialog opens immediately.
