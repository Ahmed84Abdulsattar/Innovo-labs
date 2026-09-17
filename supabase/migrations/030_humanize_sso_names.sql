-- Migration 030: Humanize SSO display names stored as email handles.
--
-- Early SSO logins stored `name` as the email local part (e.g. "first.last"),
-- so the UI showed "first.last" instead of "First Last". This rewrites those:
-- strip any domain, turn '.'/'_' runs into a single space, Initcap each word.
--
-- Only touches names that LOOK like a handle — i.e. contain a '.' or '_' AND
-- have no space — so real, in-app-edited names are left untouched. Hyphens are
-- preserved so "Jean-Pierre" stays intact (Initcap still capitalizes after '-').
--
-- Idempotent: fixed names gain a space and no longer match the WHERE clause.

UPDATE users
SET name = trim(initcap(
  regexp_replace(split_part(name, '@', 1), '[._]+', ' ', 'g')
))
WHERE name ~ '[._]' AND name NOT LIKE '% %';
