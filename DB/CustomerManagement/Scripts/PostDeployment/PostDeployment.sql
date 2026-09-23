-- An SSDT project allows exactly one post-deployment script, so this is the single
-- entry point; each seed lives in its own file and is pulled in with :r at build time.
:r ./Seed_Merchant.sql
GO
:r ./Seed_Product.sql
