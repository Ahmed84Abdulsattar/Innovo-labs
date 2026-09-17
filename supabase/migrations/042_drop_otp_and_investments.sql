-- 042: Drop the retired otp_codes and investments tables
--
-- otp_codes  — email OTP sign-in/reset was retired when the portal moved to
--              Microsoft (Entra ID) SSO only. No application code references it.
-- investments — the investments feature (route, hook, page) was removed. The
--              only remaining reference was a dead permission helper, also removed
--              in this change. No other table has a foreign key to investments.
--
-- Both drops are safe: nothing references either table. CASCADE also removes the
-- tables' own indexes and the investments updated_at trigger.

DROP TABLE IF EXISTS otp_codes   CASCADE;
DROP TABLE IF EXISTS investments  CASCADE;
